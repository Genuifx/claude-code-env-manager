use chrono::Utc;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum BrowserRuntimeReadinessStatus {
    Unavailable,
    Preparing,
    Ready,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct BrowserRuntimeReadiness {
    pub status: BrowserRuntimeReadinessStatus,
    pub version: Option<String>,
    pub error: Option<String>,
    pub checked_at: String,
}

impl Default for BrowserRuntimeReadiness {
    fn default() -> Self {
        Self {
            status: BrowserRuntimeReadinessStatus::Unavailable,
            version: None,
            error: None,
            checked_at: Utc::now().to_rfc3339(),
        }
    }
}

pub(super) fn runtime_readiness() -> BrowserRuntimeReadiness {
    // Mode 1.5 deliberately does not install or trust a runtime. A future preparation manager is
    // the only component allowed to return Ready after download integrity, executable identity,
    // private-pipe smoke, and lifecycle cleanup all pass for the pinned artifact.
    BrowserRuntimeReadiness::default()
}

#[cfg(test)]
mod tests {
    use super::{runtime_readiness, BrowserRuntimeReadinessStatus};

    #[test]
    fn mode_two_runtime_cannot_claim_ready_before_a_preparation_manager_exists() {
        let readiness = runtime_readiness();
        assert_eq!(readiness.status, BrowserRuntimeReadinessStatus::Unavailable);
        assert!(readiness.version.is_none());
        assert!(readiness.error.is_none());
        assert_eq!(
            serde_json::to_value(readiness).expect("serialize readiness")["status"],
            "unavailable"
        );
    }

    #[test]
    fn readiness_status_wire_values_are_stable() {
        let values = [
            (BrowserRuntimeReadinessStatus::Unavailable, "unavailable"),
            (BrowserRuntimeReadinessStatus::Preparing, "preparing"),
            (BrowserRuntimeReadinessStatus::Ready, "ready"),
            (BrowserRuntimeReadinessStatus::Failed, "failed"),
        ];
        for (status, expected) in values {
            assert_eq!(
                serde_json::to_value(status).expect("serialize status"),
                expected
            );
        }
    }
}
