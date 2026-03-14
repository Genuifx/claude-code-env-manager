//! Terminal integration for launching Claude Code in Terminal.app or iTerm2

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::OnceLock;

/// Supported terminal types on macOS
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TerminalType {
    TerminalApp,
    ITerm2,
}

impl TerminalType {
    /// Get the display name for this terminal type
    pub fn display_name(&self) -> &'static str {
        match self {
            TerminalType::TerminalApp => "Terminal.app",
            TerminalType::ITerm2 => "iTerm2",
        }
    }

    /// Get the application name used in AppleScript
    pub fn app_name(&self) -> &'static str {
        match self {
            TerminalType::TerminalApp => "Terminal",
            TerminalType::ITerm2 => "iTerm2",
        }
    }
}

/// Information about an available terminal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalInfo {
    pub terminal_type: TerminalType,
    pub name: String,
    pub installed: bool,
}

/// Get the path to the terminal preferences file
fn get_terminal_prefs_path() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".config")
        .join("claude-code-env-manager")
        .join("terminal-prefs.json")
}

/// Preferences for terminal settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct TerminalPrefs {
    preferred_terminal: Option<TerminalType>,
}

/// Check if an application is installed on macOS
fn is_app_installed(app_name: &str) -> bool {
    // Check common locations for applications
    let paths = [
        format!("/Applications/{}.app", app_name),
        format!("/System/Applications/{}.app", app_name),
        format!(
            "{}/Applications/{}.app",
            dirs::home_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default(),
            app_name
        ),
    ];

    for path in &paths {
        if std::path::Path::new(path).exists() {
            return true;
        }
    }

    // For Terminal.app, also check using mdfind (Spotlight)
    if app_name == "Terminal" {
        // Terminal.app is always available on macOS
        return true;
    }

    // Use mdfind as a fallback
    if let Ok(output) = Command::new("mdfind")
        .args(["kMDItemKind == 'Application'", "-name", app_name])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        return stdout
            .lines()
            .any(|line| line.contains(&format!("{}.app", app_name)));
    }

    false
}

/// Detect which terminals are installed on the system
pub fn detect_terminals() -> Vec<TerminalInfo> {
    let mut terminals = Vec::new();

    // Terminal.app is always available on macOS
    terminals.push(TerminalInfo {
        terminal_type: TerminalType::TerminalApp,
        name: "Terminal.app".to_string(),
        installed: true,
    });

    // Check for iTerm2
    let iterm_installed = is_app_installed("iTerm");
    terminals.push(TerminalInfo {
        terminal_type: TerminalType::ITerm2,
        name: "iTerm2".to_string(),
        installed: iterm_installed,
    });

    terminals
}

/// Get the user's preferred terminal
pub fn get_preferred_terminal() -> TerminalType {
    let prefs_path = get_terminal_prefs_path();

    if prefs_path.exists() {
        if let Ok(content) = fs::read_to_string(&prefs_path) {
            if let Ok(prefs) = serde_json::from_str::<TerminalPrefs>(&content) {
                if let Some(terminal) = prefs.preferred_terminal {
                    // Verify the preferred terminal is still installed
                    let terminals = detect_terminals();
                    if terminals
                        .iter()
                        .any(|t| t.terminal_type == terminal && t.installed)
                    {
                        return terminal;
                    }
                }
            }
        }
    }

    // Default to iTerm2 if installed, otherwise Terminal.app
    let terminals = detect_terminals();
    if terminals
        .iter()
        .any(|t| t.terminal_type == TerminalType::ITerm2 && t.installed)
    {
        TerminalType::ITerm2
    } else {
        TerminalType::TerminalApp
    }
}

/// Set the user's preferred terminal
pub fn set_preferred_terminal(terminal: TerminalType) -> Result<(), String> {
    let prefs_path = get_terminal_prefs_path();

    // Verify the terminal is installed
    let terminals = detect_terminals();
    if !terminals
        .iter()
        .any(|t| t.terminal_type == terminal && t.installed)
    {
        return Err(format!("{} is not installed", terminal.display_name()));
    }

    let prefs = TerminalPrefs {
        preferred_terminal: Some(terminal),
    };

    let content = serde_json::to_string_pretty(&prefs)
        .map_err(|e| format!("Failed to serialize preferences: {}", e))?;

    if let Some(parent) = prefs_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create preferences directory: {}", e))?;
    }

    fs::write(&prefs_path, content).map_err(|e| format!("Failed to write preferences: {}", e))?;

    Ok(())
}

