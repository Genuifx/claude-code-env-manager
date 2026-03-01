use crate::config;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::BufRead;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CronTask {
    pub id: String,
    pub name: String,
    #[serde(rename = "cronExpression")]
    pub cron_expression: String,
    pub prompt: String,
    #[serde(rename = "workingDir")]
    pub working_dir: String,
    #[serde(rename = "envName")]
    pub env_name: Option<String>,
    pub enabled: bool,
    #[serde(rename = "timeoutSecs")]
    pub timeout_secs: u64,
    #[serde(rename = "templateId")]
    pub template_id: Option<String>,
    #[serde(rename = "triggerType", default = "default_trigger_type")]
    pub trigger_type: String,
    #[serde(rename = "parentTaskId", default)]
    pub parent_task_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

fn default_trigger_type() -> String {
    "schedule".to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CronTaskRun {
    pub id: String,
    #[serde(rename = "taskId")]
    pub task_id: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "finishedAt")]
    pub finished_at: Option<String>,
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    #[serde(rename = "durationMs")]
    pub duration_ms: Option<u64>,
    pub status: String, // "running" | "success" | "failed" | "timeout"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CronTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "cronExpression")]
    pub cron_expression: String,
    pub prompt: String,
    pub icon: String,
}

// ============================================================================
// Persistence file wrappers
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Default)]
struct CronTasksFile {
    tasks: Vec<CronTask>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct CronRunsFile {
    runs: Vec<CronTaskRun>,
}

// ============================================================================
// File I/O helpers
// ============================================================================

fn get_tasks_path() -> std::path::PathBuf {
    config::get_ccem_dir().join("cron-tasks.json")
}

fn get_runs_dir() -> std::path::PathBuf {
    config::get_ccem_dir().join("cron-runs")
}

fn get_runs_path(task_id: &str) -> std::path::PathBuf {
    get_runs_dir().join(format!("{}.json", task_id))
}

fn read_tasks() -> Result<Vec<CronTask>, String> {
    let path = get_tasks_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read cron tasks: {}", e))?;
    let file: CronTasksFile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse cron tasks: {}", e))?;
    Ok(file.tasks)
}

fn write_tasks(tasks: &[CronTask]) -> Result<(), String> {
    config::ensure_ccem_dir().map_err(|e| format!("Failed to create ccem dir: {}", e))?;
    let file = CronTasksFile {
        tasks: tasks.to_vec(),
    };
    let content = serde_json::to_string_pretty(&file)
        .map_err(|e| format!("Failed to serialize cron tasks: {}", e))?;
    fs::write(get_tasks_path(), content).map_err(|e| format!("Failed to write cron tasks: {}", e))
}

fn read_runs(task_id: &str) -> Result<Vec<CronTaskRun>, String> {
    let path = get_runs_path(task_id);
    if !path.exists() {
        return Ok(vec![]);
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read cron runs: {}", e))?;
    let file: CronRunsFile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse cron runs: {}", e))?;
    Ok(file.runs)
}

fn write_runs(task_id: &str, runs: &[CronTaskRun]) -> Result<(), String> {
    config::ensure_ccem_dir().map_err(|e| format!("Failed to create ccem dir: {}", e))?;
    let dir = get_runs_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create cron-runs dir: {}", e))?;
    }
    let file = CronRunsFile {
        runs: runs.to_vec(),
    };
    let content = serde_json::to_string_pretty(&file)
        .map_err(|e| format!("Failed to serialize cron runs: {}", e))?;
    fs::write(get_runs_path(task_id), content)
        .map_err(|e| format!("Failed to write cron runs: {}", e))
}

const MAX_RUNS_PER_TASK: usize = 50;

fn append_run(task_id: &str, run: CronTaskRun) -> Result<(), String> {
    let mut runs = read_runs(task_id)?;
    runs.push(run);
    // Keep only the most recent MAX_RUNS_PER_TASK entries
    if runs.len() > MAX_RUNS_PER_TASK {
        let drain_count = runs.len() - MAX_RUNS_PER_TASK;
        runs.drain(..drain_count);
    }
    write_runs(task_id, &runs)
}

fn update_run(
    task_id: &str,
    run_id: &str,
    updater: impl FnOnce(&mut CronTaskRun),
) -> Result<(), String> {
    let mut runs = read_runs(task_id)?;
    if let Some(r) = runs.iter_mut().find(|r| r.id == run_id) {
        updater(r);
    }
    write_runs(task_id, &runs)
}

// ============================================================================
// ID generation
// ============================================================================

fn generate_id(prefix: &str) -> String {
    use rand::Rng;
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let rand_part: u32 = rand::thread_rng().gen_range(0..0xFFFF);
    format!("{}-{}-{:04x}", prefix, ts, rand_part)
}

// ============================================================================
// Cron expression parser
// ============================================================================

/// Parse a single cron field (e.g. "*/5", "1-3", "1,2,3", "*") into a sorted
/// list of matching values within [min, max].
fn parse_cron_field(field: &str, min: u32, max: u32) -> Vec<u32> {
    let mut result = Vec::new();
    for part in field.split(',') {
        let part = part.trim();
        if part == "*" {
            return (min..=max).collect();
        } else if let Some(step_str) = part.strip_prefix("*/") {
            if let Ok(step) = step_str.parse::<u32>() {
                if step > 0 {
                    let mut v = min;
                    while v <= max {
                        result.push(v);
                        v += step;
                    }
                }
            }
        } else if part.contains('-') {
            let bounds: Vec<&str> = part.split('-').collect();
            if bounds.len() == 2 {
                if let (Ok(lo), Ok(hi)) = (bounds[0].parse::<u32>(), bounds[1].parse::<u32>()) {
                    let lo = lo.max(min);
                    let hi = hi.min(max);
                    for v in lo..=hi {
                        result.push(v);
                    }
                }
            }
        } else if let Ok(v) = part.parse::<u32>() {
            if v >= min && v <= max {
                result.push(v);
            }
        }
    }
    result.sort();
    result.dedup();
    result
}

/// Check whether a given chrono::DateTime matches a 5-field cron expression
/// (minute hour day-of-month month day-of-week).
fn cron_matches(expression: &str, dt: &chrono::DateTime<chrono::Local>) -> bool {
    use chrono::Datelike;
    use chrono::Timelike;

    let fields: Vec<&str> = expression.split_whitespace().collect();
    if fields.len() != 5 {
        return false;
    }

    let minutes = parse_cron_field(fields[0], 0, 59);
    let hours = parse_cron_field(fields[1], 0, 23);
    let days = parse_cron_field(fields[2], 1, 31);
    let months = parse_cron_field(fields[3], 1, 12);
    let weekdays = parse_cron_field(fields[4], 0, 6);

    let m = dt.minute();
    let h = dt.hour();
    let d = dt.day();
    let mo = dt.month();
    // chrono: Mon=0 .. Sun=6 in weekday().num_days_from_monday()
    // cron convention: Sun=0, Mon=1 .. Sat=6
    let wd = dt.weekday().num_days_from_sunday();

    minutes.contains(&m)
        && hours.contains(&h)
        && days.contains(&d)
        && months.contains(&mo)
        && weekdays.contains(&wd)
}

/// Compute the next `count` run times for a cron expression, starting from now.
/// Returns ISO-8601 strings in local time.
fn next_runs(expression: &str, count: usize) -> Vec<String> {
    use chrono::{Duration, Local, Timelike};

    let mut results = Vec::new();
    // Start from the next whole minute
    let now = Local::now();
    let mut cursor = now
        .with_second(0)
        .and_then(|t| t.with_nanosecond(0))
        .unwrap_or(now)
        + Duration::minutes(1);

    // Safety: scan at most 366 days ahead
    let limit = 366 * 24 * 60;
    let mut iterations = 0;

    while results.len() < count && iterations < limit {
        if cron_matches(expression, &cursor) {
            results.push(cursor.to_rfc3339());
        }
        cursor = cursor + Duration::minutes(1);
        iterations += 1;
    }

    results
}

// ============================================================================
// Task execution
// ============================================================================

fn build_env_vars(env_name: &Option<String>) -> HashMap<String, String> {
    let mut env_vars: HashMap<String, String> = HashMap::new();
    if let Ok(cfg) = config::read_config() {
        // Use the task's explicit env, or fall back to the current active environment
        let resolved_name = env_name.as_ref().or(cfg.current.as_ref());
        if let Some(name) = resolved_name {
            if let Some(env) = cfg.registries.get(name) {
                let decrypted = config::get_env_with_decrypted_key(env);
                if let Some(url) = decrypted.base_url {
                    env_vars.insert("ANTHROPIC_BASE_URL".to_string(), url);
                }
                if let Some(key) = decrypted.api_key {
                    env_vars.insert("ANTHROPIC_API_KEY".to_string(), key);
                }
                if let Some(model) = decrypted.model {
                    env_vars.insert("ANTHROPIC_MODEL".to_string(), model);
                }
                if let Some(small) = decrypted.small_model {
                    env_vars.insert("ANTHROPIC_SMALL_FAST_MODEL".to_string(), small);
                }
            }
        }
    }
    env_vars
}

fn execute_task(app: AppHandle, task: CronTask) {
    let run_id = generate_id("run");
    let started_at = chrono::Utc::now().to_rfc3339();

    let run = CronTaskRun {
        id: run_id.clone(),
        task_id: task.id.clone(),
        started_at: started_at.clone(),
        finished_at: None,
        exit_code: None,
        stdout: String::new(),
        stderr: String::new(),
        duration_ms: None,
        status: "running".to_string(),
    };

    let _ = append_run(&task.id, run.clone());
    let _ = app.emit("cron-task-started", &run);

    let env_vars = build_env_vars(&task.env_name);
    let start = std::time::Instant::now();

    // Expand PATH to include common Node.js/nvm/fnm/volta install locations
    // since Tauri processes don't inherit the user's shell PATH
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/default".to_string());
    let current_path = std::env::var("PATH").unwrap_or_default();
    let mut extra_paths: Vec<String> = vec![
        format!("{home}/.volta/bin"),
        format!("{home}/.npm-global/bin"),
        format!("{home}/.local/bin"),
        "/usr/local/bin".to_string(),
        "/opt/homebrew/bin".to_string(),
    ];
    // Resolve nvm/fnm glob-like paths: pick the latest version directory
    for pattern_dir in &[
        format!("{home}/.nvm/versions/node"),
        format!("{home}/.fnm/node-versions"),
    ] {
        if let Ok(entries) = std::fs::read_dir(pattern_dir) {
            let mut versions: Vec<std::path::PathBuf> = entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| p.is_dir())
                .collect();
            versions.sort();
            if let Some(latest) = versions.last() {
                // nvm: node/<version>/bin, fnm: <version>/installation/bin
                let bin = latest.join("bin");
                let fnm_bin = latest.join("installation/bin");
                if bin.exists() {
                    extra_paths.insert(0, bin.to_string_lossy().to_string());
                } else if fnm_bin.exists() {
                    extra_paths.insert(0, fnm_bin.to_string_lossy().to_string());
                }
            }
        }
    }
    let expanded_path = format!("{}:{}", extra_paths.join(":"), current_path);

