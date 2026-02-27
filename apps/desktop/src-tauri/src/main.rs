// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod analytics;
mod config;
mod cron;
mod crypto;
mod history;
mod session;
mod terminal;
mod skills;
mod tray;

use analytics::{get_usage_stats, get_usage_history, get_continuous_usage_days};
use history::{get_conversation_history, get_conversation_messages, get_conversation_segments};
use config::{EnvConfig, get_env_with_decrypted_key, create_env_with_encrypted_key, AppConfig, FavoriteProject, RecentProject, VSCodeProject, JetBrainsProject, DesktopSettings};
use cron::{CronScheduler, start_cron_scheduler};
use session::{Session, SessionManager, start_session_monitor, cleanup_exit_file, cleanup_stale_exit_files_except};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::collections::HashMap;
use std::process::Command;

/// Global flag: when true, CloseRequested should NOT be intercepted.
static FORCE_QUIT: AtomicBool = AtomicBool::new(false);
use tauri::{Manager, State, WindowEvent};
use terminal::{TerminalInfo, TerminalType, ArrangeLayout, ArrangeSessionInfo};
use tray::create_tray;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
struct LoadedEnv {
    name: String,
    original_name: String,
    renamed: bool,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
struct LoadResult {
    count: usize,
    environments: Vec<LoadedEnv>,
}

fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    format!("session-{}", timestamp)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to CCEM Desktop.", name)
}

#[tauri::command]
fn get_environments() -> Result<HashMap<String, EnvConfig>, String> {
    let cfg = config::read_config()?;
    let decrypted: HashMap<String, EnvConfig> = cfg
        .registries
        .iter()
        .map(|(k, v)| (k.clone(), config::get_env_with_decrypted_key(v)))
        .collect();
    Ok(decrypted)
}

#[tauri::command]
fn get_current_env() -> Result<String, String> {
    let cfg = config::read_config()?;
    Ok(cfg.current.unwrap_or_else(|| "official".to_string()))
}

#[tauri::command]
fn set_current_env(name: String) -> Result<(), String> {
    let mut cfg = config::read_config()?;
    cfg.current = Some(name);
    config::write_config(&cfg)
}

#[tauri::command]
fn add_environment(
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' already exists", name));
    }

    let env_config = create_env_with_encrypted_key(
        Some(base_url),
        api_key,
        Some(model),
        small_model,
    );

    cfg.registries.insert(name, env_config);
    config::write_config(&cfg)
}

#[tauri::command]
fn update_environment(
    old_name: String,
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if !cfg.registries.contains_key(&old_name) {
        return Err(format!("Environment '{}' does not exist", old_name));
    }

    // If renaming, check that new name doesn't conflict
    if old_name != name && cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' already exists", name));
    }

    let env_config = create_env_with_encrypted_key(
        Some(base_url),
        api_key,
        Some(model),
        small_model,
    );

    // Remove old key if renamed
    if old_name != name {
        cfg.registries.remove(&old_name);
        // Update current env pointer if it was pointing to the old name
        if cfg.current.as_ref() == Some(&old_name) {
            cfg.current = Some(name.clone());
        }
    }

    cfg.registries.insert(name, env_config);
    config::write_config(&cfg)
}

#[tauri::command]
fn delete_environment(name: String) -> Result<(), String> {
    if name == "official" {
        return Err("Cannot delete the 'official' environment".to_string());
    }

    let mut cfg = config::read_config()?;

    if !cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
    }

    cfg.registries.remove(&name);

    if cfg.current.as_ref() == Some(&name) {
        cfg.current = Some("official".to_string());
    }

    config::write_config(&cfg)
}

// ============================================
// App Config Commands (Favorites & Recent)
// ============================================

#[tauri::command]
fn get_app_config() -> Result<AppConfig, String> {
    config::read_app_config()
}

#[tauri::command]
fn add_favorite(path: String, name: String) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    // Don't add if already exists
    if cfg.favorites.iter().any(|f| f.path == path) {
        return Ok(());
    }
    cfg.favorites.push(FavoriteProject { path, name });
    config::write_app_config(&cfg)
}

