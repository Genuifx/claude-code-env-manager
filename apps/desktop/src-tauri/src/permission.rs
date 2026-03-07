use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PermissionResponse {
    pub approved: bool,
    pub responder: String,
    pub responded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PermissionError {
    DuplicateRequest(String),
    AlreadyResolved(String),
    DeliveryFailed(String),
    LockPoisoned,
}

pub struct PermissionManager {
    pending: Mutex<HashMap<String, Sender<PermissionResponse>>>,
}

impl Default for PermissionManager {
    fn default() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
        }
    }
}

impl PermissionManager {
    pub fn register(
        &self,
        request_id: impl Into<String>,
    ) -> Result<Receiver<PermissionResponse>, PermissionError> {
        let request_id = request_id.into();
        let (tx, rx) = channel();

        let mut pending = self
            .pending
            .lock()
            .map_err(|_| PermissionError::LockPoisoned)?;

        if pending.contains_key(&request_id) {
            return Err(PermissionError::DuplicateRequest(request_id));
        }

        pending.insert(request_id, tx);
        Ok(rx)
    }

    pub fn respond(
        &self,
        request_id: &str,
        approved: bool,
        responder: impl Into<String>,
    ) -> Result<(), PermissionError> {
        let tx = {
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| PermissionError::LockPoisoned)?;

            pending
                .remove(request_id)
                .ok_or_else(|| PermissionError::AlreadyResolved(request_id.to_string()))?
        };

        tx.send(PermissionResponse {
            approved,
            responder: responder.into(),
            responded_at: Utc::now(),
        })
        .map_err(|_| PermissionError::DeliveryFailed(request_id.to_string()))
    }

    pub fn is_pending(&self, request_id: &str) -> bool {
        self.pending
            .lock()
            .map(|pending| pending.contains_key(request_id))
            .unwrap_or(false)
    }

    pub fn pending_count(&self) -> usize {
        self.pending
            .lock()
            .map(|pending| pending.len())
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::{PermissionError, PermissionManager};
    use std::time::Duration;

    #[test]
    fn permission_manager_allows_only_the_first_response() {
        let manager = PermissionManager::default();
        let receiver = manager.register("req-1").expect("register request");

        manager
            .respond("req-1", true, "desktop")
            .expect("first response should win");

        let response = receiver
            .recv_timeout(Duration::from_secs(1))
            .expect("response should be delivered");

        assert!(response.approved);
        assert_eq!(response.responder, "desktop");
        assert_eq!(
            manager.respond("req-1", false, "telegram"),
            Err(PermissionError::AlreadyResolved("req-1".to_string()))
        );
    }

    #[test]
    fn permission_manager_rejects_duplicate_registration() {
        let manager = PermissionManager::default();

        let _receiver = manager.register("req-2").expect("register request");
        assert!(matches!(
            manager.register("req-2"),
            Err(PermissionError::DuplicateRequest(request_id)) if request_id == "req-2"
        ));
        assert!(manager.is_pending("req-2"));
        assert_eq!(manager.pending_count(), 1);
    }
}
