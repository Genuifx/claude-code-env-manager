use crate::config::{resolve_claude_env, resolve_codex_runtime};
use crate::event_bus::{ReplayBatch, SessionEventPayload, SessionStore};
use crate::session_provenance::bind_source_session_id;
use crate::system_proxy::resolve_codex_proxy_env;
use crate::terminal::{self, resolve_claude_path, resolve_codex_path, TerminalType};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{path::BaseDirectory, AppHandle, Manager};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NativeProvider {
    Claude,
    Codex,
}

impl NativeProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Claude => "claude",
            Self::Codex => "codex",
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NativeTransport {
    NativeSdk,
    InteractiveTerminal,
    ExternalWeb,
    Headless,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NativeSessionRecord {
    pub runtime_id: String,
    pub provider: NativeProvider,
    pub transport: NativeTransport,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_session_id: Option<String>,
    pub project_dir: String,
    pub env_name: String,
    pub perm_mode: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
    pub can_handoff_to_terminal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NativeSessionSummary {
    pub runtime_id: String,
    pub provider: NativeProvider,
    pub transport: NativeTransport,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_session_id: Option<String>,
    pub project_dir: String,
    pub env_name: String,
    pub perm_mode: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_event_seq: Option<u64>,
    pub can_handoff_to_terminal: bool,
}

#[derive(Debug, Clone)]
pub struct NativeSessionOptions {
    pub provider: NativeProvider,
    pub env_name: String,
    pub perm_mode: String,
    pub working_dir: String,
    pub initial_prompt: Option<String>,
    pub provider_session_id: Option<String>,
    pub helper_env_vars: HashMap<String, String>,
    pub terminal_env_vars: HashMap<String, String>,
    pub claude_path: Option<String>,
    pub codex_path: Option<String>,
    pub codex_base_url: Option<String>,
    pub codex_api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractivePromptAnnotation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum HelperInputCommand<'a> {
    Init {
        provider: &'a str,
        env_name: &'a str,
        perm_mode: &'a str,
        working_dir: &'a str,
        env_vars: &'a HashMap<String, String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        initial_prompt: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        provider_session_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        claude_path: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        codex_path: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        codex_base_url: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        codex_api_key: Option<&'a str>,
    },
    Prompt {
        text: &'a str,
    },
    PermissionResponse {
        request_id: &'a str,
        approved: bool,
    },
    InteractivePromptResponse {
        tool_use_id: &'a str,
        prompt_type: &'a str,
        answers: &'a HashMap<String, String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        annotations: Option<&'a HashMap<String, InteractivePromptAnnotation>>,
    },
    Stop,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum HelperOutputEvent {
    SessionMeta {
        provider_session_id: String,
    },
    Status {
        status: String,
        #[serde(default)]
        detail: Option<String>,
    },
    Event {
        payload: Value,
    },
}

struct NativeSessionHandle {
    record: Mutex<NativeSessionRecord>,
    child: Mutex<Option<CommandChild>>,
    events: Mutex<SessionStore>,
    helper_env_vars: HashMap<String, String>,
    terminal_env_vars: HashMap<String, String>,
    claude_path: Option<String>,
    codex_path: Option<String>,
    codex_base_url: Option<String>,
    codex_api_key: Option<String>,
    alive: AtomicBool,
}

impl NativeSessionHandle {
    fn summary(&self) -> NativeSessionSummary {
        let record = self
            .record
            .lock()
            .expect("native session record poisoned")
            .clone();
        let last_event_seq = self
            .events
            .lock()
            .ok()
            .and_then(|store| store.newest_seq());
        NativeSessionSummary {
            runtime_id: record.runtime_id,
            provider: record.provider,
            transport: record.transport,
            provider_session_id: record.provider_session_id,
            project_dir: record.project_dir,
            env_name: record.env_name,
            perm_mode: record.perm_mode,
            status: record.status,
            created_at: record.created_at,
            updated_at: record.updated_at,
            is_active: record.is_active,
            last_event_seq,
            can_handoff_to_terminal: record.can_handoff_to_terminal,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct NativeRuntimeState {
    sessions: Vec<NativeSessionRecord>,
}

pub struct NativeRuntimeManager {
    records: Mutex<HashMap<String, NativeSessionRecord>>,
    handles: Mutex<HashMap<String, Arc<NativeSessionHandle>>>,
}

impl Default for NativeRuntimeManager {
    fn default() -> Self {
        let records = read_native_runtime_state_from(&native_runtime_state_file_path())
            .unwrap_or_default()
            .sessions
            .into_iter()
            .map(|record| (record.runtime_id.clone(), record))
            .collect();
        Self {
            records: Mutex::new(records),
            handles: Mutex::new(HashMap::new()),
        }
    }
}

impl NativeRuntimeManager {
    pub fn create_session(
        self: &Arc<Self>,
        app: AppHandle,
        options: NativeSessionOptions,
    ) -> Result<NativeSessionSummary, String> {
        let runtime_id = generate_runtime_id();
        let now = Utc::now();
        let record = NativeSessionRecord {
            runtime_id: runtime_id.clone(),
            provider: options.provider,
            transport: NativeTransport::NativeSdk,
            provider_session_id: options.provider_session_id.clone(),
            project_dir: options.working_dir.clone(),
            env_name: options.env_name.clone(),
            perm_mode: options.perm_mode.clone(),
            status: "initializing".to_string(),
            created_at: now,
            updated_at: now,
            is_active: true,
            can_handoff_to_terminal: options.provider_session_id.is_some(),
        };

        let handle = Arc::new(NativeSessionHandle {
            record: Mutex::new(record.clone()),
            child: Mutex::new(None),
            events: Mutex::new(SessionStore::new(runtime_id.clone())),
            helper_env_vars: options.helper_env_vars.clone(),
            terminal_env_vars: options.terminal_env_vars.clone(),
            claude_path: options.claude_path.clone(),
            codex_path: options.codex_path.clone(),
            codex_base_url: options.codex_base_url.clone(),
            codex_api_key: options.codex_api_key.clone(),
            alive: AtomicBool::new(true),
        });

        self.insert_record(record)?;
        self.insert_handle(runtime_id.clone(), handle.clone())?;
        self.append_event(
            &runtime_id,
            SessionEventPayload::Lifecycle {
                stage: "runtime_boot".to_string(),
                detail: format!("Starting {} native runtime.", options.provider.as_str()),
            },
        )?;
        self.spawn_helper(app, &runtime_id, &options, handle)?;
        self.summary_for(&runtime_id)
    }

    pub fn list_sessions(&self) -> Vec<NativeSessionSummary> {
        let handles = self
            .handles
            .lock()
            .ok()
            .map(|handles| handles.clone())
            .unwrap_or_default();
        let records = self
            .records
            .lock()
            .ok()
            .map(|records| records.clone())
            .unwrap_or_default();

        let mut sessions = records
            .into_values()
            .map(|record| {
                if let Some(handle) = handles.get(&record.runtime_id) {
                    handle.summary()
                } else {
                    NativeSessionSummary {
                        runtime_id: record.runtime_id,
                        provider: record.provider,
                        transport: record.transport,
                        provider_session_id: record.provider_session_id,
                        project_dir: record.project_dir,
                        env_name: record.env_name,
                        perm_mode: record.perm_mode,
                        status: record.status,
                        created_at: record.created_at,
                        updated_at: record.updated_at,
                        is_active: record.is_active,
                        last_event_seq: None,
                        can_handoff_to_terminal: record.can_handoff_to_terminal,
                    }
                }
            })
            .collect::<Vec<_>>();

        sessions.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        sessions
    }

    pub fn replay_events(&self, runtime_id: &str, since_seq: Option<u64>) -> Result<ReplayBatch, String> {
        let handles = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?;
        let Some(handle) = handles.get(runtime_id) else {
            if self.has_record(runtime_id)? {
                return Ok(ReplayBatch {
                    gap_detected: false,
                    oldest_available_seq: None,
                    newest_available_seq: None,
                    events: Vec::new(),
                });
            }
            return Err(format!("Native runtime {} not found", runtime_id));
        };
        handle
            .events
            .lock()
            .map_err(|_| "Failed to lock native session events".to_string())
            .map(|store| store.events_since(since_seq))
    }

    pub fn send_user_message(
        self: &Arc<Self>,
        app: &AppHandle,
        runtime_id: &str,
        text: &str,
    ) -> Result<(), String> {
        let text = text.trim();
        if text.is_empty() {
            return Ok(());
        }

        let handle = self.ensure_handle(app.clone(), runtime_id)?;
        self.write_to_child(
            &handle,
            &HelperInputCommand::Prompt { text },
        )
    }

    pub fn respond_to_permission(
        self: &Arc<Self>,
        app: &AppHandle,
        runtime_id: &str,
        request_id: &str,
        approved: bool,
    ) -> Result<(), String> {
        let handle = self.ensure_handle(app.clone(), runtime_id)?;
        self.write_to_child(
            &handle,
            &HelperInputCommand::PermissionResponse {
                request_id,
                approved,
            },
        )
    }

    pub fn respond_to_prompt(
        self: &Arc<Self>,
        app: &AppHandle,
        runtime_id: &str,
        tool_use_id: &str,
        prompt_type: &str,
        answers: &HashMap<String, String>,
        annotations: Option<&HashMap<String, InteractivePromptAnnotation>>,
    ) -> Result<(), String> {
        if answers.is_empty() {
            return Err("Interactive prompt response requires at least one answer.".to_string());
        }

        let handle = self.ensure_handle(app.clone(), runtime_id)?;
        self.write_to_child(
            &handle,
            &HelperInputCommand::InteractivePromptResponse {
                tool_use_id,
                prompt_type,
                answers,
                annotations,
            },
        )
    }

    pub fn stop_session(&self, runtime_id: &str) -> Result<(), String> {
        self.update_record(runtime_id, |record| {
            record.status = "stopped".to_string();
            record.is_active = false;
            record.updated_at = Utc::now();
        })?;
        self.append_event(
            runtime_id,
            SessionEventPayload::SessionCompleted {
                reason: "Stopped from desktop workspace.".to_string(),
            },
        )?;
        self.kill_child(runtime_id)?;
        self.remove_handle(runtime_id)?;
        Ok(())
    }

    pub fn handoff_to_terminal(
        &self,
        runtime_id: &str,
        terminal_type: Option<TerminalType>,
    ) -> Result<(), String> {
        let handle = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?
            .get(runtime_id)
            .cloned();

        let record = if let Some(handle) = handle.as_ref() {
            handle
                .record
                .lock()
                .map_err(|_| "Failed to lock native session record".to_string())?
                .clone()
        } else {
            self.records
                .lock()
                .map_err(|_| "Failed to lock native runtime records".to_string())?
                .get(runtime_id)
                .cloned()
                .ok_or_else(|| format!("Native runtime {} not found", runtime_id))?
        };

        let provider_session_id = record
            .provider_session_id
            .clone()
            .ok_or_else(|| "Session id is not ready for terminal handoff yet".to_string())?;
        let terminal = terminal_type.unwrap_or_else(terminal::get_preferred_terminal);

        let env_vars = match record.provider {
            NativeProvider::Claude => resolve_claude_env(&record.env_name)
                .map(|resolved| resolved.env_vars)
                .unwrap_or_default(),
            NativeProvider::Codex => resolve_codex_proxy_env(),
        };

        terminal::launch_in_terminal(
            terminal,
            env_vars,
            &record.project_dir,
            runtime_id,
            &record.env_name,
            Some(record.perm_mode.as_str()),
            Some(provider_session_id.as_str()),
            record.provider.as_str(),
        )?;

        self.update_record(runtime_id, |entry| {
            entry.status = "handoff".to_string();
            entry.is_active = false;
            entry.updated_at = Utc::now();
            entry.can_handoff_to_terminal = true;
        })?;
        self.append_event(
            runtime_id,
            SessionEventPayload::Lifecycle {
                stage: "handoff".to_string(),
                detail: format!(
                    "Opened {} session in {}.",
                    record.provider.as_str(),
                    terminal.display_name()
                ),
            },
        )?;
        self.kill_child(runtime_id)?;
        self.remove_handle(runtime_id)?;
        Ok(())
    }

    fn ensure_handle(
        self: &Arc<Self>,
        app: AppHandle,
        runtime_id: &str,
    ) -> Result<Arc<NativeSessionHandle>, String> {
        if let Some(handle) = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?
            .get(runtime_id)
            .cloned()
        {
            return Ok(handle);
        }

        let record = self
            .records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())?
            .get(runtime_id)
            .cloned()
            .ok_or_else(|| format!("Native runtime {} not found", runtime_id))?;

        let options = build_runtime_bootstrap_options(&record)?;

        let handle = Arc::new(NativeSessionHandle {
            record: Mutex::new(record.clone()),
            child: Mutex::new(None),
            events: Mutex::new(SessionStore::new(runtime_id.to_string())),
            helper_env_vars: options.helper_env_vars.clone(),
            terminal_env_vars: options.terminal_env_vars.clone(),
            claude_path: options.claude_path.clone(),
            codex_path: options.codex_path.clone(),
            codex_base_url: options.codex_base_url.clone(),
            codex_api_key: options.codex_api_key.clone(),
            alive: AtomicBool::new(true),
        });

        self.insert_handle(runtime_id.to_string(), handle.clone())?;
        self.append_event(
            runtime_id,
            SessionEventPayload::Lifecycle {
                stage: "runtime_resume".to_string(),
                detail: "Reconnected native runtime helper.".to_string(),
            },
        )?;
        self.spawn_helper(app, runtime_id, &options, handle.clone())?;
        Ok(handle)
    }

    fn spawn_helper(
        self: &Arc<Self>,
        app: AppHandle,
        runtime_id: &str,
        options: &NativeSessionOptions,
        handle: Arc<NativeSessionHandle>,
    ) -> Result<(), String> {
        let helper_path = native_helper_script_path(&app)?;
        let command = app
            .shell()
            .sidecar("ccem-node")
            .map_err(|error| format!("Failed to resolve Node sidecar: {}", error))?
            .arg(helper_path.to_string_lossy().to_string())
            .current_dir(&options.working_dir);

        let (mut rx, child) = command
            .spawn()
            .map_err(|error| format!("Failed to spawn native runtime sidecar: {}", error))?;

        {
            let mut child_slot = handle
                .child
                .lock()
                .map_err(|_| "Failed to lock native sidecar child".to_string())?;
            *child_slot = Some(child);
        }

        self.write_to_child(
            &handle,
            &HelperInputCommand::Init {
                provider: options.provider.as_str(),
                env_name: &options.env_name,
                perm_mode: &options.perm_mode,
                working_dir: &options.working_dir,
                env_vars: &handle.helper_env_vars,
                initial_prompt: options.initial_prompt.as_deref(),
                provider_session_id: options.provider_session_id.as_deref(),
                claude_path: handle.claude_path.as_deref(),
                codex_path: handle.codex_path.as_deref(),
                codex_base_url: handle.codex_base_url.as_deref(),
                codex_api_key: handle.codex_api_key.as_deref(),
            },
        )?;

        let manager = self.clone();
        let runtime = runtime_id.to_string();
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let text = String::from_utf8_lossy(&line).trim().to_string();
                        if text.is_empty() {
                            continue;
                        }
                        if let Err(error) = manager.process_helper_stdout(&runtime, &text) {
                            let _ = manager.append_event(
                                &runtime,
                                SessionEventPayload::StdErrLine {
                                    line: format!("Failed to process helper output: {}", error),
                                },
                            );
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        let text = String::from_utf8_lossy(&line).trim().to_string();
                        if text.is_empty() {
                            continue;
                        }
                        let _ = manager.append_event(
                            &runtime,
                            SessionEventPayload::StdErrLine { line: text },
                        );
                    }
                    CommandEvent::Error(error) => {
                        let _ = manager.append_event(
                            &runtime,
                            SessionEventPayload::StdErrLine {
                                line: format!("Native sidecar error: {}", error),
                            },
                        );
                        let _ = manager.mark_process_exit(&runtime, Some(1));
                        break;
                    }
                    CommandEvent::Terminated(payload) => {
                        let _ = manager.mark_process_exit(&runtime, payload.code);
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    fn process_helper_stdout(&self, runtime_id: &str, line: &str) -> Result<(), String> {
        let output: HelperOutputEvent = serde_json::from_str(line)
            .map_err(|error| format!("Failed to parse helper event JSON: {}", error))?;

        match output {
            HelperOutputEvent::SessionMeta { provider_session_id } => {
                let provider = self
                    .records
                    .lock()
                    .map_err(|_| "Failed to lock native runtime records".to_string())?
                    .get(runtime_id)
                    .map(|record| record.provider)
                    .ok_or_else(|| format!("Native runtime {} not found", runtime_id))?;

                self.update_record(runtime_id, |record| {
                    record.provider_session_id = Some(provider_session_id.clone());
                    record.can_handoff_to_terminal = true;
                    record.updated_at = Utc::now();
                })?;

                if let Err(error) =
                    bind_source_session_id(provider.as_str(), runtime_id, &provider_session_id)
                {
                    eprintln!(
                        "Failed to bind native runtime {} to provider session {}: {}",
                        runtime_id, provider_session_id, error
                    );
                }

                Ok(())
            }
            HelperOutputEvent::Status { status, detail } => {
                self.update_record(runtime_id, |record| {
                    record.status = status.clone();
                    record.is_active = !matches!(status.as_str(), "stopped" | "error" | "handoff");
                    record.updated_at = Utc::now();
                })?;
                if let Some(detail) = detail.filter(|value| !value.trim().is_empty()) {
                    self.append_event(
                        runtime_id,
                        SessionEventPayload::Lifecycle {
                            stage: status,
                            detail,
                        },
                    )?;
                }
                Ok(())
            }
            HelperOutputEvent::Event { payload } => {
                let payload = serde_json::from_value::<SessionEventPayload>(payload)
                    .map_err(|error| format!("Failed to decode helper payload: {}", error))?;
                self.append_event(runtime_id, payload)
            }
        }
    }

    fn mark_process_exit(&self, runtime_id: &str, exit_code: Option<i32>) -> Result<(), String> {
        let expected_terminal = self
            .records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())?
            .get(runtime_id)
            .map(|record| matches!(record.status.as_str(), "stopped" | "handoff"))
            .unwrap_or(false);

        if !expected_terminal {
            self.update_record(runtime_id, |record| {
                record.status = "error".to_string();
                record.is_active = false;
                record.updated_at = Utc::now();
            })?;
            self.append_event(
                runtime_id,
                SessionEventPayload::SessionCompleted {
                    reason: format!(
                        "Native runtime sidecar exited unexpectedly{}.",
                        exit_code
                            .map(|code| format!(" with code {}", code))
                            .unwrap_or_default()
                    ),
                },
            )?;
        }

        self.remove_handle(runtime_id)
    }

    fn write_to_child(
        &self,
        handle: &Arc<NativeSessionHandle>,
        command: &HelperInputCommand<'_>,
    ) -> Result<(), String> {
        let line = serde_json::to_string(command)
            .map_err(|error| format!("Failed to encode helper command: {}", error))?;
        let mut child_guard = handle
            .child
            .lock()
            .map_err(|_| "Failed to lock native sidecar child".to_string())?;
        let child = child_guard
            .as_mut()
            .ok_or_else(|| "Native sidecar child is not available".to_string())?;
        child
            .write(format!("{}\n", line).as_bytes())
            .map_err(|error| format!("Failed to write to native sidecar stdin: {}", error))
    }

    fn append_event(&self, runtime_id: &str, payload: SessionEventPayload) -> Result<(), String> {
        let handles = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?;
        let Some(handle) = handles.get(runtime_id) else {
            return Ok(());
        };
        let mut store = handle
            .events
            .lock()
            .map_err(|_| "Failed to lock native session store".to_string())?;
        store.append(payload);
        Ok(())
    }

    fn insert_record(&self, record: NativeSessionRecord) -> Result<(), String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())?;
        records.insert(record.runtime_id.clone(), record);
        persist_native_runtime_state(records.values().cloned().collect())
    }

    fn insert_handle(&self, runtime_id: String, handle: Arc<NativeSessionHandle>) -> Result<(), String> {
        self.handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?
            .insert(runtime_id, handle);
        Ok(())
    }

    fn remove_handle(&self, runtime_id: &str) -> Result<(), String> {
        self.handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?
            .remove(runtime_id);
        Ok(())
    }

    fn kill_child(&self, runtime_id: &str) -> Result<(), String> {
        let handles = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?;
        if let Some(handle) = handles.get(runtime_id) {
            handle.alive.store(false, Ordering::SeqCst);
            if let Some(child) = handle
                .child
                .lock()
                .map_err(|_| "Failed to lock native sidecar child".to_string())?
                .take()
            {
                let _ = child.kill();
            }
        }
        Ok(())
    }

    fn update_record<F>(&self, runtime_id: &str, update: F) -> Result<(), String>
    where
        F: FnOnce(&mut NativeSessionRecord),
    {
        let updated_record = {
            let mut records = self
                .records
                .lock()
                .map_err(|_| "Failed to lock native runtime records".to_string())?;
            let record = records
                .get_mut(runtime_id)
                .ok_or_else(|| format!("Native runtime {} not found", runtime_id))?;
            update(record);
            record.clone()
        };

        if let Some(handle) = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?
            .get(runtime_id)
            .cloned()
        {
            if let Ok(mut record) = handle.record.lock() {
                *record = updated_record;
            }
        }

        let records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())?;
        persist_native_runtime_state(records.values().cloned().collect())
    }

    fn has_record(&self, runtime_id: &str) -> Result<bool, String> {
        self.records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())
            .map(|records| records.contains_key(runtime_id))
    }

    fn summary_for(&self, runtime_id: &str) -> Result<NativeSessionSummary, String> {
        if let Some(handle) = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?
            .get(runtime_id)
            .cloned()
        {
            return Ok(handle.summary());
        }

        self.records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())?
            .get(runtime_id)
            .cloned()
            .map(|record| NativeSessionSummary {
                runtime_id: record.runtime_id,
                provider: record.provider,
                transport: record.transport,
                provider_session_id: record.provider_session_id,
                project_dir: record.project_dir,
                env_name: record.env_name,
                perm_mode: record.perm_mode,
                status: record.status,
                created_at: record.created_at,
                updated_at: record.updated_at,
                is_active: record.is_active,
                last_event_seq: None,
                can_handoff_to_terminal: record.can_handoff_to_terminal,
            })
            .ok_or_else(|| format!("Native runtime {} not found", runtime_id))
    }
}

fn generate_runtime_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("native-{}", timestamp)
}

