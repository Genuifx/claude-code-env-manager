use crate::crypto;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

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
    pub ide: String,  // e.g., "WebStorm", "IntelliJ IDEA", "PyCharm"
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

/// Read config from ~/.ccem/config.json
pub fn read_config() -> Result<CcemConfig, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok(CcemConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

/// Write config to ~/.ccem/config.json
pub fn write_config(config: &CcemConfig) -> Result<(), String> {
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(get_config_path(), content).map_err(|e| format!("Failed to write config: {}", e))
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
        api_key: env.api_key.as_ref().map(|k| crypto::decrypt(k).unwrap_or_else(|_| k.clone())),
        model: env.model.clone(),
        small_model: env.small_model.clone(),
    }
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
