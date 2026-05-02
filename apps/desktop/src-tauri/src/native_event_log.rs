use crate::event_bus::{ReplayBatch, SessionEventPayload, SessionEventRecord};
use crate::session_provenance::state_db_path;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

pub struct NativeEventLog {
    db_path: PathBuf,
    conn: Mutex<Option<Connection>>,
}

impl Default for NativeEventLog {
    fn default() -> Self {
        Self::new(state_db_path())
    }
}

impl NativeEventLog {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db_path,
            conn: Mutex::new(None),
        }
    }

    pub fn append(&self, record: &SessionEventRecord) -> Result<(), String> {
        let payload_json = serde_json::to_string(&record.payload)
            .map_err(|error| format!("Failed to serialize native event payload: {}", error))?;

        self.with_conn(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO native_session_events (
                    runtime_id,
                    seq,
                    occurred_at,
                    payload_json,
                    created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    record.runtime_id,
                    record.seq as i64,
                    record.occurred_at.to_rfc3339(),
                    payload_json,
                    Utc::now().to_rfc3339(),
                ],
            )
            .map_err(|error| format!("Failed to append native session event: {}", error))?;

            Ok(())
        })
    }

    pub fn replay(&self, runtime_id: &str, since_seq: Option<u64>) -> Result<ReplayBatch, String> {
        self.with_conn(|conn| {
            let (oldest_available_seq, newest_available_seq) = event_seq_bounds(conn, runtime_id)?;
            let gap_detected = match (since_seq, oldest_available_seq) {
                (Some(last_seen), Some(oldest)) => last_seen.saturating_add(1) < oldest,
                _ => false,
            };

            let events = query_events_since(conn, runtime_id, since_seq)?;

            Ok(ReplayBatch {
                gap_detected,
                oldest_available_seq,
                newest_available_seq,
                events,
            })
        })
    }

    pub fn has_events(&self, runtime_id: &str) -> Result<bool, String> {
        self.with_conn(|conn| {
            let count = conn
                .query_row(
                    "SELECT 1 FROM native_session_events WHERE runtime_id = ?1 LIMIT 1",
                    [runtime_id],
                    |row| row.get::<_, i64>(0),
                )
                .optional()
                .map_err(|error| format!("Failed to check native session event log: {}", error))?;
            Ok(count.is_some())
        })
    }

    fn with_conn<T>(&self, f: impl FnOnce(&Connection) -> Result<T, String>) -> Result<T, String> {
        let mut guard = self
            .conn
            .lock()
            .map_err(|_| "Failed to lock native event log connection".to_string())?;

        if guard.is_none() {
            if let Some(parent) = self.db_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("Failed to create sqlite state dir: {}", error))?;
            }

            let conn = Connection::open(&self.db_path).map_err(|error| {
                format!(
                    "Failed to open sqlite state db {}: {}",
                    self.db_path.display(),
                    error
                )
            })?;
            conn.busy_timeout(Duration::from_secs(3))
                .map_err(|error| format!("Failed to configure sqlite busy timeout: {}", error))?;
            conn.execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA synchronous = NORMAL;
                 CREATE TABLE IF NOT EXISTS native_session_events (
                     runtime_id TEXT NOT NULL,
                     seq INTEGER NOT NULL,
                     occurred_at TEXT NOT NULL,
                     payload_json TEXT NOT NULL,
                     created_at TEXT NOT NULL,
                     PRIMARY KEY(runtime_id, seq)
                 );
                 CREATE INDEX IF NOT EXISTS idx_native_session_events_runtime_seq
                     ON native_session_events (runtime_id, seq);",
            )
            .map_err(|error| format!("Failed to initialize native event log schema: {}", error))?;
            *guard = Some(conn);
        }

        let conn = guard
            .as_ref()
            .ok_or_else(|| "Native event log connection was not initialized".to_string())?;
        f(conn)
    }
}

fn event_seq_bounds(
    conn: &Connection,
    runtime_id: &str,
) -> Result<(Option<u64>, Option<u64>), String> {
    let (oldest, newest) = conn
        .query_row(
            "SELECT MIN(seq), MAX(seq)
             FROM native_session_events
             WHERE runtime_id = ?1",
            [runtime_id],
            |row| Ok((row.get::<_, Option<i64>>(0)?, row.get::<_, Option<i64>>(1)?)),
        )
        .map_err(|error| format!("Failed to query native event sequence bounds: {}", error))?;

    Ok((
        oldest.and_then(non_negative_i64_to_u64),
        newest.and_then(non_negative_i64_to_u64),
    ))
}

