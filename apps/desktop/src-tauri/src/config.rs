use crate::crypto;
use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::path::PathBuf; // 文件锁支持

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub base_url: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_MODEL")]
    pub model: Option<String>,
    #[serde(rename = "ANTHROPIC_SMALL_FAST_MODEL")]
    pub small_model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CcemConfig {
    #[serde(default)]
    pub registries: HashMap<String, EnvConfig>,
    #[serde(default)]
    pub current: Option<String>,
    #[serde(rename = "defaultMode", default)]
    pub default_mode: Option<String>,
}

impl Default for CcemConfig {
    fn default() -> Self {
        let mut registries = HashMap::new();
        registries.insert(
            "official".to_string(),
            EnvConfig {
                base_url: Some("https://api.anthropic.com".to_string()),
                api_key: None,
                model: Some("claude-sonnet-4-5-20250929".to_string()),
                small_model: Some("claude-haiku-4-5-20251001".to_string()),
            },
        );
        Self {
            registries,
            current: Some("official".to_string()),
            default_mode: None,
        }
    }
}

// ============================================================================
// App Config (Desktop-only configuration for working directory management)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct FavoriteProject {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentProject {
    pub path: String,
    #[serde(rename = "lastUsed")]
    pub last_used: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VSCodeProject {
    pub path: String,
    #[serde(rename = "syncedAt")]
    pub synced_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JetBrainsProject {
    pub path: String,
    pub ide: String, // e.g., "WebStorm", "IntelliJ IDEA", "PyCharm"
    #[serde(rename = "syncedAt")]
    pub synced_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    pub favorites: Vec<FavoriteProject>,
    pub recent: Vec<RecentProject>,
    #[serde(rename = "vscodeProjects")]
    pub vscode_projects: Vec<VSCodeProject>,
    #[serde(rename = "jetbrainsProjects", default)]
    pub jetbrains_projects: Vec<JetBrainsProject>,
    #[serde(rename = "defaultWorkingDir", default)]
    pub default_working_dir: Option<String>,
}

/// Get ~/.ccem/ directory path
pub fn get_ccem_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".ccem")
}

/// Get ~/.ccem/config.json path
pub fn get_config_path() -> PathBuf {
    get_ccem_dir().join("config.json")
}

/// Get legacy config path (conf package default)
pub fn get_legacy_config_path() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    #[cfg(target_os = "macos")]
    {
        home.join("Library")
            .join("Preferences")
            .join("claude-code-env-manager-nodejs")
            .join("config.json")
    }
    #[cfg(not(target_os = "macos"))]
    {
        home.join(".config")
            .join("claude-code-env-manager-nodejs")
            .join("config.json")
    }
}

/// Get ~/.ccem/app.json path (desktop-only config)
pub fn get_app_config_path() -> PathBuf {
    get_ccem_dir().join("app.json")
}

/// Ensure ~/.ccem/ directory exists
pub fn ensure_ccem_dir() -> std::io::Result<()> {
    let dir = get_ccem_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// Migrate config from legacy path if needed
pub fn migrate_if_needed() -> Result<bool, String> {
    let new_path = get_config_path();
    let legacy_path = get_legacy_config_path();

    // Already migrated
    if new_path.exists() {
        return Ok(false);
    }

    // No legacy config
    if !legacy_path.exists() {
        return Ok(false);
    }

    // Perform migration
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;
    fs::copy(&legacy_path, &new_path).map_err(|e| format!("Failed to copy config: {}", e))?;

    println!("CCEM: Config migrated to ~/.ccem/");
    Ok(true)
}

/// Read config from ~/.ccem/config.json with file lock
pub fn read_config() -> Result<CcemConfig, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok(CcemConfig::default());
    }

    // 获取共享锁（允许多个读者）
    let lock_file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(&config_path)
        .map_err(|e| format!("Failed to open config for locking: {}", e))?;

    lock_file
        .lock_shared()
        .map_err(|e| format!("Failed to acquire read lock: {}", e))?;

    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;

    let config =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;

    // 锁会在 lock_file drop 时自动释放
    Ok(config)
}

/// Write config to ~/.ccem/config.json with file lock and atomic write
pub fn write_config(config: &CcemConfig) -> Result<(), String> {
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;

    let config_path = get_config_path();
    let temp_path = config_path.with_extension("tmp");

    // 序列化配置
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    // 获取文件锁（如果文件不存在会创建）
    let lock_file = OpenOptions::new()
        .create(true)
        .write(true)
        .open(&config_path)
        .map_err(|e| format!("Failed to open config for locking: {}", e))?;

    // 加排他锁
    lock_file
        .lock_exclusive()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // 写入临时文件
    fs::write(&temp_path, &content).map_err(|e| format!("Failed to write temp config: {}", e))?;

    // 原子替换（rename 是原子操作）
    fs::rename(&temp_path, &config_path)
        .map_err(|e| format!("Failed to rename temp config: {}", e))?;

    // 锁会在 lock_file drop 时自动释放
    Ok(())
}

/// Read app config from ~/.ccem/app.json
pub fn read_app_config() -> Result<AppConfig, String> {
    let config_path = get_app_config_path();

    if !config_path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read app config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse app config: {}", e))
}

/// Write app config to ~/.ccem/app.json
pub fn write_app_config(config: &AppConfig) -> Result<(), String> {
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize app config: {}", e))?;

    fs::write(get_app_config_path(), content)
        .map_err(|e| format!("Failed to write app config: {}", e))
}

/// Get environment config with decrypted API key
pub fn get_env_with_decrypted_key(env: &EnvConfig) -> EnvConfig {
    EnvConfig {
        base_url: env.base_url.clone(),
        api_key: env
            .api_key
            .as_ref()
            .map(|k| crypto::decrypt(k).unwrap_or_else(|_| k.clone())),
        model: env.model.clone(),
        small_model: env.small_model.clone(),
    }
}

/// Get default working directory from app config (validated)
pub fn get_default_working_dir() -> Option<String> {
    read_app_config()
        .ok()
        .and_then(|cfg| cfg.default_working_dir)
        .filter(|d| !d.is_empty() && std::path::Path::new(d).is_dir())
}

// ============================================================================
// Desktop Settings (stored in ~/.ccem/settings.json)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DesktopSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(rename = "autoStart", default)]
    pub auto_start: bool,
    #[serde(rename = "startMinimized", default)]
    pub start_minimized: bool,
    #[serde(rename = "closeToTray", default = "default_close_to_tray")]
    pub close_to_tray: bool,
    #[serde(rename = "defaultMode", default)]
    pub default_mode: Option<String>,
}

fn default_theme() -> String {
    "system".to_string()
}
fn default_close_to_tray() -> bool {
    true
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            auto_start: false,
            start_minimized: false,
            close_to_tray: default_close_to_tray(),
            default_mode: None,
        }
    }
}

pub fn get_settings_path() -> PathBuf {
    get_ccem_dir().join("settings.json")
}

pub fn read_settings() -> Result<DesktopSettings, String> {
    let path = get_settings_path();
    if !path.exists() {
        return Ok(DesktopSettings::default());
    }
    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read settings: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))
}

pub fn write_settings(settings: &DesktopSettings) -> Result<(), String> {
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(get_settings_path(), content).map_err(|e| format!("Failed to write settings: {}", e))
}

/// Create environment config with encrypted API key
pub fn create_env_with_encrypted_key(
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
    small_model: Option<String>,
) -> EnvConfig {
    EnvConfig {
        base_url,
        api_key: api_key.map(|k| crypto::encrypt(&k)),
        model,
        small_model,
    }
}