// ============================================
// ccem launch support detection
// ============================================

/// Cached result of ccem launch support check
static CCEM_LAUNCH_SUPPORTED: OnceLock<bool> = OnceLock::new();
static CCEM_INSTALLED: OnceLock<bool> = OnceLock::new();
static CLAUDE_INSTALLED: OnceLock<bool> = OnceLock::new();

/// Compare a parsed semver tuple against a minimum requirement.
fn version_gte(
    major: u32,
    minor: u32,
    patch: u32,
    req_major: u32,
    req_minor: u32,
    req_patch: u32,
) -> bool {
    (major, minor, patch) >= (req_major, req_minor, req_patch)
}

/// Run `ccem --version`, parse the output, and check if >= 1.9.0.
fn check_ccem_launch_support() -> bool {
    // macOS GUI apps don't inherit shell PATH — try common locations
    let ccem_path = resolve_ccem_path().unwrap_or_else(|| "ccem".to_string());
    println!("[ccem-launch] resolved ccem path: {}", ccem_path);

    let output = match Command::new(&ccem_path).arg("--version").output() {
        Ok(o) if o.status.success() => o,
        Ok(o) => {
            println!(
                "[ccem-launch] ccem --version failed with status: {}",
                o.status
            );
            return false;
        }
        Err(e) => {
            println!("[ccem-launch] ccem --version error: {}", e);
            return false;
        }
    };

    // Check both stdout and stderr — some CLI tools print version to stderr
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let version_str = if stdout.is_empty() { &stderr } else { &stdout };
    println!(
        "[ccem-launch] ccem version output: '{}' (stderr: '{}')",
        stdout, stderr
    );

    // Output formats: "1.9.0", "ccem/1.9.0", "v2.0.0-beta.2", "ccem/v2.0.0-beta.2"
    // Extract the version part after the last '/'
    let version_part = version_str
        .rsplit('/')
        .next()
        .unwrap_or(version_str)
        .trim()
        .trim_start_matches('v'); // Strip leading 'v'

    let parts: Vec<&str> = version_part.split('.').collect();
    if parts.len() < 2 {
        println!("[ccem-launch] could not parse version: '{}'", version_part);
        return false;
    }

    let major = parts[0].parse::<u32>().unwrap_or(0);
    let minor = parts[1].parse::<u32>().unwrap_or(0);
    // Strip pre-release suffix (e.g., "0-beta.2" → "0")
    let patch = parts
        .get(2)
        .map(|p| p.split('-').next().unwrap_or("0"))
        .and_then(|p| p.parse::<u32>().ok())
        .unwrap_or(0);

    let supported = version_gte(major, minor, patch, 1, 9, 0);
    println!(
        "[ccem-launch] version {}.{}.{} >= 1.9.0 = {}",
        major, minor, patch, supported
    );
    supported
}

/// Resolve a CLI binary path from shell + common fallback locations.
fn resolve_binary_path(binary: &str, candidates: &[String]) -> Option<String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let which_cmd = format!("which {}", binary);

    // Try login+interactive first (sources .zshrc for nvm/fnm/volta)
    // Then fallback to login-only (in case shell doesn't support -i with -c)
    for flags in &[
        &["-li", "-c", which_cmd.as_str()][..],
        &["-l", "-c", which_cmd.as_str()][..],
    ] {
        if let Ok(output) = Command::new(&shell).args(*flags).output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // Take only the last non-empty line — shell banners/motd appear before it
                if let Some(path) = stdout.lines().rev().find(|l| !l.trim().is_empty()) {
                    let path = path.trim().to_string();
                    if path.starts_with('/') && std::path::Path::new(&path).exists() {
                        return Some(path);
                    }
                }
            }
        }
    }

    for candidate in candidates {
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.clone());
        }
    }

    None
}

/// Resolve the full path to the `ccem` binary.
pub fn resolve_ccem_path() -> Option<String> {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let candidates = vec![
        format!("{}/.local/bin/ccem", home),
        format!("{}/.npm-global/bin/ccem", home),
        "/usr/local/bin/ccem".to_string(),
        "/opt/homebrew/bin/ccem".to_string(),
    ];
    resolve_binary_path("ccem", &candidates)
}

/// Resolve the full path to the `claude` binary.
pub fn resolve_claude_path() -> Option<String> {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let candidates = vec![
        format!("{}/.local/bin/claude", home),
        format!("{}/.npm-global/bin/claude", home),
        "/usr/local/bin/claude".to_string(),
        "/opt/homebrew/bin/claude".to_string(),
    ];
    resolve_binary_path("claude", &candidates)
}

