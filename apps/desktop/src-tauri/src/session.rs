use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::terminal;

fn default_client() -> String {
    "claude".to_string()
}

/// Return the path to ~/.ccem/sessions.json
fn get_sessions_file_path() -> std::path::PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".ccem/sessions.json"))
        .unwrap_or_default()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub pid: Option<u32>,
    #[serde(default = "default_client")]
    pub client: String, // "claude" | "codex"
    #[serde(alias = "env_name")] // 兼容旧的 snake_case
    pub env_name: String,
    #[serde(default, alias = "config_source")]
    pub config_source: Option<String>,
    #[serde(alias = "perm_mode")]
    pub perm_mode: String,
    #[serde(alias = "working_dir")]
    pub working_dir: String,
    #[serde(alias = "start_time")]
    pub start_time: String,
    pub status: String, // "running", "stopped", "interrupted"
    // Terminal metadata for window control
    #[serde(alias = "terminal_type")]
    pub terminal_type: Option<String>, // "iterm2" | "terminalapp"
    #[serde(alias = "window_id")]
    pub window_id: Option<String>, // iTerm2 window ID for operations
    #[serde(alias = "iterm_session_id")]
    pub iterm_session_id: Option<String>, // iTerm2 session unique ID for move_session API
    #[serde(default, alias = "tmux_target")]
    pub tmux_target: Option<String>, // tmux target for tmux-backed interactive sessions
}

impl Session {
    pub fn is_tmux_backed(&self) -> bool {
        self.tmux_target.is_some() || self.terminal_type.as_deref() == Some("embedded")
    }

    pub fn resolved_tmux_target(&self) -> Option<&str> {
        self.tmux_target.as_deref().or_else(|| {
            (self.terminal_type.as_deref() == Some("embedded"))
                .then_some(self.window_id.as_deref())
                .flatten()
        })
    }
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
    /// Load sessions from ~/.ccem/sessions.json, returning a new SessionManager.
    /// Returns an empty manager if the file doesn't exist or is corrupted.
    pub fn load_from_disk() -> Self {
        let path = get_sessions_file_path();
        let sessions = if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(content) => serde_json::from_str::<Vec<Session>>(&content)
                    .map(|sessions| {
                        sessions
                            .into_iter()
                            .map(Self::normalize_loaded_session)
                            .collect()
                    })
                    .unwrap_or_else(|e| {
                        eprintln!("Failed to parse sessions.json: {}", e);
                        vec![]
                    }),
                Err(e) => {
                    eprintln!("Failed to read sessions.json: {}", e);
                    vec![]
                }
            }
        } else {
            vec![]
        };
        Self {
            sessions: Mutex::new(sessions),
        }
    }

    fn normalize_loaded_session(mut session: Session) -> Session {
        if session.tmux_target.is_none() && session.terminal_type.as_deref() == Some("embedded") {
            session.tmux_target = session.window_id.clone();
            session.window_id = None;
            session.iterm_session_id = None;
        }

        session
    }

    /// Persist current sessions to ~/.ccem/sessions.json with atomic write.
    /// Errors are logged but never panic.
    fn save_to_disk(&self) {
        let path = get_sessions_file_path();
        let temp_path = path.with_extension("tmp");

        // 在锁内完成读取-序列化-写入
        let sessions = self.sessions.lock().unwrap().clone();

        if let Some(parent) = path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                eprintln!("Failed to create sessions dir: {}", e);
                return;
            }
        }

        // 获取文件锁
        let lock_result = OpenOptions::new().create(true).write(true).open(&path);

        let lock_file = match lock_result {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to open sessions file for locking: {}", e);
                return;
            }
        };

        // 加排他锁
        if let Err(e) = lock_file.lock_exclusive() {
            eprintln!("Failed to acquire lock on sessions file: {}", e);
            return;
        }

        // 序列化并写入临时文件
        match serde_json::to_string_pretty(&sessions) {
            Ok(json) => {
                if let Err(e) = fs::write(&temp_path, json) {
                    eprintln!("Failed to write temp sessions file: {}", e);
                    return;
                }
                // 原子替换
                if let Err(e) = fs::rename(&temp_path, &path) {
                    eprintln!("Failed to rename temp sessions file: {}", e);
                }
            }
            Err(e) => {
                eprintln!("Failed to serialize sessions: {}", e);
            }
        }
        // 锁会在 lock_file drop 时自动释放
    }

    pub fn add_session(&self, session: Session) {
        self.sessions.lock().unwrap().push(session);
        self.save_to_disk();
    }

    pub fn remove_session(&self, id: &str) {
        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.retain(|s| s.id != id);
        }
        self.save_to_disk();
    }

    pub fn update_session_status(&self, id: &str, status: &str) {
        {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(session) = sessions.iter_mut().find(|s| s.id == id) {
                session.status = status.to_string();
            }
        }
        self.save_to_disk();
    }

    pub fn list_sessions(&self) -> Vec<Session> {
        self.sessions.lock().unwrap().clone()
    }

    pub fn get_session(&self, id: &str) -> Option<Session> {
        self.sessions
            .lock()
            .unwrap()
            .iter()
            .find(|s| s.id == id)
            .cloned()
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

    /// Update the iTerm2 session ID for a session
    pub fn update_session_iterm_id(&self, id: &str, iterm_session_id: &str) {
        {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(session) = sessions.iter_mut().find(|s| s.id == id) {
                session.iterm_session_id = Some(iterm_session_id.to_string());
            }
        }
        self.save_to_disk();
    }

    /// Update the window ID for a session (used after arrange merges windows)
    pub fn update_session_window_id(&self, id: &str, window_id: &str) {
        {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(session) = sessions.iter_mut().find(|s| s.id == id) {
                session.window_id = Some(window_id.to_string());
            }
        }
        self.save_to_disk();
    }

    pub fn attach_tmux_terminal(
        &self,
        id: &str,
        terminal_type: &str,
        window_id: Option<&str>,
        iterm_session_id: Option<&str>,
    ) {
        {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(session) = sessions.iter_mut().find(|s| s.id == id) {
                session.terminal_type = Some(terminal_type.to_string());
                session.window_id = window_id.map(str::to_string);
                session.iterm_session_id = iterm_session_id.map(str::to_string);
            }
        }
        self.save_to_disk();
    }

    pub fn update_session_pid(&self, id: &str, pid: Option<u32>) {
        {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(session) = sessions.iter_mut().find(|s| s.id == id) {
                session.pid = pid;
            }
        }
        self.save_to_disk();
    }

    /// Get all running sessions that have terminal metadata
    pub fn get_running_terminal_sessions(&self) -> Vec<Session> {
        self.sessions
            .lock()
            .unwrap()
            .iter()
            .filter(|s| s.status == "running" && s.terminal_type.is_some() && !s.is_tmux_backed())
            .cloned()
            .collect()
    }

    /// Validate persisted sessions against actual terminal state on app startup.
    /// - Removes stopped/interrupted sessions (stale from previous run)
    /// - Checks running sessions against live terminal windows
    /// - Marks orphaned sessions as stopped or interrupted
    pub fn validate_and_reconcile(&self) {
        let has_running_sessions = {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.retain(|s| s.status == "running");
            !sessions.is_empty()
        };

        if !has_running_sessions {
            self.save_to_disk();
            return;
        }

        let active_iterm_sessions = terminal::list_iterm_sessions();
        let active_terminal_windows = terminal::list_terminal_app_windows();

        {
            let mut sessions = self.sessions.lock().unwrap();

            // Validate each remaining running session
            for session in sessions.iter_mut() {
                if session.is_tmux_backed() {
                    let is_alive = session.pid.is_some_and(is_process_alive);
                    if !is_alive {
                        session.status = "stopped".to_string();
                    }
                    continue;
                }

                match (&session.terminal_type, &session.window_id) {
                    (Some(term_type), Some(wid)) => {
                        let is_alive = match term_type.as_str() {
                            "iterm2" => active_iterm_sessions.contains(wid),
                            "terminalapp" => active_terminal_windows.contains(wid),
                            _ => false,
                        };

                        if !is_alive {
                            if check_exit_file(&session.id).is_some() {
                                session.status = "stopped".to_string();
                                cleanup_exit_file(&session.id);
                            } else {
                                session.status = "interrupted".to_string();
                            }
                        }
                    }
                    _ => {
                        // No terminal metadata — can't verify, mark interrupted
                        session.status = "interrupted".to_string();
                    }
                }
            }
        }
        self.save_to_disk();
    }
}