    let working_dir = if task.working_dir.starts_with('~') {
        task.working_dir.replacen('~', &home, 1)
    } else {
        task.working_dir.clone()
    };

    let mut cmd = Command::new("claude");
    cmd.arg("-p").arg(&task.prompt);
    cmd.current_dir(&working_dir);
    cmd.envs(&env_vars);
    cmd.env("PATH", &expanded_path);
    // Remove CLAUDECODE env var to avoid "nested session" detection
    cmd.env_remove("CLAUDECODE");

    // Capture stdout and stderr separately
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let child_result = cmd.spawn();

    let (status_str, exit_code, stdout, stderr) = match child_result {
        Ok(mut child) => {
            let timeout = Duration::from_secs(task.timeout_secs);
            let poll_interval = Duration::from_millis(500);
            let mut elapsed = Duration::ZERO;

            // Poll for completion with timeout
            loop {
                match child.try_wait() {
                    Ok(Some(exit_status)) => {
                        // Process finished
                        let code = exit_status.code();
                        let out = child
                            .stdout
                            .take()
                            .map(|mut s| {
                                let mut buf = String::new();
                                use std::io::Read;
                                let _ = s.read_to_string(&mut buf);
                                buf
                            })
                            .unwrap_or_default();
                        let err = child
                            .stderr
                            .take()
                            .map(|mut s| {
                                let mut buf = String::new();
                                use std::io::Read;
                                let _ = s.read_to_string(&mut buf);
                                buf
                            })
                            .unwrap_or_default();
                        let st = if code == Some(0) { "success" } else { "failed" };
                        break (st.to_string(), code, out, err);
                    }
                    Ok(None) => {
                        // Still running
                        if elapsed >= timeout {
                            let _ = child.kill();
                            let _ = child.wait(); // reap
                            break (
                                "timeout".to_string(),
                                None,
                                String::new(),
                                format!("Task timed out after {} seconds", task.timeout_secs),
                            );
                        }
                        thread::sleep(poll_interval);
                        elapsed += poll_interval;
                    }
                    Err(e) => {
                        break (
                            "failed".to_string(),
                            None,
                            String::new(),
                            format!("Error waiting for process: {}", e),
                        );
                    }
                }
            }
        }
        Err(e) => (
            "failed".to_string(),
            None,
            String::new(),
            format!("Failed to spawn claude: {}", e),
        ),
    };

