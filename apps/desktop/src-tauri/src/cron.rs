use crate::config;
use crate::event_bus::{ReplayBatch, SessionEventPayload};
use crate::runtime::{HeadlessRuntimeManager, HeadlessSessionOptions, HeadlessSessionSource};
use crate::telegram;
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
    #[serde(rename = "executionProfile", default = "default_execution_profile")]
    pub execution_profile: String,
    #[serde(rename = "maxBudgetUsd", default)]
    pub max_budget_usd: Option<f64>,
    #[serde(rename = "allowedTools", default)]
    pub allowed_tools: Vec<String>,
    #[serde(rename = "disallowedTools", default)]
    pub disallowed_tools: Vec<String>,
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

fn default_execution_profile() -> String {
    "conservative".to_string()
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
    #[serde(rename = "runtimeId", default)]
    pub runtime_id: Option<String>,
    #[serde(rename = "runtimeKind", default)]
    pub runtime_kind: Option<String>,
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
    let resolved_name = match config::read_config() {
        Ok(cfg) => env_name.clone().or(cfg.current),
        Err(_) => env_name.clone(),
    };

    resolved_name
        .as_deref()
        .and_then(|name| config::resolve_claude_env(name).ok())
        .map(|resolved| resolved.env_vars)
        .unwrap_or_default()
}

fn collect_runtime_output(replay: &ReplayBatch) -> (String, String) {
    let mut stdout_lines = Vec::new();
    let mut stderr_lines = Vec::new();

    for event in &replay.events {
        match &event.payload {
            SessionEventPayload::ClaudeJson {
                message_type,
                raw_json,
            } => {
                let parsed = serde_json::from_str::<serde_json::Value>(raw_json).ok();
                match message_type.as_deref() {
                    Some("result") => {
                        let result = parsed
                            .as_ref()
                            .and_then(|value| value.get("result"))
                            .and_then(serde_json::Value::as_str)
                            .map(ToString::to_string)
                            .unwrap_or_else(|| raw_json.clone());
                        stdout_lines.push(result);
                    }
                    Some("error") => {
                        let message = parsed
                            .as_ref()
                            .and_then(|value| value.get("message"))
                            .and_then(serde_json::Value::as_str)
                            .map(ToString::to_string)
                            .unwrap_or_else(|| raw_json.clone());
                        stderr_lines.push(message);
                    }
                    _ => stdout_lines.push(raw_json.clone()),
                }
            }
            SessionEventPayload::StdErrLine { line } => stderr_lines.push(line.clone()),
            SessionEventPayload::Lifecycle { stage, detail } => {
                if matches!(
                    stage.as_str(),
                    "stderr_error" | "stdout_error" | "process_failure"
                ) {
                    stderr_lines.push(format!("[{stage}] {detail}"));
                }
            }
            SessionEventPayload::SessionCompleted { reason } => {
                if reason != "completed" && reason != "stopped" {
                    stderr_lines.push(reason.clone());
                }
            }
            _ => {}
        }
    }

    (stdout_lines.join("\n"), stderr_lines.join("\n"))
}

fn format_cron_notification(task: &CronTask, run: &CronTaskRun) -> String {
    let execution_profile = resolve_execution_profile(&task.execution_profile);
    let mut lines = vec![format!(
        "{} Cron: {}",
        match run.status.as_str() {
            "success" => "✅",
            "running" => "⏳",
            "timeout" => "⏱",
            _ => "❌",
        },
        task.name
    )];
    lines.push(format!("Status: {}", run.status));

    if let Some(runtime_id) = &run.runtime_id {
        lines.push(format!("Runtime: {}", runtime_id));
    }
    lines.push(format!("Schedule: {}", task.cron_expression));
    lines.push(format!("Profile: {}", execution_profile.key));
    lines.push(format!("Working dir: {}", task.working_dir));

    if let Some(duration_ms) = run.duration_ms {
        lines.push(format!("Duration: {:.1}s", duration_ms as f64 / 1000.0));
    }

    if !run.stdout.trim().is_empty() {
        lines.push(String::new());
        lines.push("Output:".to_string());
        lines.push(run.stdout.chars().take(1200).collect());
    }

    if !run.stderr.trim().is_empty() {
        lines.push(String::new());
        lines.push("Errors:".to_string());
        lines.push(run.stderr.chars().take(1200).collect());
    }

    lines.join("\n")
}

