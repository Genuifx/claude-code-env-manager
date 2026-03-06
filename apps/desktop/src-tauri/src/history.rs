// apps/desktop/src-tauri/src/history.rs
//
// Conversation history support for both Claude and Codex sources.

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

const SOURCE_CLAUDE: &str = "claude";
const SOURCE_CODEX: &str = "codex";

// ============================================================================
// Output types — sent to frontend (camelCase for TypeScript)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HistorySession {
    pub id: String,
    pub source: String,
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
// Claude JSONL line types
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
// Codex JSONL line types
// ============================================================================

#[derive(Debug, Deserialize)]
struct CodexHistoryLine {
    session_id: Option<String>,
    ts: Option<serde_json::Value>,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CodexLine {
    #[serde(rename = "type")]
    line_type: Option<String>,
    timestamp: Option<serde_json::Value>,
    payload: Option<serde_json::Value>,
}

#[derive(Debug, Default, Clone)]
struct CodexSessionMeta {
    cwd: Option<String>,
}

// ============================================================================
// Tauri commands
// ============================================================================

/// Read conversation history from Claude/Codex and return a merged list.
#[tauri::command]
pub fn get_conversation_history(source: Option<String>) -> Result<Vec<HistorySession>, String> {
    let source_filter = normalize_history_source(source.as_deref())?;
    let mut sessions = Vec::new();

    if source_filter.is_none() || source_filter == Some(SOURCE_CLAUDE) {
        sessions.extend(load_claude_history()?);
    }

    if source_filter.is_none() || source_filter == Some(SOURCE_CODEX) {
        sessions.extend(load_codex_history()?);
    }

    sessions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(sessions)
}

/// Find and read conversation messages for a given session ID/source.
#[tauri::command]
pub fn get_conversation_messages(
    session_id: String,
    source: Option<String>,
) -> Result<Vec<ConversationMessage>, String> {
    let source_hint = normalize_history_source(source.as_deref())?;
    let resolved_source = match resolve_history_source_for_session(&session_id, source_hint) {
        Some(s) => s,
        None => return Ok(vec![]),
    };

    let (messages, _) = match resolved_source {
        SOURCE_CLAUDE => {
            let home = dirs::home_dir().ok_or("Could not find home directory")?;
            let projects_dir = home.join(".claude").join("projects");
            if !projects_dir.exists() {
                return Ok(vec![]);
            }
            let path = match find_claude_session_file(&projects_dir, &session_id) {
                Some(p) => p,
                None => return Ok(vec![]),
            };
            parse_claude_conversation_file(&path)?
        }
        SOURCE_CODEX => {
            let path = match find_codex_session_file(&session_id) {
                Some(p) => p,
                None => return Ok(vec![]),
            };
            parse_codex_conversation_file(&path)?
        }
        _ => return Ok(vec![]),
    };

    Ok(messages)
}

/// Return compact segment metadata for a given session/source.
#[tauri::command]
pub fn get_conversation_segments(
    session_id: String,
    source: Option<String>,
) -> Result<Vec<CompactSegment>, String> {
    let source_hint = normalize_history_source(source.as_deref())?;
    let resolved_source = resolve_history_source_for_session(&session_id, source_hint)
        .ok_or("Session file not found")?;

    let (_, segments) = match resolved_source {
        SOURCE_CLAUDE => {
            let home = dirs::home_dir().ok_or("Could not find home directory")?;
            let projects_dir = home.join(".claude").join("projects");
            let path = find_claude_session_file(&projects_dir, &session_id)
                .ok_or("Session file not found")?;
            parse_claude_conversation_file(&path)?
        }
        SOURCE_CODEX => {
            let path = find_codex_session_file(&session_id).ok_or("Session file not found")?;
            parse_codex_conversation_file(&path)?
        }
        _ => return Err("Unsupported source".to_string()),
    };

    Ok(segments)
}

// ============================================================================
// Claude history helpers
// ============================================================================

fn load_claude_history() -> Result<Vec<HistorySession>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let history_path = home.join(".claude").join("history.jsonl");

    if !history_path.exists() {
        return Ok(vec![]);
    }

    let file = fs::File::open(&history_path)
        .map_err(|e| format!("Failed to open history.jsonl: {}", e))?;

