use std::fs;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder, TrayIconId},
    AppHandle, Manager,
};

use crate::CcemConfig;

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

    // Main menu
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
            id if id.starts_with("env_") => {
                let env_name = id.strip_prefix("env_").unwrap();
                println!("Switch to env: {}", env_name);
                // TODO: Emit event to frontend
            }
            id if id.starts_with("perm_") => {
                let perm_mode = id.strip_prefix("perm_").unwrap();
                println!("Switch to perm: {}", perm_mode);
                // TODO: Emit event to frontend
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
