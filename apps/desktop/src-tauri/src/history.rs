// apps/desktop/src-tauri/src/history.rs
//
// Conversation history support for both Claude and Codex sources.

use crate::opencode;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

const SOURCE_CLAUDE: &str = "claude";
const SOURCE_CODEX: &str = "codex";
const SOURCE_OPENCODE: &str = "opencode";

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub config_source: Option<String>,
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

async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| format!("Blocking history task failed: {error}"))?
}

// ============================================================================
// Tauri commands
// ============================================================================

/// Read conversation history from Claude/Codex and return a merged list.
#[tauri::command]
pub async fn get_conversation_history(
    source: Option<String>,
) -> Result<Vec<HistorySession>, String> {
    run_blocking(move || {
        let source_filter = normalize_history_source(source.as_deref())?;
        let mut sessions = Vec::new();

        if source_filter.is_none() || source_filter == Some(SOURCE_CLAUDE) {
            sessions.extend(load_claude_history()?);
        }

        if source_filter.is_none() || source_filter == Some(SOURCE_CODEX) {
            sessions.extend(load_codex_history()?);
        }

        if source_filter.is_none() || source_filter == Some(SOURCE_OPENCODE) {
            sessions.extend(load_opencode_history()?);
        }

        sessions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        // Overlay user-edited title overrides
        let overrides = crate::title_overrides::TitleOverrides::load();
        for session in &mut sessions {
            if let Some(ov) = overrides.get(&session.source, &session.id) {
                session.display = ov.title.clone();
            }
        }

        Ok(sessions)
    })
    .await
}

/// Find and read conversation messages for a given session ID/source.
#[tauri::command]
pub async fn get_conversation_messages(
    session_id: String,
    source: Option<String>,
) -> Result<Vec<ConversationMessage>, String> {
    run_blocking(move || {
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
            SOURCE_OPENCODE => {
                let export = match load_opencode_export(&session_id)? {
                    Some(value) => value,
                    None => return Ok(vec![]),
                };
                parse_opencode_conversation_export(&export)?
            }
            _ => return Ok(vec![]),
        };

        Ok(messages)
    })
    .await
}

/// Return compact segment metadata for a given session/source.
#[tauri::command]
pub async fn get_conversation_segments(
    session_id: String,
    source: Option<String>,
) -> Result<Vec<CompactSegment>, String> {
    run_blocking(move || {
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
            SOURCE_OPENCODE => {
                let export = load_opencode_export(&session_id)?.ok_or("Session file not found")?;
                parse_opencode_conversation_export(&export)?
            }
            _ => return Err("Unsupported source".to_string()),
        };

        Ok(segments)
    })
    .await
}

// ============================================================================
// Claude history helpers
// ============================================================================

fn load_claude_history() -> Result<Vec<HistorySession>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let history_path = home.join(".claude").join("history.jsonl");
    let projects_dir = home.join(".claude").join("projects");

    load_claude_history_from_paths(&history_path, &projects_dir)
}

fn load_claude_history_from_paths(
    history_path: &Path,
    projects_dir: &Path,
) -> Result<Vec<HistorySession>, String> {
    let mut session_map: HashMap<String, HistorySession> = HashMap::new();

    if history_path.exists() {
        let file = fs::File::open(history_path)
            .map_err(|e| format!("Failed to open history.jsonl: {}", e))?;

        let reader = BufReader::new(file);
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

            let display = normalize_history_display(parsed.display);
            let timestamp = parse_timestamp_value(&parsed.timestamp);
            let project = parsed.project.unwrap_or_default();
            let project_name = parsed.project_name.unwrap_or_else(|| {
                project
                    .split('/')
                    .next_back()
                    .unwrap_or("unknown")
                    .to_string()
            });

            merge_claude_history_session(
                &mut session_map,
                HistorySession {
                    id,
                    source: SOURCE_CLAUDE.to_string(),
                    display,
                    timestamp,
                    project,
                    project_name,
                    env_name: None,
                    config_source: None,
                },
            );
        }
    }

    supplement_claude_history_from_projects(projects_dir, &mut session_map)?;
    Ok(session_map.into_values().collect())
}

fn merge_claude_history_session(
    session_map: &mut HashMap<String, HistorySession>,
    candidate: HistorySession,
) {
    if let Some(existing) = session_map.get_mut(&candidate.id) {
        if candidate.timestamp > existing.timestamp {
            existing.timestamp = candidate.timestamp;
        }
        if (existing.project.is_empty() || existing.project_name == "unknown")
            && !candidate.project.is_empty()
        {
            existing.project = candidate.project.clone();
            existing.project_name = candidate.project_name.clone();
        }
        if (is_noise_display(&existing.display) && !is_noise_display(&candidate.display))
            || (candidate.timestamp >= existing.timestamp && !is_noise_display(&candidate.display))
        {
            existing.display = candidate.display;
        }
    } else {
        session_map.insert(candidate.id.clone(), candidate);
    }
}

