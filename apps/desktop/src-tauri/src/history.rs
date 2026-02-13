// apps/desktop/src-tauri/src/history.rs
//
// Reads ~/.claude/history.jsonl for conversation list and
// ~/.claude/projects/*/*.jsonl for conversation messages.
// Supports /compact segmentation: detects compact_boundary markers
// and exposes segment metadata to the frontend.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

// ============================================================================
// Output types — sent to frontend (camelCase for TypeScript)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HistorySession {
    pub id: String,
    pub display: String,
    pub timestamp: u64,
    pub project: String,
    pub project_name: String,
    pub segment_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMessage {
    pub msg_type: String,
    pub uuid: Option<String>,
    pub content: serde_json::Value,
    pub model: Option<String>,
    pub summary: Option<String>,
    pub segment_index: usize,
    pub is_compact_boundary: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompactSegment {
    pub segment_index: usize,
    pub timestamp: u64,
    pub trigger: Option<String>,
    pub pre_tokens: Option<u64>,
    pub message_count: usize,
}

// ============================================================================
// JSONL line types for history.jsonl
// ============================================================================

#[derive(Debug, Deserialize)]
struct HistoryLine {
    #[serde(rename = "sessionId")]
    session_id: Option<String>,
    display: Option<String>,
    timestamp: Option<serde_json::Value>,
    project: Option<String>,
    #[serde(rename = "projectName")]
    project_name: Option<String>,
}

// ============================================================================
// JSONL line types for conversation messages
// ============================================================================

#[derive(Debug, Deserialize)]
struct MessageLine {
    #[serde(rename = "type")]
    msg_type: Option<String>,
    subtype: Option<String>,
    uuid: Option<String>,
    #[serde(rename = "parentUuid")]
    parent_uuid: Option<serde_json::Value>,
    message: Option<serde_json::Value>,
    summary: Option<String>,
    content: Option<String>,
    #[serde(rename = "compactMetadata")]
    compact_metadata: Option<serde_json::Value>,
    #[serde(rename = "isCompactSummary")]
    is_compact_summary: Option<bool>,
    #[serde(rename = "isMeta")]
    is_meta: Option<bool>,
    timestamp: Option<serde_json::Value>,
}

// ============================================================================
// Tauri commands
// ============================================================================

/// Read ~/.claude/history.jsonl and return deduplicated conversation list
#[tauri::command]
pub fn get_conversation_history() -> Result<Vec<HistorySession>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let history_path = home.join(".claude").join("history.jsonl");

    if !history_path.exists() {
        return Ok(vec![]);
    }

    let file = fs::File::open(&history_path)
        .map_err(|e| format!("Failed to open history.jsonl: {}", e))?;

    let reader = BufReader::new(file);
    let mut session_map: HashMap<String, HistorySession> = HashMap::new();
    let projects_dir = home.join(".claude").join("projects");

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: HistoryLine = match serde_json::from_str(&line) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let id = match parsed.session_id {
            Some(id) => id,
            None => continue,
        };

        let display = parsed.display.unwrap_or_else(|| "Untitled".to_string());

        // Parse timestamp — could be number (ms) or string (ISO)
        let timestamp = parse_timestamp_value(&parsed.timestamp);

        let project = parsed.project.unwrap_or_default();
        let project_name = parsed.project_name.unwrap_or_else(|| {
            project.split('/').last().unwrap_or("unknown").to_string()
        });

        // Dedup: keep first meaningful display, update timestamp to latest
        if let Some(existing) = session_map.get_mut(&id) {
            if timestamp > existing.timestamp {
                existing.timestamp = timestamp;
            }
            if is_noise_display(&existing.display) && !is_noise_display(&display) {
                existing.display = display;
            }
        } else {
            session_map.insert(id.clone(), HistorySession {
                id,
                display,
                timestamp,
                project,
                project_name,
                segment_count: 1, // will be enriched below
            });
        }
    }

    // Enrich with segment counts
    if projects_dir.exists() {
        for session in session_map.values_mut() {
            if let Some(path) = find_session_file(&projects_dir, &session.id) {
                session.segment_count = count_segments(&path);
            }
        }
    }

    let mut sessions: Vec<HistorySession> = session_map.into_values().collect();
    sessions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(sessions)
}

/// Find and read conversation messages for a given session ID.
#[tauri::command]
pub fn get_conversation_messages(session_id: String) -> Result<Vec<ConversationMessage>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    let jsonl_path = find_session_file(&projects_dir, &session_id);

    let path = match jsonl_path {
        Some(p) => p,
        None => return Ok(vec![]),
    };

    let (messages, _) = parse_conversation_file(&path)?;
    Ok(messages)
}

/// Return compact segment metadata for a given session.
#[tauri::command]
pub fn get_conversation_segments(session_id: String) -> Result<Vec<CompactSegment>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    let path = find_session_file(&projects_dir, &session_id)
        .ok_or("Session file not found")?;

    let (_, segments) = parse_conversation_file(&path)?;
    Ok(segments)
}

// ============================================================================
// Internal helpers
// ============================================================================