#[derive(Debug, Clone)]
struct ExecutionProfilePreset {
    key: &'static str,
    permission_mode: &'static str,
    max_budget_usd: f64,
    allowed_tools: Vec<String>,
}

#[derive(Debug, Clone)]
struct ResolvedToolPolicy {
    permission_mode: String,
    max_budget_usd: f64,
    allowed_tools: Vec<String>,
    disallowed_tools: Vec<String>,
}

fn normalize_execution_profile(value: &str) -> &'static str {
    match value {
        "standard" => "standard",
        "autonomous" => "autonomous",
        _ => "conservative",
    }
}

fn resolve_execution_profile(value: &str) -> ExecutionProfilePreset {
    match normalize_execution_profile(value) {
        "standard" => ExecutionProfilePreset {
            key: "standard",
            permission_mode: "default",
            max_budget_usd: 2.0,
            allowed_tools: vec![
                "Task".to_string(),
                "TaskOutput".to_string(),
                "Read".to_string(),
                "Glob".to_string(),
                "Grep".to_string(),
                "Edit".to_string(),
                "Write".to_string(),
                "TodoWrite".to_string(),
                "Skill".to_string(),
                "Bash".to_string(),
                "WebFetch".to_string(),
                "WebSearch".to_string(),
            ],
        },
        "autonomous" => ExecutionProfilePreset {
            key: "autonomous",
            permission_mode: "bypassPermissions",
            max_budget_usd: 5.0,
            allowed_tools: Vec::new(),
        },
        _ => ExecutionProfilePreset {
            key: "conservative",
            permission_mode: "default",
            max_budget_usd: 0.5,
            allowed_tools: vec![
                "Task".to_string(),
                "TaskOutput".to_string(),
                "Read".to_string(),
                "Glob".to_string(),
                "Grep".to_string(),
                "Edit".to_string(),
                "Write".to_string(),
                "TodoWrite".to_string(),
                "Skill".to_string(),
            ],
        },
    }
}

fn resolve_task_tool_policy(task: &CronTask) -> ResolvedToolPolicy {
    let preset = resolve_execution_profile(&task.execution_profile);
    ResolvedToolPolicy {
        permission_mode: preset.permission_mode.to_string(),
        max_budget_usd: task.max_budget_usd.unwrap_or(preset.max_budget_usd),
        allowed_tools: if task.allowed_tools.is_empty() {
            preset.allowed_tools
        } else {
            task.allowed_tools.clone()
        },
        disallowed_tools: task.disallowed_tools.clone(),
    }
}

