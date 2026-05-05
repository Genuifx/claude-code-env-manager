use std::sync::Mutex;
use std::time::Duration;

use semver::Version;
use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const RELEASE_URL_PREFIX: &str =
    "https://github.com/Genuifx/claude-code-env-manager/releases/tag/v";

#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<Update>>);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateMetadata {
    version: String,
    current_version: String,
    channel: String,
    release_tag: String,
    release_url: String,
    date: Option<String>,
    body: Option<String>,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    pending_update: State<'_, PendingUpdate>,
) -> Result<Option<AppUpdateMetadata>, String> {
    let update = app
        .updater_builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    let metadata = update.as_ref().map(|update| AppUpdateMetadata {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        channel: version_channel(&update.version),
        release_tag: release_tag(&update.version),
        release_url: release_url(&update.version),
        date: update.date.map(|date| date.to_string()),
        body: update.body.clone(),
    });

    replace_pending_update(&pending_update, update)?;
    Ok(metadata)
}

#[tauri::command]
pub async fn install_app_update(pending_update: State<'_, PendingUpdate>) -> Result<(), String> {
    let update = take_pending_update(&pending_update)?;

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}

fn parse_version(raw: &str) -> Result<Version, String> {
    Version::parse(raw.trim_start_matches('v'))
        .map_err(|error| format!("Invalid app version {raw}: {error}"))
}

fn release_tag(version: &str) -> String {
    format!("v{}", version.trim_start_matches('v'))
}

fn release_url(version: &str) -> String {
    format!("{RELEASE_URL_PREFIX}{}", version.trim_start_matches('v'))
}

fn version_channel(version: &str) -> String {
    parse_version(version)
        .map(|version| {
            if version.pre.is_empty() {
                "stable"
            } else {
                "beta"
            }
        })
        .unwrap_or("stable")
        .to_string()
}

fn replace_pending_update(
    pending_update: &State<'_, PendingUpdate>,
    update: Option<Update>,
) -> Result<(), String> {
    let mut guard = pending_update
        .0
        .lock()
        .map_err(|_| "Pending update state is unavailable".to_string())?;
    *guard = update;
    Ok(())
}

fn take_pending_update(pending_update: &State<'_, PendingUpdate>) -> Result<Update, String> {
    pending_update
        .0
        .lock()
        .map_err(|_| "Pending update state is unavailable".to_string())?
        .take()
        .ok_or_else(|| "No pending update to install".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn release_tag_adds_v_prefix_once() {
        assert_eq!(release_tag("2.1.0"), "v2.1.0");
        assert_eq!(release_tag("v2.1.0"), "v2.1.0");
    }

    #[test]
    fn release_url_points_to_matching_tag() {
        assert_eq!(
            release_url("2.1.0"),
            "https://github.com/Genuifx/claude-code-env-manager/releases/tag/v2.1.0"
        );
    }

    #[test]
    fn version_channel_detects_prereleases() {
        assert_eq!(version_channel("2.1.0"), "stable");
        assert_eq!(version_channel("2.1.0-beta.1"), "beta");
    }

    #[test]
    fn parse_version_accepts_optional_v_prefix() {
        assert_eq!(
            parse_version("v2.1.0").unwrap(),
            Version::parse("2.1.0").unwrap()
        );
    }
}