    let reader = BufReader::new(file);
    let mut session_map: HashMap<String, HistorySession> = HashMap::new();

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
        let timestamp = parse_timestamp_value(&parsed.timestamp);
        let project = parsed.project.unwrap_or_default();
        let project_name = parsed.project_name.unwrap_or_else(|| {
            project
                .split('/')
                .next_back()
                .unwrap_or("unknown")
                .to_string()
        });

        if let Some(existing) = session_map.get_mut(&id) {
            if timestamp > existing.timestamp {
                existing.timestamp = timestamp;
            }
            if is_noise_display(&existing.display) && !is_noise_display(&display) {
                existing.display = display;
            }
        } else {
            session_map.insert(
                id.clone(),
                HistorySession {
                    id,
                    source: SOURCE_CLAUDE.to_string(),
                    display,
                    timestamp,
                    project,
                    project_name,
                },
            );
        }
    }

    Ok(session_map.into_values().collect())
}

fn find_claude_session_file(projects_dir: &PathBuf, session_id: &str) -> Option<PathBuf> {
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

fn parse_claude_conversation_file(
    path: &PathBuf,
) -> Result<(Vec<ConversationMessage>, Vec<CompactSegment>), String> {
    let file =
        fs::File::open(path).map_err(|e| format!("Failed to open conversation file: {}", e))?;

    let reader = BufReader::new(file);
    let mut messages: Vec<ConversationMessage> = Vec::new();
    let mut segments: Vec<CompactSegment> = Vec::new();
    let mut current_segment: usize = 0;

    // Segment 0 always exists.
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

        // Detect compact_boundary (not microcompact).
        if msg_type == "system" && parsed.subtype.as_deref() == Some("compact_boundary") {
            let is_null_parent = match &parsed.parent_uuid {
                Some(serde_json::Value::Null) => true,
                None => true,
                _ => false,
            };
            if is_null_parent {
                current_segment += 1;
                let ts = parse_timestamp_value(&parsed.timestamp);
                let trigger = parsed
                    .compact_metadata
                    .as_ref()
                    .and_then(|m| m.get("trigger"))
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());
                let pre_tokens = parsed
                    .compact_metadata
                    .as_ref()
                    .and_then(|m| m.get("preTokens"))
                    .and_then(|t| t.as_u64());

                segments.push(CompactSegment {
                    segment_index: current_segment,
                    timestamp: ts,
                    trigger,
                    pre_tokens,
                    message_count: 0,
                });

                messages.push(ConversationMessage {
                    msg_type: "compact_boundary".to_string(),
                    uuid: parsed.uuid,
                    content: serde_json::Value::String(
                        parsed
                            .content
                            .unwrap_or_else(|| "Conversation compacted".to_string()),
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

        if parsed.is_compact_summary == Some(true) {
            continue;
        }

        if parsed.is_meta == Some(true) {
            continue;
        }

        if parsed.subtype.as_deref() == Some("microcompact_boundary") {
            continue;
        }

        if msg_type == "file-history-snapshot" || msg_type == "progress" {
            continue;
        }

        let (content, model, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens) =
            if let Some(msg) = &parsed.message {
                let content = msg
                    .get("content")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null);
                let model = msg
                    .get("model")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string());
                let (input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens) =
                    extract_usage_fields(msg);
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

        if content.is_null() && msg_type != "summary" && parsed.summary.is_none() {
            continue;
        }

        let ts = parse_timestamp_value(&parsed.timestamp);

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

// ============================================================================
// Codex history helpers
// ============================================================================

fn load_codex_history() -> Result<Vec<HistorySession>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let history_path = home.join(".codex").join("history.jsonl");
    if !history_path.exists() {
        return Ok(vec![]);
    }

    let file = fs::File::open(&history_path)
        .map_err(|e| format!("Failed to open codex history.jsonl: {}", e))?;

    let sessions_root = home.join(".codex").join("sessions");
    let codex_file_map = collect_codex_session_files(&sessions_root);

    let reader = BufReader::new(file);
    let mut session_map: HashMap<String, HistorySession> = HashMap::new();

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: CodexHistoryLine = match serde_json::from_str(&line) {
            Ok(p) => p,
            Err(_) => continue,
        };

        upsert_codex_history_session(&mut session_map, parsed);
    }

    let mut meta_cache: HashMap<String, CodexSessionMeta> = HashMap::new();
    for session in session_map.values_mut() {
        if let Some(path) = codex_file_map.get(&session.id) {
            let path_key = path.to_string_lossy().to_string();

            let meta = meta_cache
                .entry(path_key.clone())
                .or_insert_with(|| read_codex_session_meta(path).unwrap_or_default());

            if let Some(cwd) = &meta.cwd {
                session.project = cwd.clone();
                session.project_name = cwd.split('/').next_back().unwrap_or("unknown").to_string();
            }
        }
    }

    Ok(session_map.into_values().collect())
}

fn upsert_codex_history_session(
    session_map: &mut HashMap<String, HistorySession>,
    parsed: CodexHistoryLine,
) {
    let id = match parsed.session_id {
        Some(id) if !id.is_empty() => id,
        _ => return,
    };

    let timestamp = parse_codex_history_timestamp(&parsed.ts);
    let display = parsed.text.unwrap_or_else(|| "Untitled".to_string());

    if let Some(existing) = session_map.get_mut(&id) {
        if timestamp > existing.timestamp {
            existing.timestamp = timestamp;
        }
        if is_noise_display(&existing.display) && !is_noise_display(&display) {
            existing.display = display;
        }
    } else {
        session_map.insert(
            id.clone(),
            HistorySession {
                id,
                source: SOURCE_CODEX.to_string(),
                display,
                timestamp,
                project: String::new(),
                project_name: "unknown".to_string(),
            },
        );
    }
}

fn find_codex_session_file(session_id: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let sessions_root = home.join(".codex").join("sessions");
    if !sessions_root.exists() {
        return None;
    }

    let file_map = collect_codex_session_files(&sessions_root);
    file_map.get(session_id).cloned()
}

fn collect_codex_session_files(root: &PathBuf) -> HashMap<String, PathBuf> {
    let mut file_map: HashMap<String, PathBuf> = HashMap::new();
    if !root.exists() {
        return file_map;
    }

    let mut stack = vec![root.clone()];

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }

            if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                continue;
            }

            if let Some(session_id) = extract_codex_session_id_from_path(&path) {
                file_map.entry(session_id).or_insert(path);
            }
        }
    }

    file_map
}