#[tauri::command]
fn remove_favorite(path: String) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    cfg.favorites.retain(|f| f.path != path);
    config::write_app_config(&cfg)
}

#[tauri::command]
fn add_recent(path: String) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    // Remove if already exists (will re-add at front)
    cfg.recent.retain(|r| r.path != path);
    // Add to front
    cfg.recent.insert(0, RecentProject {
        path,
        last_used: chrono::Utc::now().to_rfc3339(),
    });
    // Keep max 10
    cfg.recent.truncate(10);
    config::write_app_config(&cfg)
}

// ============================================
// Terminal Management Commands
// ============================================

#[tauri::command]
fn detect_terminals() -> Vec<TerminalInfo> {
    terminal::detect_terminals()
}

#[tauri::command]
fn get_preferred_terminal() -> TerminalType {
    terminal::get_preferred_terminal()
}

#[tauri::command]
fn set_preferred_terminal(terminal_type: TerminalType) -> Result<(), String> {
    terminal::set_preferred_terminal(terminal_type)
}

// ============================================
// Claude Code Launch Commands
// ============================================

#[tauri::command]
fn launch_claude_code(
    state: State<Arc<SessionManager>>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
    resume_session_id: Option<String>,
) -> Result<Session, String> {
    println!("=== launch_claude_code called ===");
    println!("env_name: {}, perm_mode: {:?}, working_dir: {:?}, resume_session_id: {:?}", env_name, perm_mode, working_dir, resume_session_id);

    // Read environment configuration
    let cfg = config::read_config()?;
    println!("Config loaded, registries count: {}", cfg.registries.len());
    let env_config = cfg.registries.get(&env_name).map(get_env_with_decrypted_key);

    // Build environment variables map
    let mut env_vars: HashMap<String, String> = HashMap::new();
    if let Some(env) = env_config {
        if let Some(url) = env.base_url {
            env_vars.insert("ANTHROPIC_BASE_URL".to_string(), url);
        }
        if let Some(key) = env.api_key {
            env_vars.insert("ANTHROPIC_API_KEY".to_string(), key);
        }
        if let Some(model) = env.model {
            env_vars.insert("ANTHROPIC_MODEL".to_string(), model);
        }
        if let Some(small_model) = env.small_model {
            env_vars.insert("ANTHROPIC_SMALL_FAST_MODEL".to_string(), small_model);
        }
    }

    let work_dir = working_dir.clone().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "~".to_string())
    });

    let perm = perm_mode.clone().unwrap_or_else(|| "dev".to_string());

    // Generate session ID first (needed for exit status tracking)
    let session_id = generate_session_id();

    println!("Session ID: {}", session_id);
    println!("Work dir: {}", work_dir);
    println!("Env vars count: {}", env_vars.len());

    // Get preferred terminal and launch
    let preferred_terminal = terminal::get_preferred_terminal();
    println!("Preferred terminal: {:?}", preferred_terminal);

    let launch_result = terminal::launch_in_terminal(
        preferred_terminal,
        env_vars,
        &work_dir,
        &session_id,
        &env_name,
        perm_mode.as_deref(),
        resume_session_id.as_deref(),
    );

    let (window_id, iterm_session_id) = match &launch_result {
        Ok((wid, sid)) => {
            println!("Terminal launch SUCCESS, window_id: {:?}, iterm_session_id: {:?}", wid, sid);
            (wid.clone(), sid.clone())
        }
        Err(e) => {
            println!("Terminal launch FAILED: {}", e);
            return Err(e.clone());
        }
    };

    // Determine terminal type string for session metadata
    let terminal_type_str = match preferred_terminal {
        TerminalType::ITerm2 => "iterm2",
        TerminalType::TerminalApp => "terminalapp",
    };

    let session = Session {
        id: session_id,
        pid: None, // Terminal-launched sessions don't have direct PID access
        env_name,
        perm_mode: perm,
        working_dir: work_dir,
        start_time: chrono::Utc::now().to_rfc3339(),
        status: "running".to_string(),
        terminal_type: Some(terminal_type_str.to_string()),
        window_id,  // Store window ID for later operations
        iterm_session_id, // Store iTerm2 session unique ID for arrange
    };

    state.add_session(session.clone());
    Ok(session)
}

