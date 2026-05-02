use crate::config::{resolve_claude_env, resolve_codex_runtime};
use crate::event_bus::{ReplayBatch, SessionEventPayload, SessionStore};
use crate::native_helper_resource::native_helper_script_path;
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
use tauri::AppHandle;
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NativeSessionOptions {
    pub provider: NativeProvider,
    pub env_name: String,
    pub perm_mode: String,
    pub working_dir: String,
    pub initial_prompt: Option<String>,
    pub initial_images: Option<Vec<PromptImage>>,
    pub provider_session_id: Option<String>,
    pub helper_env_vars: HashMap<String, String>,
    pub terminal_env_vars: HashMap<String, String>,
    pub claude_path: Option<String>,
    pub codex_path: Option<String>,
    pub codex_base_url: Option<String>,
    pub codex_api_key: Option<String>,
    pub effort: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractivePromptAnnotation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptImage {
    pub media_type: String,
    pub base64_data: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
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
        initial_images: Option<&'a [PromptImage]>,
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
        #[serde(skip_serializing_if = "Option::is_none")]
        effort: Option<&'a str>,
    },
    Prompt {
        text: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        images: Option<&'a [PromptImage]>,
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
    UpdateSettings {
        #[serde(skip_serializing_if = "Option::is_none")]
        env_name: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        perm_mode: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        env_vars: Option<&'a HashMap<String, String>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        effort: Option<&'a str>,
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
        let last_event_seq = self.events.lock().ok().and_then(|store| store.newest_seq());
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
            last_error: record.last_error,
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
    state_path: PathBuf,
}

impl Default for NativeRuntimeManager {
    fn default() -> Self {
        let state_path = native_runtime_state_file_path();
        let records = read_native_runtime_state_from(&state_path)
            .unwrap_or_default()
            .sessions
            .into_iter()
            .map(|record| (record.runtime_id.clone(), record))
            .collect();
        Self {
            records: Mutex::new(records),
            handles: Mutex::new(HashMap::new()),
            state_path,
        }
    }
}

impl NativeRuntimeManager {
    pub fn create_session(
        self: &Arc<Self>,
        app: AppHandle,
        options: NativeSessionOptions,
    ) -> Result<NativeSessionSummary, String> {
        let mut options = options;
        merge_helper_env_path(&mut options.helper_env_vars, &terminal::get_user_path());
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
            last_error: None,
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
                        last_error: record.last_error,
                    }
                }
            })
            .collect::<Vec<_>>();

        sessions.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        sessions
    }

    pub fn replay_events(
        &self,
        runtime_id: &str,
        since_seq: Option<u64>,
    ) -> Result<ReplayBatch, String> {
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
        images: Option<&Vec<PromptImage>>,
    ) -> Result<(), String> {
        let text = text.trim();
        let has_images = images.as_ref().is_some_and(|imgs| !imgs.is_empty());
        if text.is_empty() && !has_images {
            return Ok(());
        }

        let handle = self.ensure_handle(app.clone(), runtime_id)?;
        let images_ref = images
            .filter(|imgs| !imgs.is_empty())
            .map(|imgs| imgs.as_slice());
        self.write_to_child(
            &handle,
            &HelperInputCommand::Prompt {
                text,
                images: images_ref,
            },
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

    pub fn update_session_settings(
        self: &Arc<Self>,
        app: &AppHandle,
        runtime_id: &str,
        env_name: Option<&str>,
        perm_mode: Option<&str>,
        env_vars: Option<&HashMap<String, String>>,
        effort: Option<&str>,
    ) -> Result<(), String> {
        let handle = self.ensure_handle(app.clone(), runtime_id)?;
        self.write_to_child(
            &handle,
            &HelperInputCommand::UpdateSettings {
                env_name,
                perm_mode,
                env_vars,
                effort,
            },
        )?;
        self.update_record(runtime_id, |record| {
            if let Some(name) = env_name {
                record.env_name = name.to_string();
            }
            if let Some(mode) = perm_mode {
                record.perm_mode = mode.to_string();
            }
            record.updated_at = Utc::now();
        })?;
        Ok(())
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
                initial_images: options.initial_images.as_deref(),
                provider_session_id: options.provider_session_id.as_deref(),
                claude_path: handle.claude_path.as_deref(),
                codex_path: handle.codex_path.as_deref(),
                codex_base_url: handle.codex_base_url.as_deref(),
                codex_api_key: handle.codex_api_key.as_deref(),
                effort: options.effort.as_deref(),
            },
        )?;

        let manager = self.clone();
        let runtime = runtime_id.to_string();
        tauri::async_runtime::spawn(async move {
            let mut stdout_buffer = Vec::new();
            let mut stderr_buffer = Vec::new();
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        for text in drain_helper_output_lines(&mut stdout_buffer, &line) {
                            if let Err(error) = manager.process_helper_stdout(&runtime, &text) {
                                let _ = manager.append_event(
                                    &runtime,
                                    SessionEventPayload::StdErrLine {
                                        line: format!("Failed to process helper output: {}", error),
                                    },
                                );
                            }
                        }
                    }
                    CommandEvent::Stderr(line) => {
                        for text in drain_helper_output_lines(&mut stderr_buffer, &line) {
                            let _ = manager.append_event(
                                &runtime,
                                SessionEventPayload::StdErrLine { line: text },
                            );
                        }
                    }
                    CommandEvent::Error(error) => {
                        manager.flush_helper_output_buffers(
                            &runtime,
                            &mut stdout_buffer,
                            &mut stderr_buffer,
                        );
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
                        manager.flush_helper_output_buffers(
                            &runtime,
                            &mut stdout_buffer,
                            &mut stderr_buffer,
                        );
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
        let mut processed = false;
        for entry in line
            .lines()
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
        {
            processed = true;
            self.process_helper_stdout_line(runtime_id, entry)?;
        }
        if !processed {
            return Ok(());
        }
        Ok(())
    }

    fn process_helper_stdout_line(&self, runtime_id: &str, line: &str) -> Result<(), String> {
        let output: HelperOutputEvent = serde_json::from_str(line)
            .map_err(|error| format!("Failed to parse helper event JSON: {}", error))?;

        match output {
            HelperOutputEvent::SessionMeta {
                provider_session_id,
            } => {
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
                let normalized_detail = detail
                    .as_ref()
                    .map(|value| value.trim().to_string())
                    .filter(|value| !value.is_empty());
                let mut applied = false;
                self.update_record(runtime_id, |record| {
                    if record.status == "error"
                        && !matches!(status.as_str(), "error" | "stopped" | "handoff")
                    {
                        return;
                    }
                    applied = true;
                    record.status = status.clone();
                    record.is_active = !matches!(status.as_str(), "stopped" | "error" | "handoff");
                    record.updated_at = Utc::now();
                    if status == "error" {
                        record.last_error = normalized_detail.clone().or_else(|| {
                            Some("Native runtime helper reported an error.".to_string())
                        });
                    } else if matches!(status.as_str(), "ready" | "processing" | "initializing") {
                        record.last_error = None;
                    }
                })?;
                if !applied {
                    return Ok(());
                }
                if let Some(detail) = normalized_detail {
                    self.append_event(
                        runtime_id,
                        SessionEventPayload::Lifecycle {
                            stage: status.clone(),
                            detail,
                        },
                    )?;
                }
                if status == "error" {
                    let _ = self.kill_child(runtime_id);
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
            .map(|record| matches!(record.status.as_str(), "stopped" | "handoff" | "error"))
            .unwrap_or(false);

        if !expected_terminal {
            let exit_reason = format!(
                "Native runtime sidecar exited unexpectedly{}.",
                exit_code
                    .map(|code| format!(" with code {}", code))
                    .unwrap_or_default()
            );
            self.update_record(runtime_id, |record| {
                record.status = "error".to_string();
                record.is_active = false;
                record.updated_at = Utc::now();
                if record.last_error.is_none() {
                    record.last_error = Some(exit_reason.clone());
                }
            })?;
            self.append_event(
                runtime_id,
                SessionEventPayload::SessionCompleted {
                    reason: exit_reason,
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
        let last_error = payload_last_error(&payload);
        let handles = self
            .handles
            .lock()
            .map_err(|_| "Failed to lock native runtime handles".to_string())?;
        let Some(handle) = handles.get(runtime_id) else {
            return Ok(());
        };
        {
            let mut store = handle
                .events
                .lock()
                .map_err(|_| "Failed to lock native session store".to_string())?;
            store.append(payload);
        }
        drop(handles);
        if let Some(message) = last_error {
            self.set_last_error(runtime_id, message)?;
        }
        Ok(())
    }

    fn insert_record(&self, record: NativeSessionRecord) -> Result<(), String> {
        let mut records = self
            .records
            .lock()
            .map_err(|_| "Failed to lock native runtime records".to_string())?;
        records.insert(record.runtime_id.clone(), record);
        persist_native_runtime_state_to(&self.state_path, records.values().cloned().collect())
    }

    fn insert_handle(
        &self,
        runtime_id: String,
        handle: Arc<NativeSessionHandle>,
    ) -> Result<(), String> {
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
        persist_native_runtime_state_to(&self.state_path, records.values().cloned().collect())
    }

    fn set_last_error(&self, runtime_id: &str, message: String) -> Result<(), String> {
        self.update_record(runtime_id, |record| {
            record.last_error = Some(message);
            record.updated_at = Utc::now();
        })
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
                last_error: record.last_error,
            })
            .ok_or_else(|| format!("Native runtime {} not found", runtime_id))
    }

    fn flush_helper_output_buffers(
        &self,
        runtime_id: &str,
        stdout_buffer: &mut Vec<u8>,
        stderr_buffer: &mut Vec<u8>,
    ) {
        if let Some(text) = take_remaining_helper_output_line(stdout_buffer) {
            if let Err(error) = self.process_helper_stdout(runtime_id, &text) {
                let _ = self.append_event(
                    runtime_id,
                    SessionEventPayload::StdErrLine {
                        line: format!("Failed to process helper output: {}", error),
                    },
                );
            }
        }
        if let Some(text) = take_remaining_helper_output_line(stderr_buffer) {
            let _ = self.append_event(runtime_id, SessionEventPayload::StdErrLine { line: text });
        }
    }
}

fn trim_helper_output_line(bytes: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(bytes)
        .trim_matches(['\r', '\n'])
        .trim()
        .to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn drain_helper_output_lines(buffer: &mut Vec<u8>, chunk: &[u8]) -> Vec<String> {
    buffer.extend_from_slice(chunk);
    let mut lines = Vec::new();
    while let Some(index) = buffer.iter().position(|byte| *byte == b'\n') {
        let line = buffer.drain(..=index).collect::<Vec<_>>();
        if let Some(text) = trim_helper_output_line(&line) {
            lines.push(text);
        }
    }
    lines
}

fn take_remaining_helper_output_line(buffer: &mut Vec<u8>) -> Option<String> {
    if buffer.is_empty() {
        return None;
    }
    let line = std::mem::take(buffer);
    trim_helper_output_line(&line)
}

fn payload_last_error(payload: &SessionEventPayload) -> Option<String> {
    match payload {
        SessionEventPayload::StdErrLine { line } => non_empty_error(line),
        SessionEventPayload::Lifecycle { stage, detail } if stage == "error" => {
            non_empty_error(detail)
        }
        SessionEventPayload::SessionCompleted { reason }
            if !reason.contains("Stopped from desktop workspace") =>
        {
            non_empty_error(reason)
        }
        _ => None,
    }
}

fn merge_colon_path_values(primary: &str, secondary: &str) -> String {
    let mut parts = Vec::new();
    for value in [primary, secondary] {
        for part in value
            .split(':')
            .map(str::trim)
            .filter(|part| !part.is_empty())
        {
            if !parts.iter().any(|existing| existing == part) {
                parts.push(part.to_string());
            }
        }
    }
    parts.join(":")
}

fn merge_helper_env_path(env_vars: &mut HashMap<String, String>, user_path: &str) {
    let user_path = user_path.trim();
    if user_path.is_empty() {
        return;
    }

    let merged = env_vars
        .get("PATH")
        .map(|existing| merge_colon_path_values(user_path, existing))
        .unwrap_or_else(|| user_path.to_string());
    env_vars.insert("PATH".to_string(), merged);
}

fn non_empty_error(message: &str) -> Option<String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
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

fn persist_native_runtime_state_to(
    path: &Path,
    records: Vec<NativeSessionRecord>,
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!("Failed to create native runtime state directory: {}", error)
        })?;
    }

    let state = NativeRuntimeState { sessions: records };
    let serialized = serde_json::to_vec_pretty(&state)
        .map_err(|error| format!("Failed to serialize native runtime state: {}", error))?;
    let temp_path = path.with_extension("json.tmp");
    fs::write(&temp_path, serialized)
        .map_err(|error| format!("Failed to write native runtime state: {}", error))?;
    fs::rename(&temp_path, path)
        .map_err(|error| format!("Failed to finalize native runtime state: {}", error))
}

fn build_runtime_bootstrap_options(
    record: &NativeSessionRecord,
) -> Result<NativeSessionOptions, String> {
    let (mut helper_env_vars, terminal_env_vars, codex_base_url, codex_api_key) =
        match record.provider {
            NativeProvider::Claude => {
                let resolved = resolve_claude_env(&record.env_name)?;
                (resolved.env_vars.clone(), resolved.env_vars, None, None)
            }
            NativeProvider::Codex => {
                resolve_codex_runtime(&record.env_name)?;
                let proxy_env_vars = resolve_codex_proxy_env();
                (proxy_env_vars.clone(), proxy_env_vars, None, None)
            }
        };
    merge_helper_env_path(&mut helper_env_vars, &terminal::get_user_path());

    Ok(NativeSessionOptions {
        provider: record.provider,
        env_name: record.env_name.clone(),
        perm_mode: record.perm_mode.clone(),
        working_dir: record.project_dir.clone(),
        initial_prompt: None,
        initial_images: None,
        provider_session_id: record.provider_session_id.clone(),
        helper_env_vars,
        terminal_env_vars,
        claude_path: resolve_claude_path(),
        codex_path: resolve_codex_path(),
        codex_base_url,
        codex_api_key,
        effort: None,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        drain_helper_output_lines, merge_helper_env_path, HelperInputCommand, NativeProvider,
        NativeRuntimeManager, NativeSessionHandle, NativeSessionRecord, NativeTransport,
        PromptImage,
    };
    use crate::event_bus::{SessionEventPayload, SessionStore};
    use chrono::Utc;
    use std::collections::HashMap;
    use std::sync::atomic::AtomicBool;
    use std::sync::{Arc, Mutex};

    fn manager_with_handle(runtime_id: &str) -> NativeRuntimeManager {
        let record = NativeSessionRecord {
            runtime_id: runtime_id.to_string(),
            provider: NativeProvider::Claude,
            transport: NativeTransport::NativeSdk,
            provider_session_id: None,
            project_dir: "/tmp/project".to_string(),
            env_name: "DeepSeek".to_string(),
            perm_mode: "dev".to_string(),
            status: "processing".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_active: true,
            can_handoff_to_terminal: false,
            last_error: None,
        };
        let handle = NativeSessionHandle {
            record: Mutex::new(record.clone()),
            child: Mutex::new(None),
            events: Mutex::new(SessionStore::new(runtime_id)),
            helper_env_vars: HashMap::new(),
            terminal_env_vars: HashMap::new(),
            claude_path: None,
            codex_path: None,
            codex_base_url: None,
            codex_api_key: None,
            alive: AtomicBool::new(true),
        };
        let manager = NativeRuntimeManager {
            records: Mutex::new(HashMap::from([(runtime_id.to_string(), record)])),
            handles: Mutex::new(HashMap::from([(runtime_id.to_string(), Arc::new(handle))])),
            state_path: std::env::temp_dir()
                .join(format!("ccem-native-runtime-test-{runtime_id}.json")),
        };
        manager
    }

    #[test]
    fn helper_stdout_accepts_multiple_jsonl_events_in_one_chunk() {
        let runtime_id = "native-jsonl";
        let manager = manager_with_handle(runtime_id);
        let chunk = concat!(
            r#"{"type":"event","payload":{"type":"stderr_line","line":"first error"}}"#,
            "\n",
            r#"{"type":"event","payload":{"type":"session_completed","reason":"done"}}"#,
            "\n",
        );

        manager
            .process_helper_stdout(runtime_id, chunk)
            .expect("process jsonl chunk");

        let batch = manager
            .replay_events(runtime_id, None)
            .expect("replay events");

        assert_eq!(batch.events.len(), 2);
        assert_eq!(
            batch.events[0].payload,
            SessionEventPayload::StdErrLine {
                line: "first error".to_string(),
            }
        );
        assert_eq!(
            batch.events[1].payload,
            SessionEventPayload::SessionCompleted {
                reason: "done".to_string(),
            }
        );
    }

    #[test]
    fn helper_output_buffers_partial_json_until_newline() {
        let mut buffer = Vec::new();
        let first = drain_helper_output_lines(&mut buffer, br#"{"type":"status","status":"ready""#);
        assert!(first.is_empty());

        let second = drain_helper_output_lines(
            &mut buffer,
            br#","detail":"ok"}
{"type":"status","status":"processing","detail":"go"}
"#,
        );

        assert_eq!(
            second,
            vec![
                r#"{"type":"status","status":"ready","detail":"ok"}"#.to_string(),
                r#"{"type":"status","status":"processing","detail":"go"}"#.to_string(),
            ]
        );
    }

    #[test]
    fn helper_init_serializes_initial_images_for_first_turn() {
        let env_vars = HashMap::new();
        let images = vec![PromptImage {
            media_type: "image/png".to_string(),
            base64_data: "iVBORw0KGgo=".to_string(),
            placeholder: Some("[Image #1]".to_string()),
        }];

        let command = HelperInputCommand::Init {
            provider: "claude",
            env_name: "default",
            perm_mode: "dev",
            working_dir: "/tmp/project",
            env_vars: &env_vars,
            initial_prompt: Some("describe this"),
            initial_images: Some(images.as_slice()),
            provider_session_id: None,
            claude_path: None,
            codex_path: None,
            codex_base_url: None,
            codex_api_key: None,
            effort: None,
        };

        let serialized = serde_json::to_value(command).expect("serialize init command");
        assert_eq!(serialized["initial_prompt"], "describe this");
        assert_eq!(serialized["initial_images"][0]["mediaType"], "image/png");
        assert_eq!(
            serialized["initial_images"][0]["base64Data"],
            "iVBORw0KGgo="
        );
        assert_eq!(serialized["initial_images"][0]["placeholder"], "[Image #1]");
    }

    #[test]
    fn status_error_keeps_last_error_when_late_processing_arrives() {
        let runtime_id = "native-status-error";
        let manager = manager_with_handle(runtime_id);

        manager
            .process_helper_stdout(
                runtime_id,
                r#"{"type":"status","status":"error","detail":"Native CLI binary not found"}"#,
            )
            .expect("process error status");
        manager
            .process_helper_stdout(
                runtime_id,
                r#"{"type":"status","status":"processing","detail":"Claude is processing a turn."}"#,
            )
            .expect("ignore late processing");

        let summary = manager.summary_for(runtime_id).expect("summary");
        assert_eq!(summary.status, "error");
        assert!(!summary.is_active);
        assert_eq!(
            summary.last_error.as_deref(),
            Some("Native CLI binary not found")
        );
    }

    #[test]
    fn helper_env_path_preserves_api_vars_and_adds_user_path() {
        let mut env_vars = HashMap::from([(
            "ANTHROPIC_AUTH_TOKEN".to_string(),
            "secret-token".to_string(),
        )]);

        merge_helper_env_path(
            &mut env_vars,
            "/Users/test/.nvm/versions/node/v22/bin:/usr/bin",
        );

        assert_eq!(
            env_vars.get("ANTHROPIC_AUTH_TOKEN").map(String::as_str),
            Some("secret-token")
        );
        assert_eq!(
            env_vars.get("PATH").map(String::as_str),
            Some("/Users/test/.nvm/versions/node/v22/bin:/usr/bin")
        );
    }

    #[test]
    fn helper_env_path_prepends_user_path_to_existing_path() {
        let mut env_vars = HashMap::from([("PATH".to_string(), "/custom/bin".to_string())]);

        merge_helper_env_path(
            &mut env_vars,
            "/Users/test/.nvm/versions/node/v22/bin:/usr/bin",
        );

        assert_eq!(
            env_vars.get("PATH").map(String::as_str),
            Some("/Users/test/.nvm/versions/node/v22/bin:/usr/bin:/custom/bin")
        );
    }
}
