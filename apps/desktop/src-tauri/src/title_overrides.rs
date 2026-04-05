// apps/desktop/src-tauri/src/title_overrides.rs
//
// User-editable title overrides for history sessions.
// Persisted to ~/.ccem/title_overrides.json with atomic writes + file locking.

use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::ErrorKind;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::config::get_ccem_dir;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TitleOverride {
    pub title: String,
    pub updated_at: u64,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct TitleOverrides {
    entries: HashMap<String, TitleOverride>,
}

impl TitleOverrides {
    fn path() -> PathBuf {
        get_ccem_dir().join("title_overrides.json")
    }

    fn lock_path() -> PathBuf {
        get_ccem_dir().join("title_overrides.json.lock")
    }

    /// Acquire an exclusive lock and load from disk.
    fn load_locked() -> std::io::Result<(Self, fs::File)> {
        let path = Self::path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let lock_file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(Self::lock_path())?;

        lock_file.lock_exclusive()?;

        let data = match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(e) if e.kind() == ErrorKind::NotFound => Self::default(),
            Err(_) => Self::default(),
        };

        Ok((data, lock_file))
    }

    /// Load without locking (read-only, e.g. for overlay in get_conversation_history).
    pub fn load() -> Self {
        match fs::read_to_string(Self::path()) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(e) if e.kind() == ErrorKind::NotFound => Self::default(),
            Err(_) => Self::default(),
        }
    }

    /// Atomic write: write-to-tmp + rename. Caller must hold the lock.
    fn save_locked(&self) -> std::io::Result<()> {
        let path = Self::path();
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(ErrorKind::InvalidData, e))?;
        let tmp = path.with_extension("tmp");
        fs::write(&tmp, json)?;
        fs::rename(tmp, path)
    }

    pub fn get(&self, source: &str, id: &str) -> Option<&TitleOverride> {
        self.entries.get(&format!("{}:{}", source, id))
    }

    pub fn set(&mut self, source: &str, id: &str, title: String) {
        let key = format!("{}:{}", source, id);
        let updated_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.entries.insert(key, TitleOverride { title, updated_at });
    }

    pub fn remove(&mut self, source: &str, id: &str) {
        self.entries.remove(&format!("{}:{}", source, id));
    }
}

#[tauri::command]
pub async fn set_session_title(
    source: String,
    session_id: String,
    title: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (mut overrides, _lock) = TitleOverrides::load_locked()
            .map_err(|e| format!("Failed to acquire lock: {}", e))?;
        let trimmed = title.trim();
        if trimmed.is_empty() {
            overrides.remove(&source, &session_id);
        } else {
            overrides.set(&source, &session_id, trimmed.to_string());
        }
        overrides
            .save_locked()
            .map_err(|e| format!("Failed to save title override: {}", e))?;
        // _lock dropped here, releasing the exclusive lock
        Ok(())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}