/// Resolve the full path to the `codex` binary.
pub fn resolve_codex_path() -> Option<String> {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let candidates = vec![
        format!("{}/.local/bin/codex", home),
        format!("{}/.npm-global/bin/codex", home),
        format!("{}/.cargo/bin/codex", home),
        "/usr/local/bin/codex".to_string(),
        "/opt/homebrew/bin/codex".to_string(),
    ];
    resolve_binary_path("codex", &candidates)
}

/// Resolve the full path to the `tmux` binary.
pub fn resolve_tmux_path() -> Option<String> {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let candidates = vec![
        format!("{}/.local/bin/tmux", home),
        "/usr/local/bin/tmux".to_string(),
        "/opt/homebrew/bin/tmux".to_string(),
        "/usr/bin/tmux".to_string(),
    ];
    resolve_binary_path("tmux", &candidates)
}

/// Returns whether ccem is installed.
pub fn is_ccem_installed() -> bool {
    *CCEM_INSTALLED.get_or_init(|| resolve_ccem_path().is_some())
}

/// Returns whether Claude Code is installed.
pub fn is_claude_installed() -> bool {
    *CLAUDE_INSTALLED.get_or_init(|| resolve_claude_path().is_some())
}

/// Cached result of Codex install detection.
static CODEX_INSTALLED: OnceLock<bool> = OnceLock::new();

/// Returns whether Codex is installed.
///
/// This is used by the Dashboard launch picker, so cache it for the lifetime
/// of the app to avoid repeatedly spawning a login shell on every tab visit.
pub fn is_codex_installed() -> bool {
    *CODEX_INSTALLED.get_or_init(|| resolve_codex_path().is_some())
}

/// Returns whether the installed ccem supports the `launch` command.
/// Result is cached for the lifetime of the process.
pub fn is_ccem_launch_supported() -> bool {
    *CCEM_LAUNCH_SUPPORTED.get_or_init(check_ccem_launch_support)
}

/// Build the short `ccem launch` command string.
fn build_launch_command(
    env_name: &str,
    perm_mode: Option<&str>,
    session_id: &str,
    working_dir: &str,
    resume_session_id: Option<&str>,
    proxy_base_url: Option<&str>,
) -> String {
    let ccem = resolve_ccem_path().unwrap_or_else(|| "ccem".to_string());
    let mut cmd = format!(
        "'{}' launch --env '{}' --session-id '{}'",
        ccem, env_name, session_id
    );
    if let Some(perm) = perm_mode {
        cmd.push_str(&format!(" --perm '{}'", perm));
    }
    if let Some(resume_id) = resume_session_id {
        let escaped_id = resume_id.replace("'", "'\\''");
        cmd.push_str(&format!(" --resume-session '{}'", escaped_id));
    }
    if let Some(proxy_url) = proxy_base_url {
        let escaped_url = proxy_url.replace("'", "'\\''");
        cmd.push_str(&format!(" --proxy-base-url '{}'", escaped_url));
    }
    // Escape single quotes in working_dir
    let escaped_dir = working_dir.replace("'", "'\\''");
    cmd.push_str(&format!(" --working-dir '{}'", escaped_dir));
    cmd
}

/// Build the shell command to set environment variables and launch Claude
fn build_shell_command(
    env_vars: &HashMap<String, String>,
    working_dir: &str,
    session_id: &str,
    resume_session_id: Option<&str>,
) -> String {
    let mut parts = Vec::new();

    // Ensure sessions directory exists
    parts.push("mkdir -p ~/.ccem/sessions".to_string());

    // Change to working directory (escape backslashes and double quotes to prevent shell injection)
    let escaped_dir = working_dir.replace("\\", "\\\\").replace("\"", "\\\"");
    parts.push(format!("cd \"{}\"", escaped_dir));

    // Unset CLAUDECODE to prevent "nested session" detection error
    parts.push("unset CLAUDECODE".to_string());
    for key in [
        "ANTHROPIC_BASE_URL",
        "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ANTHROPIC_DEFAULT_SONNET_MODEL",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
        "ANTHROPIC_MODEL",
        "CLAUDE_CODE_SUBAGENT_MODEL",
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_SMALL_FAST_MODEL",
    ] {
        parts.push(format!("unset {}", key));
    }

    // Export environment variables
    for (key, value) in env_vars {
        // Escape single quotes in values
        let escaped_value = value.replace("'", "'\\''");
        parts.push(format!("export {}='{}'", key, escaped_value));
    }

    // Launch claude (with optional --resume) and write exit code to file after it exits
    let escaped_session_id = session_id.replace("'", "'\\''");
    let claude_cmd = if let Some(resume_id) = resume_session_id {
        let escaped_resume = resume_id.replace("'", "'\\''");
        format!("claude --resume '{}'", escaped_resume)
    } else {
        "claude".to_string()
    };
    parts.push(format!(
        "{}; echo $? > ~/.ccem/sessions/'{}'.exit",
        claude_cmd, escaped_session_id
    ));

    parts.join(" && ")
}