fn execute_task(app: AppHandle, runtime_manager: Arc<HeadlessRuntimeManager>, task: CronTask) {
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
        runtime_id: None,
        runtime_kind: Some("headless".to_string()),
    };

    let _ = append_run(&task.id, run.clone());
    let _ = app.emit("cron-task-started", &run);

    let effective_env_name = match config::read_config() {
        Ok(cfg) => task
            .env_name
            .clone()
            .or(cfg.current)
            .unwrap_or_else(|| "official".to_string()),
        Err(_) => task
            .env_name
            .clone()
            .unwrap_or_else(|| "official".to_string()),
    };
    let env_vars = build_env_vars(&task.env_name);
    let tool_policy = resolve_task_tool_policy(&task);
    let start = std::time::Instant::now();
    let mut runtime_id_for_run: Option<String> = None;

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

    let create_result = runtime_manager.create_session(
        app.clone(),
        HeadlessSessionOptions {
            env_name: effective_env_name,
            perm_mode: tool_policy.permission_mode.clone(),
            working_dir,
            resume_session_id: None,
            initial_prompt: Some(task.prompt.clone()),
            max_budget_usd: Some(tool_policy.max_budget_usd),
            allowed_tools: tool_policy.allowed_tools.clone(),
            disallowed_tools: tool_policy.disallowed_tools.clone(),
            env_vars: {
                let mut vars = env_vars;
                vars.insert("PATH".to_string(), expanded_path);
                vars
            },
            source: HeadlessSessionSource::Cron {
                task_id: task.id.clone(),
            },
        },
    );

    let (status_str, exit_code, stdout, stderr) = match create_result {
        Ok(summary) => {
            runtime_id_for_run = Some(summary.runtime_id.clone());
            let _ = update_run(&task.id, &run_id, |r| {
                r.runtime_id = Some(summary.runtime_id.clone());
                r.runtime_kind = Some("headless".to_string());
            });
            let timeout = Duration::from_secs(task.timeout_secs);
            let poll_interval = Duration::from_millis(500);

            loop {
                if start.elapsed() >= timeout {
                    let _ = runtime_manager.stop_session(&app, &summary.runtime_id);
                    let replay = runtime_manager
                        .replay_events(&summary.runtime_id, None)
                        .unwrap_or(ReplayBatch {
                            gap_detected: false,
                            oldest_available_seq: None,
                            newest_available_seq: None,
                            events: Vec::new(),
                        });
                    let (stdout, mut stderr) = collect_runtime_output(&replay);
                    if !stderr.is_empty() {
                        stderr.push('\n');
                    }
                    stderr.push_str(&format!(
                        "Task timed out after {} seconds",
                        task.timeout_secs
                    ));
                    break ("timeout".to_string(), None, stdout, stderr);
                }

                match runtime_manager.summary(&summary.runtime_id) {
                    Some(next_summary)
                        if !next_summary.is_active
                            || matches!(
                                next_summary.status.as_str(),
                                "completed" | "stopped" | "error"
                            ) =>
                    {
                        let replay = runtime_manager
                            .replay_events(&summary.runtime_id, None)
                            .unwrap_or(ReplayBatch {
                                gap_detected: false,
                                oldest_available_seq: None,
                                newest_available_seq: None,
                                events: Vec::new(),
                            });
                        let (stdout, stderr) = collect_runtime_output(&replay);
                        let exit_code = if next_summary.status == "completed" {
                            Some(0)
                        } else {
                            Some(1)
                        };
                        let status = if next_summary.status == "completed" {
                            "success".to_string()
                        } else {
                            "failed".to_string()
                        };
                        break (status, exit_code, stdout, stderr);
                    }
                    Some(_) => {
                        thread::sleep(poll_interval);
                    }
                    None => {
                        break (
                            "failed".to_string(),
                            None,
                            String::new(),
                            format!(
                                "Headless runtime session disappeared before completion: {}",
                                summary.runtime_id
                            ),
                        );
                    }
                }
            }
        }
        Err(error) => (
            "failed".to_string(),
            None,
            String::new(),
            format!("Failed to start headless runtime: {}", error),
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
        if r.runtime_kind.is_none() {
            r.runtime_kind = Some("headless".to_string());
        }
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
        runtime_id: runtime_id_for_run,
        runtime_kind: Some("headless".to_string()),
    };

    let event_name = if finished_run.status == "success" {
        "cron-task-completed"
    } else {
        "cron-task-failed"
    };
    let _ = app.emit(event_name, &finished_run);
    let _ = telegram::send_configured_message(&format_cron_notification(&task, &finished_run));
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

pub fn start_cron_scheduler(
    app: AppHandle,
    scheduler: Arc<CronScheduler>,
    runtime_manager: Arc<HeadlessRuntimeManager>,
) {
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
                let runtime_manager_clone = runtime_manager.clone();
                thread::spawn(move || {
                    execute_task(app_clone, runtime_manager_clone, task_clone);
                });
            }
        }
    });
}