#[tauri::command]
fn list_sessions(state: State<Arc<SessionManager>>) -> Vec<Session> {
    state.list_sessions()
}

#[tauri::command]
fn stop_session(state: State<Arc<SessionManager>>, session_id: String) -> Result<(), String> {
    let session = state.get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    if let Some(pid) = session.pid {
        #[cfg(unix)]
        {
            Command::new("kill")
                .arg("-15")
                .arg(pid.to_string())
                .output()
                .map_err(|e| format!("Failed to stop process: {}", e))?;
        }

        #[cfg(windows)]
        {
            Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output()
                .map_err(|e| format!("Failed to stop process: {}", e))?;
        }
    }

    state.update_session_status(&session_id, "stopped");
    Ok(())
}

#[tauri::command]
fn remove_session(state: State<Arc<SessionManager>>, session_id: String) {
    // Clean up exit file when removing session
    cleanup_exit_file(&session_id);
    state.remove_session(&session_id);
}

#[tauri::command]
fn focus_session(state: State<Arc<SessionManager>>, session_id: String) -> Result<(), String> {
    let session = state.get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    let terminal_type = session.terminal_type.as_ref()
        .ok_or("Session has no terminal type")?;
    let window_id = session.window_id.as_ref()
        .ok_or("Session has no window ID")?;

    let term_type = match terminal_type.as_str() {
        "iterm2" => TerminalType::ITerm2,
        "terminalapp" => TerminalType::TerminalApp,
        _ => return Err(format!("Unknown terminal type: {}", terminal_type)),
    };

    terminal::focus_terminal_window(term_type, window_id)
}

#[tauri::command]
fn close_session(state: State<Arc<SessionManager>>, session_id: String) -> Result<(), String> {
    let session = state.get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    let terminal_type = session.terminal_type.as_ref()
        .ok_or("Session has no terminal type")?;
    let window_id = session.window_id.as_ref()
        .ok_or("Session has no window ID")?;

    let term_type = match terminal_type.as_str() {
        "iterm2" => TerminalType::ITerm2,
        "terminalapp" => TerminalType::TerminalApp,
        _ => return Err(format!("Unknown terminal type: {}", terminal_type)),
    };

    terminal::close_terminal_session(term_type, window_id)?;

    // Clean up and remove session after closing
    cleanup_exit_file(&session_id);
    state.remove_session(&session_id);
    Ok(())
}

#[tauri::command]
fn minimize_session(state: State<Arc<SessionManager>>, session_id: String) -> Result<(), String> {
    let session = state.get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    let terminal_type = session.terminal_type.as_ref()
        .ok_or("Session has no terminal type")?;
    let window_id = session.window_id.as_ref()
        .ok_or("Session has no window ID")?;

    let term_type = match terminal_type.as_str() {
        "iterm2" => TerminalType::ITerm2,
        "terminalapp" => TerminalType::TerminalApp,
        _ => return Err(format!("Unknown terminal type: {}", terminal_type)),
    };

    terminal::minimize_terminal_window(term_type, window_id)
}

// ============================================
// Arrange Windows Commands
// ============================================

#[derive(Debug, serde::Deserialize)]
struct ArrangeRequest {
    session_ids: Vec<String>,
    layout: ArrangeLayout,
}