fn supplement_claude_history_from_projects(
    projects_dir: &Path,
    session_map: &mut HashMap<String, HistorySession>,
) -> Result<(), String> {
    if !projects_dir.exists() {
        return Ok(());
    }

    let projects = fs::read_dir(projects_dir)
        .map_err(|error| format!("Failed to read Claude projects dir: {}", error))?;

    for project_entry in projects.flatten() {
        let project_path = project_entry.path();
        if !project_path.is_dir() {
            continue;
        }

        let entries = match fs::read_dir(&project_path) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                continue;
            }
            if let Some(candidate) = parse_claude_project_session_index(&path) {
                merge_claude_history_session(session_map, candidate);
            }
        }
    }

    Ok(())
}

fn parse_claude_project_session_index(path: &Path) -> Option<HistorySession> {
    let file = fs::File::open(path).ok()?;
    let reader = BufReader::new(file);

    let mut session_id = path.file_stem()?.to_str()?.to_string();
    let mut display: Option<String> = None;
    let mut timestamp = 0;
    let mut project = String::new();

    for line_result in reader.lines() {
        let line = line_result.ok()?;
        if line.trim().is_empty() {
            continue;
        }

        let value: serde_json::Value = serde_json::from_str(&line).ok()?;
        if let Some(id) = value.get("sessionId").and_then(|v| v.as_str()) {
            session_id = id.to_string();
        }

        let line_ts = parse_timestamp_value(&value.get("timestamp").cloned());
        if line_ts > timestamp {
            timestamp = line_ts;
        }

        if project.is_empty() {
            if let Some(cwd) = value.get("cwd").and_then(|v| v.as_str()) {
                project = cwd.to_string();
            }
        }

        let is_meta = value.get("isMeta").and_then(|v| v.as_bool()) == Some(true);
        if is_meta {
            continue;
        }

        if let Some(candidate) = extract_claude_project_display_candidate(&value) {
            let candidate = normalize_history_display(Some(candidate));
            if !candidate.is_empty() {
                display = Some(candidate);
            }
        }
    }

    let project_name = project
        .split('/')
        .next_back()
        .unwrap_or("unknown")
        .to_string();

    Some(HistorySession {
        id: session_id,
        source: SOURCE_CLAUDE.to_string(),
        display: normalize_history_display(display),
        timestamp,
        project,
        project_name,
        env_name: None,
        config_source: None,
    })
}

fn extract_claude_project_display_candidate(value: &serde_json::Value) -> Option<String> {
    match value.get("type").and_then(|v| v.as_str()) {
        Some("last-prompt") => value
            .get("lastPrompt")
            .and_then(|v| v.as_str())
            .map(ToString::to_string),
        Some("summary") => value
            .get("summary")
            .and_then(|v| v.as_str())
            .or_else(|| value.get("content").and_then(|v| v.as_str()))
            .map(ToString::to_string),
        Some("user") => value
            .get("message")
            .and_then(extract_first_claude_message_text)
            .map(ToString::to_string),
        _ => None,
    }
}

