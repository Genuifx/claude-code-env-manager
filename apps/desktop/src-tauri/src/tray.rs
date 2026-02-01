use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder, TrayIconId},
    AppHandle, Emitter, Manager,
};

use crate::CcemConfig;
use crate::session::SessionManager;
use crate::terminal;

/// Event payload for environment changes
#[derive(Clone, Serialize)]
pub struct EnvChangedPayload {
    pub env: String,
}

/// Event payload for permission changes
#[derive(Clone, Serialize)]
pub struct PermChangedPayload {
    pub perm: String,
}

/// Get the config file path
fn get_config_path() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".config")
        .join("claude-code-env-manager")
        .join("config.json")
}

/// Read environments from the config file
fn read_environments() -> (String, Vec<String>) {
    let config_path = get_config_path();

    if !config_path.exists() {
        return ("official".to_string(), vec!["official".to_string()]);
    }

    let content = match fs::read_to_string(&config_path) {
        Ok(c) => c,
        Err(_) => return ("official".to_string(), vec!["official".to_string()]),
    };

    let config: CcemConfig = match serde_json::from_str(&content) {
        Ok(c) => c,
        Err(_) => return ("official".to_string(), vec!["official".to_string()]),
    };

    let current = config.current.unwrap_or_else(|| "official".to_string());

    // Build environment list, always include "official" first
    let mut envs: Vec<String> = vec!["official".to_string()];
    for name in config.registries.keys() {
        if name != "official" {
            envs.push(name.clone());
        }
    }
    envs.sort_by(|a, b| {
        if a == "official" { std::cmp::Ordering::Less }
        else if b == "official" { std::cmp::Ordering::Greater }
        else { a.cmp(b) }
    });

    (current, envs)
}

/// Build the environment submenu dynamically
fn build_env_menu(app: &AppHandle, current: &str, envs: Vec<String>) -> Result<Submenu<tauri::Wry>, tauri::Error> {
    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();

    for env_name in &envs {
        let marker = if env_name == current { "●" } else { "○" };
        let label = format!("{} {}", marker, env_name);
        let id = format!("env_{}", env_name.to_lowercase().replace(" ", "_"));
        items.push(MenuItem::with_id(app, &id, &label, true, None::<&str>)?);
    }

    let title = format!("Environment: {}", current);

    // Convert Vec<MenuItem> to Vec<&dyn IsMenuItem>
    let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();

    Submenu::with_items(app, &title, true, &item_refs)
}

/// Build the active sessions submenu dynamically
fn build_sessions_menu(app: &AppHandle) -> Result<Option<Submenu<tauri::Wry>>, tauri::Error> {
    // Get the SessionManager from app state
    let manager = match app.try_state::<Arc<SessionManager>>() {
        Some(m) => m,
        None => return Ok(None),
    };

    let running_sessions = manager.get_running_sessions();

    if running_sessions.is_empty() {
        return Ok(None);
    }

    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();

    for session in &running_sessions {
        // Format: "env_name + perm_mode    [Focus]"
        let label = format!("{} + {}", session.env_name, session.perm_mode);
        let id = format!("session_{}", session.id);
        items.push(MenuItem::with_id(app, &id, &label, true, None::<&str>)?);
    }

    let title = format!("Active Sessions ({})", running_sessions.len());

    // Convert Vec<MenuItem> to Vec<&dyn IsMenuItem>
    let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();

    Ok(Some(Submenu::with_items(app, &title, true, &item_refs)?))
}

/// Build the full tray menu
fn build_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    // Read environments from config
    let (current_env, envs) = read_environments();

    // Environment submenu (dynamic)
    let env_submenu = build_env_menu(app, &current_env, envs)?;

    // Permission mode submenu (static for now)
    let perm_submenu = Submenu::with_items(
        app,
        "Permission: dev",
        true,
        &[
            &MenuItem::with_id(app, "perm_yolo", "○ YOLO", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_dev", "● Dev", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_readonly", "○ Readonly", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_safe", "○ Safe", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_ci", "○ CI", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_audit", "○ Audit", true, None::<&str>)?,
        ],
    )?;

    // Active sessions submenu (dynamic)
    let sessions_submenu = build_sessions_menu(app)?;

    // Build menu items list dynamically based on whether we have active sessions
    if let Some(sessions_menu) = sessions_submenu {
        Menu::with_items(
            app,
            &[
                &sessions_menu,
                &MenuItem::with_id(app, "separator0", "─────────", false, None::<&str>)?,
                &env_submenu,
                &perm_submenu,
                &MenuItem::with_id(app, "separator1", "─────────", false, None::<&str>)?,
                &MenuItem::with_id(app, "launch", "▶ Launch Claude", true, None::<&str>)?,
                &MenuItem::with_id(app, "separator2", "─────────", false, None::<&str>)?,
                &MenuItem::with_id(app, "open_window", "Open Window", true, None::<&str>)?,
                &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
            ],
        )
    } else {
        Menu::with_items(
            app,
            &[
                &env_submenu,
                &perm_submenu,
                &MenuItem::with_id(app, "separator1", "─────────", false, None::<&str>)?,
                &MenuItem::with_id(app, "launch", "▶ Launch Claude", true, None::<&str>)?,
                &MenuItem::with_id(app, "separator2", "─────────", false, None::<&str>)?,
                &MenuItem::with_id(app, "open_window", "Open Window", true, None::<&str>)?,
                &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
            ],
        )
    }
}