#[tauri::command]
fn arrange_sessions(
    state: State<Arc<SessionManager>>,
    request: ArrangeRequest,
) -> Result<String, String> {
    let sessions = state.list_sessions();

    // Collect the requested sessions, verify they're running
    let mut arrange_infos: Vec<ArrangeSessionInfo> = Vec::new();
    let mut terminal_type: Option<TerminalType> = None;

    for sid in &request.session_ids {
        let session = sessions.iter().find(|s| &s.id == sid)
            .ok_or_else(|| format!("Session not found: {}", sid))?;

        if session.status != "running" {
            return Err(format!("Session {} is not running", sid));
        }

        let term_type_str = session.terminal_type.as_ref()
            .ok_or_else(|| format!("Session {} has no terminal type", sid))?;
        let term_type = match term_type_str.as_str() {
            "iterm2" => TerminalType::ITerm2,
            "terminalapp" => TerminalType::TerminalApp,
            _ => return Err(format!("Unknown terminal type: {}", term_type_str)),
        };

        // All sessions must be the same terminal type
        if let Some(ref expected) = terminal_type {
            if *expected != term_type {
                return Err("Cannot arrange sessions from different terminal types".to_string());
            }
        } else {
            terminal_type = Some(term_type);
        }

        let window_id = session.window_id.clone()
            .ok_or_else(|| format!("Session {} has no window ID", sid))?;

        // For iTerm2, try to get session ID (backfill if missing)
        let iterm_session_id = if term_type == TerminalType::ITerm2 {
            match &session.iterm_session_id {
                Some(id) => Some(id.clone()),
                None => {
                    // Try to backfill from iTerm2
                    match terminal::get_iterm_session_id(&window_id) {
                        Ok(id) => {
                            // Update the session manager with the backfilled ID
                            state.update_session_iterm_id(sid, &id);
                            Some(id)
                        }
                        Err(e) => {
                            eprintln!("Warning: could not backfill iTerm2 session ID for {}: {}", sid, e);
                            None
                        }
                    }
                }
            }
        } else {
            None
        };

        arrange_infos.push(ArrangeSessionInfo {
            window_id,
            iterm_session_id,
        });
    }

    let term = terminal_type.ok_or("No sessions to arrange")?;

    // Perform the arrangement
    let result = terminal::arrange_sessions(term, &arrange_infos, &request.layout)?;

    // For iTerm2, update all sessions with the new shared window ID
    if term == TerminalType::ITerm2 && result != "arranged" {
        for sid in &request.session_ids {
            state.update_session_window_id(sid, &result);
        }
    }

    Ok(result)
}

#[tauri::command]
fn check_arrange_support() -> Result<bool, String> {
    terminal::check_arrange_support()
}

// ============================================
// Directory & VS Code Sync Commands
// ======================================================

#[tauri::command]
async fn open_directory_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path.map(|p| p.to_string()));
        });

    rx.recv()
        .map_err(|e| format!("Dialog error: {}", e))
}

#[tauri::command]
fn sync_vscode_projects() -> Result<Vec<VSCodeProject>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let storage_path = home
        .join("Library/Application Support/Code/User/globalStorage/storage.json");

    if !storage_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read VS Code storage: {}", e))?;

    // Parse the JSON
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse VS Code storage: {}", e))?;

    let mut projects = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Helper function to recursively extract openRecentFolder items
    fn extract_recent_folders(
        value: &serde_json::Value,
        projects: &mut Vec<VSCodeProject>,
        seen_paths: &mut std::collections::HashSet<String>,
        now: &str,
    ) {
        match value {
            serde_json::Value::Object(map) => {
                // Check if this is an openRecentFolder entry with uri.path
                if let Some(id) = map.get("id").and_then(|v| v.as_str()) {
                    if id == "openRecentFolder" {
                        if let Some(path) = map
                            .get("uri")
                            .and_then(|u| u.get("path"))
                            .and_then(|p| p.as_str())
                        {
                            if !seen_paths.contains(path) {
                                seen_paths.insert(path.to_string());
                                projects.push(VSCodeProject {
                                    path: path.to_string(),
                                    synced_at: now.to_string(),
                                });
                            }
                        }
                    }
                }
                // Recurse into all values
                for v in map.values() {
                    extract_recent_folders(v, projects, seen_paths, now);
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr {
                    extract_recent_folders(item, projects, seen_paths, now);
                }
            }
            _ => {}
        }
    }

    extract_recent_folders(&json, &mut projects, &mut seen_paths, &now);

    // Update app config with synced projects
    let mut cfg = config::read_app_config()?;
    cfg.vscode_projects = projects.clone();
    config::write_app_config(&cfg)?;

    Ok(projects)
}

