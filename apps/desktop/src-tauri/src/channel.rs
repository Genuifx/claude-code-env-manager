use crate::event_bus::SessionEventRecord;
use crate::remote::RemotePeerRef;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

pub const LEGACY_MANAGED_SESSION_EVENT: &str = "managed-session-event";
pub const HEADLESS_SESSION_EVENT: &str = "headless-session-event";
pub const INTERACTIVE_SESSION_EVENT: &str = "interactive-session-event";
pub const INTERACTIVE_OUTPUT_EVENT: &str = "interactive-session-output";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ChannelKind {
    DesktopUi,
    Telegram {
        chat_id: i64,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        thread_id: Option<i64>,
    },
    Weixin {
        peer_id: String,
    },
}

impl ChannelKind {
    pub fn remote_peer_ref(&self) -> Option<RemotePeerRef> {
        match self {
            Self::DesktopUi => None,
            Self::Telegram { chat_id, thread_id } => {
                Some(RemotePeerRef::telegram(*chat_id, *thread_id))
            }
            Self::Weixin { peer_id } => Some(RemotePeerRef::weixin(peer_id.clone())),
        }
    }

    pub fn is_managed_remote(&self) -> bool {
        self.remote_peer_ref().is_some()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AttachedChannelInfo {
    pub kind: ChannelKind,
    pub connected_at: DateTime<Utc>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InteractiveOutputChunk {
    pub session_id: String,
    pub seq: u64,
    pub occurred_at: DateTime<Utc>,
    pub data: String,
}

pub trait OutputChannel: Send + Sync {
    fn channel_kind(&self) -> ChannelKind;

    fn connected_at(&self) -> DateTime<Utc>;

    fn label(&self) -> Option<String> {
        None
    }

    fn send_event(&self, event: &SessionEventRecord) -> Result<(), String>;

    fn send_interactive_output(&self, _chunk: &InteractiveOutputChunk) -> Result<(), String> {
        Ok(())
    }

    fn is_connected(&self) -> bool;
}

#[derive(Clone)]
pub struct DesktopChannel {
    app: AppHandle,
    session_event_names: &'static [&'static str],
    interactive_output_event_name: Option<&'static str>,
    connected_at: DateTime<Utc>,
}

impl DesktopChannel {
    pub fn headless(app: AppHandle) -> Self {
        Self {
            app,
            session_event_names: &[LEGACY_MANAGED_SESSION_EVENT, HEADLESS_SESSION_EVENT],
            interactive_output_event_name: None,
            connected_at: Utc::now(),
        }
    }

    pub fn interactive(app: AppHandle) -> Self {
        Self {
            app,
            session_event_names: &[INTERACTIVE_SESSION_EVENT],
            interactive_output_event_name: Some(INTERACTIVE_OUTPUT_EVENT),
            connected_at: Utc::now(),
        }
    }
}

impl OutputChannel for DesktopChannel {
    fn channel_kind(&self) -> ChannelKind {
        ChannelKind::DesktopUi
    }

    fn connected_at(&self) -> DateTime<Utc> {
        self.connected_at
    }

    fn send_event(&self, event: &SessionEventRecord) -> Result<(), String> {
        for event_name in self.session_event_names {
            self.app
                .emit(*event_name, event)
                .map_err(|error| format!("Failed to emit {}: {}", event_name, error))?;
        }
        Ok(())
    }

    fn send_interactive_output(&self, chunk: &InteractiveOutputChunk) -> Result<(), String> {
        if let Some(event_name) = self.interactive_output_event_name {
            self.app
                .emit(event_name, chunk)
                .map_err(|error| format!("Failed to emit {}: {}", event_name, error))?;
        }
        Ok(())
    }

    fn is_connected(&self) -> bool {
        true
    }
}
