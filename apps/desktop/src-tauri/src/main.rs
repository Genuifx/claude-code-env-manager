// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod session;
mod tray;

use serde::{Deserialize, Serialize};
use session::{Session, SessionManager};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::State;
use tray::create_tray;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub base_url: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_MODEL")]
    pub model: Option<String>,
    #[serde(rename = "ANTHROPIC_SMALL_FAST_MODEL")]
    pub small_model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CcemConfig {
    pub registries: HashMap<String, EnvConfig>,
    pub current: Option<String>,
}

fn get_config_path() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".config")
        .join("claude-code-env-manager")
        .join("config.json")
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
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok(HashMap::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config: CcemConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    Ok(config.registries)
}

#[tauri::command]
fn get_current_env() -> Result<String, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok("official".to_string());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config: CcemConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    Ok(config.current.unwrap_or_else(|| "official".to_string()))
}

#[tauri::command]
fn set_current_env(name: String) -> Result<(), String> {
    let config_path = get_config_path();

    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))?
    } else {
        CcemConfig {
            registries: HashMap::new(),
            current: None,
        }
    };

    config.current = Some(name);

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
fn add_environment(
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let config_path = get_config_path();

    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))?
    } else {
        CcemConfig {
            registries: HashMap::new(),
            current: None,
        }
    };

    if config.registries.contains_key(&name) {
        return Err(format!("Environment '{}' already exists", name));
    }

    let env_config = EnvConfig {
        base_url: Some(base_url),
        api_key,
        model: Some(model),
        small_model,
    };

    config.registries.insert(name, env_config);

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
fn update_environment(
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Err(format!("Environment '{}' does not exist", name));
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let mut config: CcemConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    if !config.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
    }

    let env_config = EnvConfig {
        base_url: Some(base_url),
        api_key,
        model: Some(model),
        small_model,
    };

    config.registries.insert(name, env_config);

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
fn delete_environment(name: String) -> Result<(), String> {
    if name == "official" {
        return Err("Cannot delete the 'official' environment".to_string());
    }

    let config_path = get_config_path();

    if !config_path.exists() {
        return Err(format!("Environment '{}' does not exist", name));
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let mut config: CcemConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))?;

    if !config.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
    }

    config.registries.remove(&name);

    // Reset current to "official" if we deleted the current environment
    if config.current.as_ref() == Some(&name) {
        config.current = Some("official".to_string());
    }

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

#[tauri::command]
fn launch_claude_code(
    state: State<SessionManager>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
) -> Result<Session, String> {
    let config_path = get_config_path();

    let env_vars = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let config: CcemConfig = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))?;

        config.registries.get(&env_name).cloned()
    } else {
        None
    };

    let mut cmd = Command::new("claude");

    if let Some(env) = env_vars {
        if let Some(url) = env.base_url {
            cmd.env("ANTHROPIC_BASE_URL", url);
        }
        if let Some(key) = env.api_key {
            cmd.env("ANTHROPIC_API_KEY", key);
        }
        if let Some(model) = env.model {
            cmd.env("ANTHROPIC_MODEL", model);
        }
        if let Some(small_model) = env.small_model {
            cmd.env("ANTHROPIC_SMALL_FAST_MODEL", small_model);
        }
    }

    let work_dir = working_dir.clone().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "~".to_string())
    });

    cmd.current_dir(&work_dir);

    let child = cmd.spawn()
        .map_err(|e| format!("Failed to launch Claude Code: {}", e))?;

    let session = Session {
        id: generate_session_id(),
        pid: Some(child.id()),
        env_name,
        perm_mode: perm_mode.unwrap_or_else(|| "dev".to_string()),
        working_dir: work_dir,
        start_time: chrono::Utc::now().to_rfc3339(),
        status: "running".to_string(),
    };

    state.add_session(session.clone());
    Ok(session)
}

#[tauri::command]
fn list_sessions(state: State<SessionManager>) -> Vec<Session> {
    state.list_sessions()
}

#[tauri::command]
fn stop_session(state: State<SessionManager>, session_id: String) -> Result<(), String> {
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
fn remove_session(state: State<SessionManager>, session_id: String) {
    state.remove_session(&session_id);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SessionManager::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_environments,
            get_current_env,
            set_current_env,
            add_environment,
            update_environment,
            delete_environment,
            launch_claude_code,
            list_sessions,
            stop_session,
            remove_session
        ])
        .setup(|app| {
            let _ = create_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
