use crate::config;
use crate::native_helper_resource::native_helper_script_path;
use crate::terminal;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use tauri::AppHandle;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

const DEFAULT_HAIKU_MODEL: &str = "claude-3-5-haiku-20241022";
const TITLE_MAX_CHARS: usize = 36;
const TITLE_INPUT_MAX_CHARS: usize = 2_000;

#[tauri::command]
pub async fn generate_workspace_session_title(
    app: AppHandle,
    title_input: String,
) -> Result<Option<String>, String> {
    let Some(request) = build_title_query_request(&title_input)? else {
        return Ok(None);
    };
    let generated_title = run_title_query_helper(app, request).await?;
    Ok(generated_title.and_then(|title| sanitize_generated_title(&title)))
}

#[derive(Debug)]
struct TitleQueryRequest {
    title_input: String,
    working_dir: String,
    env_vars: HashMap<String, String>,
    claude_path: Option<String>,
    model: String,
}

#[derive(Debug, Serialize)]
struct TitleQueryCommand<'a> {
    #[serde(rename = "type")]
    command_type: &'static str,
    title_input: &'a str,
    working_dir: &'a str,
    env_vars: &'a HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    claude_path: Option<&'a str>,
    model: &'a str,
}

fn build_title_query_request(title_input: &str) -> Result<Option<TitleQueryRequest>, String> {
    let input = normalize_title_input(title_input);
    if input.is_empty() {
        return Ok(None);
    }

    let settings = config::read_settings().unwrap_or_default();
    if !settings.ai_enhanced {
        return Ok(None);
    }

    let cfg = config::read_config()?;
    let env_name = settings
        .ai_env_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .or(cfg.current.as_deref())
        .ok_or_else(|| "No AI enhancement environment configured".to_string())?;
    let resolved = config::resolve_claude_env(env_name)?;
    let mut env_vars = resolved.env_vars;
    force_haiku_title_model(&mut env_vars);
    env_vars.insert("PATH".to_string(), terminal::get_user_path());

    let auth_token = env_vars
        .get("ANTHROPIC_AUTH_TOKEN")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if auth_token.is_none() {
        return Ok(None);
    }

    let model = env_vars
        .get("ANTHROPIC_MODEL")
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_HAIKU_MODEL)
        .to_string();

    Ok(Some(TitleQueryRequest {
        title_input: input,
        working_dir: title_query_working_dir(),
        env_vars,
        claude_path: terminal::resolve_claude_path(),
        model,
    }))
}

async fn run_title_query_helper(
    app: AppHandle,
    request: TitleQueryRequest,
) -> Result<Option<String>, String> {
    let helper_path = native_helper_script_path(&app)?;
    let command = app
        .shell()
        .sidecar("ccem-node")
        .map_err(|error| format!("Failed to resolve Node sidecar: {}", error))?
        .arg(helper_path.to_string_lossy().to_string())
        .current_dir(&request.working_dir);

    let (mut rx, mut child) = command
        .spawn()
        .map_err(|error| format!("Failed to spawn native title helper: {}", error))?;

    let helper_command = TitleQueryCommand {
        command_type: "title_query",
        title_input: &request.title_input,
        working_dir: &request.working_dir,
        env_vars: &request.env_vars,
        claude_path: request.claude_path.as_deref(),
        model: &request.model,
    };
    let line = serde_json::to_string(&helper_command)
        .map_err(|error| format!("Failed to encode title query command: {}", error))?;
    child
        .write(format!("{}\n", line).as_bytes())
        .map_err(|error| format!("Failed to write title query command: {}", error))?;

    let mut stdout_buffer = Vec::new();
    let mut stderr_buffer = Vec::new();
    let mut stderr_lines = Vec::new();
    let mut status_error: Option<String> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(chunk) => {
                for text in drain_output_lines(&mut stdout_buffer, &chunk) {
                    if let Some(title) =
                        process_title_helper_line(&text, &mut status_error, &mut stderr_lines)?
                    {
                        let _ = child.kill();
                        return Ok(title);
                    }
                }
            }
            CommandEvent::Stderr(chunk) => {
                stderr_lines.extend(drain_output_lines(&mut stderr_buffer, &chunk));
            }
            CommandEvent::Error(error) => {
                return Err(format!("Native title helper error: {}", error));
            }
            CommandEvent::Terminated(payload) => {
                if let Some(text) = take_remaining_output_line(&mut stdout_buffer) {
                    if let Some(title) =
                        process_title_helper_line(&text, &mut status_error, &mut stderr_lines)?
                    {
                        return Ok(title);
                    }
                }
                if let Some(text) = take_remaining_output_line(&mut stderr_buffer) {
                    stderr_lines.push(text);
                }
                if let Some(error) = status_error {
                    return Err(error);
                }
                if payload.code.unwrap_or_default() != 0 {
                    let suffix = if stderr_lines.is_empty() {
                        String::new()
                    } else {
                        format!(": {}", stderr_lines.join("\n"))
                    };
                    return Err(format!(
                        "Native title helper exited with code {:?}{}",
                        payload.code, suffix
                    ));
                }
                return Ok(None);
            }
            _ => {}
        }
    }

    status_error.map_or(Ok(None), Err)
}

