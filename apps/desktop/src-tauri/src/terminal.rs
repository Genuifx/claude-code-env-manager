//! Terminal integration for launching Claude Code in Terminal.app or iTerm2

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

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
        return stdout.lines().any(|line| line.contains(&format!("{}.app", app_name)));
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
        return Err(format!(
            "{} is not installed",
            terminal.display_name()
        ));
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

    fs::write(&prefs_path, content)
        .map_err(|e| format!("Failed to write preferences: {}", e))?;

    Ok(())
}

/// Build the shell command to set environment variables and launch Claude
fn build_shell_command(env_vars: &HashMap<String, String>, working_dir: &str) -> String {
    let mut parts = Vec::new();

    // Change to working directory (escape backslashes and double quotes to prevent shell injection)
    let escaped_dir = working_dir.replace("\\", "\\\\").replace("\"", "\\\"");
    parts.push(format!("cd \"{}\"", escaped_dir));

    // Export environment variables
    for (key, value) in env_vars {
        // Escape single quotes in values
        let escaped_value = value.replace("'", "'\\''");
        parts.push(format!("export {}='{}'", key, escaped_value));
    }

    // Launch claude
    parts.push("claude".to_string());

    parts.join(" && ")
}

/// Generate AppleScript for Terminal.app
fn terminal_app_script(shell_command: &str) -> String {
    format!(
        r#"tell application "Terminal"
    do script "{}"
    activate
end tell"#,
        shell_command.replace("\"", "\\\"").replace("\\", "\\\\")
    )
}

/// Generate AppleScript for iTerm2 with tab title
fn iterm2_script(shell_command: &str, session_name: &str) -> String {
    format!(
        r#"tell application "iTerm2"
    create window with default profile
    tell current session of current window
        set name to "{}"
        write text "{}"
    end tell
    activate
end tell"#,
        session_name.replace("\"", "\\\""),
        shell_command.replace("\"", "\\\"").replace("\\", "\\\\")
    )
}

/// Launch Claude Code in the specified terminal
///
/// # Arguments
/// * `terminal` - The terminal to launch in
/// * `env_vars` - Environment variables to set
/// * `working_dir` - Working directory for the session
/// * `session_name` - Session name (used for iTerm2 tab title)
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error message on failure
pub fn launch_in_terminal(
    terminal: TerminalType,
    env_vars: HashMap<String, String>,
    working_dir: &str,
    session_name: &str,
) -> Result<(), String> {
    let shell_command = build_shell_command(&env_vars, working_dir);

    let script = match terminal {
        TerminalType::TerminalApp => terminal_app_script(&shell_command),
        TerminalType::ITerm2 => iterm2_script(&shell_command, session_name),
    };

    // Execute the AppleScript
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "AppleScript failed: {}",
            stderr.trim()
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_shell_command() {
        let mut env_vars = HashMap::new();
        env_vars.insert("KEY1".to_string(), "value1".to_string());
        env_vars.insert("KEY2".to_string(), "value2".to_string());

        let cmd = build_shell_command(&env_vars, "/home/user");

        assert!(cmd.contains("cd \"/home/user\""));
        assert!(cmd.contains("export KEY1='value1'"));
        assert!(cmd.contains("export KEY2='value2'"));
        assert!(cmd.ends_with("claude"));
    }

    #[test]
    fn test_terminal_type_display_name() {
        assert_eq!(TerminalType::TerminalApp.display_name(), "Terminal.app");
        assert_eq!(TerminalType::ITerm2.display_name(), "iTerm2");
    }
}