    let duration_ms = start.elapsed().as_millis() as u64;
    let finished_at = chrono::Utc::now().to_rfc3339();

    let _ = update_run(&task.id, &run_id, |r| {
        r.status = status_str.clone();
        r.exit_code = exit_code;
        r.stdout = stdout.clone();
        r.stderr = stderr.clone();
        r.duration_ms = Some(duration_ms);
        r.finished_at = Some(finished_at.clone());
    });

    let finished_run = CronTaskRun {
        id: run_id,
        task_id: task.id.clone(),
        started_at,
        finished_at: Some(finished_at),
        exit_code,
        stdout,
        stderr,
        duration_ms: Some(duration_ms),
        status: status_str,
    };

    let event_name = if finished_run.status == "success" {
        "cron-task-completed"
    } else {
        "cron-task-failed"
    };
    let _ = app.emit(event_name, &finished_run);
}

// ============================================================================
// Scheduler
// ============================================================================

pub struct CronScheduler {
    last_fired: Mutex<HashMap<String, i64>>,
}

impl Default for CronScheduler {
    fn default() -> Self {
        Self {
            last_fired: Mutex::new(HashMap::new()),
        }
    }
}

pub fn start_cron_scheduler(app: AppHandle, scheduler: Arc<CronScheduler>) {
    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(30));

            let tasks = match read_tasks() {
                Ok(t) => t,
                Err(_) => continue,
            };

            let now = chrono::Local::now();
            // Minute-level timestamp for dedup
            let minute_ts = now.timestamp() / 60;

            for task in &tasks {
                if !task.enabled {
                    continue;
                }
                if task.trigger_type != "schedule" {
                    continue;
                }
                if !cron_matches(&task.cron_expression, &now) {
                    continue;
                }

                // Dedup: skip if already fired this minute
                {
                    let mut map = scheduler.last_fired.lock().unwrap();
                    if let Some(&last) = map.get(&task.id) {
                        if last == minute_ts {
                            continue;
                        }
                    }
                    map.insert(task.id.clone(), minute_ts);
                }

                // Execute in a separate thread
                let app_clone = app.clone();
                let task_clone = task.clone();
                thread::spawn(move || {
                    execute_task(app_clone, task_clone);
                });
            }
        }
    });
}

