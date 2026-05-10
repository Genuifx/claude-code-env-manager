use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const PET_WINDOW_LABEL: &str = "desktop-pet";

const PET_WINDOW_WIDTH: f64 = 520.0;
const PET_WINDOW_HEIGHT: f64 = 360.0;
const PET_WINDOW_MARGIN: f64 = 28.0;

pub fn sync_pet_window_visibility(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        show_pet_window(app)
    } else {
        hide_pet_window(app)
    }
}

pub fn show_pet_window(app: &AppHandle) -> Result<(), String> {
    let window = match app.get_webview_window(PET_WINDOW_LABEL) {
        Some(window) => window,
        None => build_pet_window(app)?,
    };

    configure_pet_window(&window)?;
    position_pet_window(&window)?;
    window.show().map_err(|e| format!("show pet window: {e}"))?;
    Ok(())
}

pub fn hide_pet_window(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(PET_WINDOW_LABEL) {
        window.hide().map_err(|e| format!("hide pet window: {e}"))?;
    }
    Ok(())
}

fn build_pet_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    let builder = WebviewWindowBuilder::new(
        app,
        PET_WINDOW_LABEL,
        WebviewUrl::App("index.html?window=pet".into()),
    )
    .title("CCEM Desktop Pet")
    .decorations(false)
    .resizable(false)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .inner_size(PET_WINDOW_WIDTH, PET_WINDOW_HEIGHT)
    .visible(false);

    #[cfg(not(target_os = "macos"))]
    let builder = builder.transparent(true);

    let window = builder
        .build()
        .map_err(|e| format!("build pet window: {e}"))?;

    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_decorum::WebviewWindowExt;

        window
            .make_transparent()
            .map_err(|e| format!("make pet window transparent: {e}"))?;
    }

    Ok(window)
}

fn configure_pet_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .set_always_on_top(true)
        .map_err(|e| format!("pet window always on top: {e}"))?;
    window
        .set_decorations(false)
        .map_err(|e| format!("pet window decorations: {e}"))?;
    Ok(())
}

fn position_pet_window(window: &WebviewWindow) -> Result<(), String> {
    let Some(monitor) = window
        .primary_monitor()
        .map_err(|e| format!("pet window monitor: {e}"))?
    else {
        return Ok(());
    };

    let position = monitor.position();
    let size = monitor.size();
    let scale = monitor.scale_factor();
    let x = position.x as f64 + (size.width as f64 / scale) - PET_WINDOW_WIDTH - PET_WINDOW_MARGIN;
    let y =
        position.y as f64 + (size.height as f64 / scale) - PET_WINDOW_HEIGHT - PET_WINDOW_MARGIN;

    window
        .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
        .map_err(|e| format!("position pet window: {e}"))?;
    Ok(())
}
