// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod crypto;
mod session;
mod terminal;
mod tray;

use config::{EnvConfig, get_env_with_decrypted_key, create_env_with_encrypted_key};
use session::{Session, SessionManager, start_session_monitor};
use std::sync::Arc;
use std::collections::HashMap;
use std::process::Command;
use tauri::State;
use terminal::{TerminalInfo, TerminalType};
use tray::create_tray;

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
    Ok(cfg.registries)
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
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if !cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
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
) -> Result<Session, String> {
    // Read environment configuration
    let cfg = config::read_config()?;
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

    // Build session name for iTerm2 tab title
    let session_name = format!("Claude: {} + {}", env_name, perm);

    // Get preferred terminal and launch
    let preferred_terminal = terminal::get_preferred_terminal();
    terminal::launch_in_terminal(preferred_terminal, env_vars, &work_dir, &session_name)?;

    let session = Session {
        id: generate_session_id(),
        pid: None, // Terminal-launched sessions don't have direct PID access
        env_name,
        perm_mode: perm,
        working_dir: work_dir,
        start_time: chrono::Utc::now().to_rfc3339(),
        status: "running".to_string(),
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
    state.remove_session(&session_id);
}

fn main() {
    // Create SessionManager wrapped in Arc for sharing with monitor
    let session_manager = Arc::new(SessionManager::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(session_manager.clone())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_environments,
            get_current_env,
            set_current_env,
            add_environment,
            update_environment,
            delete_environment,
            detect_terminals,
            get_preferred_terminal,
            set_preferred_terminal,
            launch_claude_code,
            list_sessions,
            stop_session,
            remove_session
        ])
        .setup(move |app| {
            let _ = create_tray(app.handle())?;

            // Start session monitor background task
            start_session_monitor(app.handle().clone(), session_manager.clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
