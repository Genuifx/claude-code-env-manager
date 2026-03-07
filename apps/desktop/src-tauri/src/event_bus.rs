use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

pub const DEFAULT_SESSION_EVENT_CAPACITY: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SessionEventPayload {
    SystemMessage {
        message: String,
    },
    Lifecycle {
        stage: String,
        detail: String,
    },
    ClaudeJson {
        message_type: Option<String>,
        raw_json: String,
    },
    StdErrLine {
        line: String,
    },
    AssistantChunk {
        text: String,
    },
    PermissionRequired {
        request_id: String,
        tool_name: String,
    },
    PermissionResponded {
        request_id: String,
        approved: bool,
        responder: String,
    },
    SessionCompleted {
        reason: String,
    },
    GapNotification {
        last_seen_seq: u64,
        oldest_available_seq: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SessionEventRecord {
    pub runtime_id: String,
    pub seq: u64,
    pub occurred_at: DateTime<Utc>,
    pub payload: SessionEventPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReplayBatch {
    pub gap_detected: bool,
    pub oldest_available_seq: Option<u64>,
    pub newest_available_seq: Option<u64>,
    pub events: Vec<SessionEventRecord>,
}

pub struct SessionStore {
    runtime_id: String,
    capacity: usize,
    next_seq: u64,
    events: VecDeque<SessionEventRecord>,
}

impl SessionStore {
    pub fn new(runtime_id: impl Into<String>) -> Self {
        Self::with_capacity(runtime_id, DEFAULT_SESSION_EVENT_CAPACITY)
    }

    pub fn with_capacity(runtime_id: impl Into<String>, capacity: usize) -> Self {
        assert!(
            capacity > 0,
            "session event capacity must be greater than zero"
        );

        Self {
            runtime_id: runtime_id.into(),
            capacity,
            next_seq: 1,
            events: VecDeque::with_capacity(capacity),
        }
    }

    pub fn append(&mut self, payload: SessionEventPayload) -> SessionEventRecord {
        let record = SessionEventRecord {
            runtime_id: self.runtime_id.clone(),
            seq: self.next_seq,
            occurred_at: Utc::now(),
            payload,
        };
        self.next_seq += 1;

        if self.events.len() == self.capacity {
            self.events.pop_front();
        }

        self.events.push_back(record.clone());
        record
    }

    pub fn events_since(&self, last_seen_seq: Option<u64>) -> ReplayBatch {
        let oldest_available_seq = self.oldest_seq();
        let newest_available_seq = self.newest_seq();
        let gap_detected = match (last_seen_seq, oldest_available_seq) {
            (Some(last_seen), Some(oldest)) => last_seen.saturating_add(1) < oldest,
            _ => false,
        };

        let events = match last_seen_seq {
            Some(last_seen) => self
                .events
                .iter()
                .filter(|event| event.seq > last_seen)
                .cloned()
                .collect(),
            None => self.events.iter().cloned().collect(),
        };

        ReplayBatch {
            gap_detected,
            oldest_available_seq,
            newest_available_seq,
            events,
        }
    }

    pub fn len(&self) -> usize {
        self.events.len()
    }

    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }

    pub fn oldest_seq(&self) -> Option<u64> {
        self.events.front().map(|event| event.seq)
    }

    pub fn newest_seq(&self) -> Option<u64> {
        self.events.back().map(|event| event.seq)
    }
}

#[cfg(test)]
mod tests {
    use super::{SessionEventPayload, SessionStore};

    #[test]
    fn session_store_emits_monotonic_sequence_numbers() {
        let mut store = SessionStore::new("runtime-1");

        assert!(store.is_empty());

        let first = store.append(SessionEventPayload::SystemMessage {
            message: "boot".to_string(),
        });
        let second = store.append(SessionEventPayload::AssistantChunk {
            text: "hello".to_string(),
        });
        let third = store.append(SessionEventPayload::SessionCompleted {
            reason: "done".to_string(),
        });

        assert_eq!(first.seq, 1);
        assert_eq!(second.seq, 2);
        assert_eq!(third.seq, 3);
        assert_eq!(store.len(), 3);
        assert_eq!(store.oldest_seq(), Some(1));
        assert_eq!(store.newest_seq(), Some(3));
    }

    #[test]
    fn session_store_replays_only_unseen_events() {
        let mut store = SessionStore::with_capacity("runtime-1", 5);
        store.append(SessionEventPayload::SystemMessage {
            message: "boot".to_string(),
        });
        store.append(SessionEventPayload::AssistantChunk {
            text: "step-1".to_string(),
        });
        store.append(SessionEventPayload::AssistantChunk {
            text: "step-2".to_string(),
        });

        let replay = store.events_since(Some(1));

        assert!(!replay.gap_detected);
        assert_eq!(replay.events.len(), 2);
        assert_eq!(replay.events[0].seq, 2);
        assert_eq!(replay.events[1].seq, 3);
    }

    #[test]
    fn session_store_flags_gap_when_requested_seq_has_been_evicted() {
        let mut store = SessionStore::with_capacity("runtime-1", 2);
        store.append(SessionEventPayload::SystemMessage {
            message: "boot".to_string(),
        });
        store.append(SessionEventPayload::AssistantChunk {
            text: "step-1".to_string(),
        });
        store.append(SessionEventPayload::AssistantChunk {
            text: "step-2".to_string(),
        });

        let replay = store.events_since(Some(0));

        assert!(replay.gap_detected);
        assert_eq!(replay.oldest_available_seq, Some(2));
        assert_eq!(replay.events.len(), 2);
        assert_eq!(replay.events[0].seq, 2);
        assert_eq!(replay.events[1].seq, 3);
    }
}