#[tauri::command]
fn sync_jetbrains_projects() -> Result<Vec<JetBrainsProject>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let jetbrains_dir = home.join("Library/Application Support/JetBrains");

    if !jetbrains_dir.exists() {
        return Ok(vec![]);
    }

    let mut projects = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Map directory prefixes to IDE names
    let ide_prefixes = [
        ("WebStorm", "WebStorm"),
        ("IntelliJIdea", "IntelliJ IDEA"),
        ("PyCharm", "PyCharm"),
        ("GoLand", "GoLand"),
        ("RustRover", "RustRover"),
        ("CLion", "CLion"),
        ("PhpStorm", "PhpStorm"),
        ("Rider", "Rider"),
        ("DataGrip", "DataGrip"),
        ("RubyMine", "RubyMine"),
        ("AppCode", "AppCode"),
        ("AndroidStudio", "Android Studio"),
    ];

    // Iterate through JetBrains directories
    if let Ok(entries) = std::fs::read_dir(&jetbrains_dir) {
        for entry in entries.flatten() {
            let dir_name = entry.file_name().to_string_lossy().to_string();

            // Find matching IDE
            let ide_name = ide_prefixes
                .iter()
                .find(|(prefix, _)| dir_name.starts_with(prefix))
                .map(|(_, name)| *name);

            if let Some(ide) = ide_name {
                let recent_path = entry.path().join("options/recentProjects.xml");

                if recent_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&recent_path) {
                        // Parse XML to extract project paths
                        extract_jetbrains_projects(&content, ide, &mut projects, &mut seen_paths, &now);
                    }
                }
            }
        }
    }

    // Update app config with synced projects
    let mut cfg = config::read_app_config()?;
    cfg.jetbrains_projects = projects.clone();
    config::write_app_config(&cfg)?;

    Ok(projects)
}

/// Extract project paths from JetBrains recentProjects.xml
fn extract_jetbrains_projects(
    xml_content: &str,
    ide: &str,
    projects: &mut Vec<JetBrainsProject>,
    seen_paths: &mut std::collections::HashSet<String>,
    now: &str,
) {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml_content);

    let mut buf = Vec::new();
    let mut in_recent_project_manager = false;
    let mut in_additional_info = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let name = e.name();
                let name_str = std::str::from_utf8(name.as_ref()).unwrap_or("");

                if name_str == "component" {
                    // Check if this is RecentProjectsManager
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"name" {
                            let value = String::from_utf8_lossy(&attr.value);
                            if value == "RecentProjectsManager" {
                                in_recent_project_manager = true;
                            }
                        }
                    }
                } else if name_str == "map" && in_recent_project_manager {
                    // We're in the additionalInfo map
                    in_additional_info = true;
                } else if name_str == "entry" && in_additional_info {
                    // Extract project path from key attribute
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"key" {
                            let value = String::from_utf8_lossy(&attr.value);
                            // Path format: $USER_HOME$/path/to/project
                            let path = value
                                .replace("$USER_HOME$", &dirs::home_dir()
                                    .map(|p| p.to_string_lossy().to_string())
                                    .unwrap_or_else(|| "~".to_string()));

                            if !seen_paths.contains(&path) && std::path::Path::new(&path).exists() {
                                seen_paths.insert(path.clone());
                                projects.push(JetBrainsProject {
                                    path,
                                    ide: ide.to_string(),
                                    synced_at: now.to_string(),
                                });
                            }
                        }
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name_bytes = e.name();
                let name = std::str::from_utf8(name_bytes.as_ref()).unwrap_or("");
                if name == "component" {
                    in_recent_project_manager = false;
                    in_additional_info = false;
                } else if name == "map" {
                    in_additional_info = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }
}

// ============================================
// Remote Environment Loading Commands
// ============================================

#[tauri::command]
fn check_ccem_installed() -> bool {
    terminal::resolve_ccem_path().is_some()
}

#[derive(Debug, serde::Deserialize)]
struct RemoteResponse {
    encrypted: String,
}

