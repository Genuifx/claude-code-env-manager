use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub pid: Option<u32>,
    pub env_name: String,
    pub perm_mode: String,
    pub working_dir: String,
    pub start_time: String,
    pub status: String, // "running", "stopped", "error"
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

/// Start a background thread to monitor session status
/// Checks every 5 seconds if processes are still alive
pub fn start_session_monitor(app: AppHandle, manager: Arc<SessionManager>) {
    thread::spawn(move || {
        loop {
            // Sleep for 5 seconds between checks
            thread::sleep(Duration::from_secs(5));

            // Get all running sessions with PIDs
            let sessions_to_check = manager.get_running_sessions_with_pid();

            for (session_id, pid) in sessions_to_check {
                if !is_process_alive(pid) {
                    // Process has ended, update status
                    manager.update_session_status(&session_id, "stopped");

                    // Emit event to notify frontend
                    if let Some(session) = manager.get_session(&session_id) {
                        let _ = app.emit("session-updated", &session);
                    }
                }
            }
        }
    });
}
