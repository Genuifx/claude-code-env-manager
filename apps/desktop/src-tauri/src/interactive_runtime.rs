use crate::runtime::{
    replace_runtime_entries_for_kind, runtime_state_file_path, RuntimeKind, RuntimeStateEntry,
};
use crate::session::{Session, SessionManager};
use crate::terminal::resolve_claude_path;
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::collections::{HashMap, VecDeque};
use std::io;
use std::io::{Read, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const MAX_TRANSCRIPT_CHUNKS: usize = 1200;
const INTERACTIVE_OUTPUT_EVENT: &str = "interactive-session-output";
static USER_PATH: OnceLock<String> = OnceLock::new();

#[derive(Debug, Clone)]
pub struct InteractiveSessionOptions {
    pub session_id: String,
    pub env_name: String,
    pub perm_mode: String,
    pub working_dir: String,
    pub resume_session_id: Option<String>,
    pub env_vars: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InteractiveOutputChunk {
    pub session_id: String,
    pub seq: u64,
    pub occurred_at: DateTime<Utc>,
    pub data: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InteractiveReplayBatch {
    pub gap_detected: bool,
    pub oldest_available_seq: Option<u64>,
    pub newest_available_seq: Option<u64>,
    pub chunks: Vec<InteractiveOutputChunk>,
}

#[derive(Debug, Default)]
struct InteractiveTranscript {
    next_seq: u64,
    chunks: VecDeque<InteractiveOutputChunk>,
}

impl InteractiveTranscript {
    fn append(&mut self, session_id: &str, data: String) -> InteractiveOutputChunk {
        let chunk = InteractiveOutputChunk {
            session_id: session_id.to_string(),
            seq: self.next_seq,
            occurred_at: Utc::now(),
            data,
        };
        self.next_seq += 1;
        self.chunks.push_back(chunk.clone());
        while self.chunks.len() > MAX_TRANSCRIPT_CHUNKS {
            let _ = self.chunks.pop_front();
        }
        chunk
    }

    fn replay_since(&self, since_seq: Option<u64>) -> InteractiveReplayBatch {
        let oldest = self.chunks.front().map(|chunk| chunk.seq);
        let newest = self.chunks.back().map(|chunk| chunk.seq);

        let (gap_detected, start_seq) = match (since_seq, oldest) {
            (Some(seq), Some(oldest_seq)) if seq < oldest_seq => (true, oldest_seq),
            (Some(seq), _) => (false, seq.saturating_add(1)),
            (None, _) => (false, oldest.unwrap_or(0)),
        };

        let chunks = self
            .chunks
            .iter()
            .filter(|chunk| since_seq.is_none() || chunk.seq >= start_seq)
            .cloned()
            .collect();

        InteractiveReplayBatch {
            gap_detected,
            oldest_available_seq: oldest,
            newest_available_seq: newest,
            chunks,
        }
    }
}

struct InteractiveSessionHandle {
    session: Mutex<Session>,
    claude_session_id: Option<String>,
    stdin: Mutex<Option<ChildStdin>>,
    transcript: Mutex<InteractiveTranscript>,
    alive: AtomicBool,
}

pub struct InteractiveRuntimeManager {
    sessions: Mutex<HashMap<String, Arc<InteractiveSessionHandle>>>,
}

impl Default for InteractiveRuntimeManager {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

impl InteractiveRuntimeManager {
    pub fn create_session(
        self: &Arc<Self>,
        app: AppHandle,
        session_manager: Arc<SessionManager>,
        options: InteractiveSessionOptions,
    ) -> Result<Session, String> {
        let mut command = build_interactive_command(&options)?;
        let mut child = command
            .spawn()
            .map_err(|error| format!("Failed to spawn interactive Claude session: {}", error))?;

        let pid = child.id();
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Failed to capture interactive stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture interactive stdout".to_string())?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| "Failed to capture interactive stderr".to_string())?;

        let session = Session {
            id: options.session_id.clone(),
            pid: Some(pid),
            client: "claude".to_string(),
            env_name: options.env_name.clone(),
            perm_mode: options.perm_mode.clone(),
            working_dir: options.working_dir.clone(),
            start_time: Utc::now().to_rfc3339(),
            status: "running".to_string(),
            terminal_type: Some("embedded".to_string()),
            window_id: None,
            iterm_session_id: None,
        };

        let handle = Arc::new(InteractiveSessionHandle {
            session: Mutex::new(session.clone()),
            claude_session_id: options.resume_session_id.clone(),
            stdin: Mutex::new(Some(stdin)),
            transcript: Mutex::new(InteractiveTranscript::default()),
            alive: AtomicBool::new(true),
        });

        self.insert_handle(session.id.clone(), handle.clone())?;
        session_manager.add_session(session.clone());
        self.persist_state_best_effort();

        self.append_output(
            &app,
            &session.id,
            format!(
                "\r\n[ccem] interactive session attached (pid {}, cwd {})\r\n",
                pid, options.working_dir
            ),
        );

        self.spawn_output_reader(app.clone(), session.id.clone(), stdout);
        self.spawn_output_reader(app.clone(), session.id.clone(), stderr);
        self.spawn_waiter(app, session_manager, session.id.clone(), child);

        Ok(session)
    }

    pub fn write_input(&self, session_id: &str, data: &str) -> Result<(), String> {
        let handle = self.get_handle(session_id)?;
        if !handle.alive.load(Ordering::SeqCst) {
            return Err(format!(
                "Interactive session {} is no longer running",
                session_id
            ));
        }

        let mut stdin_guard = handle
            .stdin
            .lock()
            .map_err(|_| "Failed to lock interactive stdin".to_string())?;
        let stdin = stdin_guard
            .as_mut()
            .ok_or_else(|| format!("Interactive session {} stdin is closed", session_id))?;

        stdin
            .write_all(data.as_bytes())
            .and_then(|_| stdin.flush())
            .map_err(|error| format!("Failed to write to interactive stdin: {}", error))
    }

    pub fn stop_session(&self, session_id: &str) -> Result<(), String> {
        let handle = self.get_handle(session_id)?;
        let pid = handle
            .session
            .lock()
            .map_err(|_| "Failed to lock interactive session".to_string())?
            .pid
            .ok_or_else(|| format!("Interactive session {} has no active pid", session_id))?;

        {
            let mut stdin_guard = handle
                .stdin
                .lock()
                .map_err(|_| "Failed to lock interactive stdin".to_string())?;
            *stdin_guard = None;
        }

        kill_process(pid)?;
        Ok(())
    }

    pub fn shutdown_all(&self) {
        let handles = self
            .sessions
            .lock()
            .map(|sessions| sessions.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();

        for handle in handles {
            let pid = {
                let mut stdin_guard = match handle.stdin.lock() {
                    Ok(guard) => guard,
                    Err(_) => continue,
                };
                *stdin_guard = None;

                let session = match handle.session.lock() {
                    Ok(session) => session,
                    Err(_) => continue,
                };
                session.pid
            };

            handle.alive.store(false, Ordering::SeqCst);

            if let Some(pid) = pid {
                let _ = terminate_process(pid);
            }
        }

        let _ = replace_runtime_entries_for_kind(
            &runtime_state_file_path(),
            RuntimeKind::Interactive,
            Vec::new(),
        );
    }

    pub fn active_state_entries(&self) -> Vec<RuntimeStateEntry> {
        self.sessions
            .lock()
            .map(|sessions| {
                sessions
                    .values()
                    .filter(|handle| handle.alive.load(Ordering::SeqCst))
                    .filter_map(|handle| {
                        let session = handle.session.lock().ok()?.clone();
                        Some(RuntimeStateEntry {
                            runtime_id: session.id,
                            runtime_kind: RuntimeKind::Interactive,
                            claude_session_id: handle.claude_session_id.clone(),
                            pid: session.pid,
                            project_dir: session.working_dir,
                            env_name: session.env_name,
                            perm_mode: session.perm_mode,
                            source: crate::runtime::ManagedSessionSource::Desktop,
                            saved_at: Utc::now(),
                            summary: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    #[allow(dead_code)]
    pub fn persist_default_state(&self) -> io::Result<()> {
        replace_runtime_entries_for_kind(
            &runtime_state_file_path(),
            RuntimeKind::Interactive,
            self.active_state_entries(),
        )
    }

    pub fn replay_output(
        &self,
        session_id: &str,
        since_seq: Option<u64>,
    ) -> Result<InteractiveReplayBatch, String> {
        let handle = self.get_handle(session_id)?;
        let transcript = handle
            .transcript
            .lock()
            .map_err(|_| "Failed to lock interactive transcript".to_string())?;
        Ok(transcript.replay_since(since_seq))
    }

    pub fn remove_session(&self, session_id: &str) {
        if let Ok(mut sessions) = self.sessions.lock() {
            sessions.remove(session_id);
        }
        self.persist_state_best_effort();
    }

    fn insert_handle(
        &self,
        session_id: String,
        handle: Arc<InteractiveSessionHandle>,
    ) -> Result<(), String> {
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| "Failed to lock interactive session map".to_string())?;
        sessions.insert(session_id, handle);
        Ok(())
    }

    fn get_handle(&self, session_id: &str) -> Result<Arc<InteractiveSessionHandle>, String> {
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| "Failed to lock interactive session map".to_string())?;
        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| format!("Interactive session not found: {}", session_id))
    }

    fn append_output(&self, app: &AppHandle, session_id: &str, data: String) {
        if let Ok(handle) = self.get_handle(session_id) {
            if let Ok(mut transcript) = handle.transcript.lock() {
                let chunk = transcript.append(session_id, data);
                let _ = app.emit(INTERACTIVE_OUTPUT_EVENT, &chunk);
            }
        }
    }

    fn spawn_output_reader<T>(self: &Arc<Self>, app: AppHandle, session_id: String, output: T)
    where
        T: Read + Send + 'static,
    {
        let manager = Arc::clone(self);
        thread::spawn(move || {
            let mut reader = output;
            let mut buffer = [0_u8; 4096];

            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(read) => {
                        let chunk = String::from_utf8_lossy(&buffer[..read]).to_string();
                        manager.append_output(&app, &session_id, chunk);
                    }
                    Err(error) => {
                        manager.append_output(
                            &app,
                            &session_id,
                            format!("\r\n[ccem] interactive output error: {}\r\n", error),
                        );
                        break;
                    }
                }
            }
        });
    }

    fn spawn_waiter(
        self: &Arc<Self>,
        app: AppHandle,
        session_manager: Arc<SessionManager>,
        session_id: String,
        mut child: Child,
    ) {
        let manager = Arc::clone(self);
        thread::spawn(move || match child.wait() {
            Ok(status) => {
                if let Ok(handle) = manager.get_handle(&session_id) {
                    handle.alive.store(false, Ordering::SeqCst);
                    if let Ok(mut stdin_guard) = handle.stdin.lock() {
                        *stdin_guard = None;
                    }
                    if let Ok(mut session) = handle.session.lock() {
                        session.status = if status.success() {
                            "stopped".to_string()
                        } else {
                            "error".to_string()
                        };
                    }
                }

                session_manager.update_session_status(
                    &session_id,
                    if status.success() { "stopped" } else { "error" },
                );

                let exit_detail = status
                    .code()
                    .map(|code| code.to_string())
                    .unwrap_or_else(|| "unknown".to_string());
                manager.append_output(
                    &app,
                    &session_id,
                    format!(
                        "\r\n[ccem] interactive session exited (code {})\r\n",
                        exit_detail
                    ),
                );

                if let Some(session) = session_manager.get_session(&session_id) {
                    let _ = app.emit("session-updated", &session);
                }
                manager.persist_state_best_effort();
            }
            Err(error) => {
                session_manager.update_session_status(&session_id, "error");
                manager.append_output(
                    &app,
                    &session_id,
                    format!("\r\n[ccem] interactive wait error: {}\r\n", error),
                );
                manager.persist_state_best_effort();
            }
        });
    }

    fn persist_state_best_effort(&self) {
        if let Err(error) = self.persist_default_state() {
            eprintln!("Failed to persist interactive runtime state: {}", error);
        }
    }
}

fn build_interactive_command(options: &InteractiveSessionOptions) -> Result<Command, String> {
    let claude_binary = resolve_claude_path().unwrap_or_else(|| "claude".to_string());
    let mut command = Command::new("/usr/bin/script");

    command.args(["-q", "/dev/null", &claude_binary]);
    command.args(build_permission_args(&options.perm_mode));

    if let Some(resume_session_id) = options.resume_session_id.as_ref() {
        command.args(["--resume", resume_session_id]);
    }

    command
        .env("PATH", get_user_path())
        .env("TERM", "xterm-256color")
        .env_remove("CLAUDECODE")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(&options.working_dir);

    for (key, value) in &options.env_vars {
        command.env(key, value);
    }

    Ok(command)
}

fn build_permission_args(mode_name: &str) -> Vec<String> {
    let official_mode = match mode_name {
        "yolo" => "bypassPermissions",
        "dev" => "acceptEdits",
        "readonly" | "audit" => "plan",
        "safe" | "ci" => "default",
        "acceptEdits" | "bypassPermissions" | "default" | "dontAsk" | "plan" | "auto" => mode_name,
        _ => "acceptEdits",
    };

    vec!["--permission-mode".to_string(), official_mode.to_string()]
}

fn get_user_path() -> &'static str {
    USER_PATH.get_or_init(|| {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
        match Command::new(&shell)
            .args(["-li", "-c", "echo $PATH"])
            .output()
        {
            Ok(output) if output.status.success() => {
                String::from_utf8_lossy(&output.stdout).trim().to_string()
            }
            _ => std::env::var("PATH").unwrap_or_default(),
        }
    })
}

fn kill_process(pid: u32) -> Result<(), String> {
    let status = Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status()
        .map_err(|error| format!("Failed to invoke kill for pid {}: {}", pid, error))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("kill -TERM {} exited with status {}", pid, status))
    }
}

fn terminate_process(pid: u32) -> Result<(), String> {
    kill_process(pid)?;

    for _ in 0..50 {
        if !process_exists(pid) {
            return Ok(());
        }
        thread::sleep(std::time::Duration::from_millis(100));
    }

    let status = Command::new("kill")
        .args(["-KILL", &pid.to_string()])
        .status()
        .map_err(|error| format!("Failed to invoke kill -KILL for pid {}: {}", pid, error))?;

    if status.success() || !process_exists(pid) {
        Ok(())
    } else {
        Err(format!("kill -KILL {} exited with status {}", pid, status))
    }
}

fn process_exists(pid: u32) -> bool {
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[allow(dead_code)]
fn generate_interactive_runtime_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("interactive-{}", nanos)
}

#[cfg(test)]
mod tests {
    use super::InteractiveTranscript;

    #[test]
    fn replay_flags_gap_after_eviction() {
        let mut transcript = InteractiveTranscript::default();
        for index in 0..1300 {
            let _ = transcript.append("session-1", format!("chunk-{index}"));
        }

        let replay = transcript.replay_since(Some(0));
        assert!(replay.gap_detected);
        assert!(replay.oldest_available_seq.unwrap_or(0) > 0);
        assert_eq!(replay.chunks.len(), 1200);
    }
}
