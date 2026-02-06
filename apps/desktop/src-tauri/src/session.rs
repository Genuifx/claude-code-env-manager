use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::thread;
use tauri::{AppHandle, Emitter};

use crate::terminal;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub pid: Option<u32>,
    pub env_name: String,
    pub perm_mode: String,
    pub working_dir: String,
    pub start_time: String,
    pub status: String, // "running", "stopped", "interrupted"
    // Terminal metadata for window control
    pub terminal_type: Option<String>,  // "iterm2" | "terminalapp"
    pub window_id: Option<String>,      // iTerm2 window ID for operations
}

pub struct SessionManager {
    pub sessions: Mutex<Vec<Session>>,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(vec![]),
        }
    }
}

impl SessionManager {
    pub fn add_session(&self, session: Session) {
        self.sessions.lock().unwrap().push(session);
    }

    pub fn remove_session(&self, id: &str) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.retain(|s| s.id != id);
    }

    pub fn update_session_status(&self, id: &str, status: &str) {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.iter_mut().find(|s| s.id == id) {
            session.status = status.to_string();
        }
    }

    pub fn list_sessions(&self) -> Vec<Session> {
        self.sessions.lock().unwrap().clone()
    }

    pub fn get_session(&self, id: &str) -> Option<Session> {
        self.sessions.lock().unwrap().iter().find(|s| s.id == id).cloned()
    }

    /// Get all running sessions with PIDs for monitoring
    pub fn get_running_sessions_with_pid(&self) -> Vec<(String, u32)> {
        self.sessions
            .lock()
            .unwrap()
            .iter()
            .filter(|s| s.status == "running" && s.pid.is_some())
            .map(|s| (s.id.clone(), s.pid.unwrap()))
            .collect()
    }

    /// Get all running sessions (including those without PID)
    pub fn get_running_sessions(&self) -> Vec<Session> {
        self.sessions
            .lock()
            .unwrap()
            .iter()
            .filter(|s| s.status == "running")
            .cloned()
            .collect()
    }

    /// Get all running sessions that have terminal metadata
    pub fn get_running_terminal_sessions(&self) -> Vec<Session> {
        self.sessions
            .lock()
            .unwrap()
            .iter()
            .filter(|s| s.status == "running" && s.terminal_type.is_some())
            .cloned()
            .collect()
    }
}

/// Check if a process with the given PID is still running
#[cfg(unix)]
fn is_process_alive(pid: u32) -> bool {
    use std::process::Command;

    // Use kill -0 to check if process exists (doesn't actually send a signal)
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_process_alive(pid: u32) -> bool {
    use std::process::Command;

    // Use tasklist to check if process exists
    Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/NH"])
        .output()
        .map(|output| {
            let stdout = String::from_utf8_lossy(&output.stdout);
            stdout.contains(&pid.to_string())
        })
        .unwrap_or(false)
}

/// Get the sessions directory path
fn get_sessions_dir() -> std::path::PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".ccem/sessions"))
        .unwrap_or_default()
}

/// Check if an exit file exists for a session and return the exit code
fn check_exit_file(session_id: &str) -> Option<i32> {
    let exit_file = get_sessions_dir().join(format!("{}.exit", session_id));
    if exit_file.exists() {
        std::fs::read_to_string(&exit_file)
            .ok()
            .and_then(|s| s.trim().parse().ok())
    } else {
        None
    }
}

/// Clean up the exit file for a session
pub fn cleanup_exit_file(session_id: &str) {
    let exit_file = get_sessions_dir().join(format!("{}.exit", session_id));
    let _ = std::fs::remove_file(exit_file);
}

/// Clean up all stale exit files on app startup
pub fn cleanup_stale_exit_files() {
    let sessions_dir = get_sessions_dir();
    if sessions_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&sessions_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().map(|e| e == "exit").unwrap_or(false) {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }
}

/// Send a system notification
#[cfg(target_os = "macos")]
fn send_notification(title: &str, body: &str) {
    use std::process::Command;

    // Use osascript to send notification on macOS
    let script = format!(
        r#"display notification "{}" with title "{}""#,
        body.replace("\"", "\\\""),
        title.replace("\"", "\\\"")
    );
    let _ = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output();
}

#[cfg(not(target_os = "macos"))]
fn send_notification(_title: &str, _body: &str) {
    // Notifications not implemented for other platforms yet
}

/// Start a background thread to monitor session status
/// Checks every 5 seconds if processes are still alive
pub fn start_session_monitor(app: AppHandle, manager: Arc<SessionManager>) {
    thread::spawn(move || {
        loop {
            // Sleep for 5 seconds between checks
            thread::sleep(Duration::from_secs(5));

            // 1. Check PID-based sessions (existing logic)
            let sessions_to_check = manager.get_running_sessions_with_pid();
            for (session_id, pid) in sessions_to_check {
                if !is_process_alive(pid) {
                    manager.update_session_status(&session_id, "stopped");
                    if let Some(session) = manager.get_session(&session_id) {
                        let _ = app.emit("session-updated", &session);
                    }
                }
            }

            // 2. Batch query all active iTerm2 sessions (single AppleScript call)
            let active_iterm_sessions = terminal::list_iterm_sessions();

            // 3. Check terminal-based sessions
            let terminal_sessions = manager.get_running_terminal_sessions();
            for session in terminal_sessions {
                // First check for exit status file
                if let Some(exit_code) = check_exit_file(&session.id) {
                    let (event_name, notification_title) = if exit_code == 0 {
                        ("task-completed", "Task Completed")
                    } else {
                        ("task-error", "Task Error")
                    };

                    let notification_body = if exit_code == 0 {
                        format!("{} task completed", session.env_name)
                    } else {
                        format!("{} exited with code: {}", session.env_name, exit_code)
                    };

                    manager.update_session_status(&session.id, "stopped");
                    if let Some(updated_session) = manager.get_session(&session.id) {
                        let _ = app.emit(event_name, &updated_session);
                    }
                    send_notification(notification_title, &notification_body);
                    cleanup_exit_file(&session.id);
                    continue;
                }

                // Then check if terminal window still exists
                if let (Some(term_type), Some(wid)) = (&session.terminal_type, &session.window_id) {
                    let is_alive = match term_type.as_str() {
                        "iterm2" => active_iterm_sessions.contains(wid),
                        _ => true, // Terminal.app cannot be precisely detected, assume alive
                    };

                    if !is_alive {
                        // Window closed but no exit file = interrupted
                        manager.update_session_status(&session.id, "interrupted");
                        if let Some(updated_session) = manager.get_session(&session.id) {
                            let _ = app.emit("session-interrupted", &updated_session);
                        }
                        send_notification("Session Interrupted", &format!("{} window was closed", session.env_name));
                    }
                }
            }
        }
    });
}