/// Build the shell command to attach a new terminal window to an existing tmux target.
fn build_tmux_attach_command(target: &str) -> String {
    let escaped_target = target.replace("'", "'\\''");
    let tmux = resolve_tmux_path().unwrap_or_else(|| "tmux".to_string());
    let escaped_tmux = tmux.replace("'", "'\\''");
    format!("'{}' attach-session -t '{}'", escaped_tmux, escaped_target)
}

/// Build the shell command to launch Codex and write exit code for session tracking.
fn build_codex_shell_command(
    env_vars: &HashMap<String, String>,
    working_dir: &str,
    session_id: &str,
) -> String {
    let mut parts = Vec::new();
    parts.push("mkdir -p ~/.ccem/sessions".to_string());

    let escaped_dir = working_dir.replace("\\", "\\\\").replace("\"", "\\\"");
    parts.push(format!("cd \"{}\"", escaped_dir));
    parts.push("unset CLAUDECODE".to_string());

    for (key, value) in env_vars {
        let escaped_value = value.replace("'", "'\\''");
        parts.push(format!("export {}='{}'", key, escaped_value));
    }

    let codex_path = resolve_codex_path().unwrap_or_else(|| "codex".to_string());
    let escaped_codex = codex_path.replace("'", "'\\''");
    let escaped_session_id = session_id.replace("'", "'\\''");
    parts.push(format!(
        "'{}'; echo $? > ~/.ccem/sessions/'{}'.exit",
        escaped_codex, escaped_session_id
    ));

    parts.join(" && ")
}

/// Generate AppleScript for Terminal.app
/// Returns the window ID as a string for later tracking
fn terminal_app_script(shell_command: &str) -> String {
    // IMPORTANT: Escape backslashes FIRST, then double quotes
    let escaped = shell_command.replace("\\", "\\\\").replace("\"", "\\\"");
    format!(
        r#"tell application "Terminal"
    set theTab to do script "{}"
    activate
    return id of window of theTab as string
end tell"#,
        escaped
    )
}

/// Generate AppleScript for iTerm2 with tab title
/// Returns "windowId|sessionId" for later operations (arrange needs session unique ID)
fn iterm2_script(shell_command: &str) -> String {
    // IMPORTANT: Escape backslashes FIRST, then double quotes
    let escaped_cmd = shell_command.replace("\\", "\\\\").replace("\"", "\\\"");
    format!(
        r#"tell application "iTerm"
    set newWindow to (create window with default profile)
    set theSession to current session of current tab of newWindow
    tell theSession
        write text "{}"
    end tell
    activate
    set windowId to id of newWindow
    set sessionId to unique id of theSession
    return (windowId as string) & "|" & sessionId
end tell"#,
        escaped_cmd
    )
}