fn extract_codex_session_id_from_path(path: &PathBuf) -> Option<String> {
    let stem = path.file_stem()?.to_str()?;
    if stem.len() < 36 {
        return None;
    }

    let candidate = &stem[stem.len() - 36..];
    if !looks_like_uuid(candidate) {
        return None;
    }

    Some(candidate.to_string())
}

fn looks_like_uuid(value: &str) -> bool {
    if value.len() != 36 {
        return false;
    }

    for (idx, ch) in value.chars().enumerate() {
        if matches!(idx, 8 | 13 | 18 | 23) {
            if ch != '-' {
                return false;
            }
            continue;
        }

        if !ch.is_ascii_hexdigit() {
            return false;
        }
    }

    true
}

fn read_codex_session_meta(path: &PathBuf) -> Option<CodexSessionMeta> {
    let file = fs::File::open(path).ok()?;
    let reader = BufReader::new(file);

    for line_result in reader.lines() {
        let line = line_result.ok()?;
        if line.trim().is_empty() {
            continue;
        }

        let parsed: CodexLine = serde_json::from_str(&line).ok()?;
        if parsed.line_type.as_deref() != Some("session_meta") {
            continue;
        }

        let payload = parsed.payload.unwrap_or(serde_json::Value::Null);
        let cwd = payload
            .get("cwd")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        return Some(CodexSessionMeta { cwd });
    }

    None
}

