use crate::terminal::resolve_claude_path;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use std::process::Stdio;
use std::sync::OnceLock;
use std::thread;
use std::time::Duration;

static USER_PATH: OnceLock<String> = OnceLock::new();

const DEFAULT_TMUX_SESSION: &str = "ccem";

#[derive(Debug, Clone, Serialize)]
pub struct TmuxWindowInfo {
    pub session_name: String,
    pub window_name: String,
    pub window_index: u32,
    pub pane_pid: Option<u32>,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClaudeTerminalState {
    Idle,
    Processing,
    WaitingApproval,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct TmuxManager {
    session_name: String,
}

impl Default for TmuxManager {
    fn default() -> Self {
        Self {
            session_name: DEFAULT_TMUX_SESSION.to_string(),
        }
    }
}

impl TmuxManager {
    pub fn session_name(&self) -> &str {
        &self.session_name
    }

    pub fn ensure_server(&self) -> Result<(), String> {
        Self::check_tmux_installed()?;
        if self.has_session()? {
            return Ok(());
        }

        let status = Command::new("tmux")
            .args([
                "new-session",
                "-d",
                "-s",
                &self.session_name,
                "-n",
                "bootstrap",
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| {
                format!(
                    "Failed to create tmux session '{}': {}",
                    self.session_name, error
                )
            })?;

        if status.success() {
            Ok(())
        } else {
            Err(format!(
                "tmux new-session exited with status {} while creating '{}'",
                status, self.session_name
            ))
        }
    }

    pub fn create_session(
        &self,
        runtime_id: &str,
        claude_args: &[String],
        env_vars: &HashMap<String, String>,
        working_dir: &Path,
    ) -> Result<TmuxWindowInfo, String> {
        Self::check_tmux_installed()?;
        let window_name = window_name_for_runtime(runtime_id);
        let working_dir_str = working_dir.to_str().ok_or_else(|| {
            format!(
                "Working directory is not valid UTF-8: {}",
                working_dir.display()
            )
        })?;
        let launch_command = build_tmux_launch_command(claude_args, env_vars);

        let output = if self.has_session()? {
            Command::new("tmux")
                .args([
                    "new-window",
                    "-P",
                    "-F",
                    "#{window_index}",
                    "-t",
                    &self.session_name,
                    "-n",
                    &window_name,
                    "-c",
                    working_dir_str,
                    &launch_command,
                ])
                .output()
        } else {
            Command::new("tmux")
                .args([
                    "new-session",
                    "-d",
                    "-P",
                    "-F",
                    "#{window_index}",
                    "-s",
                    &self.session_name,
                    "-n",
                    &window_name,
                    "-c",
                    working_dir_str,
                    &launch_command,
                ])
                .output()
        }
        .map_err(|error| format!("Failed to create tmux window '{}': {}", window_name, error))?;

        if !output.status.success() {
            return Err(format!(
                "tmux failed to create window '{}': {}",
                window_name,
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }

        let window_index = String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse::<u32>()
            .map_err(|error| {
                format!(
                    "Failed to parse tmux window index for '{}': {}",
                    window_name, error
                )
            })?;

        self.get_window_info(runtime_id).or_else(|_| {
            Ok(TmuxWindowInfo {
                session_name: self.session_name.clone(),
                window_name: window_name.clone(),
                window_index,
                pane_pid: None,
                target: format!("{}:{}", self.session_name, window_name),
            })
        })
    }

    pub fn list_sessions(&self) -> Result<Vec<TmuxWindowInfo>, String> {
        Self::check_tmux_installed()?;
        if !self.has_session()? {
            return Ok(Vec::new());
        }

        let output = Command::new("tmux")
            .args([
                "list-windows",
                "-t",
                &self.session_name,
                "-F",
                "#{window_index}\t#{window_name}\t#{pane_pid}",
            ])
            .output()
            .map_err(|error| format!("Failed to list tmux windows: {}", error))?;

        if !output.status.success() {
            return Err(format!(
                "tmux list-windows failed: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }

        let windows = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| parse_window_line(&self.session_name, line))
            .filter(|info| info.window_name != "bootstrap")
            .collect();
        Ok(windows)
    }

    pub fn get_window_info(&self, runtime_id: &str) -> Result<TmuxWindowInfo, String> {
        let target_names = window_name_candidates_for_runtime(runtime_id);
        self.list_sessions()?
            .into_iter()
            .find(|window| target_names.iter().any(|name| window.window_name == *name))
            .ok_or_else(|| format!("tmux window not found for runtime {}", runtime_id))
    }

    pub fn get_attach_target(&self, runtime_id: &str) -> Result<String, String> {
        Ok(self.get_window_info(runtime_id)?.target)
    }

    pub fn stop_session(&self, runtime_id: &str) -> Result<(), String> {
        let info = match self.get_window_info(runtime_id) {
            Ok(info) => info,
            Err(error)
                if error.contains("tmux window not found")
                    || error.contains("no server running")
                    || error.contains("list-windows failed") =>
            {
                return Ok(());
            }
            Err(error) => return Err(error),
        };
        self.send_named_key_to_target(&info.target, "C-c")?;
        thread::sleep(Duration::from_millis(1200));
        if self.target_exists(&info.target)? {
            self.kill_window_target(&info.target)?;
        }
        Ok(())
    }

    pub fn capture_pane(&self, runtime_id: &str, lines: u32) -> Result<String, String> {
        let info = self.get_window_info(runtime_id)?;
        self.capture_pane_target(&info.target, lines)
    }

    pub fn capture_pane_target(&self, target: &str, lines: u32) -> Result<String, String> {
        let start = format!("-{}", lines.max(20));
        let output = Command::new("tmux")
            .args(["capture-pane", "-t", target, "-p", "-S", &start])
            .output()
            .map_err(|error| format!("Failed to capture tmux pane {}: {}", target, error))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(format!(
                "tmux capture-pane failed for {}: {}",
                target,
                String::from_utf8_lossy(&output.stderr).trim()
            ))
        }
    }

    pub fn send_terminal_input(&self, runtime_id: &str, data: &str) -> Result<(), String> {
        let target = self.get_attach_target(runtime_id)?;
        self.send_terminal_input_to_target(&target, data)
    }

    pub fn send_terminal_input_to_target(&self, target: &str, data: &str) -> Result<(), String> {
        match data {
            "\r" => self.send_named_key_to_target(target, "Enter"),
            "\n" => self.send_named_key_to_target(target, "Enter"),
            "\t" => self.send_named_key_to_target(target, "Tab"),
            "\u{7f}" => self.send_named_key_to_target(target, "BSpace"),
            "\u{3}" => self.send_named_key_to_target(target, "C-c"),
            "\u{4}" => self.send_named_key_to_target(target, "C-d"),
            "\u{1b}" => self.send_named_key_to_target(target, "Escape"),
            "\u{1b}[A" => self.send_named_key_to_target(target, "Up"),
            "\u{1b}[B" => self.send_named_key_to_target(target, "Down"),
            "\u{1b}[C" => self.send_named_key_to_target(target, "Right"),
            "\u{1b}[D" => self.send_named_key_to_target(target, "Left"),
            _ if should_use_paste_buffer(data) => self.send_long_text_to_target(target, data),
            _ => self.send_literal_to_target(target, data),
        }
    }

    pub fn send_message(&self, runtime_id: &str, message: &str) -> Result<(), String> {
        if self.detect_state(runtime_id)? == ClaudeTerminalState::WaitingApproval {
            return Err(
                "Claude is waiting for approval. Approve or deny the request before sending a new message."
                    .to_string(),
            );
        }

        let target = self.get_attach_target(runtime_id)?;
        if should_use_paste_buffer(message) {
            self.send_long_text_to_target(&target, message)?;
        } else {
            self.send_literal_to_target(&target, message)?;
        }
        self.send_named_key_to_target(&target, "Enter")
    }

    pub fn send_approval(&self, runtime_id: &str, approved: bool) -> Result<(), String> {
        if self.detect_state(runtime_id)? != ClaudeTerminalState::WaitingApproval {
            return Err("Claude is not currently waiting for approval".to_string());
        }

        let target = self.get_attach_target(runtime_id)?;
        self.send_named_key_to_target(&target, if approved { "y" } else { "n" })
    }

    pub fn detect_state(&self, runtime_id: &str) -> Result<ClaudeTerminalState, String> {
        let captured = self.capture_pane(runtime_id, 24)?;
        Ok(detect_state_from_capture(&captured))
    }

    pub fn check_tmux_installed() -> Result<(), String> {
        let status = Command::new("sh")
            .args(["-c", "command -v tmux >/dev/null 2>&1"])
            .status()
            .map_err(|error| format!("Failed to check tmux installation: {}", error))?;

        if status.success() {
            Ok(())
        } else {
            Err("tmux is not installed. Install it first, e.g. `brew install tmux`.".to_string())
        }
    }

    fn has_session(&self) -> Result<bool, String> {
        let status = Command::new("tmux")
            .args(["has-session", "-t", &self.session_name])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| {
                format!(
                    "Failed to check tmux session '{}': {}",
                    self.session_name, error
                )
            })?;
        Ok(status.success())
    }

    fn target_exists(&self, target: &str) -> Result<bool, String> {
        let status = Command::new("tmux")
            .args(["display-message", "-p", "-t", target, "#{window_name}"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("Failed to inspect tmux target {}: {}", target, error))?;
        Ok(status.success())
    }

    fn kill_window_target(&self, target: &str) -> Result<(), String> {
        let status = Command::new("tmux")
            .args(["kill-window", "-t", target])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("Failed to kill tmux window {}: {}", target, error))?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("tmux kill-window failed for {}", target))
        }
    }

    fn send_named_key_to_target(&self, target: &str, key: &str) -> Result<(), String> {
        let status = Command::new("tmux")
            .args(["send-keys", "-t", target, key])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| {
                format!("Failed to send tmux key '{}' to {}: {}", key, target, error)
            })?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("tmux send-keys {} failed for {}", key, target))
        }
    }