fn extract_first_claude_message_text(message: &serde_json::Value) -> Option<&str> {
    message
        .get("content")
        .and_then(|v| v.as_array())
        .and_then(|blocks| {
            blocks.iter().find_map(|block| {
                block
                    .get("text")
                    .and_then(|v| v.as_str())
                    .filter(|text| !text.trim().is_empty())
            })
        })
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
    let display = normalize_history_display(parsed.text);

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
                env_name: None,
                config_source: None,
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
// OpenCode history helpers
// ============================================================================

fn load_opencode_history() -> Result<Vec<HistorySession>, String> {
    let mut session_map: HashMap<String, HistorySession> = HashMap::new();

    if let Some(raw_value) = opencode::load_session_list_value_from_cli_or_fixture()? {
        if let Some(items) = raw_value.as_array() {
            for item in items {
                if let Some(session) = parse_opencode_history_session(item) {
                    merge_opencode_history_session(&mut session_map, session);
                }
            }
        }

        if let Some(items) = raw_value.get("sessions").and_then(|value| value.as_array()) {
            for item in items {
                if let Some(session) = parse_opencode_history_session(item) {
                    merge_opencode_history_session(&mut session_map, session);
                }
            }
        }
    }

    for session in opencode::list_local_sessions()? {
        merge_opencode_history_session(
            &mut session_map,
            local_opencode_session_to_history_session(session),
        );
    }

    Ok(session_map.into_values().collect())
}

fn parse_opencode_history_session(value: &serde_json::Value) -> Option<HistorySession> {
    let id = extract_opencode_string(value, &["id", "sessionId", "session_id"])?;
    let metadata = opencode::read_session_metadata(&id);
    let project = extract_opencode_string(value, &["cwd", "path", "projectPath", "project"])
        .or_else(|| metadata.as_ref().and_then(|item| item.project.clone()))
        .unwrap_or_default();
    let project_name = project
        .split(['/', '\\'])
        .next_back()
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown")
        .to_string();
    let timestamp = extract_opencode_timestamp(value)
        .or_else(|| {
            extract_opencode_string(value, &["updatedAt", "createdAt", "timestamp", "lastUpdated"])
                .map(|text| parse_string_timestamp(&text))
        })
        .unwrap_or(0);
    let display = normalize_history_display(
        extract_opencode_string(value, &["title", "display", "summary", "preview", "name"]),
    );

    Some(HistorySession {
        id,
        source: SOURCE_OPENCODE.to_string(),
        display,
        timestamp,
        project,
        project_name,
        env_name: extract_opencode_string(value, &["envName", "environment", "env"]).or_else(|| {
            metadata
                .as_ref()
                .map(|item| item.env_name.clone())
                .or_else(|| Some(opencode::OPENCODE_NATIVE_ENV_NAME.to_string()))
        }),
        config_source: extract_opencode_string(value, &["configSource"]).or_else(|| {
            metadata
                .as_ref()
                .map(|item| item.config_source.clone())
                .or_else(|| Some("native".to_string()))
        }),
    })
}

fn merge_opencode_history_session(
    session_map: &mut HashMap<String, HistorySession>,
    candidate: HistorySession,
) {
    if let Some(existing) = session_map.get_mut(&candidate.id) {
        if candidate.timestamp > existing.timestamp {
            existing.timestamp = candidate.timestamp;
        }
        if existing.project.is_empty() && !candidate.project.is_empty() {
            existing.project = candidate.project.clone();
            existing.project_name = candidate.project_name.clone();
        }
        if (existing.env_name.is_none()
            || existing.env_name.as_deref() == Some(opencode::OPENCODE_NATIVE_ENV_NAME))
            && candidate.env_name.is_some()
            && candidate.env_name.as_deref() != Some(opencode::OPENCODE_NATIVE_ENV_NAME)
        {
            existing.env_name = candidate.env_name.clone();
        }
        if (existing.config_source.is_none()
            || existing.config_source.as_deref() == Some("native"))
            && candidate.config_source.as_deref() == Some("ccem")
        {
            existing.config_source = candidate.config_source.clone();
        }
        if (existing.display.is_empty() || is_noise_display(&existing.display))
            && !candidate.display.is_empty()
            && !is_noise_display(&candidate.display)
        {
            existing.display = candidate.display;
        }
    } else {
        session_map.insert(candidate.id.clone(), candidate);
    }
}

fn load_opencode_export(session_id: &str) -> Result<Option<serde_json::Value>, String> {
    if let Some(value) = opencode::load_export_from_cli_or_fixture(session_id)? {
        return Ok(Some(value));
    }

    let messages = opencode::load_local_messages(session_id)?;
    Ok(messages.map(build_local_opencode_export))
}

fn parse_opencode_conversation_export(
    value: &serde_json::Value,
) -> Result<(Vec<ConversationMessage>, Vec<CompactSegment>), String> {
    let Some(items) = find_opencode_message_array(value) else {
        return Ok((Vec::new(), Vec::new()));
    };

    let mut messages = Vec::new();
    for item in items {
        let msg_type = extract_opencode_string(item, &["role", "type", "kind"])
            .unwrap_or_else(|| "assistant".to_string());
        let content_text = extract_opencode_content_text(item);
        let usage = extract_opencode_usage(item);
        let timestamp = extract_opencode_timestamp(item)
            .or_else(|| {
                extract_opencode_string(item, &["timestamp", "createdAt", "updatedAt"])
                    .map(|text| parse_string_timestamp(&text))
            })
            .unwrap_or(0);

        messages.push(ConversationMessage {
            msg_type,
            uuid: extract_opencode_string(item, &["id", "uuid"]),
            content: content_text.map_or(serde_json::Value::Null, |text| json!(text)),
            model: extract_opencode_string(item, &["model"]),
            summary: None,
            plan_content: None,
            timestamp,
            input_tokens: usage.as_ref().map(|usage| usage.input_tokens),
            output_tokens: usage.as_ref().map(|usage| usage.output_tokens),
            cache_creation_tokens: usage.as_ref().map(|usage| usage.cache_creation_tokens),
            cache_read_tokens: usage.as_ref().map(|usage| usage.cache_read_tokens),
            segment_index: 0,
            is_compact_boundary: false,
        });
    }

    Ok((messages, Vec::new()))
}

#[derive(Debug, Clone, Default)]
struct OpenCodeUsage {
    input_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
    cache_creation_tokens: u64,
}

fn find_opencode_message_array(value: &serde_json::Value) -> Option<&Vec<serde_json::Value>> {
    if let Some(array) = value.as_array() {
        if array.iter().any(opencode_message_candidate) {
            return Some(array);
        }
        return None;
    }

    let object = value.as_object()?;
    for key in ["messages", "items", "entries", "conversation"] {
        if let Some(candidate) = object.get(key) {
            if let Some(array) = find_opencode_message_array(candidate) {
                return Some(array);
            }
        }
    }

    for child in object.values() {
        if let Some(array) = find_opencode_message_array(child) {
            return Some(array);
        }
    }

    None
}

fn opencode_message_candidate(value: &serde_json::Value) -> bool {
    value
        .as_object()
        .map(|object| {
            object.contains_key("role")
                || object.contains_key("type")
                || object.contains_key("content")
                || object.contains_key("message")
                || object.contains_key("text")
        })
        .unwrap_or(false)
}

fn extract_opencode_string(value: &serde_json::Value, keys: &[&str]) -> Option<String> {
    if let Some(object) = value.as_object() {
        for key in keys {
            if let Some(raw) = object.get(*key) {
                if let Some(text) = raw.as_str().filter(|text| !text.trim().is_empty()) {
                    return Some(text.to_string());
                }
                if let Some(nested) = raw
                    .as_object()
                    .and_then(|nested| nested.get("path"))
                    .and_then(|nested| nested.as_str())
                    .filter(|text| !text.trim().is_empty())
                {
                    return Some(nested.to_string());
                }
            }
        }
    }

    None
}

fn extract_opencode_timestamp(value: &serde_json::Value) -> Option<u64> {
    for key in ["timestamp", "updatedAt", "createdAt", "lastUpdated"] {
        let Some(raw) = value.get(key) else {
            continue;
        };

        if let Some(number) = raw.as_u64() {
            return Some(normalize_unix_timestamp(number));
        }
        if let Some(text) = raw.as_str().filter(|text| !text.trim().is_empty()) {
            let parsed = parse_string_timestamp(text);
            if parsed > 0 {
                return Some(parsed);
            }
        }
    }

    None
}

fn parse_string_timestamp(value: &str) -> u64 {
    if let Ok(number) = value.parse::<u64>() {
        return normalize_unix_timestamp(number);
    }

    chrono::DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.timestamp_millis() as u64)
        .unwrap_or(0)
}