fn parse_codex_conversation_file(
    path: &PathBuf,
) -> Result<(Vec<ConversationMessage>, Vec<CompactSegment>), String> {
    let file =
        fs::File::open(path).map_err(|e| format!("Failed to open codex session file: {}", e))?;

    let reader = BufReader::new(file);
    let mut lines: Vec<CodexLine> = Vec::new();

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(line) => line,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(parsed) = serde_json::from_str::<CodexLine>(&line) {
            lines.push(parsed);
        }
    }

    let has_event_chat = lines.iter().any(|line| {
        if line.line_type.as_deref() != Some("event_msg") {
            return false;
        }
        let payload_type = line
            .payload
            .as_ref()
            .and_then(|payload| payload.get("type"))
            .and_then(|v| v.as_str());
        matches!(
            payload_type,
            Some("user_message") | Some("agent_message") | Some("agent_reasoning")
        )
    });

    let mut messages: Vec<ConversationMessage> = Vec::new();
    let mut segments: Vec<CompactSegment> = Vec::new();
    let mut current_segment: usize = 0;
    let mut current_model: Option<String> = None;

    segments.push(CompactSegment {
        segment_index: 0,
        timestamp: 0,
        trigger: None,
        pre_tokens: None,
        message_count: 0,
    });

    for line in lines {
        let line_type = match line.line_type.as_deref() {
            Some(t) => t,
            None => continue,
        };

        if line_type == "turn_context" {
            let model = line
                .payload
                .as_ref()
                .and_then(|payload| payload.get("model"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            if model.is_some() {
                current_model = model;
            }
            continue;
        }

        match line_type {
            "event_msg" => {
                let payload = match &line.payload {
                    Some(payload) => payload,
                    None => continue,
                };
                let payload_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
                let ts = parse_timestamp_value(&line.timestamp);

                match payload_type {
                    "user_message" => {
                        let text = payload
                            .get("message")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        if text.is_empty() {
                            continue;
                        }

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: "user".to_string(),
                                uuid: None,
                                content: json!([{
                                    "type": "text",
                                    "text": text,
                                }]),
                                model: None,
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    "agent_message" => {
                        let text = payload
                            .get("message")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        if text.is_empty() {
                            continue;
                        }

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: "assistant".to_string(),
                                uuid: None,
                                content: json!([{
                                    "type": "text",
                                    "text": text,
                                }]),
                                model: current_model.clone(),
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    "agent_reasoning" => {
                        let text = payload
                            .get("text")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        if text.is_empty() {
                            continue;
                        }

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: "assistant".to_string(),
                                uuid: None,
                                content: json!([{
                                    "type": "thinking",
                                    "thinking": text,
                                }]),
                                model: current_model.clone(),
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    "context_compacted" => {
                        current_segment += 1;
                        segments.push(CompactSegment {
                            segment_index: current_segment,
                            timestamp: ts,
                            trigger: None,
                            pre_tokens: None,
                            message_count: 0,
                        });

                        messages.push(ConversationMessage {
                            msg_type: "compact_boundary".to_string(),
                            uuid: None,
                            content: serde_json::Value::String(
                                "Conversation compacted".to_string(),
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
                    }
                    _ => {}
                }
            }
            "response_item" => {
                let payload = match &line.payload {
                    Some(payload) => payload,
                    None => continue,
                };
                let payload_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
                let ts = parse_timestamp_value(&line.timestamp);

                match payload_type {
                    "function_call" | "custom_tool_call" => {
                        let tool_name = payload
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("tool")
                            .to_string();
                        let call_id = payload
                            .get("call_id")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        let input = payload
                            .get("arguments")
                            .or_else(|| payload.get("input"))
                            .map(parse_maybe_json)
                            .unwrap_or(serde_json::Value::Null);

                        let mut block = json!({
                            "type": "tool_use",
                            "name": tool_name,
                            "input": input,
                        });
                        if let Some(id) = &call_id {
                            block["id"] = serde_json::Value::String(id.clone());
                        }

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: "assistant".to_string(),
                                uuid: None,
                                content: json!([block]),
                                model: current_model.clone(),
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    "function_call_output" | "custom_tool_call_output" => {
                        let call_id = payload
                            .get("call_id")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        if call_id.is_empty() {
                            continue;
                        }

                        let output = payload
                            .get("output")
                            .map(parse_maybe_json)
                            .unwrap_or(serde_json::Value::Null);

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: "user".to_string(),
                                uuid: None,
                                content: json!([{
                                    "type": "tool_result",
                                    "tool_use_id": call_id,
                                    "content": output,
                                    "is_error": false,
                                }]),
                                model: None,
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    "reasoning" => {
                        if has_event_chat {
                            continue;
                        }

                        let text = extract_reasoning_text(payload);
                        if text.is_empty() {
                            continue;
                        }

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: "assistant".to_string(),
                                uuid: None,
                                content: json!([{
                                    "type": "thinking",
                                    "thinking": text,
                                }]),
                                model: current_model.clone(),
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    "message" => {
                        if has_event_chat {
                            continue;
                        }

                        let role = payload.get("role").and_then(|v| v.as_str()).unwrap_or("");
                        let msg_type = match role {
                            "user" => "user",
                            "assistant" => "assistant",
                            _ => continue,
                        };

                        let blocks = extract_codex_text_blocks(payload);
                        if blocks.is_empty() {
                            continue;
                        }

                        push_message(
                            &mut messages,
                            &mut segments,
                            current_segment,
                            ConversationMessage {
                                msg_type: msg_type.to_string(),
                                uuid: None,
                                content: serde_json::Value::Array(blocks),
                                model: if msg_type == "assistant" {
                                    current_model.clone()
                                } else {
                                    None
                                },
                                summary: None,
                                plan_content: None,
                                timestamp: ts,
                                input_tokens: None,
                                output_tokens: None,
                                cache_creation_tokens: None,
                                cache_read_tokens: None,
                                segment_index: current_segment,
                                is_compact_boundary: false,
                            },
                        );
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }

    Ok((messages, segments))
}

fn push_message(
    messages: &mut Vec<ConversationMessage>,
    segments: &mut [CompactSegment],
    current_segment: usize,
    message: ConversationMessage,
) {
    if let Some(seg) = segments.get_mut(current_segment) {
        seg.message_count += 1;
    }
    messages.push(message);
}

fn parse_maybe_json(value: &serde_json::Value) -> serde_json::Value {
    if let Some(text) = value.as_str() {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(text) {
            return parsed;
        }
        return serde_json::Value::String(text.to_string());
    }

    value.clone()
}

fn extract_codex_text_blocks(payload: &serde_json::Value) -> Vec<serde_json::Value> {
    let mut blocks = Vec::new();

    if let Some(content_items) = payload.get("content").and_then(|v| v.as_array()) {
        for item in content_items {
            let text = item
                .get("text")
                .and_then(|v| v.as_str())
                .or_else(|| item.get("input_text").and_then(|v| v.as_str()))
                .or_else(|| item.get("output_text").and_then(|v| v.as_str()));

            if let Some(text) = text {
                if !text.is_empty() {
                    blocks.push(json!({
                        "type": "text",
                        "text": text,
                    }));
                }
            }
        }
    }

    blocks
}

fn extract_reasoning_text(payload: &serde_json::Value) -> String {
    if let Some(summary_items) = payload.get("summary").and_then(|v| v.as_array()) {
        let mut parts = Vec::new();
        for item in summary_items {
            if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                if !text.trim().is_empty() {
                    parts.push(text.trim().to_string());
                }
            }
        }
        if !parts.is_empty() {
            return parts.join("\n");
        }
    }

    payload
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

// ============================================================================
// Shared helpers
// ============================================================================

fn normalize_history_source(source: Option<&str>) -> Result<Option<&'static str>, String> {
    let raw = match source {
        Some(value) => value.trim(),
        None => return Ok(None),
    };

    if raw.is_empty() || raw.eq_ignore_ascii_case("all") {
        return Ok(None);
    }

    let lowered = raw.to_ascii_lowercase();
    match lowered.as_str() {
        SOURCE_CLAUDE => Ok(Some(SOURCE_CLAUDE)),
        SOURCE_CODEX => Ok(Some(SOURCE_CODEX)),
        _ => Err(format!(
            "Unsupported source '{}'. Use claude, codex, or all.",
            raw
        )),
    }
}

fn resolve_history_source_for_session(
    session_id: &str,
    source_hint: Option<&'static str>,
) -> Option<&'static str> {
    if let Some(source) = source_hint {
        return Some(source);
    }

    let has_claude = has_claude_session(session_id);
    let has_codex = has_codex_session(session_id);

    if has_claude {
        // Keep legacy behavior: if both exist, default to Claude unless caller passes source.
        return Some(SOURCE_CLAUDE);
    }

    if has_codex {
        return Some(SOURCE_CODEX);
    }

    None
}

fn has_claude_session(session_id: &str) -> bool {
    let home = match dirs::home_dir() {
        Some(home) => home,
        None => return false,
    };
    let projects_dir = home.join(".claude").join("projects");
    find_claude_session_file(&projects_dir, session_id).is_some()
}

fn has_codex_session(session_id: &str) -> bool {
    find_codex_session_file(session_id).is_some()
}

/// Parse timestamp value that could be number or ISO string.
fn parse_timestamp_value(val: &Option<serde_json::Value>) -> u64 {
    match val {
        Some(serde_json::Value::Number(n)) => n.as_u64().unwrap_or(0),
        Some(serde_json::Value::String(s)) => chrono::DateTime::parse_from_rfc3339(s)
            .map(|dt| dt.timestamp_millis() as u64)
            .unwrap_or(0),
        _ => 0,
    }
}

/// Parse Codex history ts where values may be seconds or milliseconds.
fn parse_codex_history_timestamp(val: &Option<serde_json::Value>) -> u64 {
    match val {
        Some(serde_json::Value::Number(n)) => normalize_unix_timestamp(n.as_u64().unwrap_or(0)),
        Some(serde_json::Value::String(s)) => {
            if let Ok(num) = s.parse::<u64>() {
                return normalize_unix_timestamp(num);
            }
            chrono::DateTime::parse_from_rfc3339(s)
                .map(|dt| dt.timestamp_millis() as u64)
                .unwrap_or(0)
        }
        _ => 0,
    }
}

fn normalize_unix_timestamp(ts: u64) -> u64 {
    if ts > 10_000_000_000 {
        // Already milliseconds.
        ts
    } else {
        // Seconds -> milliseconds.
        ts.saturating_mul(1000)
    }
}

/// Returns true if display text is command noise, not a real topic.
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

    let first_ws = text
        .char_indices()
        .find(|(_, c)| c.is_whitespace())
        .map(|(i, _)| i);
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

    const ALWAYS_NOISE: &[&str] = &[
        "clear", "compact", "help", "quit", "exit", "new", "resume", "status", "stats", "config",
        "mcp", "plugin", "skills",
    ];
    if ALWAYS_NOISE.contains(&cmd.as_str()) {
        return true;
    }

    if args.is_empty() {
        return true;
    }

    false
}

/// Heuristic: local shell command entered from history, e.g. !ls, !open.
fn looks_like_bang_command(text: &str) -> bool {
    if !text.starts_with('!') {
        return false;
    }

    let token = text.split_whitespace().next().unwrap_or("");
    token.len() > 1
}

fn extract_usage_fields(
    message: &serde_json::Value,
) -> (Option<u64>, Option<u64>, Option<u64>, Option<u64>) {
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
    use super::{
        is_noise_display, normalize_history_source, parse_codex_history_timestamp,
        upsert_codex_history_session, CodexHistoryLine,
    };
    use std::collections::HashMap;

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

    #[test]
    fn test_codex_history_parsing_with_missing_fields() {
        let mut map = HashMap::new();

        upsert_codex_history_session(
            &mut map,
            CodexHistoryLine {
                session_id: Some("sid-1".to_string()),
                ts: Some(serde_json::Value::Number(serde_json::Number::from(
                    1700000000u64,
                ))),
                text: None,
            },
        );

        let item = map.get("sid-1").expect("session should exist");
        assert_eq!(item.display, "Untitled");
        assert_eq!(item.source, "codex");
        assert_eq!(item.timestamp, 1_700_000_000_000);

        // Missing ID should be ignored.
        upsert_codex_history_session(
            &mut map,
            CodexHistoryLine {
                session_id: None,
                ts: None,
                text: Some("ignored".to_string()),
            },
        );
        assert_eq!(map.len(), 1);
    }

    #[test]
    fn test_history_source_filtering() {
        assert_eq!(normalize_history_source(None).unwrap(), None);
        assert_eq!(normalize_history_source(Some("all")).unwrap(), None);
        assert_eq!(
            normalize_history_source(Some("claude")).unwrap(),
            Some("claude")
        );
        assert_eq!(
            normalize_history_source(Some("CoDeX")).unwrap(),
            Some("codex")
        );
        assert!(normalize_history_source(Some("other")).is_err());
    }

    #[test]
    fn test_parse_codex_seconds_timestamp_to_millis() {
        let ts = parse_codex_history_timestamp(&Some(serde_json::Value::Number(
            serde_json::Number::from(1_700_000_000u64),
        )));
        assert_eq!(ts, 1_700_000_000_000);
    }
}
