use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

pub const DEFAULT_WECOM_WS_URL: &str = "wss://openws.work.weixin.qq.com";
pub const DEFAULT_ALLOWED_INTENT: &str = "weekly_report";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WecomSettings {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub bots: Vec<WecomBotConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WecomBotConfig {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "botId", alias = "bot_id")]
    pub bot_id: String,
    #[serde(default)]
    pub secret: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(rename = "workspaceDir", alias = "workspace_dir")]
    pub workspace_dir: String,
    #[serde(rename = "adminUserIds", alias = "admin_user_ids", default)]
    pub admin_user_ids: Vec<String>,
    #[serde(rename = "allowedUserIds", alias = "allowed_user_ids", default)]
    pub allowed_user_ids: Vec<String>,
    #[serde(
        rename = "allowedGroupChatIds",
        alias = "allowed_group_chat_ids",
        default
    )]
    pub allowed_group_chat_ids: Vec<String>,
    #[serde(
        rename = "allowedIntents",
        alias = "allowed_intents",
        default = "default_allowed_intents"
    )]
    pub allowed_intents: Vec<String>,
    #[serde(rename = "requireMention", alias = "require_mention", default)]
    pub require_mention: bool,
    #[serde(rename = "mentionPatterns", alias = "mention_patterns", default)]
    pub mention_patterns: Vec<String>,
    #[serde(
        rename = "adminPermMode",
        alias = "admin_perm_mode",
        default = "default_admin_perm_mode"
    )]
    pub admin_perm_mode: String,
    #[serde(
        rename = "userPermMode",
        alias = "user_perm_mode",
        default = "default_user_perm_mode"
    )]
    pub user_perm_mode: String,
    #[serde(rename = "defaultEnvName", alias = "default_env_name", default)]
    pub default_env_name: Option<String>,
    #[serde(rename = "wsUrl", alias = "ws_url", default = "default_ws_url")]
    pub ws_url: String,
}

impl Default for WecomBotConfig {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            bot_id: String::new(),
            secret: None,
            enabled: true,
            workspace_dir: String::new(),
            admin_user_ids: Vec::new(),
            allowed_user_ids: Vec::new(),
            allowed_group_chat_ids: Vec::new(),
            allowed_intents: default_allowed_intents(),
            require_mention: false,
            mention_patterns: Vec::new(),
            admin_perm_mode: default_admin_perm_mode(),
            user_perm_mode: default_user_perm_mode(),
            default_env_name: None,
            ws_url: default_ws_url(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WecomBridgeStatus {
    pub configured: bool,
    pub running: bool,
    #[serde(rename = "activeBotCount")]
    pub active_bot_count: usize,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
    #[serde(default)]
    pub bots: Vec<WecomBotStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WecomBotStatus {
    pub id: String,
    #[serde(rename = "botId")]
    pub bot_id: String,
    pub name: String,
    pub configured: bool,
    pub running: bool,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
    #[serde(rename = "connectedAt", skip_serializing_if = "Option::is_none")]
    pub connected_at: Option<DateTime<Utc>>,
}

pub fn default_allowed_intents() -> Vec<String> {
    vec![DEFAULT_ALLOWED_INTENT.to_string()]
}

pub fn default_admin_perm_mode() -> String {
    "dev".to_string()
}

pub fn default_user_perm_mode() -> String {
    "readonly".to_string()
}

pub fn default_ws_url() -> String {
    DEFAULT_WECOM_WS_URL.to_string()
}

fn default_true() -> bool {
    true
}
