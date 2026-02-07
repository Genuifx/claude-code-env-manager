use std::sync::Arc;
use serde::Serialize;
use tauri::{
    menu::{Menu, MenuItem, Submenu, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder, TrayIconId},
    AppHandle, Emitter, Manager,
};

use crate::config;
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

/// Event payload for session focus
#[derive(Clone, Serialize)]
pub struct SessionFocusPayload {
    pub session_id: String,
}

/// Read environments and current permission mode from config
fn read_config_state() -> (String, Vec<String>, String) {
    let cfg = match config::read_config() {
        Ok(c) => c,
        Err(_) => return ("official".to_string(), vec!["official".to_string()], "dev".to_string()),
    };

    let current_env = cfg.current.unwrap_or_else(|| "official".to_string());
    let current_perm = cfg.default_mode.unwrap_or_else(|| "dev".to_string());

    // Build environment list, always include "official" first
    let mut envs: Vec<String> = vec!["official".to_string()];
    for name in cfg.registries.keys() {
        if name != "official" {
            envs.push(name.clone());
        }
    }
    envs.sort_by(|a, b| {
        if a == "official" { std::cmp::Ordering::Less }
        else if b == "official" { std::cmp::Ordering::Greater }
        else { a.cmp(b) }
    });

    (current_env, envs, current_perm)
}

/// Build the environment submenu dynamically
fn build_env_menu(app: &AppHandle, current: &str, envs: Vec<String>) -> Result<Submenu<tauri::Wry>, tauri::Error> {
    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();

    for env_name in &envs {
        let marker = if env_name == current { "●" } else { "○" };
        let label = format!("{} {}", marker, env_name);
        let id = format!("env:{}", env_name);
        items.push(MenuItem::with_id(app, &id, &label, true, None::<&str>)?);
    }

    let title = format!("Environment: {}", current);

    // Convert Vec<MenuItem> to Vec<&dyn IsMenuItem>
    let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();

    Submenu::with_items(app, &title, true, &item_refs)
}

/// Build the permission mode submenu dynamically
fn build_perm_menu(app: &AppHandle, current: &str) -> Result<Submenu<tauri::Wry>, tauri::Error> {
    let modes = vec!["yolo", "dev", "readonly", "safe", "ci", "audit"];
    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();

    for mode in &modes {
        let marker = if mode == &current { "●" } else { "○" };
        let label = format!("{} {}", marker, mode);
        let id = format!("perm:{}", mode);
        items.push(MenuItem::with_id(app, &id, &label, true, None::<&str>)?);
    }

    let title = format!("Permission: {}", current);

    // Convert Vec<MenuItem> to Vec<&dyn IsMenuItem>
    let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();

    Submenu::with_items(app, &title, true, &item_refs)
}

/// Build the active sessions submenu dynamically
fn build_sessions_menu(app: &AppHandle) -> Result<Submenu<tauri::Wry>, tauri::Error> {
    // Get the SessionManager from app state
    let manager = match app.try_state::<Arc<SessionManager>>() {
        Some(m) => m,
        None => {
            // Return empty submenu if no manager
            let title = "Sessions (0)";
            let no_sessions = MenuItem::with_id(app, "no_sessions", "No active sessions", false, None::<&str>)?;
            return Submenu::with_items(app, title, true, &[&no_sessions]);
        }
    };

    let sessions = manager.list_sessions();
    let running_count = sessions.iter().filter(|s| s.status == "running").count();

    let title = format!("Sessions ({})", running_count);

    if sessions.is_empty() {
        let no_sessions = MenuItem::with_id(app, "no_sessions", "No active sessions", false, None::<&str>)?;
        return Submenu::with_items(app, &title, true, &[&no_sessions]);
    }

    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();

    // Show up to 5 most recent sessions
    for session in sessions.iter().take(5) {
        // Extract project name from working directory
        let project_name = session.working_dir
            .split('/')
            .last()
            .unwrap_or(&session.working_dir);

        let label = format!("{} ({} + {})", project_name, session.env_name, session.perm_mode);
        let id = format!("session:{}", session.id);
        items.push(MenuItem::with_id(app, &id, &label, true, None::<&str>)?);
    }

    // Convert Vec<MenuItem> to Vec<&dyn IsMenuItem>
    let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>).collect();

    Submenu::with_items(app, &title, true, &item_refs)
}

