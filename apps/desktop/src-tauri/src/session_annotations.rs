// apps/desktop/src-tauri/src/session_annotations.rs
//
// User-editable workflow stage, expressive sticker, and short label metadata
// for history sessions. Persisted outside provider history so Claude/Codex files
// remain immutable.

use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::config::get_ccem_dir;

const VALID_STAGES: &[&str] = &[
    "ideation",
    "implementation",
    "validation",
    "release",
    "done",
];
const VALID_STICKERS: &[&str] = &[
    "focused",
    "excited",
    "calm",
    "blocked",
    "confused",
    "waiting",
    "urgent",
    "reviewing",
    "shipping",
    "celebrating",
    "risky",
    "archived",
];
const MAX_LABEL_CHARS: usize = 24;

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
pub struct SessionAnnotation {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stage: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sticker: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub updated_at: u64,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct SessionAnnotations {
    entries: HashMap<String, SessionAnnotation>,
}

impl SessionAnnotations {
    fn path() -> PathBuf {
        get_ccem_dir().join("session_annotations.json")
    }

    fn lock_path() -> PathBuf {
        get_ccem_dir().join("session_annotations.json.lock")
    }

    fn key(source: &str, id: &str) -> String {
        format!("{}:{}", source, id)
    }

    pub fn load() -> Self {
        Self::load_from_path(&Self::path()).unwrap_or_default()
    }

    pub fn load_from_path(path: &Path) -> std::io::Result<Self> {
        match fs::read_to_string(path) {
            Ok(content) => Ok(serde_json::from_str(&content).unwrap_or_default()),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(Self::default()),
            Err(error) => Err(error),
        }
    }

    pub fn save_to_path(&self, path: &Path) -> std::io::Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(self)
            .map_err(|error| std::io::Error::new(ErrorKind::InvalidData, error))?;
        fs::write(path, json)
    }

    fn load_locked() -> std::io::Result<(Self, fs::File)> {
        let path = Self::path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let lock_file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(Self::lock_path())?;
        lock_file.lock_exclusive()?;

        let data = Self::load_from_path(&path).unwrap_or_default();
        Ok((data, lock_file))
    }

    fn save_locked(&self) -> std::io::Result<()> {
        let path = Self::path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let json = serde_json::to_string_pretty(self)
            .map_err(|error| std::io::Error::new(ErrorKind::InvalidData, error))?;
        let tmp = path.with_extension("tmp");
        fs::write(&tmp, json)?;
        fs::rename(tmp, path)
    }

    pub fn get(&self, source: &str, id: &str) -> Option<&SessionAnnotation> {
        self.entries.get(&Self::key(source, id))
    }

    pub fn set(&mut self, source: &str, id: &str, annotation: SessionAnnotation) {
        self.entries.insert(Self::key(source, id), annotation);
    }

    pub fn remove(&mut self, source: &str, id: &str) {
        self.entries.remove(&Self::key(source, id));
    }

    pub fn validate_stage(value: Option<&str>) -> Result<(), String> {
        match value {
            Some(stage) if !VALID_STAGES.contains(&stage) => {
                Err(format!("Unsupported session stage: {}", stage))
            }
            _ => Ok(()),
        }
    }

    pub fn validate_sticker(value: Option<&str>) -> Result<(), String> {
        match value {
            Some(sticker) if !VALID_STICKERS.contains(&sticker) => {
                Err(format!("Unsupported session sticker: {}", sticker))
            }
            _ => Ok(()),
        }
    }
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn normalize_label(value: Option<String>) -> Option<String> {
    normalize_optional(value).map(|label| label.chars().take(MAX_LABEL_CHARS).collect())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[tauri::command]
pub async fn set_session_annotation(
    source: String,
    session_id: String,
    stage: Option<String>,
    sticker: Option<String>,
    label: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let stage = normalize_optional(stage);
        let sticker = normalize_optional(sticker);
        let label = normalize_label(label);

        SessionAnnotations::validate_stage(stage.as_deref())?;
        SessionAnnotations::validate_sticker(sticker.as_deref())?;

        let (mut annotations, _lock) = SessionAnnotations::load_locked()
            .map_err(|error| format!("Failed to acquire annotation lock: {}", error))?;

        if stage.is_none() && sticker.is_none() && label.is_none() {
            annotations.remove(&source, &session_id);
        } else {
            annotations.set(
                &source,
                &session_id,
                SessionAnnotation {
                    stage,
                    sticker,
                    label,
                    updated_at: now_secs(),
                },
            );
        }

        annotations
            .save_locked()
            .map_err(|error| format!("Failed to save session annotation: {}", error))?;
        Ok(())
    })
    .await
    .map_err(|error| format!("Task error: {}", error))?
}

#[tauri::command]
pub async fn clear_session_annotation(source: String, session_id: String) -> Result<(), String> {
    set_session_annotation(source, session_id, None, None, None).await
}

#[cfg(test)]
mod tests {
    use super::{SessionAnnotation, SessionAnnotations};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_annotations_path(prefix: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        std::env::temp_dir().join(format!("ccem-session-annotations-{prefix}-{unique}.json"))
    }

    #[test]
    fn stores_and_reloads_session_annotation_by_source_and_id() {
        let path = temp_annotations_path("roundtrip");
        let mut annotations = SessionAnnotations::default();

        annotations.set(
            "codex",
            "session-1",
            SessionAnnotation {
                stage: Some("validation".to_string()),
                sticker: Some("focused".to_string()),
                label: Some("等我跑完整回归".to_string()),
                updated_at: 42,
            },
        );
        annotations.save_to_path(&path).expect("save annotations");

        let reloaded = SessionAnnotations::load_from_path(&path).expect("load annotations");
        let annotation = reloaded
            .get("codex", "session-1")
            .expect("annotation exists");

        assert_eq!(annotation.stage.as_deref(), Some("validation"));
        assert_eq!(annotation.sticker.as_deref(), Some("focused"));
        assert_eq!(annotation.label.as_deref(), Some("等我跑完整回归"));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_unknown_stages_and_stickers() {
        assert!(SessionAnnotations::validate_stage(Some("validation")).is_ok());
        assert!(SessionAnnotations::validate_stage(Some("bogus")).is_err());
        assert!(SessionAnnotations::validate_sticker(Some("celebrating")).is_ok());
        assert!(SessionAnnotations::validate_sticker(Some("bogus")).is_err());
    }
}
