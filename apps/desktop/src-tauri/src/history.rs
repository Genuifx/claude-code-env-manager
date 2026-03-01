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
    pub plan_content: Option<String>,
    pub timestamp: u64,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub cache_creation_tokens: Option<u64>,
    pub cache_read_tokens: Option<u64>,
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
    #[serde(rename = "planContent")]
    plan_content: Option<String>,
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
                    plan_content: None,
                    timestamp: ts,
                    input_tokens: None,
                    output_tokens: None,
                    cache_creation_tokens: None,
                    cache_read_tokens: None,
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

        // Extract content/model/usage from the message object
        let (content, model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens) = if let Some(msg) = &parsed.message {
            let content = msg.get("content")
                .cloned()
                .unwrap_or(serde_json::Value::Null);
            let model = msg.get("model")
                .and_then(|m| m.as_str())
                .map(|s| s.to_string());
            let (input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens) = extract_usage_fields(msg);
            (
                content,
                model,
                input_tokens,
                output_tokens,
                cache_creation_tokens,
                cache_read_tokens,
            )
        } else {
            (serde_json::Value::Null, None, None, None, None, None)
        };

        // Skip messages with no content (unless it's a summary)
        if content.is_null() && msg_type != "summary" && parsed.summary.is_none() {
            continue;
        }

        let ts = parse_timestamp_value(&parsed.timestamp);

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
            plan_content: parsed.plan_content,
            timestamp: ts,
            input_tokens,
            output_tokens,
            cache_creation_tokens,
            cache_read_tokens,
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
    let trimmed = display.trim();
    if trimmed.is_empty() {
        return true;
    }

    let lowered = trimmed.to_lowercase();
    if lowered == "clear" || lowered == "compact" {
        return true;
    }

    if let Some((command, args)) = parse_slash_command(trimmed) {
        return is_noise_slash_command(command, args);
    }

    if looks_like_bang_command(trimmed) {
        return true;
    }

    false
}

/// Heuristic: slash command token such as /clear, /superpowers:executing-plans.
/// Paths like /Users/g/... are excluded (they contain an additional '/').
fn parse_slash_command(text: &str) -> Option<(&str, &str)> {
    if !text.starts_with('/') {
        return None;
    }

    let first_ws = text.char_indices().find(|(_, c)| c.is_whitespace()).map(|(i, _)| i);
    let (token, args) = match first_ws {
        Some(i) => (&text[..i], text[i..].trim()),
        None => (text, ""),
    };

    if token.len() <= 1 {
        return None;
    }

    let command = &token[1..];
    if command.contains('/') {
        return None;
    }

    let valid = command
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ':' || c == '.');

    if !valid {
        return None;
    }

    Some((command, args))
}

/// System commands should not become conversation titles.
/// Slash commands with arguments are treated as meaningful by default.
fn is_noise_slash_command(command: &str, args: &str) -> bool {
    let cmd = command.to_ascii_lowercase();

    // Common built-in/session control commands that are not user intent topics.
    const ALWAYS_NOISE: &[&str] = &[
        "clear", "compact", "help", "quit", "exit", "new", "resume", "status", "stats",
        "config", "mcp", "plugin", "skills",
    ];
    if ALWAYS_NOISE.contains(&cmd.as_str()) {
        return true;
    }

    // Bare slash command with no arguments is usually command/control noise.
    if args.is_empty() {
        return true;
    }

    false
}

/// Heuristic: local shell command entered from Claude Code history, e.g. !ls, !open.
fn looks_like_bang_command(text: &str) -> bool {
    if !text.starts_with('!') {
        return false;
    }

    let token = text.split_whitespace().next().unwrap_or("");
    token.len() > 1
}

fn extract_usage_fields(message: &serde_json::Value) -> (Option<u64>, Option<u64>, Option<u64>, Option<u64>) {
    let usage = match message.get("usage") {
        Some(u) => u,
        None => return (None, None, None, None),
    };

    let input_tokens = usage.get("input_tokens").and_then(|v| v.as_u64());
    let output_tokens = usage.get("output_tokens").and_then(|v| v.as_u64());
    let cache_creation_tokens = usage
        .get("cache_creation_input_tokens")
        .and_then(|v| v.as_u64());
    let cache_read_tokens = usage
        .get("cache_read_input_tokens")
        .and_then(|v| v.as_u64());

    (
        input_tokens,
        output_tokens,
        cache_creation_tokens,
        cache_read_tokens,
    )
}

#[cfg(test)]
mod tests {
    use super::is_noise_display;

    #[test]
    fn test_is_noise_display_for_system_commands() {
        assert!(is_noise_display("/clear"));
        assert!(is_noise_display("/resume "));
        assert!(is_noise_display("/new"));
        assert!(is_noise_display("/new my-topic"));
        assert!(is_noise_display("/status"));
        assert!(is_noise_display("!ls"));
        assert!(is_noise_display("!open /tmp"));
    }

    #[test]
    fn test_is_noise_display_for_meaningful_slash_inputs() {
        assert!(!is_noise_display(
            "/superpowers:executing-plans docs/plans/2026-03-01-whole-repo-refactor-implementation.md"
        ));
        assert!(!is_noise_display(
            "/writing-plans docs/plans/2026-03-01-whole-repo-refactor-design.md"
        ));
        assert!(!is_noise_display("/baymax 帮我整理一下这份方案"));
    }

    #[test]
    fn test_is_noise_display_for_real_topics() {
        assert!(!is_noise_display("继续完成所有的任务"));
        assert!(!is_noise_display("How do we handle auth token refresh?"));
        assert!(!is_noise_display("/Users/g/Github/ccem/docs"));
        assert!(!is_noise_display("I typed /clear but this is a sentence"));
    }
}