/// Build the full tray menu
fn build_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    // Read configuration state
    let (current_env, envs, current_perm) = read_config_state();

    // Status header (non-clickable)
    let status_header = MenuItem::with_id(
        app,
        "status",
        format!("CCEM · {} · {}", current_env, current_perm),
        false,
        None::<&str>,
    )?;

    // Environment submenu (dynamic)
    let env_submenu = build_env_menu(app, &current_env, envs)?;

    // Permission mode submenu (dynamic)
    let perm_submenu = build_perm_menu(app, &current_perm)?;

    // Active sessions submenu (dynamic)
    let sessions_submenu = build_sessions_menu(app)?;

    // Today's stats (non-clickable, placeholder for now)
    let stats_item = MenuItem::with_id(
        app,
        "stats",
        "Today: 0 tokens · $0.00",
        false,
        None::<&str>,
    )?;

    // Main action items
    let launch_item = MenuItem::with_id(app, "launch", "Launch Claude Code", true, None::<&str>)?;
    let open_window_item = MenuItem::with_id(app, "open_window", "Open Window", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Build complete menu
    Menu::with_items(
        app,
        &[
            &status_header,
            &PredefinedMenuItem::separator(app)?,
            &env_submenu,
            &perm_submenu,
            &sessions_submenu,
            &PredefinedMenuItem::separator(app)?,
            &stats_item,
            &PredefinedMenuItem::separator(app)?,
            &launch_item,
            &open_window_item,
            &settings_item,
            &PredefinedMenuItem::separator(app)?,
            &quit_item,
        ],
    )
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
                println!("Launch Claude from tray");
                // Emit event to frontend to show launch dialog
                let _ = app.emit("tray-launch-claude", ());
            }
            "open_window" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    // Emit event to navigate to settings
                    let _ = app.emit("navigate-to-settings", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            id if id.starts_with("session:") => {
                let session_id = id.strip_prefix("session:").unwrap();
                handle_session_focus(app, session_id);
            }
            id if id.starts_with("env:") => {
                let env_name = id.strip_prefix("env:").unwrap();
                handle_env_switch(app, env_name);
            }
            id if id.starts_with("perm:") => {
                let perm_mode = id.strip_prefix("perm:").unwrap();
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

/// Update tray icon based on session state
/// Call this when sessions are added/removed or when errors occur
pub fn update_tray_icon(app: &AppHandle, has_error: bool) -> Result<(), tauri::Error> {
    let tray_id = TrayIconId::new(TRAY_ID);

    if let Some(_tray) = app.tray_by_id(&tray_id) {
        let manager = app.try_state::<Arc<SessionManager>>();
        let has_running_sessions = manager
            .map(|m| m.list_sessions().iter().any(|s| s.status == "running"))
            .unwrap_or(false);

        // Icon state logic:
        // - Red: has_error = true
        // - Green: has running sessions
        // - White/Default: no sessions

        // TODO: Implement icon switching when we have multiple icon assets
        // For now, just log the state
        let icon_state = if has_error {
            "error"
        } else if has_running_sessions {
            "active"
        } else {
            "idle"
        };

        println!("Tray icon state: {}", icon_state);
    }

    Ok(())
}

/// Update tray stats display
/// Call this periodically or when usage data changes
pub fn update_tray_stats(app: &AppHandle, tokens: u64, cost: f64) -> Result<(), tauri::Error> {
    // TODO: Update the stats menu item text
    // This requires rebuilding the menu with updated stats
    // For now, just log the stats
    println!("Tray stats update: {} tokens, ${:.2}", tokens, cost);

    // We could rebuild the entire menu here, but that's expensive
    // A better approach would be to use a mutable menu item if Tauri supports it
    // For now, we'll rebuild on demand
    let _ = rebuild_tray_menu(app);

    Ok(())
}

/// Set the current environment and update config file
fn set_current_env_internal(env_name: &str) -> Result<(), String> {
    let mut cfg = config::read_config()?;
    cfg.current = Some(env_name.to_string());
    config::write_config(&cfg)
}

/// Set the current permission mode and update config file
fn set_current_perm_internal(perm_mode: &str) -> Result<(), String> {
    let mut cfg = config::read_config()?;
    cfg.default_mode = Some(perm_mode.to_string());
    config::write_config(&cfg)
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
    // Update the config file
    match set_current_perm_internal(perm_mode) {
        Ok(_) => {
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
        Err(e) => {
            eprintln!("Failed to switch permission mode: {}", e);
        }
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

    // Get terminal info from session
    let terminal_type = match session.terminal_type.as_ref() {
        Some(t) => match t.as_str() {
            "iterm2" => terminal::TerminalType::ITerm2,
            "terminalapp" => terminal::TerminalType::TerminalApp,
            _ => {
                eprintln!("Unknown terminal type: {}", t);
                return;
            }
        },
        None => {
            eprintln!("Session has no terminal type");
            return;
        }
    };

    let window_id = match session.window_id.as_ref() {
        Some(id) => id,
        None => {
            eprintln!("Session has no window ID");
            return;
        }
    };

    // Focus the terminal window
    if let Err(e) = terminal::focus_terminal_window(terminal_type, window_id) {
        eprintln!("Failed to focus terminal window: {}", e);
    } else {
        println!("Focused session: {}", session_id);
    }
}
