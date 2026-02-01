use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager,
};

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    // Environment submenu
    let env_submenu = Submenu::with_items(
        app,
        "Environment: official",
        true,
        &[
            &MenuItem::with_id(app, "env_official", "● official", true, None::<&str>)?,
            &MenuItem::with_id(app, "env_glm", "○ GLM", true, None::<&str>)?,
            &MenuItem::with_id(app, "env_deepseek", "○ DeepSeek", true, None::<&str>)?,
            &MenuItem::with_id(app, "env_kimi", "○ KIMI", true, None::<&str>)?,
            &MenuItem::with_id(app, "env_minimax", "○ MiniMax", true, None::<&str>)?,
        ],
    )?;

    // Permission mode submenu
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
    let menu = Menu::with_items(
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
    )?;

    TrayIconBuilder::new()
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