fn extract_opencode_content_text(value: &serde_json::Value) -> Option<String> {
    if let Some(text) = value.as_str().filter(|text| !text.trim().is_empty()) {
        return Some(text.to_string());
    }

    if let Some(array) = value.as_array() {
        let parts = array
            .iter()
            .filter_map(extract_opencode_content_text)
            .collect::<Vec<_>>();
        if !parts.is_empty() {
            return Some(parts.join("\n\n"));
        }
    }

    let object = value.as_object()?;
    for key in ["content", "text", "body", "message", "input", "output", "result"] {
        if let Some(text) = object.get(key).and_then(extract_opencode_content_text) {
            return Some(text);
        }
    }

    None
}

fn extract_opencode_usage(value: &serde_json::Value) -> Option<OpenCodeUsage> {
    let usage_node = value
        .get("usage")
        .or_else(|| value.get("tokens"))
        .or_else(|| value.get("stats"))
        .or_else(|| value.get("cost"))?;
    let object = usage_node.as_object()?;

    Some(OpenCodeUsage {
        input_tokens: object
            .get("inputTokens")
            .or_else(|| object.get("input_tokens"))
            .and_then(|value| value.as_u64())
            .unwrap_or(0),
        output_tokens: object
            .get("outputTokens")
            .or_else(|| object.get("output_tokens"))
            .and_then(|value| value.as_u64())
            .unwrap_or(0),
        cache_read_tokens: object
            .get("cacheReadTokens")
            .or_else(|| object.get("cache_read_tokens"))
            .and_then(|value| value.as_u64())
            .unwrap_or(0),
        cache_creation_tokens: object
            .get("cacheCreationTokens")
            .or_else(|| object.get("cache_creation_tokens"))
            .and_then(|value| value.as_u64())
            .unwrap_or(0),
    })
}

fn local_opencode_session_to_history_session(
    session: opencode::LocalOpenCodeSession,
) -> HistorySession {
    let project = session.project.unwrap_or_default();
    let project_name = project
        .split(['/', '\\'])
        .next_back()
        .filter(|value| !value.is_empty())
        .unwrap_or("unknown")
        .to_string();

    HistorySession {
        id: session.id,
        source: SOURCE_OPENCODE.to_string(),
        display: normalize_history_display(Some(session.title)),
        timestamp: session.updated_at.max(session.created_at),
        project,
        project_name,
        env_name: session.env_name,
        config_source: session.config_source,
    }
}