// ============================================================================
// Built-in templates
// ============================================================================

fn get_builtin_templates() -> Vec<CronTemplate> {
    vec![
        CronTemplate {
            id: "code-review".to_string(),
            name: "Code Review".to_string(),
            description: "Review recent git changes and provide feedback".to_string(),
            cron_expression: "0 9 * * 1-5".to_string(),
            prompt: "Review the git diff of the last 24 hours. Summarize changes, highlight potential issues, and suggest improvements.".to_string(),
            icon: "GitPullRequest".to_string(),
        },
        CronTemplate {
            id: "test-runner".to_string(),
            name: "Test Runner".to_string(),
            description: "Run test suite and report results".to_string(),
            cron_expression: "0 */4 * * *".to_string(),
            prompt: "Run the project test suite. Report any failures with details and suggest fixes for broken tests.".to_string(),
            icon: "TestTube".to_string(),
        },
        CronTemplate {
            id: "doc-gen".to_string(),
            name: "Documentation Generator".to_string(),
            description: "Generate or update project documentation".to_string(),
            cron_expression: "0 18 * * 5".to_string(),
            prompt: "Scan the codebase for undocumented or poorly documented public APIs. Generate or update documentation for them.".to_string(),
            icon: "FileText".to_string(),
        },
        CronTemplate {
            id: "security-scan".to_string(),
            name: "Security Scan".to_string(),
            description: "Scan for security vulnerabilities".to_string(),
            cron_expression: "0 3 * * 1".to_string(),
            prompt: "Perform a security review of the codebase. Check for common vulnerabilities, outdated dependencies, and exposed secrets.".to_string(),
            icon: "Shield".to_string(),
        },
        CronTemplate {
            id: "changelog".to_string(),
            name: "Changelog Generator".to_string(),
            description: "Generate changelog from recent commits".to_string(),
            cron_expression: "0 17 * * 5".to_string(),
            prompt: "Analyze git commits since the last tag or the past week. Generate a well-formatted changelog grouped by category (features, fixes, chores).".to_string(),
            icon: "ScrollText".to_string(),
        },
    ]
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub fn list_cron_tasks() -> Result<Vec<CronTask>, String> {
    read_tasks()
}

#[tauri::command]
pub fn add_cron_task(
    name: String,
    cron_expression: String,
    prompt: String,
    working_dir: String,
    env_name: Option<String>,
    timeout_secs: Option<u64>,
    template_id: Option<String>,
) -> Result<CronTask, String> {
    // Validate cron expression (must be 5 fields)
    let fields: Vec<&str> = cron_expression.split_whitespace().collect();
    if fields.len() != 5 {
        return Err(
            "Invalid cron expression: must have exactly 5 fields (minute hour day month weekday)"
                .to_string(),
        );
    }

    let now = chrono::Utc::now().to_rfc3339();
    let task = CronTask {
        id: generate_id("cron"),
        name,
        cron_expression,
        prompt,
        working_dir,
        env_name,
        enabled: true,
        timeout_secs: timeout_secs.unwrap_or(300),
        template_id,
        trigger_type: "schedule".to_string(),
        parent_task_id: None,
        created_at: now.clone(),
        updated_at: now,
    };

    let mut tasks = read_tasks()?;
    tasks.push(task.clone());
    write_tasks(&tasks)?;

    Ok(task)
}

#[tauri::command]
pub fn update_cron_task(
    id: String,
    name: Option<String>,
    cron_expression: Option<String>,
    prompt: Option<String>,
    working_dir: Option<String>,
    env_name: Option<String>,
    timeout_secs: Option<u64>,
) -> Result<CronTask, String> {
    let mut tasks = read_tasks()?;
    let task = tasks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("Task not found: {}", id))?;

    if let Some(v) = name {
        task.name = v;
    }
    if let Some(v) = cron_expression {
        let fields: Vec<&str> = v.split_whitespace().collect();
        if fields.len() != 5 {
            return Err("Invalid cron expression: must have exactly 5 fields".to_string());
        }
        task.cron_expression = v;
    }
    if let Some(v) = prompt {
        task.prompt = v;
    }
    if let Some(v) = working_dir {
        task.working_dir = v;
    }
    // env_name: always update (allows clearing by passing null from frontend)
    task.env_name = env_name;
    if let Some(v) = timeout_secs {
        task.timeout_secs = v;
    }
    task.updated_at = chrono::Utc::now().to_rfc3339();

    let updated = task.clone();
    write_tasks(&tasks)?;
    Ok(updated)
}

