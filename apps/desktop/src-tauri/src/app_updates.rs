use std::sync::Mutex;
use std::time::Duration;

use semver::Version;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const GITHUB_RELEASES_URL: &str =
    "https://api.github.com/repos/Genuifx/claude-code-env-manager/releases?per_page=50";
const GITHUB_USER_AGENT: &str = "ccem-desktop-updater";

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

#[derive(Debug, Clone, Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
    draft: bool,
    prerelease: bool,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Clone, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
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
    let current_version = parse_version(env!("CARGO_PKG_VERSION"))?;
    let releases = fetch_github_releases().await?;
    let Some(release) = select_update_release(&current_version, &releases) else {
        replace_pending_update(&pending_update, None)?;
        return Ok(None);
    };

    let latest_json_url = release
        .latest_json_url()
        .ok_or_else(|| format!("Release {} is missing latest.json", release.tag_name))?;
    let endpoint = reqwest::Url::parse(latest_json_url)
        .map_err(|error| format!("Invalid update endpoint: {error}"))?;

    let update = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|error| error.to_string())?
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    let metadata = update.as_ref().map(|update| AppUpdateMetadata {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        channel: if release.prerelease { "beta" } else { "stable" }.to_string(),
        release_tag: release.tag_name.clone(),
        release_url: release.html_url.clone(),
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

async fn fetch_github_releases() -> Result<Vec<GithubRelease>, String> {
    let response = reqwest::Client::new()
        .get(GITHUB_RELEASES_URL)
        .header(reqwest::header::USER_AGENT, GITHUB_USER_AGENT)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| format!("Failed to query GitHub releases: {error}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("GitHub releases request failed with status {status}"));
    }

    response
        .json::<Vec<GithubRelease>>()
        .await
        .map_err(|error| format!("Failed to parse GitHub releases: {error}"))
}

fn parse_version(raw: &str) -> Result<Version, String> {
    Version::parse(raw.trim_start_matches('v'))
        .map_err(|error| format!("Invalid app version {raw}: {error}"))
}

fn select_update_release<'a>(
    current_version: &Version,
    releases: &'a [GithubRelease],
) -> Option<&'a GithubRelease> {
    releases
        .iter()
        .filter(|release| !release.draft && release.latest_json_url().is_some())
        .filter_map(|release| {
            release
                .version()
                .map(|version| (release, version))
        })
        .filter(|(release, version)| {
            version > current_version && is_channel_eligible(current_version, release)
        })
        .max_by(|(_, left), (_, right)| left.cmp(right))
        .map(|(release, _)| release)
}

fn is_channel_eligible(current_version: &Version, release: &GithubRelease) -> bool {
    if current_version.pre.is_empty() {
        !release.prerelease
    } else {
        true
    }
}

impl GithubRelease {
    fn latest_json_url(&self) -> Option<&str> {
        self.assets
            .iter()
            .find(|asset| asset.name == "latest.json")
            .map(|asset| asset.browser_download_url.as_str())
    }

    fn version(&self) -> Option<Version> {
        Version::parse(self.tag_name.trim_start_matches('v')).ok()
    }
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

    fn release(tag: &str, prerelease: bool, has_manifest: bool) -> GithubRelease {
        GithubRelease {
            tag_name: tag.to_string(),
            html_url: format!("https://github.com/Genuifx/claude-code-env-manager/releases/tag/{tag}"),
            draft: false,
            prerelease,
            assets: if has_manifest {
                vec![GithubAsset {
                    name: "latest.json".to_string(),
                    browser_download_url: format!(
                        "https://github.com/Genuifx/claude-code-env-manager/releases/download/{tag}/latest.json"
                    ),
                }]
            } else {
                Vec::new()
            },
        }
    }

    #[test]
    fn beta_versions_can_update_to_newer_beta() {
        let current = parse_version("2.0.0-beta.33").unwrap();
        let releases = vec![
            release("v2.0.0-beta.34", true, true),
            release("v2.0.0-beta.33", true, true),
        ];

        let selected = select_update_release(&current, &releases).unwrap();
        assert_eq!(selected.tag_name, "v2.0.0-beta.34");
    }

    #[test]
    fn beta_versions_can_graduate_to_stable() {
        let current = parse_version("2.0.0-beta.34").unwrap();
        let releases = vec![
            release("v2.0.0", false, true),
            release("v2.0.0-beta.34", true, true),
        ];

        let selected = select_update_release(&current, &releases).unwrap();
        assert_eq!(selected.tag_name, "v2.0.0");
    }

    #[test]
    fn stable_versions_ignore_prereleases() {
        let current = parse_version("2.0.0").unwrap();
        let releases = vec![
            release("v2.1.0-beta.1", true, true),
            release("v2.0.1", false, true),
        ];

        let selected = select_update_release(&current, &releases).unwrap();
        assert_eq!(selected.tag_name, "v2.0.1");
    }

    #[test]
    fn releases_without_manifest_are_skipped() {
        let current = parse_version("2.0.0-beta.33").unwrap();
        let releases = vec![
            release("v2.0.0-beta.35", true, false),
            release("v2.0.0-beta.34", true, true),
        ];

        let selected = select_update_release(&current, &releases).unwrap();
        assert_eq!(selected.tag_name, "v2.0.0-beta.34");
    }
}