#[derive(Debug, serde::Deserialize)]
struct RemoteEnvConfig {
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    base_url: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_MODEL")]
    model: Option<String>,
    #[serde(rename = "ANTHROPIC_SMALL_FAST_MODEL")]
    small_model: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
struct RemoteEnvironments {
    environments: HashMap<String, RemoteEnvConfig>,
}

#[tauri::command]
fn load_from_remote(url: String, secret: String) -> Result<LoadResult, String> {
    // Path A: try CLI if installed
    if let Some(ccem_path) = terminal::resolve_ccem_path() {
        let output = Command::new(&ccem_path)
            .args(["load", &url, "--secret", &secret])
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                // CLI succeeded — re-read config and build result
                let cfg = config::read_config()?;
                let envs: Vec<LoadedEnv> = cfg.registries.keys().map(|name| LoadedEnv {
                    name: name.clone(),
                    original_name: name.clone(),
                    renamed: false,
                }).collect();
                return Ok(LoadResult {
                    count: envs.len(),
                    environments: envs,
                });
            }
            // CLI failed — fall through to native path
        }
    }

    // Path B: native Rust implementation
    let response = reqwest::blocking::get(&url)
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("Unauthorized: invalid credentials".to_string());
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("Rate limited: please try again later".to_string());
    }
    if !status.is_success() {
        return Err(format!("Server returned HTTP {}", status.as_u16()));
    }

    let remote_resp: RemoteResponse = response.json()
        .map_err(|e| format!("Invalid server response: {}", e))?;

    let decrypted = crypto::decrypt_remote(&remote_resp.encrypted, &secret)?;

    let remote_envs: RemoteEnvironments = serde_json::from_str(&decrypted)
        .map_err(|e| format!("Invalid environment data: {}", e))?;

    let mut cfg = config::read_config()?;
    let mut loaded: Vec<LoadedEnv> = Vec::new();

    for (orig_name, env) in remote_envs.environments {
        // Generate unique name if duplicate
        let mut final_name = orig_name.clone();
        if cfg.registries.contains_key(&final_name) {
            final_name = format!("{}-remote", orig_name);
            let mut counter = 2;
            while cfg.registries.contains_key(&final_name) {
                final_name = format!("{}-remote-{}", orig_name, counter);
                counter += 1;
            }
        }

        let renamed = final_name != orig_name;

        let env_config = create_env_with_encrypted_key(
            env.base_url,
            env.api_key,
            env.model,
            env.small_model,
        );

        cfg.registries.insert(final_name.clone(), env_config);
        loaded.push(LoadedEnv {
            name: final_name,
            original_name: orig_name,
            renamed,
        });
    }

    config::write_config(&cfg)?;

    Ok(LoadResult {
        count: loaded.len(),
        environments: loaded,
    })
}

#[tauri::command]
fn get_default_working_dir() -> Result<Option<String>, String> {
    let cfg = config::read_app_config()?;
    Ok(cfg.default_working_dir)
}

#[tauri::command]
fn set_default_working_dir(path: Option<String>) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    cfg.default_working_dir = path;
    config::write_app_config(&cfg)
}

// ============================================
// Settings Commands
// ============================================

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<DesktopSettings, String> {
    let mut settings = config::read_settings()?;
    // Merge defaultMode from config.json (source of truth for permission mode)
    let cfg = config::read_config()?;
    settings.default_mode = cfg.default_mode;
    // Reflect actual system autostart state
    {
        use tauri_plugin_autostart::ManagerExt;
        let autostart = app.autolaunch();
        if let Ok(enabled) = autostart.is_enabled() {
            settings.auto_start = enabled;
        }
    }
    Ok(settings)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: DesktopSettings) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();

    // Save defaultMode to config.json (shared with CLI)
    match config::read_config() {
        Ok(mut cfg) => {
            cfg.default_mode = settings.default_mode.clone();
            if let Err(e) = config::write_config(&cfg) {
                errors.push(format!("config.json: {}", e));
            }
        }
        Err(e) => errors.push(format!("read config: {}", e)),
    }

    // Sync autostart with system
    {
        use tauri_plugin_autostart::ManagerExt;
        let autostart = app.autolaunch();
        let result = if settings.auto_start {
            autostart.enable()
        } else {
            autostart.disable()
        };
        if let Err(e) = result {
            errors.push(format!("autostart: {}", e));
        }
    }

    // Save desktop-specific settings to settings.json
    config::write_settings(&settings)?;

    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!("Partial save failures: {}", errors.join("; ")))
    }
}