fn native_runtime_state_file_path() -> PathBuf {
    dirs::home_dir()
        .map(|home| home.join(".ccem/native-runtime-state.json"))
        .unwrap_or_else(|| PathBuf::from(".ccem/native-runtime-state.json"))
}

fn read_native_runtime_state_from(path: &Path) -> io::Result<NativeRuntimeState> {
    if !path.exists() {
        return Ok(NativeRuntimeState::default());
    }

    let content = fs::read_to_string(path)?;
    serde_json::from_str::<NativeRuntimeState>(&content)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

fn persist_native_runtime_state(records: Vec<NativeSessionRecord>) -> Result<(), String> {
    let path = native_runtime_state_file_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create native runtime state directory: {}", error))?;
    }

    let state = NativeRuntimeState { sessions: records };
    let serialized = serde_json::to_vec_pretty(&state)
        .map_err(|error| format!("Failed to serialize native runtime state: {}", error))?;
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, serialized)
        .map_err(|error| format!("Failed to write native runtime state: {}", error))?;
    fs::rename(&temp_path, &path)
        .map_err(|error| format!("Failed to finalize native runtime state: {}", error))
}

fn native_helper_script_path(app: &AppHandle) -> Result<PathBuf, String> {
    let manifest_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("native-runtime-helper.mjs");
    if manifest_path.exists() {
        return Ok(manifest_path);
    }

    let resource_path = app
        .path()
        .resolve("native-runtime-helper.mjs", BaseDirectory::Resource)
        .map_err(|error| format!("Failed to resolve helper resource path: {}", error))?;
    if resource_path.exists() {
        return Ok(resource_path);
    }

    Err("Native runtime helper resource was not found".to_string())
}

fn build_runtime_bootstrap_options(record: &NativeSessionRecord) -> Result<NativeSessionOptions, String> {
    let (helper_env_vars, terminal_env_vars, codex_base_url, codex_api_key) = match record.provider {
        NativeProvider::Claude => {
            let resolved = resolve_claude_env(&record.env_name)?;
            (
                resolved.env_vars.clone(),
                resolved.env_vars,
                None,
                None,
            )
        }
        NativeProvider::Codex => {
            resolve_codex_runtime(&record.env_name)?;
            let proxy_env_vars = resolve_codex_proxy_env();
            (
                proxy_env_vars.clone(),
                proxy_env_vars,
                None,
                None,
            )
        }
    };

    Ok(NativeSessionOptions {
        provider: record.provider,
        env_name: record.env_name.clone(),
        perm_mode: record.perm_mode.clone(),
        working_dir: record.project_dir.clone(),
        initial_prompt: None,
        provider_session_id: record.provider_session_id.clone(),
        helper_env_vars,
        terminal_env_vars,
        claude_path: resolve_claude_path(),
        codex_path: resolve_codex_path(),
        codex_base_url,
        codex_api_key,
    })
}
