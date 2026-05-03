use crate::event_bus::{ReplayBatch, SessionEventPayload, SessionEventRecord};
use crate::session_provenance::state_db_path;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

const EVENT_LOG_FLUSH_BATCH_SIZE: usize = 64;

pub struct NativeEventLog {
    db_path: PathBuf,
    conn: Mutex<Option<Connection>>,
    pending: Mutex<Vec<SessionEventRecord>>,
}

impl Default for NativeEventLog {
    fn default() -> Self {
        Self::new(state_db_path())
    }
}

impl Drop for NativeEventLog {
    fn drop(&mut self) {
        let _ = self.flush_pending();
    }
}

impl NativeEventLog {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            db_path,
            conn: Mutex::new(None),
            pending: Mutex::new(Vec::new()),
        }
    }

    pub fn append(&self, record: &SessionEventRecord) -> Result<(), String> {
        let should_flush = {
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| "Failed to lock pending native event log records".to_string())?;
            pending.push(record.clone());
            pending.len() >= EVENT_LOG_FLUSH_BATCH_SIZE || should_flush_after_append(&record.payload)
        };

        if should_flush {
            self.flush_pending()?;
        }

        Ok(())
    }

    pub fn flush_pending(&self) -> Result<(), String> {
        let records = {
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| "Failed to lock pending native event log records".to_string())?;
            if pending.is_empty() {
                return Ok(());
            }
            std::mem::take(&mut *pending)
        };

        if let Err(error) = self.write_records(&records) {
            if let Ok(mut pending) = self.pending.lock() {
                let mut restored = records;
                restored.append(&mut *pending);
                *pending = restored;
            }
            return Err(error);
        }

        Ok(())
    }

    pub fn replay(
        &self,
        runtime_id: &str,
        since_seq: Option<u64>,
        limit: Option<u64>,
    ) -> Result<ReplayBatch, String> {
        self.flush_pending()?;
        self.with_conn(|conn| {
            let (oldest_available_seq, newest_available_seq) = event_seq_bounds(conn, runtime_id)?;
            let gap_detected = match (since_seq, oldest_available_seq) {
                (Some(last_seen), Some(oldest)) => last_seen.saturating_add(1) < oldest,
                _ => false,
            };

            let events = query_events_since(conn, runtime_id, since_seq, limit)?;

            Ok(ReplayBatch {
                gap_detected,
                oldest_available_seq,
                newest_available_seq,
                events,
            })
        })
    }

    pub fn has_events(&self, runtime_id: &str) -> Result<bool, String> {
        self.flush_pending()?;
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

    fn write_records(&self, records: &[SessionEventRecord]) -> Result<(), String> {
        self.with_conn(|conn| {
            let tx = conn
                .transaction()
                .map_err(|error| format!("Failed to begin native event log transaction: {}", error))?;
            {
                let mut stmt = tx
                    .prepare_cached(
                        "INSERT OR IGNORE INTO native_session_events (
                            runtime_id,
                            seq,
                            occurred_at,
                            payload_json,
                            created_at
                        ) VALUES (?1, ?2, ?3, ?4, ?5)",
                    )
                    .map_err(|error| {
                        format!("Failed to prepare native session event append: {}", error)
                    })?;
                let created_at = Utc::now().to_rfc3339();
                for record in records {
                    let payload_json = serde_json::to_string(&record.payload).map_err(|error| {
                        format!("Failed to serialize native event payload: {}", error)
                    })?;
                    stmt.execute(params![
                        record.runtime_id,
                        record.seq as i64,
                        record.occurred_at.to_rfc3339(),
                        payload_json,
                        created_at,
                    ])
                    .map_err(|error| {
                        format!("Failed to append native session event: {}", error)
                    })?;
                }
            }
            tx.commit()
                .map_err(|error| format!("Failed to commit native event log transaction: {}", error))?;
            Ok(())
        })
    }

    fn with_conn<T>(&self, f: impl FnOnce(&mut Connection) -> Result<T, String>) -> Result<T, String> {
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
                 DROP INDEX IF EXISTS idx_native_session_events_runtime_seq;
                 CREATE TABLE IF NOT EXISTS native_session_events (
                     runtime_id TEXT NOT NULL,
                     seq INTEGER NOT NULL,
                     occurred_at TEXT NOT NULL,
                     payload_json TEXT NOT NULL,
                     created_at TEXT NOT NULL,
                     PRIMARY KEY(runtime_id, seq)
                 );
                 PRAGMA optimize;",
            )
            .map_err(|error| format!("Failed to initialize native event log schema: {}", error))?;
            *guard = Some(conn);
        }

        let conn = guard
            .as_mut()
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
    limit: Option<u64>,
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

    if let Some(limit) = limit.filter(|value| *value > 0) {
        let mut stmt = conn
            .prepare(
                "SELECT seq, occurred_at, payload_json
                 FROM (
                     SELECT seq, occurred_at, payload_json
                     FROM native_session_events
                     WHERE runtime_id = ?1
                     ORDER BY seq DESC
                     LIMIT ?2
                 )
                 ORDER BY seq ASC",
            )
            .map_err(|error| format!("Failed to prepare native event tail replay: {}", error))?;
        let rows = stmt
            .query_map(params![runtime_id, limit as i64], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|error| format!("Failed to query native session event tail: {}", error))?;

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

fn should_flush_after_append(payload: &SessionEventPayload) -> bool {
    match payload {
        SessionEventPayload::Lifecycle { stage, .. } => {
            matches!(stage.as_str(), "error" | "stopped" | "handoff")
        }
        SessionEventPayload::SessionCompleted { .. }
        | SessionEventPayload::PermissionRequired { .. }
        | SessionEventPayload::PermissionResponded { .. }
        | SessionEventPayload::TerminalPromptRequired { .. }
        | SessionEventPayload::TerminalPromptResolved { .. } => true,
        SessionEventPayload::ToolUseStarted { needs_response, .. } => *needs_response,
        SessionEventPayload::ToolUseCompleted { .. } => true,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::NativeEventLog;
    use crate::event_bus::{SessionEventPayload, SessionEventRecord};
    use chrono::Utc;
    use rusqlite::Connection;

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
        let replay = reopened
            .replay("runtime-1", Some(1), None)
            .expect("replay");

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

        let replay = log
            .replay("runtime-jsonl", None, None)
            .expect("replay all");
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

    #[test]
    fn native_event_log_flushes_pending_records_before_limited_replay() {
        let db_path = std::env::temp_dir().join(format!(
            "ccem-native-event-log-tail-test-{}.sqlite",
            Utc::now().timestamp_nanos_opt().unwrap_or_default(),
        ));
        let log = NativeEventLog::new(db_path.clone());

        for seq in 1..=5 {
            log.append(&SessionEventRecord {
                runtime_id: "runtime-tail".to_string(),
                seq,
                occurred_at: Utc::now(),
                payload: SessionEventPayload::AssistantChunk {
                    text: format!("chunk-{seq}"),
                },
            })
            .expect("append chunk");
        }

        let replay = log
            .replay("runtime-tail", None, Some(2))
            .expect("replay tail");
        assert_eq!(replay.oldest_available_seq, Some(1));
        assert_eq!(replay.newest_available_seq, Some(5));
        assert_eq!(
            replay.events.iter().map(|event| event.seq).collect::<Vec<_>>(),
            vec![4, 5],
        );

        let conn = Connection::open(&db_path).expect("open sqlite db");
        let duplicate_index_exists = conn
            .query_row(
                "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'idx_native_session_events_runtime_seq'",
                [],
                |_| Ok(true),
            )
            .unwrap_or(false);
        assert!(!duplicate_index_exists);

        let _ = std::fs::remove_file(db_path);
    }
}