fn build_local_opencode_export(messages: Vec<opencode::LocalOpenCodeMessage>) -> serde_json::Value {
    json!({
        "messages": messages
            .into_iter()
            .map(|message| {
                json!({
                    "id": message.id,
                    "role": message.role,
                    "timestamp": message.timestamp,
                    "model": message.model,
                    "content": message.content,
                })
            })
            .collect::<Vec<_>>()
    })
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
        SOURCE_OPENCODE => Ok(Some(SOURCE_OPENCODE)),
        _ => Err(format!(
            "Unsupported source '{}'. Use claude, codex, opencode, or all.",
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
    let has_opencode = has_opencode_session(session_id);

    if has_claude {
        // Keep legacy behavior: if both exist, default to Claude unless caller passes source.
        return Some(SOURCE_CLAUDE);
    }

    if has_codex {
        return Some(SOURCE_CODEX);
    }

    if has_opencode {
        return Some(SOURCE_OPENCODE);
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

fn has_opencode_session(session_id: &str) -> bool {
    load_opencode_export(session_id)
        .map(|value| value.is_some())
        .unwrap_or(false)
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

fn normalize_history_display(display: Option<String>) -> String {
    let raw = display.unwrap_or_default();
    let cleaned = clean_display_title(&raw);
    if is_noise_display(&cleaned) {
        return String::new();
    }
    // Return empty string — frontend fallback chain handles "Untitled" display
    cleaned
}

/// Non-destructive cleanup: strip noise artifacts but do NOT truncate.
/// Search and export rely on the raw string; truncation is handled by frontend CSS.
fn clean_display_title(raw: &str) -> String {
    let s = raw.trim();
    if s.is_empty() {
        return String::new();
    }

    // 1. Replace newlines with spaces
    let s = s.replace('\n', " ").replace('\r', "");

    // 2. Strip leading artifact markers (only from start to preserve legitimate content)
    //    Loop to handle stacked markers like "[Request interrupted][Error ...]actual title"
    let mut s = s;
    loop {
        let cleaned = strip_leading_bracket(&s, "[Request interrupted");
        let cleaned = strip_leading_system_error(&cleaned);
        let cleaned = cleaned
            .trim_start()
            .trim_start_matches("<synthetic>")
            .trim_start();
        let cleaned = strip_leading_image_marker(&cleaned);
        let cleaned = strip_leading_image_source_marker(&cleaned);
        let cleaned = strip_leading_skill_reference(&cleaned);
        if cleaned == s {
            break;
        }
        s = cleaned;
    }

    // 3. Collapse consecutive whitespace
    let s = s.split_whitespace().collect::<Vec<_>>().join(" ");

    s.trim().to_string()
}

/// Strip a leading system error bracket like "[Error]", "[Error: ...]", "[Error - ...]".
/// Only strips system artifact formats — NOT "[Error boundary]" or "[Error handling]".
fn strip_leading_system_error(text: &str) -> String {
    let lowered = text.trim_start().to_lowercase();
    if !lowered.starts_with("[error") {
        return text.to_string();
    }
    // Reuse the same precise matching as is_noise_display
    if !lower_starts_with_error_artifact(&lowered) {
        return text.to_string();
    }
    // Match confirmed — find closing ']' and strip
    let chars: Vec<char> = text.trim_start().chars().collect();
    if let Some(offset) = chars.iter().position(|&c| c == ']') {
        let rest: String = chars[offset + 1..].iter().collect();
        rest.trim_start().to_string()
    } else {
        text.to_string()
    }
}

/// Remove a leading "[...]" segment starting with `prefix` from `text`.
/// Only strips from the **beginning** of the string to avoid mangling legitimate
/// titles like "Fix [Error boundary] crash".
/// UTF-8 safe: operates on `Vec<char>`, not byte indices.
fn strip_leading_bracket(text: &str, prefix: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let prefix_chars: Vec<char> = prefix.chars().collect();
    if chars.len() <= prefix_chars.len() || chars[0] != '[' {
        return text.to_string();
    }
    let matches_prefix = chars[..prefix_chars.len()]
        .iter()
        .zip(prefix_chars.iter())
        .all(|(a, b)| a == b);
    if !matches_prefix {
        return text.to_string();
    }
    // Find closing ']' for the leading bracket
    if let Some(offset) = chars.iter().position(|&c| c == ']') {
        let rest: String = chars[offset + 1..].iter().collect();
        rest.trim_start().to_string()
    } else {
        text.to_string()
    }
}

/// Remove a leading "[Image #N]" or "[image #N]" pattern from `text`.
/// Only strips from the **beginning** to preserve legitimate content.
/// UTF-8 safe: char-based.
fn strip_leading_image_marker(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= 7 || chars[0] != '[' {
        return text.to_string();
    }
    let tag: String = chars[..7].iter().collect();
    if tag != "[Image " && tag != "[image " {
        return text.to_string();
    }
    if let Some(offset) = chars.iter().position(|&c| c == ']') {
        let rest: String = chars[offset + 1..].iter().collect();
        rest.trim_start().to_string()
    } else {
        text.to_string()
    }
}

/// Remove a leading "[Image: source: ...]" marker from `text`.
/// Only strips from the beginning to preserve legitimate content later in the title.
fn strip_leading_image_source_marker(text: &str) -> String {
    let trimmed = text.trim_start();
    if !trimmed.starts_with("[Image: source:") && !trimmed.starts_with("[image: source:") {
        return text.to_string();
    }

    if let Some(offset) = trimmed.find(']') {
        return trimmed[offset + 1..].trim_start().to_string();
    }

    text.to_string()
}

/// Strip a leading skill marker such as:
/// - `[$skill](/path/to/SKILL.md)`
/// - `$skill-name`
/// Only strips from the beginning so normal markdown links in real titles are preserved.
fn strip_leading_skill_reference(text: &str) -> String {
    let trimmed = text.trim_start();
    let cleaned = strip_one_leading_markdown_skill_link(trimmed);
    if cleaned != trimmed {
        return cleaned;
    }

    strip_one_leading_skill_token(trimmed)
}

fn strip_one_leading_markdown_skill_link(text: &str) -> String {
    if !text.starts_with('[') {
        return text.to_string();
    }

    let Some(label_end) = text.find("](") else {
        return text.to_string();
    };
    let target_start = label_end + 2;
    let Some(target_end_rel) = text[target_start..].find(')') else {
        return text.to_string();
    };
    let target_end = target_start + target_end_rel;
    let target = &text[target_start..target_end];
    if !target.contains("/SKILL.md") {
        return text.to_string();
    }

    text[target_end + 1..].trim_start().to_string()
}

fn strip_one_leading_skill_token(text: &str) -> String {
    if !text.starts_with('$') {
        return text.to_string();
    }

    let token_end = text
        .char_indices()
        .find(|(_, c)| c.is_whitespace())
        .map(|(i, _)| i)
        .unwrap_or(text.len());
    let token = &text[..token_end];
    if token.len() <= 1 {
        return text.to_string();
    }

    let body = &token[1..];
    let valid = body
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ':' || c == '.');
    let looks_like_skill = body.chars().any(|c| c.is_ascii_alphabetic());
    if !valid || !looks_like_skill {
        return text.to_string();
    }

    text[token_end..].trim_start().to_string()
}

/// Check if a lowered string starts with a Claude system error artifact.
/// Matches "[error]" (bare), "[error:" (with details), "[error -" (dash format).
/// Does NOT match "[error boundary]" or "[error handling]" — legitimate user titles.
fn lower_starts_with_error_artifact(lowered: &str) -> bool {
    if !lowered.starts_with("[error") {
        return false;
    }
    let rest = &lowered[6..]; // after "[error"
    if rest.is_empty() {
        return true; // "[error" alone
    }
    let next_char = rest.chars().next().unwrap();
    // Only treat as noise if followed by ']', ':', '-', or '/'
    // Space is intentionally excluded to preserve "[Error boundary]", "[Error handling]", etc.
    matches!(next_char, ']' | ':' | '-' | '/')
}

/// Returns true if display text is command noise, not a real topic.
fn is_noise_display(display: &str) -> bool {
    let trimmed = display.trim();
    if trimmed.is_empty() {
        return true;
    }

    // Filter out very short / punctuation-only content ("？", "??", "...")
    // Use chars() for correct Unicode handling (CJK, emoji, etc.)
    let meaningful: usize = trimmed
        .chars()
        .filter(|c| c.is_alphanumeric() || (*c as u32) >= 0x4E00)
        .count();
    if meaningful < 2 {
        return true;
    }

    if is_low_signal_followup(trimmed) {
        return true;
    }

    // System message patterns — match specific Claude system artifacts only.
    // Use exact prefixes to avoid catching legitimate user titles like "[Error boundary] crash".
    let lowered = trimmed.to_lowercase();
    if lowered.starts_with("[request interrupted") {
        return true;
    }
    // Only match "[error]" (bare) or "[error:" (with details), not "[error boundary]"
    if lower_starts_with_error_artifact(&lowered) {
        return true;
    }
    if lowered.starts_with("<synthetic>") {
        return true;
    }
    if lowered.starts_with("unknown skill:") {
        return true;
    }
    if lowered.starts_with("base directory for this skill:") {
        return true;
    }
    if lowered.starts_with("[image: source:") {
        return true;
    }
    if lowered.starts_with("<local-command-caveat>")
        || lowered.starts_with("<local-command-stdout>")
        || lowered.starts_with("<command-name>")
        || lowered.starts_with("<command-message>")
    {
        return true;
    }

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

fn is_low_signal_followup(display: &str) -> bool {
    let trimmed = display
        .trim()
        .trim_start_matches(|c: char| {
            matches!(c, '?' | '？' | '!' | '！' | '.' | '。' | ',' | '，')
        })
        .trim_start();

    matches!(trimmed, "继续" | "继续呢" | "继续啊" | "怎么样了")
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
        // System/display-only commands — never meaningful as conversation titles
        "buddy", "doctor", "cost", "memory", "login",
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
        is_noise_display, load_claude_history_from_paths, normalize_history_display,
        normalize_history_source, parse_codex_history_timestamp,
        merge_opencode_history_session,
        parse_opencode_conversation_export, parse_opencode_history_session,
        HistorySession, upsert_codex_history_session, CodexHistoryLine,
    };
    use std::collections::HashMap;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_history_dir(prefix: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("ccem-history-{prefix}-{unique}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

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
    fn test_normalize_history_display_strips_skill_prefixes() {
        assert_eq!(
            normalize_history_display(Some(
                "[$vercel-react-best-practices](/Users/g/.agents/skills/vercel-react-best-practices/SKILL.md) Dashboard 现在一点进去有卡顿定位下问题".to_string()
            )),
            "Dashboard 现在一点进去有卡顿定位下问题"
        );
        assert_eq!(
            normalize_history_display(Some(
                "$pua [$vercel-react-best-practices](/Users/g/.agents/skills/vercel-react-best-practices/SKILL.md) 最近有多个用户向我反馈说 ui 很卡".to_string()
            )),
            "最近有多个用户向我反馈说 ui 很卡"
        );
        assert_eq!(
            normalize_history_display(Some(
                "[$done](/Users/g/.codex/claude-done/skills/done/SKILL.md)".to_string()
            )),
            ""
        );
    }

    #[test]
    fn test_normalize_history_display_filters_low_signal_noise() {
        assert_eq!(
            normalize_history_display(Some("Unknown skill: codex:setup".to_string())),
            ""
        );
        assert_eq!(normalize_history_display(Some("继续".to_string())), "");
        assert_eq!(normalize_history_display(Some("继续呢".to_string())), "");
        assert_eq!(normalize_history_display(Some("怎么样了".to_string())), "");
        assert_eq!(normalize_history_display(Some("/status".to_string())), "");
        assert_eq!(
            normalize_history_display(Some("[Image: source: /tmp/test.png]".to_string())),
            ""
        );
        assert_eq!(
            normalize_history_display(Some("[Image #1] 右边的空状态为啥有个新会按钮".to_string())),
            "右边的空状态为啥有个新会按钮"
        );
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
        // Now returns empty string — frontend handles the fallback
        assert_eq!(item.display, "");
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
        assert_eq!(
            normalize_history_source(Some("OpenCode")).unwrap(),
            Some("opencode")
        );
        assert!(normalize_history_source(Some("other")).is_err());
    }

    #[test]
    fn test_parse_opencode_history_session_uses_title_and_project() {
        let value = serde_json::json!({
            "id": "opencode-session-1",
            "cwd": "/tmp/opencode-workspace",
            "title": "排查 OpenCode 集成",
            "updatedAt": "2026-04-15T12:34:56.000Z"
        });

        let session = parse_opencode_history_session(&value).expect("session parsed");
        assert_eq!(session.id, "opencode-session-1");
        assert_eq!(session.source, "opencode");
        assert_eq!(session.project, "/tmp/opencode-workspace");
        assert_eq!(session.project_name, "opencode-workspace");
        assert_eq!(session.display, "排查 OpenCode 集成");
        assert_eq!(session.timestamp, 1_776_256_496_000);
    }

    #[test]
    fn test_merge_opencode_history_session_promotes_local_ccem_metadata() {
        let mut map = HashMap::new();
        map.insert(
            "opencode-session-1".to_string(),
            HistorySession {
                id: "opencode-session-1".to_string(),
                source: "opencode".to_string(),
                display: "".to_string(),
                timestamp: 10,
                project: "".to_string(),
                project_name: "unknown".to_string(),
                env_name: Some(super::opencode::OPENCODE_NATIVE_ENV_NAME.to_string()),
                config_source: Some("native".to_string()),
            },
        );

        merge_opencode_history_session(
            &mut map,
            HistorySession {
                id: "opencode-session-1".to_string(),
                source: "opencode".to_string(),
                display: "补齐元数据".to_string(),
                timestamp: 20,
                project: "/tmp/demo".to_string(),
                project_name: "demo".to_string(),
                env_name: Some("Fixture Anthropic".to_string()),
                config_source: Some("ccem".to_string()),
            },
        );

        let merged = map.get("opencode-session-1").expect("merged session");
        assert_eq!(merged.timestamp, 20);
        assert_eq!(merged.project, "/tmp/demo");
        assert_eq!(merged.project_name, "demo");
        assert_eq!(merged.display, "补齐元数据");
        assert_eq!(merged.env_name.as_deref(), Some("Fixture Anthropic"));
        assert_eq!(merged.config_source.as_deref(), Some("ccem"));
    }

    #[test]
    fn test_parse_opencode_conversation_export_reads_messages_and_usage() {
        let export = serde_json::json!({
            "messages": [
                {
                    "id": "msg-1",
                    "role": "user",
                    "timestamp": "2026-04-15T12:34:56.000Z",
                    "content": [{"type": "text", "text": "请帮我检查 OpenCode 接入"}]
                },
                {
                    "id": "msg-2",
                    "role": "assistant",
                    "timestamp": "2026-04-15T12:35:10.000Z",
                    "model": "anthropic/claude-sonnet-4-5",
                    "content": [{"type": "text", "text": "已经开始检查。"}],
                    "usage": {
                        "inputTokens": 1200,
                        "outputTokens": 340,
                        "cacheReadTokens": 80,
                        "cacheCreationTokens": 20
                    }
                }
            ]
        });

        let (messages, segments) =
            parse_opencode_conversation_export(&export).expect("export parsed");

        assert!(segments.is_empty());
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].msg_type, "user");
        assert_eq!(messages[1].model.as_deref(), Some("anthropic/claude-sonnet-4-5"));
        assert_eq!(messages[1].input_tokens, Some(1200));
        assert_eq!(messages[1].output_tokens, Some(340));
        assert_eq!(messages[1].cache_read_tokens, Some(80));
        assert_eq!(messages[1].cache_creation_tokens, Some(20));
    }

    #[test]
    fn test_parse_codex_seconds_timestamp_to_millis() {
        let ts = parse_codex_history_timestamp(&Some(serde_json::Value::Number(
            serde_json::Number::from(1_700_000_000u64),
        )));
        assert_eq!(ts, 1_700_000_000_000);
    }

    #[test]
    fn test_normalize_history_display_falls_back_for_blank_values() {
        // Empty string — frontend handles "Untitled" display
        assert_eq!(normalize_history_display(None), "");
        assert_eq!(normalize_history_display(Some(String::new())), "");
        assert_eq!(
            normalize_history_display(Some("   keep title   ".to_string())),
            "keep title"
        );
    }

    #[test]
    fn test_claude_history_falls_back_to_project_sessions_when_index_missing() {
        let root = temp_history_dir("fallback");
        let history_path = root.join("history.jsonl");
        let projects_dir = root.join("projects");
        let project_dir = projects_dir.join("-Users-g-cc-home");
        fs::create_dir_all(&project_dir).expect("create project dir");

        fs::write(
            project_dir.join("session-1.jsonl"),
            concat!(
                "{\"type\":\"progress\",\"cwd\":\"/Users/g/cc-home\",\"sessionId\":\"session-1\",\"timestamp\":\"2026-03-11T15:43:34.800Z\"}\n",
                "{\"type\":\"user\",\"sessionId\":\"session-1\",\"timestamp\":\"2026-03-11T15:43:34.817Z\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"Say exactly ok\"}]}}\n",
                "{\"type\":\"last-prompt\",\"sessionId\":\"session-1\",\"lastPrompt\":\"Say exactly ok\",\"timestamp\":\"2026-03-11T15:44:22.971Z\"}\n"
            ),
        )
        .expect("write session file");

        let sessions =
            load_claude_history_from_paths(&history_path, &projects_dir).expect("load history");
        let session = sessions
            .into_iter()
            .find(|session| session.id == "session-1")
            .expect("session should be indexed");

        assert_eq!(session.project, "/Users/g/cc-home");
        assert_eq!(session.project_name, "cc-home");
        assert_eq!(session.display, "Say exactly ok");

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn test_claude_history_merges_project_metadata_into_indexed_sessions() {
        let root = temp_history_dir("merge");
        let history_path = root.join("history.jsonl");
        let projects_dir = root.join("projects");
        let project_dir = projects_dir.join("-Users-g-cc-home");
        fs::create_dir_all(&project_dir).expect("create project dir");

        fs::write(
            &history_path,
            "{\"display\":\"/new my-topic\",\"timestamp\":1773243810000,\"project\":\"\",\"sessionId\":\"session-2\"}\n",
        )
        .expect("write history index");

        fs::write(
            project_dir.join("session-2.jsonl"),
            concat!(
                "{\"type\":\"progress\",\"cwd\":\"/Users/g/cc-home\",\"sessionId\":\"session-2\",\"timestamp\":\"2026-03-11T15:43:34.800Z\"}\n",
                "{\"type\":\"user\",\"sessionId\":\"session-2\",\"timestamp\":\"2026-03-11T15:43:34.817Z\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"Real follow-up\"}]}}\n"
            ),
        )
        .expect("write session file");

        let sessions =
            load_claude_history_from_paths(&history_path, &projects_dir).expect("load history");
        let session = sessions
            .into_iter()
            .find(|session| session.id == "session-2")
            .expect("session should be merged");

        assert_eq!(session.project, "/Users/g/cc-home");
        assert_eq!(session.project_name, "cc-home");
        assert_eq!(session.display, "Real follow-up");

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn test_claude_project_index_ignores_meta_skill_payload_for_title() {
        let root = temp_history_dir("meta-skip");
        let history_path = root.join("history.jsonl");
        let projects_dir = root.join("projects");
        let project_dir = projects_dir.join("-Users-g-ccem");
        fs::create_dir_all(&project_dir).expect("create project dir");

        fs::write(
            project_dir.join("session-1.jsonl"),
            concat!(
                "{\"type\":\"user\",\"sessionId\":\"session-1\",\"timestamp\":\"2026-03-31T15:54:28.964Z\",\"cwd\":\"/Users/g/ccem\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"Base directory for this skill: /Users/g/.claude/skills/foo\\n\\nARGUMENTS: hello\"}]},\"isMeta\":true}\n",
                "{\"type\":\"file-history-snapshot\",\"sessionId\":\"session-1\",\"timestamp\":\"2026-03-31T15:54:29.000Z\",\"cwd\":\"/Users/g/ccem\"}\n"
            ),
        )
        .expect("write session file");

        let sessions =
            load_claude_history_from_paths(&history_path, &projects_dir).expect("load history");
        let session = sessions
            .into_iter()
            .find(|session| session.id == "session-1")
            .expect("session should be indexed");

        assert_eq!(session.project, "/Users/g/ccem");
        assert_eq!(session.project_name, "ccem");
        assert_eq!(session.display, "");

        let _ = fs::remove_dir_all(root);
    }
}