/// Launch Claude Code in the specified terminal
///
/// # Arguments
/// * `terminal` - The terminal to launch in
/// * `env_vars` - Environment variables to set (used as fallback)
/// * `working_dir` - Working directory for the session
/// * `session_id` - Session ID (used for exit status tracking)
/// * `env_name` - Environment name for `ccem launch`
/// * `perm_mode` - Optional permission mode for `ccem launch`
/// * `resume_session_id` - Optional session ID to resume via `claude --resume`
///
/// # Returns
/// * `Ok((Option<String>, Option<String>))` - (window_id, iterm_session_id) on success
/// * `Err(String)` with error message on failure
pub fn launch_in_terminal(
    terminal: TerminalType,
    env_vars: HashMap<String, String>,
    working_dir: &str,
    session_id: &str,
    env_name: &str,
    perm_mode: Option<&str>,
    resume_session_id: Option<&str>,
    client: &str,
) -> Result<(Option<String>, Option<String>), String> {
    let shell_command = if client == "codex" {
        if resume_session_id.is_some() {
            return Err("Codex resume is not supported yet".to_string());
        }
        build_codex_shell_command(&env_vars, working_dir, session_id)
    } else if is_ccem_launch_supported() {
        let proxy_base_url = env_vars.get("ANTHROPIC_BASE_URL").and_then(|url| {
            if url.starts_with("http://127.0.0.1:") && url.contains("/proxy/claude/") {
                Some(url.clone())
            } else {
                None
            }
        });
        build_launch_command(
            env_name,
            perm_mode,
            session_id,
            working_dir,
            resume_session_id,
            proxy_base_url.as_deref(),
        )
    } else {
        build_shell_command(&env_vars, working_dir, session_id, resume_session_id)
    };

    let script = match terminal {
        TerminalType::TerminalApp => terminal_app_script(&shell_command),
        TerminalType::ITerm2 => iterm2_script(&shell_command),
    };

    // Execute the AppleScript
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("AppleScript failed: {}", stderr.trim()));
    }

    // Parse window ID / session ID from AppleScript output
    match terminal {
        TerminalType::ITerm2 => {
            let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if let Some((window_id, session_id)) = raw.split_once('|') {
                Ok((Some(window_id.to_string()), Some(session_id.to_string())))
            } else {
                // Fallback: old format (just window ID)
                Ok((Some(raw), None))
            }
        }
        TerminalType::TerminalApp => {
            let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if raw.is_empty() {
                Ok((None, None))
            } else {
                Ok((Some(raw), None))
            }
        }
    }
}

/// Launch a new terminal window and attach it to an existing tmux target.
pub fn open_tmux_target_in_terminal(
    terminal: TerminalType,
    target: &str,
) -> Result<(Option<String>, Option<String>), String> {
    let shell_command = build_tmux_attach_command(target);
    let script = match terminal {
        TerminalType::TerminalApp => terminal_app_script(&shell_command),
        TerminalType::ITerm2 => iterm2_script(&shell_command),
    };

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("AppleScript failed: {}", stderr.trim()));
    }

    match terminal {
        TerminalType::ITerm2 => {
            let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if let Some((window_id, session_id)) = raw.split_once('|') {
                Ok((Some(window_id.to_string()), Some(session_id.to_string())))
            } else {
                Ok((Some(raw), None))
            }
        }
        TerminalType::TerminalApp => {
            let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if raw.is_empty() {
                Ok((None, None))
            } else {
                Ok((Some(raw), None))
            }
        }
    }
}

/// Focus a terminal window by window ID
pub fn focus_terminal_window(terminal: TerminalType, window_id: &str) -> Result<(), String> {
    let script = match terminal {
        TerminalType::TerminalApp => r#"tell application "Terminal"
    activate
end tell"#
            .to_string(),
        TerminalType::ITerm2 => {
            format!(
                r#"tell application "iTerm"
    repeat with aWindow in windows
        if id of aWindow is {} then
            select aWindow
            activate
            return
        end if
    end repeat
    activate
end tell"#,
                window_id
            )
        }
    };

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            eprintln!("AppleScript warning: {}", stderr.trim());
        }
    }

    Ok(())
}

/// Batch query all iTerm2 window IDs (single AppleScript call for performance)
pub fn list_iterm_sessions() -> Vec<String> {
    let script = r#"tell application "iTerm"
    if not running then return ""
    set windowIds to {}
    repeat with aWindow in windows
        set end of windowIds to (id of aWindow as string)
    end repeat
    return windowIds
end tell"#;

    let output = Command::new("osascript").arg("-e").arg(script).output();

    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            stdout
                .trim()
                .split(", ")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect()
        }
        _ => Vec::new(),
    }
}

/// Batch query all Terminal.app window IDs (single AppleScript call for performance)
pub fn list_terminal_app_windows() -> Vec<String> {
    let script = r#"tell application "Terminal"
    if not running then return ""
    set windowIds to {}
    repeat with aWindow in windows
        set end of windowIds to (id of aWindow as string)
    end repeat
    return windowIds
end tell"#;

    let output = Command::new("osascript").arg("-e").arg(script).output();

    match output {
        Ok(result) if result.status.success() => {
            let stdout = String::from_utf8_lossy(&result.stdout);
            stdout
                .trim()
                .split(", ")
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect()
        }
        _ => Vec::new(),
    }
}

/// Close a terminal window by window ID
pub fn close_terminal_session(terminal: TerminalType, window_id: &str) -> Result<(), String> {
    match terminal {
        TerminalType::TerminalApp => {
            Err("Terminal.app does not support precise session closing. Please close the window manually.".to_string())
        }
        TerminalType::ITerm2 => {
            let script = format!(
                r#"tell application "iTerm"
    repeat with aWindow in windows
        if id of aWindow is {} then
            close aWindow
            return "closed"
        end if
    end repeat
    return "not found"
end tell"#,
                window_id
            );

            let output = Command::new("osascript")
                .arg("-e")
                .arg(&script)
                .output()
                .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to close session: {}", stderr.trim()))
            }
        }
    }
}

