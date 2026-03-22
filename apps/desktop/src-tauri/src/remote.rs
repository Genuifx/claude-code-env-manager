use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum RemotePlatform {
    Telegram,
    Weixin,
}

impl RemotePlatform {
    pub fn display_name(self) -> &'static str {
        match self {
            Self::Telegram => "Telegram",
            Self::Weixin => "Weixin",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct RemotePeerRef {
    pub platform: RemotePlatform,
    pub peer_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thread_id: Option<String>,
}

impl RemotePeerRef {
    pub fn telegram(chat_id: i64, thread_id: Option<i64>) -> Self {
        Self {
            platform: RemotePlatform::Telegram,
            peer_id: chat_id.to_string(),
            thread_id: thread_id.map(|value| value.to_string()),
        }
    }

    pub fn weixin(peer_id: impl Into<String>) -> Self {
        Self {
            platform: RemotePlatform::Weixin,
            peer_id: peer_id.into(),
            thread_id: None,
        }
    }
}
