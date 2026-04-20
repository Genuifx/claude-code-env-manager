use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

pub const DEFAULT_SESSION_EVENT_CAPACITY: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UserInputKind {
    Question,
    PlanEntry,
    PlanExit,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "category", rename_all = "snake_case")]
pub enum ToolCategory {
    UserInput {
        kind: UserInputKind,
        raw_name: String,
    },
    FileOp {
        raw_name: String,
    },
    Execution {
        raw_name: String,
    },
    Search {
        raw_name: String,
    },
    TaskMgmt {
        raw_name: String,
    },
    Unknown {
        raw_name: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ToolQuestionOption {
    pub label: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ToolQuestionPrompt {
    pub question: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub header: Option<String>,
    #[serde(rename = "multiSelect")]
    pub multi_select: bool,
    pub options: Vec<ToolQuestionOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "prompt_type", rename_all = "snake_case")]
pub enum InteractiveToolPrompt {
    AskUserQuestion {
        questions: Vec<ToolQuestionPrompt>,
    },
    PlanEntry,
    PlanExit {
        #[serde(default)]
        allowed_prompts: Vec<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        plan_summary: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TerminalPromptKind {
    Permission,
}

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
    ToolUseStarted {
        tool_use_id: String,
        category: ToolCategory,
        raw_name: String,
        input_summary: String,
        needs_response: bool,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        prompt: Option<InteractiveToolPrompt>,
    },
    ToolUseCompleted {
        tool_use_id: String,
        raw_name: String,
        result_summary: String,
        success: bool,
    },
    PermissionRequired {
        request_id: String,
        tool_name: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        input_summary: Option<String>,
    },
    PermissionResponded {
        request_id: String,
        approved: bool,
        responder: String,
    },
    SessionCompleted {
        reason: String,
    },
    TerminalPromptRequired {
        prompt_kind: TerminalPromptKind,
        prompt_text: String,
    },
    TerminalPromptResolved {
        prompt_kind: TerminalPromptKind,
        approved: bool,
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
    use super::{
        InteractiveToolPrompt, SessionEventPayload, SessionStore, ToolCategory, ToolQuestionOption,
        ToolQuestionPrompt, UserInputKind,
    };

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
    fn tool_use_started_round_trips_with_lightweight_prompt_payload() {
        let payload = SessionEventPayload::ToolUseStarted {
            tool_use_id: "toolu-1".to_string(),
            category: ToolCategory::UserInput {
                kind: UserInputKind::Question,
                raw_name: "AskUserQuestion".to_string(),
            },
            raw_name: "AskUserQuestion".to_string(),
            input_summary: "需要用户回答 1 个问题".to_string(),
            needs_response: true,
            prompt: Some(InteractiveToolPrompt::AskUserQuestion {
                questions: vec![ToolQuestionPrompt {
                    question: "Which one?".to_string(),
                    header: Some("Choice".to_string()),
                    multi_select: false,
                    options: vec![
                        ToolQuestionOption {
                            label: "A".to_string(),
                            description: None,
                            preview: None,
                        },
                        ToolQuestionOption {
                            label: "B".to_string(),
                            description: Some("Preferred".to_string()),
                            preview: None,
                        },
                    ],
                }],
            }),
        };

        let encoded = serde_json::to_string(&payload).expect("serialize");
        let decoded: SessionEventPayload = serde_json::from_str(&encoded).expect("deserialize");
        assert_eq!(decoded, payload);
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