fn query_events_since(
    conn: &Connection,
    runtime_id: &str,
    since_seq: Option<u64>,
) -> Result<Vec<SessionEventRecord>, String> {
    let mut records = Vec::new();

    if let Some(last_seen) = since_seq {
        let mut stmt = conn
            .prepare(
                "SELECT seq, occurred_at, payload_json
                 FROM native_session_events
                 WHERE runtime_id = ?1 AND seq > ?2
                 ORDER BY seq ASC",
            )
            .map_err(|error| format!("Failed to prepare native event replay: {}", error))?;
        let rows = stmt
            .query_map(params![runtime_id, last_seen as i64], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|error| format!("Failed to query native session events: {}", error))?;

        for row in rows {
            let row =
                row.map_err(|error| format!("Failed to read native session event row: {}", error))?;
            records.push(event_row_to_record(runtime_id, row)?);
        }
        return Ok(records);
    }

    let mut stmt = conn
        .prepare(
            "SELECT seq, occurred_at, payload_json
             FROM native_session_events
             WHERE runtime_id = ?1
             ORDER BY seq ASC",
        )
        .map_err(|error| format!("Failed to prepare native event replay: {}", error))?;
    let rows = stmt
        .query_map([runtime_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|error| format!("Failed to query native session events: {}", error))?;

    for row in rows {
        let row =
            row.map_err(|error| format!("Failed to read native session event row: {}", error))?;
        records.push(event_row_to_record(runtime_id, row)?);
    }
    Ok(records)
}

fn event_row_to_record(
    runtime_id: &str,
    row: (i64, String, String),
) -> Result<SessionEventRecord, String> {
    let (seq, occurred_at, payload_json) = row;
    let seq = non_negative_i64_to_u64(seq)
        .ok_or_else(|| format!("Invalid native event sequence number: {}", seq))?;
    let occurred_at = DateTime::parse_from_rfc3339(&occurred_at)
        .map_err(|error| format!("Failed to parse native event timestamp: {}", error))?
        .with_timezone(&Utc);
    let payload = serde_json::from_str::<SessionEventPayload>(&payload_json)
        .map_err(|error| format!("Failed to parse native event payload: {}", error))?;

    Ok(SessionEventRecord {
        runtime_id: runtime_id.to_string(),
        seq,
        occurred_at,
        payload,
    })
}

fn non_negative_i64_to_u64(value: i64) -> Option<u64> {
    if value < 0 {
        None
    } else {
        Some(value as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::NativeEventLog;
    use crate::event_bus::{SessionEventPayload, SessionEventRecord};
    use chrono::Utc;

    #[test]
    fn native_event_log_replays_events_after_reopen() {
        let db_path = std::env::temp_dir().join(format!(
            "ccem-native-event-log-test-{}.sqlite",
            Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        ));
        let log = NativeEventLog::new(db_path.clone());
        let first = SessionEventRecord {
            runtime_id: "runtime-1".to_string(),
            seq: 1,
            occurred_at: Utc::now(),
            payload: SessionEventPayload::AssistantChunk {
                text: "hello".to_string(),
            },
        };
        let second = SessionEventRecord {
            runtime_id: "runtime-1".to_string(),
            seq: 2,
            occurred_at: Utc::now(),
            payload: SessionEventPayload::SessionCompleted {
                reason: "done".to_string(),
            },
        };

        log.append(&first).expect("append first");
        log.append(&second).expect("append second");
        drop(log);

        let reopened = NativeEventLog::new(db_path.clone());
        let replay = reopened.replay("runtime-1", Some(1)).expect("replay");

        assert!(!replay.gap_detected);
        assert_eq!(replay.oldest_available_seq, Some(1));
        assert_eq!(replay.newest_available_seq, Some(2));
        assert_eq!(replay.events.len(), 1);
        assert_eq!(replay.events[0].seq, 2);

        let _ = std::fs::remove_file(db_path);
    }

    #[test]
    fn native_event_log_preserves_raw_jsonl_payloads() {
        let db_path = std::env::temp_dir().join(format!(
            "ccem-native-event-log-jsonl-test-{}.sqlite",
            Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        ));
        let raw_json = serde_json::json!({
            "type": "assistant",
            "message": {
                "content": [
                    {"type": "text", "text": "hello"},
                    {"type": "tool_use", "id": "toolu-1", "name": "Bash", "input": {"command": "npm test"}}
                ]
            }
        })
        .to_string();
        let log = NativeEventLog::new(db_path.clone());

        log.append(&SessionEventRecord {
            runtime_id: "runtime-jsonl".to_string(),
            seq: 1,
            occurred_at: Utc::now(),
            payload: SessionEventPayload::ClaudeJson {
                message_type: Some("assistant".to_string()),
                raw_json: raw_json.clone(),
            },
        })
        .expect("append raw jsonl payload");

        let replay = log.replay("runtime-jsonl", None).expect("replay all");
        assert_eq!(replay.events.len(), 1);
        assert_eq!(
            replay.events[0].payload,
            SessionEventPayload::ClaudeJson {
                message_type: Some("assistant".to_string()),
                raw_json,
            }
        );

        let _ = std::fs::remove_file(db_path);
    }
}