/// Force-quit the app, bypassing closeToTray.
/// Called from frontend Cmd+Q handler.
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    FORCE_QUIT.store(true, Ordering::SeqCst);
    app.exit(0);
}

fn main() {
    // Create SessionManager from persisted sessions (or empty if first run)
    let session_manager = Arc::new(SessionManager::load_from_disk());

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .manage(session_manager.clone())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_environments,
            get_current_env,
            set_current_env,
            add_environment,
            update_environment,
            delete_environment,
            get_app_config,
            add_favorite,
            remove_favorite,
            add_recent,
            detect_terminals,
            get_preferred_terminal,
            set_preferred_terminal,
            launch_claude_code,
            list_sessions,
            stop_session,
            remove_session,
            focus_session,
            close_session,
            minimize_session,
            open_directory_dialog,
            sync_vscode_projects,
            sync_jetbrains_projects,
            get_usage_stats,
            get_usage_history,
            get_continuous_usage_days,
            check_ccem_installed,
            load_from_remote,
            arrange_sessions,
            check_arrange_support,
            get_conversation_history,
            get_conversation_messages,
            get_conversation_segments,
            skills::search_skills_stream,
            skills::list_installed_skills,
            skills::install_skill,
            skills::uninstall_skill,
            cron::list_cron_tasks,
            cron::add_cron_task,
            cron::update_cron_task,
            cron::delete_cron_task,
            cron::toggle_cron_task,
            cron::get_cron_task_runs,
            cron::retry_cron_task,
            cron::get_cron_run_detail,
            cron::list_cron_templates,
            cron::get_cron_next_runs,
            cron::generate_cron_task_stream,
            get_default_working_dir,
            set_default_working_dir,
            get_settings,
            save_settings,
            quit_app
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Only intercept the main window, and never when force-quit is requested
                if window.label() == "main" && !FORCE_QUIT.load(Ordering::SeqCst) {
                    let close_to_tray = config::read_settings()
                        .map(|s| s.close_to_tray)
                        .unwrap_or(true);
                    if close_to_tray {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            }
        })
        .setup(move |app| {
            // Clean up stale exit files not belonging to any persisted session
            cleanup_stale_exit_files_except(&session_manager);

            // Validate persisted sessions against actual terminal state
            session_manager.validate_and_reconcile();

            // Auto-migrate configuration if needed
            if let Err(e) = config::migrate_if_needed() {
                eprintln!("Config migration warning: {}", e);
            }

            // Load desktop settings once for startup logic
            let startup_settings = config::read_settings().unwrap_or_default();

            // Sync autostart state from settings
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart = app.autolaunch();
                if startup_settings.auto_start {
                    let _ = autostart.enable();
                } else {
                    let _ = autostart.disable();
                }
            }

            // Configure macOS overlay titlebar with inset traffic lights + vibrancy
            #[cfg(target_os = "macos")]
            {
                use tauri_plugin_decorum::WebviewWindowExt;
                let main_window = app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();
                // Position traffic lights — offset to align inside the inset sidebar panel
                main_window.set_traffic_lights_inset(24.0, 28.0).unwrap();
                // Make window transparent so vibrancy can show through
                main_window.make_transparent().unwrap();

                // Apply sidebar vibrancy — real NSVisualEffectView
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                apply_vibrancy(&main_window, NSVisualEffectMaterial::Sidebar, None, None)
                    .expect("Failed to apply vibrancy");
            }

            // startMinimized: hide window immediately after setup (platform-independent)
            if startup_settings.start_minimized {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            let _ = create_tray(app.handle())?;

            // Start session monitor background task
            start_session_monitor(app.handle().clone(), session_manager.clone());

            // Start cron scheduler background task
            let cron_scheduler = Arc::new(CronScheduler::default());
            app.manage(cron_scheduler.clone());
            let cron_app = app.handle().clone();
            start_cron_scheduler(cron_app, cron_scheduler);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