fn process_title_helper_line(
    line: &str,
    status_error: &mut Option<String>,
    stderr_lines: &mut Vec<String>,
) -> Result<Option<Option<String>>, String> {
    let value: Value = serde_json::from_str(line)
        .map_err(|error| format!("Failed to parse title helper output: {}", error))?;
    match value.get("type").and_then(Value::as_str) {
        Some("title_result") => Ok(Some(
            value
                .get("title")
                .and_then(Value::as_str)
                .map(|title| title.to_string()),
        )),
        Some("status") => {
            if value.get("status").and_then(Value::as_str) == Some("error") {
                *status_error = value
                    .get("detail")
                    .and_then(Value::as_str)
                    .map(str::to_string)
                    .or_else(|| Some("Native title helper reported an error.".to_string()));
            }
            Ok(None)
        }
        Some("event") => {
            if let Some(line) = value
                .get("payload")
                .and_then(|payload| payload.get("line"))
                .and_then(Value::as_str)
            {
                stderr_lines.push(line.to_string());
            }
            Ok(None)
        }
        _ => Ok(None),
    }
}

fn title_query_working_dir() -> String {
    config::get_default_working_dir()
        .or_else(|| dirs::home_dir().map(|path| path.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string())
}

fn trim_output_line(bytes: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(bytes).trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn drain_output_lines(buffer: &mut Vec<u8>, chunk: &[u8]) -> Vec<String> {
    buffer.extend_from_slice(chunk);
    let mut lines = Vec::new();
    while let Some(index) = buffer.iter().position(|byte| *byte == b'\n') {
        let line: Vec<u8> = buffer.drain(..=index).collect();
        if let Some(text) = trim_output_line(&line) {
            lines.push(text);
        }
    }
    lines
}

fn take_remaining_output_line(buffer: &mut Vec<u8>) -> Option<String> {
    if buffer.is_empty() {
        return None;
    }
    let line = std::mem::take(buffer);
    trim_output_line(&line)
}

fn normalize_title_input(input: &str) -> String {
    input
        .trim()
        .chars()
        .take(TITLE_INPUT_MAX_CHARS)
        .collect::<String>()
}

fn sanitize_generated_title(raw: &str) -> Option<String> {
    let mut title = raw
        .trim()
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or("")
        .trim()
        .trim_start_matches(['"', '\'', '`', '“', '‘', '[', '【'])
        .trim_end_matches([
            '"', '\'', '`', '”', '’', ']', '】', '。', '.', '！', '!', '？', '?', '，', ',', '、',
            '；', ';', '：', ':',
        ])
        .trim()
        .to_string();

    for prefix in ["标题：", "标题:", "Title:", "title:"] {
        if let Some(stripped) = title.strip_prefix(prefix) {
            title = stripped.trim().to_string();
        }
    }

    title = title
        .chars()
        .take(TITLE_MAX_CHARS)
        .collect::<String>()
        .trim()
        .to_string();

    let normalized = title.to_ascii_lowercase();
    if title.is_empty()
        || matches!(
            normalized.as_str(),
            "无法生成标题" | "untitled" | "no title" | "session title"
        )
    {
        None
    } else {
        Some(title)
    }
}

fn force_haiku_title_model(env_vars: &mut HashMap<String, String>) {
    let model = env_vars
        .get("ANTHROPIC_DEFAULT_HAIKU_MODEL")
        .or_else(|| env_vars.get("ANTHROPIC_SMALL_FAST_MODEL"))
        .map(String::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_HAIKU_MODEL)
        .to_string();
    env_vars.insert("ANTHROPIC_MODEL".to_string(), model);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn sanitize_generated_title_returns_compact_plain_text() {
        assert_eq!(
            sanitize_generated_title("  ```\n\"排查 ProjectTree 标题生成。\"\n```  "),
            Some("排查 ProjectTree 标题生成".to_string())
        );
    }

    #[test]
    fn sanitize_generated_title_rejects_empty_or_generic_output() {
        assert_eq!(sanitize_generated_title("   "), None);
        assert_eq!(sanitize_generated_title("无法生成标题"), None);
    }

    #[test]
    fn title_model_env_prefers_configured_haiku_model() {
        let mut env_vars = HashMap::new();
        env_vars.insert(
            "ANTHROPIC_DEFAULT_HAIKU_MODEL".to_string(),
            "claude-haiku-test".to_string(),
        );
        env_vars.insert("ANTHROPIC_MODEL".to_string(), "opus".to_string());

        force_haiku_title_model(&mut env_vars);

        assert_eq!(
            env_vars.get("ANTHROPIC_MODEL").map(String::as_str),
            Some("claude-haiku-test")
        );
    }

    #[test]
    fn title_helper_line_extracts_title_result() {
        let mut status_error = None;
        let mut stderr_lines = Vec::new();

        assert_eq!(
            process_title_helper_line(
                r#"{"type":"title_result","title":"标题：AI 生成标题。"}"#,
                &mut status_error,
                &mut stderr_lines
            )
            .expect("helper output should parse"),
            Some(Some("标题：AI 生成标题。".to_string()))
        );
    }
}
