use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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
}