    fn send_literal_to_target(&self, target: &str, text: &str) -> Result<(), String> {
        let status = Command::new("tmux")
            .args(["send-keys", "-t", target, "-l", text])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| {
                format!("Failed to send literal tmux input to {}: {}", target, error)
            })?;

        if status.success() {
            Ok(())
        } else {
            Err(format!("tmux send-keys -l failed for {}", target))
        }
    }

    fn send_long_text_to_target(&self, target: &str, text: &str) -> Result<(), String> {
        let temp_path = std::env::temp_dir().join(format!(
            "ccem-tmux-buffer-{}-{}.txt",
            std::process::id(),
            sanitize_target_for_filename(target)
        ));
        std::fs::write(&temp_path, text)
            .map_err(|error| format!("Failed to write tmux paste buffer temp file: {}", error))?;

        let load_status = Command::new("tmux")
            .args(["load-buffer", temp_path.to_string_lossy().as_ref()])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("Failed to load tmux buffer for {}: {}", target, error))?;

        if !load_status.success() {
            let _ = std::fs::remove_file(&temp_path);
            return Err(format!("tmux load-buffer failed for {}", target));
        }

        let paste_status = Command::new("tmux")
            .args(["paste-buffer", "-d", "-t", target])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|error| format!("Failed to paste tmux buffer into {}: {}", target, error))?;

        let _ = std::fs::remove_file(&temp_path);
        if paste_status.success() {
            Ok(())
        } else {
            Err(format!("tmux paste-buffer failed for {}", target))
        }
    }
}

