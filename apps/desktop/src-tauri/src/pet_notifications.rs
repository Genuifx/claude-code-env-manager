use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, fs, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PetNotificationReadState {
    pub read_notification_ids: BTreeSet<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PetOpenSessionRequest {
    pub notification_id: String,
    pub runtime_id: String,
    pub provider_session_id: Option<String>,
    pub provider: Option<String>,
    pub status: String,
    pub mark_read: bool,
}

pub fn mark_read_id(state: &mut PetNotificationReadState, id: String) -> bool {
    state.read_notification_ids.insert(id)
}

fn read_state_path() -> PathBuf {
    crate::config::get_ccem_dir().join("pet-notifications.json")
}

fn write_read_state(state: &PetNotificationReadState) -> Result<(), String> {
    crate::config::ensure_ccem_dir()
        .map_err(|e| format!("create ccem dir for pet notifications: {e}"))?;
    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("serialize pet notification state: {e}"))?;
    fs::write(read_state_path(), content).map_err(|e| format!("write pet notification state: {e}"))
}

#[tauri::command]
pub fn get_pet_notification_read_state() -> Result<PetNotificationReadState, String> {
    let path = read_state_path();
    if !path.exists() {
        return Ok(PetNotificationReadState::default());
    }

    let content =
        fs::read_to_string(&path).map_err(|e| format!("read pet notification state: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("parse pet notification state: {e}"))
}

#[tauri::command]
pub fn mark_pet_notification_read(
    notification_id: String,
) -> Result<PetNotificationReadState, String> {
    let mut state = get_pet_notification_read_state()?;
    mark_read_id(&mut state, notification_id);
    write_read_state(&state)?;
    Ok(state)
}

#[tauri::command]
pub fn open_pet_notification(
    app: AppHandle,
    request: PetOpenSessionRequest,
) -> Result<(), String> {
    if request.mark_read {
        mark_pet_notification_read(request.notification_id.clone())?;
        app.emit("pet-notification-read-state-updated", ())
            .map_err(|e| format!("emit pet read state update: {e}"))?;
    }

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.unminimize();
        let _ = main_window.set_focus();
        main_window
            .emit("pet-open-session", &request)
            .map_err(|e| format!("emit pet open session: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{mark_read_id, PetNotificationReadState};

    #[test]
    fn mark_read_id_inserts_once() {
        let mut state = PetNotificationReadState::default();
        assert!(mark_read_id(&mut state, "done:runtime-1".to_string()));
        assert!(!mark_read_id(&mut state, "done:runtime-1".to_string()));
        assert_eq!(state.read_notification_ids.len(), 1);
    }

    #[test]
    fn read_state_uses_camel_case_json() {
        let mut state = PetNotificationReadState::default();
        mark_read_id(&mut state, "done:runtime-1".to_string());

        let value = serde_json::to_value(&state).expect("read state serialize");
        assert_eq!(
            value["readNotificationIds"][0],
            serde_json::Value::String("done:runtime-1".to_string())
        );
    }
}