/// Tray icon ID constant for rebuilding
const TRAY_ID: &str = "main_tray";

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let menu = build_tray_menu(app)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "launch" => {
                println!("Launch Claude");
                // TODO: Emit event to frontend to launch Claude
            }
            "open_window" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            id if id.starts_with("session_") => {
                let session_id = id.strip_prefix("session_").unwrap();
                handle_session_focus(app, session_id);
            }
            id if id.starts_with("env_") => {
                let env_name = id.strip_prefix("env_").unwrap();
                handle_env_switch(app, env_name);
            }
            id if id.starts_with("perm_") => {
                let perm_mode = id.strip_prefix("perm_").unwrap();
                handle_perm_switch(app, perm_mode);
            }
            _ => {}
        })
        .build(app)
}

/// Rebuild the tray menu to reflect updated configuration
/// Call this after environments are added, deleted, or switched
pub fn rebuild_tray_menu(app: &AppHandle) -> Result<(), tauri::Error> {
    let tray_id = TrayIconId::new(TRAY_ID);

    if let Some(tray) = app.tray_by_id(&tray_id) {
        let menu = build_tray_menu(app)?;
        tray.set_menu(Some(menu))?;
    }

    Ok(())
}

/// Set the current environment and update config file
fn set_current_env_internal(env_name: &str) -> Result<(), String> {
    let config_path = get_config_path();

    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config: {}", e))?
    } else {
        CcemConfig {
            registries: std::collections::HashMap::new(),
            current: None,
        }
    };

    config.current = Some(env_name.to_string());

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

/// Handle environment switch from tray menu
fn handle_env_switch(app: &AppHandle, env_name: &str) {
    // Update the config file
    match set_current_env_internal(env_name) {
        Ok(_) => {
            println!("Switched to environment: {}", env_name);

            // Emit event to frontend
            let _ = app.emit("env-changed", EnvChangedPayload {
                env: env_name.to_string(),
            });

            // Rebuild tray menu to show updated selection
            if let Err(e) = rebuild_tray_menu(app) {
                eprintln!("Failed to rebuild tray menu: {}", e);
            }
        }
        Err(e) => {
            eprintln!("Failed to switch environment: {}", e);
        }
    }
}

/// Handle permission mode switch from tray menu
fn handle_perm_switch(app: &AppHandle, perm_mode: &str) {
    println!("Switched to permission mode: {}", perm_mode);

    // Emit event to frontend
    let _ = app.emit("perm-changed", PermChangedPayload {
        perm: perm_mode.to_string(),
    });

    // Rebuild tray menu to show updated selection
    if let Err(e) = rebuild_tray_menu(app) {
        eprintln!("Failed to rebuild tray menu: {}", e);
    }
}

/// Handle session focus from tray menu
fn handle_session_focus(app: &AppHandle, session_id: &str) {
    // Get the SessionManager from app state
    let manager = match app.try_state::<Arc<SessionManager>>() {
        Some(m) => m,
        None => {
            eprintln!("SessionManager not found in app state");
            return;
        }
    };

    // Find the session
    let session = match manager.get_session(session_id) {
        Some(s) => s,
        None => {
            eprintln!("Session not found: {}", session_id);
            return;
        }
    };

    // Build session name (same format as used when launching)
    let session_name = format!("Claude: {} + {}", session.env_name, session.perm_mode);

    // Get preferred terminal and focus
    let preferred_terminal = terminal::get_preferred_terminal();

    if let Err(e) = terminal::focus_terminal_window(preferred_terminal, &session_name) {
        eprintln!("Failed to focus terminal window: {}", e);
    } else {
        println!("Focused session: {}", session_name);
    }
}