pub fn window_name_for_runtime(runtime_id: &str) -> String {
    let sanitized = sanitize_runtime_id(runtime_id);
    let short = if sanitized.len() > 8 {
        sanitized[sanitized.len() - 8..].to_string()
    } else {
        sanitized
    };
    format!("ccem-{}", short)
}

fn window_name_candidates_for_runtime(runtime_id: &str) -> Vec<String> {
    let primary = window_name_for_runtime(runtime_id);
    let legacy = format!("ccem-{}", runtime_id.chars().take(8).collect::<String>());
    if legacy == primary {
        vec![primary]
    } else {
        vec![primary, legacy]
    }
}

pub fn detect_state_from_capture(captured: &str) -> ClaudeTerminalState {
    let tail = captured
        .lines()
        .rev()
        .filter(|line| !line.trim().is_empty())
        .take(16)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n");

    if contains_approval_pattern(&tail) {
        return ClaudeTerminalState::WaitingApproval;
    }
    if contains_prompt_pattern(&tail) {
        return ClaudeTerminalState::Idle;
    }
    if tail.trim().is_empty() {
        return ClaudeTerminalState::Unknown;
    }
    ClaudeTerminalState::Processing
}

fn contains_prompt_pattern(lines: &str) -> bool {
    let trimmed = lines.trim_end();
    trimmed.contains("\n❯")
        || trimmed.contains("❯\u{a0}Try ")
        || trimmed.contains("❯ Try ")
        || trimmed.ends_with('❯')
        || trimmed.contains("\n>")
        || trimmed.ends_with('>')
        || trimmed.contains("accept edits on")
        || trimmed.contains("Press Enter")
}