/// Check if a process with the given PID is still running
#[cfg(unix)]
fn is_process_alive(pid: u32) -> bool {
    // kill(pid, 0) checks whether the process exists without spawning a shell command.
    let result = unsafe { libc::kill(pid as i32, 0) };
    if result == 0 {
        return true;
    }

    std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
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

/// Clean up stale exit files that don't belong to any persisted session.
/// Called on startup after load_from_disk, before validate_and_reconcile,
/// so that known sessions' exit files are preserved for reconciliation.
pub fn cleanup_stale_exit_files_except(manager: &SessionManager) {
    let sessions_dir = get_sessions_dir();
    if !sessions_dir.exists() {
        return;
    }

    let known_ids: std::collections::HashSet<String> = manager
        .sessions
        .lock()
        .unwrap()
        .iter()
        .map(|s| s.id.clone())
        .collect();

    if let Ok(entries) = std::fs::read_dir(&sessions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "exit").unwrap_or(false) {
                // Extract session ID from filename (e.g. "session-123456.exit" -> "session-123456")
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    if !known_ids.contains(stem) {
                        let _ = std::fs::remove_file(&path);
                    }
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
    let _ = Command::new("osascript").arg("-e").arg(&script).output();
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

            // 2. Batch query all active terminal windows (single AppleScript call each)
            let active_iterm_sessions = terminal::list_iterm_sessions();
            let active_terminal_app_windows = terminal::list_terminal_app_windows();

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
                        "terminalapp" => active_terminal_app_windows.contains(wid),
                        _ => true,
                    };

                    if !is_alive {
                        // Window closed but no exit file = interrupted
                        manager.update_session_status(&session.id, "interrupted");
                        if let Some(updated_session) = manager.get_session(&session.id) {
                            let _ = app.emit("session-interrupted", &updated_session);
                        }
                        send_notification(
                            "Session Interrupted",
                            &format!("{} window was closed", session.env_name),
                        );
                    }
                }
            }
        }
    });
}