#[tauri::command]
pub fn delete_cron_task(id: String) -> Result<(), String> {
    let mut tasks = read_tasks()?;
    let before = tasks.len();
    tasks.retain(|t| t.id != id);
    if tasks.len() == before {
        return Err(format!("Task not found: {}", id));
    }
    write_tasks(&tasks)?;

    // Also clean up runs file
    let runs_path = get_runs_path(&id);
    if runs_path.exists() {
        let _ = fs::remove_file(runs_path);
    }

    Ok(())
}

#[tauri::command]
pub fn toggle_cron_task(id: String) -> Result<CronTask, String> {
    let mut tasks = read_tasks()?;
    let task = tasks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("Task not found: {}", id))?;

    task.enabled = !task.enabled;
    task.updated_at = chrono::Utc::now().to_rfc3339();

    let toggled = task.clone();
    write_tasks(&tasks)?;
    Ok(toggled)
}

#[tauri::command]
pub fn get_cron_task_runs(task_id: String) -> Result<Vec<CronTaskRun>, String> {
    read_runs(&task_id)
}

#[tauri::command]
pub fn retry_cron_task(id: String, app: AppHandle) -> Result<(), String> {
    let tasks = read_tasks()?;
    let task = tasks
        .iter()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("Task not found: {}", id))?
        .clone();

    let app_clone = app.clone();
    thread::spawn(move || {
        execute_task(app_clone, task);
    });

    Ok(())
}