/// Minimize a terminal window by window ID
pub fn minimize_terminal_window(terminal: TerminalType, window_id: &str) -> Result<(), String> {
    match terminal {
        TerminalType::TerminalApp => Err(
            "Terminal.app does not support precise window control. Please minimize manually."
                .to_string(),
        ),
        TerminalType::ITerm2 => {
            let script = format!(
                r#"tell application "iTerm"
    repeat with aWindow in windows
        if id of aWindow is {} then
            set miniaturized of aWindow to true
            return "minimized"
        end if
    end repeat
    return "not found"
end tell"#,
                window_id
            );

            let output = Command::new("osascript")
                .arg("-e")
                .arg(&script)
                .output()
                .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to minimize window: {}", stderr.trim()))
            }
        }
    }
}

// ============================================
// Arrange Windows Support
// ============================================

/// Layout options for arranging terminal sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ArrangeLayout {
    Horizontal2, // [A | B] side by side
    Vertical2,   // [A] / [B] stacked
    Grid4,       // 2×2 grid
    LeftMain3,   // A large left + B/C stacked right
}

/// Session info needed for arranging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArrangeSessionInfo {
    pub window_id: String,
    pub iterm_session_id: Option<String>,
}

/// Get screen size via AppleScript (Finder desktop bounds)
pub fn get_screen_size() -> Result<(i32, i32), String> {
    let script = r#"tell application "Finder"
    set b to bounds of window of desktop
    return (item 3 of b as string) & "," & (item 4 of b as string)
end tell"#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to get screen size: {}", e))?;

    if !output.status.success() {
        return Err("Failed to query screen size".to_string());
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = raw.split(',').collect();
    if parts.len() != 2 {
        return Err(format!("Unexpected screen size format: {}", raw));
    }

    let w = parts[0]
        .trim()
        .parse::<i32>()
        .map_err(|_| "Invalid screen width".to_string())?;
    let h = parts[1]
        .trim()
        .parse::<i32>()
        .map_err(|_| "Invalid screen height".to_string())?;
    Ok((w, h))
}

/// Get iTerm2 session unique ID by querying a window ID
/// Used to backfill sessions launched before this feature existed
pub fn get_iterm_session_id(window_id: &str) -> Result<String, String> {
    let script = format!(
        r#"tell application "iTerm"
    repeat with aWindow in windows
        if id of aWindow is {} then
            return unique id of current session of current tab of aWindow
        end if
    end repeat
    return "not_found"
end tell"#,
        window_id
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to query iTerm2 session ID: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("AppleScript failed: {}", stderr.trim()));
    }

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if result == "not_found" {
        return Err(format!("Window {} not found in iTerm2", window_id));
    }
    Ok(result)
}

/// Check if iTerm2 supports the invoke API expression (3.5+)
pub fn check_arrange_support() -> Result<bool, String> {
    // Try a harmless invoke API expression to test support
    let script = r#"tell application "iTerm"
    if not running then return "not_running"
    try
        set v to version
        return v
    on error
        return "unknown"
    end try
end tell"#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to check iTerm2: {}", e))?;

    if !output.status.success() {
        return Ok(false);
    }

    let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if version_str == "not_running" {
        return Err("iTerm2 is not running".to_string());
    }

    // Parse version: need 3.5+ for invoke API expression
    let parts: Vec<&str> = version_str.split('.').collect();
    if parts.len() >= 2 {
        if let (Ok(major), Ok(minor)) = (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
            return Ok(major > 3 || (major == 3 && minor >= 5));
        }
    }

    // If we can't parse version, assume it's supported (best effort)
    Ok(true)
}