fn contains_approval_pattern(lines: &str) -> bool {
    lines.contains("[Edit]")
        || lines.contains("[Shell]")
        || lines.contains("[Question]")
        || (lines.contains("Allow") && lines.contains("Deny"))
}

fn parse_window_line(session_name: &str, line: &str) -> Option<TmuxWindowInfo> {
    let mut parts = line.split('\t');
    let window_index = parts.next()?.parse::<u32>().ok()?;
    let window_name = parts.next()?.to_string();
    let pane_pid = parts.next().and_then(|value| value.parse::<u32>().ok());
    Some(TmuxWindowInfo {
        session_name: session_name.to_string(),
        target: format!("{}:{}", session_name, window_name),
        window_name,
        window_index,
        pane_pid,
    })
}

fn build_tmux_launch_command(claude_args: &[String], env_vars: &HashMap<String, String>) -> String {
    let claude_binary = resolve_claude_path().unwrap_or_else(|| "claude".to_string());
    let mut exports = vec![
        format!("export PATH={}", shell_quote(get_user_path())),
        "unset CLAUDECODE".to_string(),
    ];

    let mut env_entries = env_vars.iter().collect::<Vec<_>>();
    env_entries.sort_by(|left, right| left.0.cmp(right.0));
    for (key, value) in env_entries {
        exports.push(format!("export {}={}", key, shell_quote(value)));
    }

    let mut command_parts = vec![shell_quote(&claude_binary)];
    command_parts.extend(claude_args.iter().map(|arg| shell_quote(arg)));

    format!("{}; exec {}", exports.join("; "), command_parts.join(" "))
}

fn should_use_paste_buffer(text: &str) -> bool {
    text.contains('\n')
        || text.contains('\r')
        || text.contains('\u{1b}')
        || text.len() > 120
        || text.chars().filter(|ch| ch.is_whitespace()).count() > 8
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn get_user_path() -> &'static str {
    USER_PATH.get_or_init(|| {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        match Command::new(&shell)
            .args(["-li", "-c", "echo $PATH"])
            .output()
        {
            Ok(output) if output.status.success() => {
                String::from_utf8_lossy(&output.stdout).trim().to_string()
            }
            _ => std::env::var("PATH").unwrap_or_default(),
        }
    })
}

fn sanitize_target_for_filename(target: &str) -> String {
    target
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

fn sanitize_runtime_id(runtime_id: &str) -> String {
    runtime_id
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>()
}

#[cfg(test)]
mod tests {
    use super::{
        build_tmux_launch_command, detect_state_from_capture, window_name_for_runtime,
        ClaudeTerminalState,
    };
    use std::collections::HashMap;

    #[test]
    fn detect_state_flags_waiting_approval() {
        let captured = "Run tool?\n[Shell] cargo test\nAllow   Deny";
        assert_eq!(
            detect_state_from_capture(captured),
            ClaudeTerminalState::WaitingApproval
        );
    }

    #[test]
    fn detect_state_flags_idle_prompt() {
        let captured = "Done.\n❯";
        assert_eq!(
            detect_state_from_capture(captured),
            ClaudeTerminalState::Idle
        );
    }

    #[test]
    fn detect_state_flags_idle_for_initial_claude_input_screen() {
        let captured = "\
 ▐▛███▜▌   Claude Code v2.1.72\n\
▝▜█████▛▘  glm-5 · API Usage Billing\n\
  ▘▘ ▝▝    ~/Github/claude-code-env-manager\n\
\n\
────────────────────────────────────────────────────────────────────────────────\n\
❯\u{a0}Try \"how do I log an error?\"\n\
────────────────────────────────────────────────────────────────────────────────\n\
  g@192 claude-code-env-manager\n\
  ⏵⏵ accept edits on (shift+tab to cycle)\n\
\n\
\n\
\n\
\n\
";
        assert_eq!(
            detect_state_from_capture(captured),
            ClaudeTerminalState::Idle
        );
    }

    #[test]
    fn window_name_uses_runtime_suffix_for_better_uniqueness() {
        assert_eq!(
            window_name_for_runtime("session-1772984434305"),
            "ccem-84434305"
        );
    }

    #[test]
    fn launch_command_does_not_override_term_inside_tmux() {
        let command = build_tmux_launch_command(&["--print".to_string()], &HashMap::new());
        assert!(!command.contains("export TERM="));
        assert!(command.contains("unset CLAUDECODE"));
    }
}