#[tauri::command]
pub fn get_cron_run_detail(task_id: String, run_id: String) -> Result<CronTaskRun, String> {
    let runs = read_runs(&task_id)?;
    runs.into_iter()
        .find(|r| r.id == run_id)
        .ok_or_else(|| format!("Run not found: {}", run_id))
}

#[tauri::command]
pub fn list_cron_templates() -> Vec<CronTemplate> {
    get_builtin_templates()
}

#[tauri::command]
pub fn get_cron_next_runs(
    cron_expression: String,
    count: Option<usize>,
) -> Result<Vec<String>, String> {
    let fields: Vec<&str> = cron_expression.split_whitespace().collect();
    if fields.len() != 5 {
        return Err("Invalid cron expression: must have exactly 5 fields".to_string());
    }
    Ok(next_runs(&cron_expression, count.unwrap_or(5)))
}

// ============================================================================
// AI-assisted cron task generation (streaming)
// ============================================================================

/// Resolve the user's full login-shell PATH so we can find the `claude` binary.
fn get_user_path() -> String {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = Command::new(&shell)
        .args(["-li", "-c", "echo $PATH"])
        .output();

    match output {
        Ok(out) if out.status.success() => String::from_utf8_lossy(&out.stdout).trim().to_string(),
        _ => std::env::var("PATH").unwrap_or_default(),
    }
}

#[tauri::command]
pub fn generate_cron_task_stream(app: AppHandle, query: String) {
    thread::spawn(move || {
        let prompt = format!(
            "用户想创建一个定时任务: {}\n\n\
             请根据用户描述，生成一个 cron 任务配置。返回一个 JSON 对象（不要包含在 markdown 代码块中）：\n\
             {{\n\
               \"name\": \"简短的任务名称\",\n\
               \"cronExpression\": \"标准5字段cron表达式\",\n\
               \"prompt\": \"要发送给 Claude Code 执行的详细 prompt\",\n\
               \"workingDir\": \"建议的工作目录，如果用户没指定则用 ~\"\n\
             }}\n\n\
             注意：\n\
             - cronExpression 使用标准 5 字段: 分 时 日 月 周\n\
             - prompt 应该是详细的、可直接执行的指令\n\
             - 只返回 JSON，不要其他内容",
            query
        );

        let user_path = get_user_path();
        let mut cmd = Command::new("claude");
        cmd.args(["-p", &prompt, "--output-format", "stream-json", "--verbose"])
            .env("PATH", &user_path)
            .env_remove("CLAUDECODE")
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        // Set working directory to avoid running in `/`
        if let Some(dir) = config::get_default_working_dir() {
            cmd.current_dir(&dir);
        } else if let Some(home) = dirs::home_dir() {
            cmd.current_dir(home);
        }

        // Inject current environment's API config
        if let Ok(cfg) = config::read_config() {
            if let Some(env_name) = &cfg.current {
                if let Some(env) = cfg.registries.get(env_name) {
                    let decrypted = config::get_env_with_decrypted_key(env);
                    if let Some(url) = &decrypted.base_url {
                        cmd.env("ANTHROPIC_BASE_URL", url);
                    }
                    if let Some(key) = &decrypted.api_key {
                        cmd.env("ANTHROPIC_API_KEY", key);
                    }
                    if let Some(model) = &decrypted.model {
                        cmd.env("ANTHROPIC_MODEL", model);
                    }
                    if let Some(small) = &decrypted.small_model {
                        cmd.env("ANTHROPIC_SMALL_FAST_MODEL", small);
                    }
                }
            }
        }

        let child = cmd.spawn();
        match child {
            Ok(mut process) => {
                if let Some(stdout) = process.stdout.take() {
                    let reader = std::io::BufReader::new(stdout);
                    for line in reader.lines() {
                        match line {
                            Ok(l) if !l.trim().is_empty() => {
                                let _ = app.emit("cron-ai-stream", &l);
                            }
                            _ => {}
                        }
                    }
                }
                let _ = process.wait();
                let _ = app.emit("cron-ai-done", ());
            }
            Err(e) => {
                let _ = app.emit(
                    "cron-ai-stream",
                    &serde_json::json!({"type":"error","error":format!("Failed to start claude CLI: {}",e)}).to_string(),
                );
                let _ = app.emit("cron-ai-done", ());
            }
        }
    });
}