/// Arrange iTerm2 sessions into split panes using invoke API expression
///
/// This uses iTerm2's Python API bridge via AppleScript to move sessions
/// into split-pane layouts within a single window.
///
/// Parameter semantics (iTerm2 3.6.6 verified):
///   vertical: true  = vertical split line = side by side (left/right)
///   vertical: false = horizontal split line = stacked (top/bottom)
///   before: false   = session placed right-of/below destination
///   before: true    = session placed left-of/above destination
pub fn arrange_iterm_sessions(
    sessions: &[ArrangeSessionInfo],
    layout: &ArrangeLayout,
) -> Result<String, String> {
    if sessions.is_empty() {
        return Err("No sessions to arrange".to_string());
    }

    // Collect session IDs (all must have iterm_session_id)
    let session_ids: Vec<&str> = sessions
        .iter()
        .map(|s| {
            s.iterm_session_id
                .as_deref()
                .ok_or("Missing iTerm2 session ID")
        })
        .collect::<Result<Vec<_>, _>>()?;

    let script = match layout {
        ArrangeLayout::Horizontal2 => {
            if session_ids.len() < 2 {
                return Err("Need at least 2 sessions for side-by-side layout".to_string());
            }
            // Move B right of A: vertical=true, before=false
            format!(
                r#"tell application "iTerm"
    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: true, before: false)"
    delay 0.8
    -- Find the window containing session A
    repeat with aWindow in windows
        repeat with aTab in tabs of aWindow
            repeat with aSession in sessions of aTab
                if unique id of aSession is "{}" then
                    return id of aWindow as string
                end if
            end repeat
        end repeat
    end repeat
    return "not_found"
end tell"#,
                session_ids[1], session_ids[0], session_ids[0]
            )
        }
        ArrangeLayout::Vertical2 => {
            if session_ids.len() < 2 {
                return Err("Need at least 2 sessions for stacked layout".to_string());
            }
            // Move B below A: vertical=false, before=true
            format!(
                r#"tell application "iTerm"
    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: false, before: true)"
    delay 0.8
    repeat with aWindow in windows
        repeat with aTab in tabs of aWindow
            repeat with aSession in sessions of aTab
                if unique id of aSession is "{}" then
                    return id of aWindow as string
                end if
            end repeat
        end repeat
    end repeat
    return "not_found"
end tell"#,
                session_ids[1], session_ids[0], session_ids[0]
            )
        }
        ArrangeLayout::Grid4 => {
            if session_ids.len() < 2 {
                return Err("Need at least 2 sessions for grid layout".to_string());
            }
            let count = session_ids.len().min(4);
            // Build the script dynamically based on session count
            let mut steps = String::new();

            // Step 1: Move B right of A → [A | B]
            steps.push_str(&format!(
                r#"    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: true, before: false)"
    delay 0.8
"#,
                session_ids[1], session_ids[0]
            ));

            if count >= 3 {
                // Step 2: Move C below A → [A|B] becomes [A|B] / [C|_]
                steps.push_str(&format!(
                    r#"    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: false, before: true)"
    delay 0.8
"#,
                    session_ids[2], session_ids[0]
                ));
            }

            if count >= 4 {
                // Step 3: Move D below B → [A|B] / [C|D]
                steps.push_str(&format!(
                    r#"    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: false, before: true)"
    delay 0.8
"#,
                    session_ids[3], session_ids[1]
                ));
            }

            format!(
                r#"tell application "iTerm"
{}    -- Find the window containing session A
    repeat with aWindow in windows
        repeat with aTab in tabs of aWindow
            repeat with aSession in sessions of aTab
                if unique id of aSession is "{}" then
                    return id of aWindow as string
                end if
            end repeat
        end repeat
    end repeat
    return "not_found"
end tell"#,
                steps, session_ids[0]
            )
        }
        ArrangeLayout::LeftMain3 => {
            if session_ids.len() < 2 {
                return Err("Need at least 2 sessions layout".to_string());
            }
            let count = session_ids.len().min(3);
            let mut steps = String::new();

            // Step 1: Move B right of A → [A | B]
            steps.push_str(&format!(
                r#"    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: true, before: false)"
    delay 0.8
"#,
                session_ids[1], session_ids[0]
            ));

            if count >= 3 {
                // Step 2: Move C below B → [A | B/C]
                steps.push_str(&format!(
                    r#"    invoke API expression "iterm2.move_session(session: \"{}\", destination: \"{}\", vertical: false, before: true)"
    delay 0.8
"#,
                    session_ids[2], session_ids[1]
                ));
            }

            format!(
                r#"tell application "iTerm"
{}    repeat with aWindow in windows
        repeat with aTab in tabs of aWindow
            repeat with aSession in sessions of aTab
                if unique id of aSession is "{}" then
                    return id of aWindow as string
                end if
            end repeat
        end repeat
    end repeat
    return "not_found"
end tell"#,
                steps, session_ids[0]
            )
        }
    };

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to arrange iTerm2 sessions: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Arrange failed: {}", stderr.trim()));
    }

    let new_window_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if new_window_id == "not_found" {
        return Err("Could not find arranged window".to_string());
    }

    Ok(new_window_id)
}

