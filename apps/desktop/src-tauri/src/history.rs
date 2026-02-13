// apps/desktop/src-tauri/src/history.rs
//
// Reads ~/.claude/history.jsonl for conversation list and
// ~/.claude/projects/*/*.jsonl for conversation messages.

use serde::{Deserialize, Serialize};
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMessage {
    pub msg_type: String,
    pub uuid: Option<String>,
    pub content: serde_json::Value,
    pub model: Option<String>,
    pub summary: Option<String>,
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
    uuid: Option<String>,
    message: Option<serde_json::Value>,
    summary: Option<String>,
}

// ============================================================================
// Tauri commands
// ============================================================================

/// Read ~/.claude/history.jsonl and return conversation list
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
    let mut sessions: Vec<HistorySession> = Vec::new();

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
        let timestamp = match parsed.timestamp {
            Some(serde_json::Value::Number(n)) => {
                n.as_u64().unwrap_or(0)
            }
            Some(serde_json::Value::String(s)) => {
                // Try parsing ISO timestamp to epoch ms
                chrono::DateTime::parse_from_rfc3339(&s)
                    .map(|dt| dt.timestamp_millis() as u64)
                    .unwrap_or(0)
            }
            _ => 0,
        };

        let project = parsed.project.unwrap_or_default();
        let project_name = parsed.project_name.unwrap_or_else(|| {
            // Derive project name from project path
            project.split('/').last().unwrap_or("unknown").to_string()
        });

        sessions.push(HistorySession {
            id,
            display,
            timestamp,
            project,
            project_name,
        });
    }

    // Sort by timestamp descending (newest first)
    sessions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(sessions)
}

/// Find and read conversation messages for a given session ID.
/// Scans ~/.claude/projects/*/*.jsonl for the matching session.
#[tauri::command]
pub fn get_conversation_messages(session_id: String) -> Result<Vec<ConversationMessage>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let projects_dir = home.join(".claude").join("projects");

    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    // Find the JSONL file that contains this session
    let jsonl_path = find_session_file(&projects_dir, &session_id);

    let path = match jsonl_path {
        Some(p) => p,
        None => return Ok(vec![]),
    };

    parse_conversation_file(&path)
}

/// Search for the JSONL file matching a session ID.
/// The session ID is typically the filename (without .jsonl) under a project dir.
fn find_session_file(projects_dir: &PathBuf, session_id: &str) -> Option<PathBuf> {
    // First try: session_id directly as filename
    let projects = fs::read_dir(projects_dir).ok()?;

    for project_entry in projects.flatten() {
        let project_path = project_entry.path();
        if !project_path.is_dir() {
            continue;
        }

        // Check for exact filename match: <session_id>.jsonl
        let candidate = project_path.join(format!("{}.jsonl", session_id));
        if candidate.exists() {
            return Some(candidate);
        }

        // Also scan files for a sessionId field match
        if let Ok(dir_entries) = fs::read_dir(&project_path) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("jsonl") {
                    continue;
                }

                // Check if the filename stem matches
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

/// Parse a conversation JSONL file into messages.
fn parse_conversation_file(path: &PathBuf) -> Result<Vec<ConversationMessage>, String> {
    let file = fs::File::open(path)
        .map_err(|e| format!("Failed to open conversation file: {}", e))?;

    let reader = BufReader::new(file);
    let mut messages: Vec<ConversationMessage> = Vec::new();

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

        messages.push(ConversationMessage {
            msg_type,
            uuid: parsed.uuid,
            content,
            model,
            summary: parsed.summary,
        });
    }

    Ok(messages)
}