/// Search for the JSONL file matching a session ID.
fn find_session_file(projects_dir: &PathBuf, session_id: &str) -> Option<PathBuf> {
    let projects = fs::read_dir(projects_dir).ok()?;

    for project_entry in projects.flatten() {
        let project_path = project_entry.path();
        if !project_path.is_dir() {
            continue;
        }

        let candidate = project_path.join(format!("{}.jsonl", session_id));
        if candidate.exists() {
            return Some(candidate);
        }

        if let Ok(dir_entries) = fs::read_dir(&project_path) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                    continue;
                }
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    if stem == session_id {
                        return Some(path);
                    }
                }
            }
        }
    }

    None
}

/// Parse a conversation JSONL file into messages and segment metadata.
fn parse_conversation_file(path: &PathBuf) -> Result<(Vec<ConversationMessage>, Vec<CompactSegment>), String> {
    let file = fs::File::open(path)
        .map_err(|e| format!("Failed to open conversation file: {}", e))?;

    let reader = BufReader::new(file);
    let mut messages: Vec<ConversationMessage> = Vec::new();
    let mut segments: Vec<CompactSegment> = Vec::new();
    let mut current_segment: usize = 0;

    // Segment 0 always exists (the initial conversation)
    segments.push(CompactSegment {
        segment_index: 0,
        timestamp: 0,
        trigger: None,
        pre_tokens: None,
        message_count: 0,
    });

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: MessageLine = match serde_json::from_str(&line) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let msg_type = match &parsed.msg_type {
            Some(t) => t.clone(),
            None => continue,
        };

        // Detect compact_boundary (NOT microcompact)
        if msg_type == "system" && parsed.subtype.as_deref() == Some("compact_boundary") {
            let is_null_parent = match &parsed.parent_uuid {
                Some(serde_json::Value::Null) => true,
                None => true,
                _ => false,
            };
            if is_null_parent {
                current_segment += 1;
                let ts = parse_timestamp_value(&parsed.timestamp);
                let trigger = parsed.compact_metadata.as_ref()
                    .and_then(|m| m.get("trigger"))
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());
                let pre_tokens = parsed.compact_metadata.as_ref()
                    .and_then(|m| m.get("preTokens"))
                    .and_then(|t| t.as_u64());

                segments.push(CompactSegment {
                    segment_index: current_segment,
                    timestamp: ts,
                    trigger,
                    pre_tokens,
                    message_count: 0,
                });

                // Insert a marker message for the boundary
                messages.push(ConversationMessage {
                    msg_type: "compact_boundary".to_string(),
                    uuid: parsed.uuid,
                    content: serde_json::Value::String(
                        parsed.content.unwrap_or_else(|| "Conversation compacted".to_string())
                    ),
                    model: None,
                    summary: None,
                    segment_index: current_segment,
                    is_compact_boundary: true,
                });
                continue;
            }
        }

        // Skip compact summary messages (injected as user role, not user-visible)
        if parsed.is_compact_summary == Some(true) {
            continue;
        }

        // Skip meta messages (internal command wrappers like /compact itself)
        if parsed.is_meta == Some(true) {
            continue;
        }

        // Skip microcompact_boundary
        if parsed.subtype.as_deref() == Some("microcompact_boundary") {
            continue;
        }

        // Skip file-history-snapshot and progress types
        if msg_type == "file-history-snapshot" || msg_type == "progress" {
            continue;
        }

        // Extract content and model from the message object
        let (content, model) = if let Some(msg) = &parsed.message {
            let content = msg.get("content")
                .cloned()
                .unwrap_or(serde_json::Value::Null);
            let model = msg.get("model")
                .and_then(|m| m.as_str())
                .map(|s| s.to_string());
            (content, model)
        } else {
            (serde_json::Value::Null, None)
        };

        // Skip messages with no content (unless it's a summary)
        if content.is_null() && msg_type != "summary" && parsed.summary.is_none() {
            continue;
        }

        // Track message count per segment
        if let Some(seg) = segments.get_mut(current_segment) {
            seg.message_count += 1;
        }

        messages.push(ConversationMessage {
            msg_type,
            uuid: parsed.uuid,
            content,
            model,
            summary: parsed.summary,
            segment_index: current_segment,
            is_compact_boundary: false,
        });
    }

    Ok((messages, segments))
}

/// Lightweight scan: count compact_boundary markers without full parsing.
fn count_segments(path: &PathBuf) -> usize {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return 1,
    };
    let reader = BufReader::new(file);
    let mut count: usize = 1; // segment 0 always exists

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => continue,
        };
        // Quick string check before JSON parsing
        if line.contains("\"compact_boundary\"") && line.contains("\"parentUuid\":null") {
            count += 1;
        }
    }

    count
}

/// Parse a timestamp value that could be a number (ms) or ISO string.
fn parse_timestamp_value(val: &Option<serde_json::Value>) -> u64 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_u64().unwrap_or(0),
        Some(serde_json::Value::String(s)) => {
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.timestamp_millis() as u64)
                .unwrap_or(0)
        }
        _ => 0,
    }
}

/// Returns true if the display text is a CLI command or noise, not a real topic.
fn is_noise_display(display: &str) -> bool {
    let trimmed = display.trim().to_lowercase();
    trimmed.is_empty()
        || trimmed.starts_with("/clear")
        || trimmed.starts_with("/compact")
        || trimmed.starts_with("/help")
        || trimmed.starts_with("/quit")
        || trimmed.starts_with("/exit")
        || trimmed == "clear"
        || trimmed == "compact"
}