/// Arrange Terminal.app windows by setting bounds (pseudo split-screen)
pub fn arrange_terminal_app_sessions(
    sessions: &[ArrangeSessionInfo],
    layout: &ArrangeLayout,
) -> Result<String, String> {
    if sessions.is_empty() {
        return Err("No sessions to arrange".to_string());
    }

    let (screen_w, screen_h) = get_screen_size()?;
    let menu_bar = 25; // macOS menu bar height
    let usable_h = screen_h - menu_bar;

    // Build bounds assignments based on layout
    let bounds: Vec<(i32, i32, i32, i32)> = match layout {
        ArrangeLayout::Horizontal2 => {
            let half_w = screen_w / 2;
            vec![
                (0, menu_bar, half_w, screen_h),
                (half_w, menu_bar, screen_w, screen_h),
            ]
        }
        ArrangeLayout::Vertical2 => {
            let half_h = usable_h / 2;
            vec![
                (0, menu_bar, screen_w, menu_bar + half_h),
                (0, menu_bar + half_h, screen_w, screen_h),
            ]
        }
        ArrangeLayout::Grid4 => {
            let half_w = screen_w / 2;
            let half_h = usable_h / 2;
            vec![
                (0, menu_bar, half_w, menu_bar + half_h),        // top-left
                (half_w, menu_bar, screen_w, menu_bar + half_h), // top-right
                (0, menu_bar + half_h, half_w, screen_h),        // bottom-left
                (half_w, menu_bar + half_h, screen_w, screen_h), // bottom-right
            ]
        }
        ArrangeLayout::LeftMain3 => {
            let main_w = (screen_w as f64 * 0.55) as i32;
            let side_h = usable_h / 2;
            vec![
                (0, menu_bar, main_w, screen_h),                 // left main
                (main_w, menu_bar, screen_w, menu_bar + side_h), // right top
                (main_w, menu_bar + side_h, screen_w, screen_h), // right bottom
            ]
        }
    };

    // Build AppleScript to set bounds for each window
    let mut set_bounds_lines = String::new();
    for (i, session) in sessions.iter().enumerate() {
        if i >= bounds.len() {
            break;
        }
        let (x1, y1, x2, y2) = bounds[i];
        set_bounds_lines.push_str(&format!(
            r#"        if id of aWindow is {} then
            set bounds of aWindow to {{{}, {}, {}, {}}}
        end if
"#,
            session.window_id, x1, y1, x2, y2
        ));
    }

    let script = format!(
        r#"tell application "Terminal"
    repeat with aWindow in windows
{}    end repeat
    activate
end tell"#,
        set_bounds_lines
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to arrange Terminal.app windows: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Arrange failed: {}", stderr.trim()));
    }

    // Terminal.app windows keep their individual IDs
    Ok("arranged".to_string())
}

/// Arrange sessions — dispatches to iTerm2 or Terminal.app implementation
pub fn arrange_sessions(
    terminal: TerminalType,
    sessions: &[ArrangeSessionInfo],
    layout: &ArrangeLayout,
) -> Result<String, String> {
    match terminal {
        TerminalType::ITerm2 => arrange_iterm_sessions(sessions, layout),
        TerminalType::TerminalApp => arrange_terminal_app_sessions(sessions, layout),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_shell_command() {
        let mut env_vars = HashMap::new();
        env_vars.insert("KEY1".to_string(), "value1".to_string());
        env_vars.insert("KEY2".to_string(), "value2".to_string());

        let cmd = build_shell_command(&env_vars, "/home/user", "test-session-123", None);

        assert!(cmd.contains("mkdir -p ~/.ccem/sessions"));
        assert!(cmd.contains("cd \"/home/user\""));
        assert!(cmd.contains("export KEY1='value1'"));
        assert!(cmd.contains("export KEY2='value2'"));
        assert!(cmd.contains("claude; echo $? > ~/.ccem/sessions/'test-session-123'.exit"));
    }

    #[test]
    fn test_terminal_type_display_name() {
        assert_eq!(TerminalType::TerminalApp.display_name(), "Terminal.app");
        assert_eq!(TerminalType::ITerm2.display_name(), "iTerm2");
    }

    #[test]
    fn test_build_tmux_attach_command() {
        let cmd = build_tmux_attach_command("ccem:ccem-1234abcd");
        assert!(cmd.ends_with("attach-session -t 'ccem:ccem-1234abcd'"));
    }
}
