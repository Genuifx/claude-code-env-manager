use crate::channel::{AttachedChannelInfo, ChannelKind};
use crate::runtime::{ManagedSessionSource, RuntimeKind};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RuntimeInput {
    Message {
        text: String,
    },
    Approval {
        approved: bool,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        responder: Option<String>,
    },
    RawTerminal {
        data: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UnifiedSessionInfo {
    pub id: String,
    pub runtime_kind: RuntimeKind,
    pub source: ManagedSessionSource,
    pub status: String,
    pub project_dir: String,
    pub env_name: String,
    pub perm_mode: String,
    pub created_at: DateTime<Utc>,
    pub is_active: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub claude_session_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tmux_target: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client: Option<String>,
    #[serde(default)]
    pub channels: Vec<AttachedChannelInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UnifiedSessionDebugComparison {
    pub headless_count: usize,
    pub interactive_count: usize,
    pub unified_count: usize,
    pub matched: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChannelAttachmentRequest {
    pub runtime_id: String,
    pub channel: ChannelKind,
}