pub fn run_cron_task_now(
    app: AppHandle,
    runtime_manager: Arc<HeadlessRuntimeManager>,
    id: &str,
) -> Result<CronTask, String> {
    let tasks = read_tasks()?;
    let task = tasks
        .iter()
        .find(|task| task.id == id)
        .ok_or_else(|| format!("Task not found: {}", id))?
        .clone();

    let app_clone = app.clone();
    let task_clone = task.clone();
    thread::spawn(move || {
        execute_task(app_clone, runtime_manager, task_clone);
    });

    Ok(task)
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
    execution_profile: Option<String>,
    max_budget_usd: Option<f64>,
    allowed_tools: Option<Vec<String>>,
    disallowed_tools: Option<Vec<String>>,
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
        execution_profile: normalize_execution_profile(
            execution_profile.as_deref().unwrap_or("conservative"),
        )
        .to_string(),
        max_budget_usd,
        allowed_tools: allowed_tools.unwrap_or_default(),
        disallowed_tools: disallowed_tools.unwrap_or_default(),
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
    execution_profile: Option<String>,
    max_budget_usd: Option<f64>,
    allowed_tools: Option<Vec<String>>,
    disallowed_tools: Option<Vec<String>>,
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
    if let Some(v) = execution_profile {
        task.execution_profile = normalize_execution_profile(&v).to_string();
    }
    task.max_budget_usd = max_budget_usd;
    task.allowed_tools = allowed_tools.unwrap_or_default();
    task.disallowed_tools = disallowed_tools.unwrap_or_default();
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
pub fn retry_cron_task(
    id: String,
    app: AppHandle,
    runtime_manager: tauri::State<'_, Arc<HeadlessRuntimeManager>>,
) -> Result<(), String> {
    run_cron_task_now(app, runtime_manager.inner().clone(), &id)?;
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
                    config::clear_managed_claude_env(&mut cmd);
                    for (key, value) in config::build_claude_env_vars(&decrypted) {
                        cmd.env(key, value);
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

#[cfg(test)]
mod tests {
    use super::{
        normalize_execution_profile, resolve_execution_profile, resolve_task_tool_policy, CronTask,
    };

    #[test]
    fn normalize_execution_profile_defaults_unknown_values() {
        assert_eq!(normalize_execution_profile("standard"), "standard");
        assert_eq!(normalize_execution_profile("autonomous"), "autonomous");
        assert_eq!(normalize_execution_profile("unknown"), "conservative");
    }

    #[test]
    fn resolve_execution_profile_maps_budget_and_tools() {
        let conservative = resolve_execution_profile("conservative");
        assert_eq!(conservative.permission_mode, "default");
        assert_eq!(conservative.max_budget_usd, 0.5);
        assert!(conservative.allowed_tools.contains(&"Read".to_string()));
        assert!(!conservative.allowed_tools.contains(&"Bash".to_string()));

        let standard = resolve_execution_profile("standard");
        assert_eq!(standard.permission_mode, "default");
        assert_eq!(standard.max_budget_usd, 2.0);
        assert!(standard.allowed_tools.contains(&"Bash".to_string()));
        assert!(standard.allowed_tools.contains(&"WebSearch".to_string()));

        let autonomous = resolve_execution_profile("autonomous");
        assert_eq!(autonomous.permission_mode, "bypassPermissions");
        assert_eq!(autonomous.max_budget_usd, 5.0);
        assert!(autonomous.allowed_tools.is_empty());
    }

    #[test]
    fn resolve_task_tool_policy_prefers_task_overrides() {
        let task = CronTask {
            id: "cron-1".to_string(),
            name: "Example".to_string(),
            cron_expression: "0 9 * * 1-5".to_string(),
            prompt: "Do work".to_string(),
            working_dir: "/tmp".to_string(),
            env_name: Some("glm".to_string()),
            execution_profile: "standard".to_string(),
            max_budget_usd: Some(9.5),
            allowed_tools: vec!["Read".to_string(), "Bash".to_string()],
            disallowed_tools: vec!["WebSearch".to_string()],
            enabled: true,
            timeout_secs: 300,
            template_id: None,
            trigger_type: "schedule".to_string(),
            parent_task_id: None,
            created_at: "2026-03-08T00:00:00Z".to_string(),
            updated_at: "2026-03-08T00:00:00Z".to_string(),
        };

        let resolved = resolve_task_tool_policy(&task);
        assert_eq!(resolved.permission_mode, "default");
        assert_eq!(resolved.max_budget_usd, 9.5);
        assert_eq!(
            resolved.allowed_tools,
            vec!["Read".to_string(), "Bash".to_string()]
        );
        assert_eq!(resolved.disallowed_tools, vec!["WebSearch".to_string()]);
    }
}
