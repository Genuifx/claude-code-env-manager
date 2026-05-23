use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const PET_WINDOW_LABEL: &str = "desktop-pet";

const PET_WINDOW_INITIAL_WIDTH: f64 = 144.0;
const PET_WINDOW_INITIAL_HEIGHT: f64 = 144.0;
const PET_WINDOW_MAX_WIDTH: f64 = 520.0;
const PET_WINDOW_MAX_HEIGHT: f64 = 360.0;
const PET_WINDOW_MARGIN: f64 = 28.0;

pub fn sync_pet_window_visibility(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        show_pet_window(app)
    } else {
        hide_pet_window(app)
    }
}

pub fn show_pet_window(app: &AppHandle) -> Result<(), String> {
    set_pet_activation_policy(app, true)?;
    let window = match app.get_webview_window(PET_WINDOW_LABEL) {
        Some(window) => window,
        None => build_pet_window(app)?,
    };

    configure_pet_window(&window)?;
    position_pet_window(&window)?;
    window.show().map_err(|e| format!("show pet window: {e}"))?;
    apply_pet_window_after_show(&window)?;
    Ok(())
}

pub fn hide_pet_window(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(PET_WINDOW_LABEL) {
        window.hide().map_err(|e| format!("hide pet window: {e}"))?;
    }
    set_pet_activation_policy(app, false)?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn set_pet_activation_policy(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let policy = if enabled {
        tauri::ActivationPolicy::Accessory
    } else {
        tauri::ActivationPolicy::Regular
    };
    app.set_activation_policy(policy)
        .map_err(|e| format!("pet activation policy: {e}"))
}

#[cfg(not(target_os = "macos"))]
fn set_pet_activation_policy(_app: &AppHandle, _enabled: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn resize_pet_window(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let Some(window) = app.get_webview_window(PET_WINDOW_LABEL) else {
        return Ok(());
    };

    resize_and_position_pet_window(&window, width, height)
}

fn build_pet_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    let builder = WebviewWindowBuilder::new(
        app,
        PET_WINDOW_LABEL,
        WebviewUrl::App("index.html?window=pet".into()),
    )
    .title("CCEM Desktop Pet")
    // On macOS, tauri-plugin-decorum touches traffic lights for every new window.
    // Create decorated while hidden, then remove decorations before showing.
    .decorations(cfg!(target_os = "macos"))
    .resizable(false)
    .shadow(false)
    .always_on_top(!cfg!(target_os = "macos"))
    .visible_on_all_workspaces(!cfg!(target_os = "macos"))
    .skip_taskbar(true)
    .inner_size(PET_WINDOW_INITIAL_WIDTH, PET_WINDOW_INITIAL_HEIGHT)
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
        .set_decorations(false)
        .map_err(|e| format!("pet window decorations: {e}"))?;

    #[cfg(target_os = "macos")]
    {
        apply_pet_window_macos_behavior(window)
    }

    #[cfg(not(target_os = "macos"))]
    {
        window
            .set_visible_on_all_workspaces(true)
            .map_err(|e| format!("pet window all workspaces: {e}"))?;
        window
            .set_always_on_top(true)
            .map_err(|e| format!("pet window always on top: {e}"))?;
        Ok(())
    }
}

fn resize_and_position_pet_window(
    window: &WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let size = pet_window_size(width, height);
    window
        .set_size(tauri::Size::Logical(size))
        .map_err(|e| format!("resize pet window: {e}"))?;
    position_pet_window_for_size(window, size.width, size.height)
}

fn apply_pet_window_after_show(window: &WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        apply_pet_window_macos_behavior(window)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn apply_pet_window_macos_behavior(window: &WebviewWindow) -> Result<(), String> {
    use objc2_app_kit::{NSStatusWindowLevel, NSWindow};

    run_on_pet_window_main_thread(window, move |window| {
        let ns_window = window
            .ns_window()
            .map_err(|e| format!("pet window nswindow: {e}"))?;
        let ns_window: &NSWindow = unsafe { &*ns_window.cast() };
        let behavior = pet_macos_collection_behavior(unsafe { ns_window.collectionBehavior() });
        unsafe {
            ns_window.setCollectionBehavior(behavior);
            ns_window.setHidesOnDeactivate(false);
            ns_window.setCanHide(false);
        }
        ns_window.setDelegate(None);
        ns_window.setLevel(NSStatusWindowLevel);
        unsafe {
            ns_window.orderFrontRegardless();
        }
        Ok(())
    })
}

#[cfg(target_os = "macos")]
fn pet_macos_collection_behavior(
    mut behavior: objc2_app_kit::NSWindowCollectionBehavior,
) -> objc2_app_kit::NSWindowCollectionBehavior {
    use objc2_app_kit::NSWindowCollectionBehavior;

    behavior.remove(NSWindowCollectionBehavior::MoveToActiveSpace);
    behavior.remove(NSWindowCollectionBehavior::Managed);
    behavior.remove(NSWindowCollectionBehavior::Transient);
    behavior.remove(NSWindowCollectionBehavior::ParticipatesInCycle);
    behavior.remove(NSWindowCollectionBehavior::FullScreenPrimary);
    behavior.remove(NSWindowCollectionBehavior::FullScreenNone);
    behavior.remove(NSWindowCollectionBehavior::Primary);
    behavior.remove(NSWindowCollectionBehavior::Auxiliary);

    behavior.insert(NSWindowCollectionBehavior::CanJoinAllSpaces);
    behavior.insert(NSWindowCollectionBehavior::CanJoinAllApplications);
    behavior.insert(NSWindowCollectionBehavior::Stationary);
    behavior.insert(NSWindowCollectionBehavior::IgnoresCycle);
    behavior.insert(NSWindowCollectionBehavior::FullScreenAuxiliary);
    behavior
}

#[cfg(target_os = "macos")]
fn run_on_pet_window_main_thread<F>(window: &WebviewWindow, action: F) -> Result<(), String>
where
    F: FnOnce(&WebviewWindow) -> Result<(), String> + Send + 'static,
{
    if std::thread::current().name() == Some("main") {
        return action(window);
    }

    let (tx, rx) = std::sync::mpsc::channel();
    let window_for_main_thread = window.clone();
    window
        .run_on_main_thread(move || {
            let _ = tx.send(action(&window_for_main_thread));
        })
        .map_err(|e| format!("pet window macos main thread: {e}"))?;
    rx.recv_timeout(std::time::Duration::from_secs(2))
        .map_err(|e| format!("pet window macos main thread response: {e}"))?
}

fn position_pet_window(window: &WebviewWindow) -> Result<(), String> {
    position_pet_window_for_size(window, PET_WINDOW_INITIAL_WIDTH, PET_WINDOW_INITIAL_HEIGHT)
}

fn pet_window_size(width: f64, height: f64) -> tauri::LogicalSize<f64> {
    tauri::LogicalSize {
        width: clamp_pet_window_dimension(
            width,
            PET_WINDOW_INITIAL_WIDTH,
            PET_WINDOW_MAX_WIDTH,
        ),
        height: clamp_pet_window_dimension(
            height,
            PET_WINDOW_INITIAL_HEIGHT,
            PET_WINDOW_MAX_HEIGHT,
        ),
    }
}

fn clamp_pet_window_dimension(value: f64, min: f64, max: f64) -> f64 {
    if !value.is_finite() {
        return min;
    }
    value.ceil().clamp(min, max)
}

fn position_pet_window_for_size(
    window: &WebviewWindow,
    window_width: f64,
    window_height: f64,
) -> Result<(), String> {
    let Some(monitor) = window
        .primary_monitor()
        .map_err(|e| format!("pet window monitor: {e}"))?
    else {
        return Ok(());
    };

    let position = monitor.position();
    let size = monitor.size();
    let scale = monitor.scale_factor();
    let x = position.x as f64 + (size.width as f64 / scale) - window_width - PET_WINDOW_MARGIN;
    let y =
        position.y as f64 + (size.height as f64 / scale) - window_height - PET_WINDOW_MARGIN;

    window
        .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
        .map_err(|e| format!("position pet window: {e}"))?;
    Ok(())
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;
    use objc2_app_kit::NSWindowCollectionBehavior;

    #[test]
    fn pet_macos_collection_behavior_replaces_conflicting_defaults() {
        let behavior = pet_macos_collection_behavior(
            NSWindowCollectionBehavior::MoveToActiveSpace
                | NSWindowCollectionBehavior::Managed
                | NSWindowCollectionBehavior::Transient
                | NSWindowCollectionBehavior::ParticipatesInCycle
                | NSWindowCollectionBehavior::FullScreenPrimary
                | NSWindowCollectionBehavior::FullScreenNone
                | NSWindowCollectionBehavior::Primary
                | NSWindowCollectionBehavior::Auxiliary,
        );

        assert!(behavior.contains(NSWindowCollectionBehavior::CanJoinAllSpaces));
        assert!(behavior.contains(NSWindowCollectionBehavior::CanJoinAllApplications));
        assert!(behavior.contains(NSWindowCollectionBehavior::Stationary));
        assert!(behavior.contains(NSWindowCollectionBehavior::IgnoresCycle));
        assert!(behavior.contains(NSWindowCollectionBehavior::FullScreenAuxiliary));
        assert!(!behavior.contains(NSWindowCollectionBehavior::MoveToActiveSpace));
        assert!(!behavior.contains(NSWindowCollectionBehavior::Managed));
        assert!(!behavior.contains(NSWindowCollectionBehavior::Transient));
        assert!(!behavior.contains(NSWindowCollectionBehavior::ParticipatesInCycle));
        assert!(!behavior.contains(NSWindowCollectionBehavior::FullScreenPrimary));
        assert!(!behavior.contains(NSWindowCollectionBehavior::FullScreenNone));
        assert!(!behavior.contains(NSWindowCollectionBehavior::Primary));
        assert!(!behavior.contains(NSWindowCollectionBehavior::Auxiliary));
    }
}

#[cfg(test)]
mod size_tests {
    use super::*;

    #[test]
    fn pet_window_size_clamps_to_visible_content_bounds() {
        let tiny = pet_window_size(1.2, 2.8);
        assert_eq!(tiny.width, PET_WINDOW_INITIAL_WIDTH);
        assert_eq!(tiny.height, PET_WINDOW_INITIAL_HEIGHT);

        let content = pet_window_size(486.2, 351.1);
        assert_eq!(content.width, 487.0);
        assert_eq!(content.height, 352.0);

        let huge = pet_window_size(9999.0, f64::INFINITY);
        assert_eq!(huge.width, PET_WINDOW_MAX_WIDTH);
        assert_eq!(huge.height, PET_WINDOW_INITIAL_HEIGHT);
    }
}
