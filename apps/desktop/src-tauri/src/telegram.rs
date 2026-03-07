use crate::config;
use crate::cron;
use crate::crypto;
use crate::event_bus::{ReplayBatch, SessionEventPayload};
use crate::runtime::{HeadlessRuntimeManager, HeadlessSessionOptions, HeadlessSessionSource};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::AppHandle;

const TELEGRAM_API_BASE: &str = "https://api.telegram.org";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TelegramTopicBinding {
    #[serde(rename = "threadId", alias = "thread_id")]
    pub thread_id: i64,
    #[serde(rename = "projectDir", alias = "project_dir")]
    pub project_dir: String,
    #[serde(
        rename = "preferredEnv",
        alias = "preferred_env",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub preferred_env: Option<String>,
    #[serde(
        rename = "preferredPermMode",
        alias = "preferred_perm_mode",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub preferred_perm_mode: Option<String>,
    #[serde(
        rename = "activeRuntimeId",
        alias = "active_runtime_id",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub active_runtime_id: Option<String>,
    #[serde(
        rename = "lastClaudeSessionId",
        alias = "last_claude_session_id",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub last_claude_session_id: Option<String>,
    #[serde(rename = "createdAt", alias = "created_at")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TelegramBridgePreferences {
    #[serde(rename = "showToolCalls", alias = "show_tool_calls", default)]
    pub show_tool_calls: bool,
    #[serde(rename = "showLowRiskTools", alias = "show_low_risk_tools", default)]
    pub show_low_risk_tools: bool,
    #[serde(
        rename = "flushIntervalMs",
        alias = "flush_interval_ms",
        default = "default_flush_interval_ms"
    )]
    pub flush_interval_ms: u64,
}

impl Default for TelegramBridgePreferences {
    fn default() -> Self {
        Self {
            show_tool_calls: true,
            show_low_risk_tools: false,
            flush_interval_ms: default_flush_interval_ms(),
        }
    }
}

fn default_flush_interval_ms() -> u64 {
    3000
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TelegramSettings {
    #[serde(default)]
    pub enabled: bool,
    #[serde(rename = "botToken", default)]
    pub bot_token: Option<String>,
    #[serde(rename = "allowedChatId", default)]
    pub allowed_chat_id: Option<i64>,
    #[serde(rename = "notificationsThreadId", default)]
    pub notifications_thread_id: Option<i64>,
    #[serde(rename = "defaultEnvName", default)]
    pub default_env_name: Option<String>,
    #[serde(rename = "defaultPermMode", default)]
    pub default_perm_mode: Option<String>,
    #[serde(rename = "defaultWorkingDir", default)]
    pub default_working_dir: Option<String>,
    #[serde(rename = "topicBindings", alias = "topic_bindings", default)]
    pub topic_bindings: Vec<TelegramTopicBinding>,
    #[serde(default)]
    pub preferences: TelegramBridgePreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TelegramBridgeStatus {
    pub configured: bool,
    pub running: bool,
    #[serde(rename = "botUsername")]
    pub bot_username: Option<String>,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
    #[serde(rename = "allowedChatId")]
    pub allowed_chat_id: Option<i64>,
}

#[derive(Debug, Clone, Default)]
struct TelegramBridgeState {
    configured: bool,
    running: bool,
    bot_username: Option<String>,
    last_error: Option<String>,
    allowed_chat_id: Option<i64>,
    next_update_id: Option<i64>,
    active_runtime_by_scope: HashMap<String, String>,
}

pub struct TelegramBridgeManager {
    state: Mutex<TelegramBridgeState>,
    stop_flag: AtomicBool,
}

impl Default for TelegramBridgeManager {
    fn default() -> Self {
        Self {
            state: Mutex::new(TelegramBridgeState::default()),
            stop_flag: AtomicBool::new(false),
        }
    }
}

impl TelegramBridgeManager {
    pub fn status(&self) -> TelegramBridgeStatus {
        let state = self
            .state
            .lock()
            .map(|state| state.clone())
            .unwrap_or_default();
        TelegramBridgeStatus {
            configured: state.configured,
            running: state.running,
            bot_username: state.bot_username,
            last_error: state.last_error,
            allowed_chat_id: state.allowed_chat_id,
        }
    }

    pub fn start(
        self: &Arc<Self>,
        app: AppHandle,
        runtime_manager: Arc<HeadlessRuntimeManager>,
    ) -> Result<TelegramBridgeStatus, String> {
        let settings = read_telegram_settings()?;
        let token = settings
            .bot_token
            .clone()
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| "Telegram bot token is not configured".to_string())?;
        let me = get_me(&token)?;

        {
            let mut state = self
                .state
                .lock()
                .map_err(|_| "Failed to lock Telegram bridge state".to_string())?;
            if state.running {
                return Ok(TelegramBridgeStatus {
                    configured: true,
                    running: true,
                    bot_username: state.bot_username.clone(),
                    last_error: state.last_error.clone(),
                    allowed_chat_id: settings.allowed_chat_id,
                });
            }

            self.stop_flag.store(false, Ordering::SeqCst);
            state.configured = true;
            state.running = true;
            state.bot_username = me.username.clone();
            state.last_error = None;
            state.allowed_chat_id = settings.allowed_chat_id;
        }

        let manager = Arc::clone(self);
        thread::spawn(move || {
            run_bridge_loop(manager, app, runtime_manager, token, settings, me.username);
        });

        Ok(self.status())
    }

    pub fn stop(&self) -> TelegramBridgeStatus {
        self.stop_flag.store(true, Ordering::SeqCst);
        if let Ok(mut state) = self.state.lock() {
            state.running = false;
            state.active_runtime_by_scope.clear();
        }
        self.status()
    }

    pub fn sync_settings(&self, settings: &TelegramSettings) {
        if let Ok(mut state) = self.state.lock() {
            state.configured = settings
                .bot_token
                .as_ref()
                .map(|value| !value.trim().is_empty())
                .unwrap_or(false);
            state.allowed_chat_id = settings.allowed_chat_id;
            if !settings.enabled {
                state.running = false;
            }
        }
    }

    fn set_last_error(&self, message: impl Into<String>) {
        if let Ok(mut state) = self.state.lock() {
            state.last_error = Some(message.into());
            state.running = false;
        }
    }

    fn clear_last_error(&self) {
        if let Ok(mut state) = self.state.lock() {
            state.last_error = None;
        }
    }

    fn remember_runtime_for_scope(&self, chat_id: i64, thread_id: Option<i64>, runtime_id: String) {
        if let Ok(mut state) = self.state.lock() {
            state
                .active_runtime_by_scope
                .insert(scope_key(chat_id, thread_id), runtime_id);
        }
    }

    fn active_runtime_for_scope(&self, chat_id: i64, thread_id: Option<i64>) -> Option<String> {
        self.state.lock().ok().and_then(|state| {
            state
                .active_runtime_by_scope
                .get(&scope_key(chat_id, thread_id))
                .cloned()
        })
    }

    fn clear_runtime_for_scope(&self, chat_id: i64, thread_id: Option<i64>, runtime_id: &str) {
        if let Ok(mut state) = self.state.lock() {
            if state
                .active_runtime_by_scope
                .get(&scope_key(chat_id, thread_id))
                .is_some_and(|value| value == runtime_id)
            {
                state
                    .active_runtime_by_scope
                    .remove(&scope_key(chat_id, thread_id));
            }
        }
    }

    fn next_update_id(&self) -> Option<i64> {
        self.state
            .lock()
            .ok()
            .and_then(|state| state.next_update_id)
    }

    fn advance_update_id(&self, update_id: i64) {
        if let Ok(mut state) = self.state.lock() {
            state.next_update_id = Some(update_id + 1);
        }
    }
}

#[derive(Debug, Deserialize)]
struct TelegramApiResponse<T> {
    ok: bool,
    result: T,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TelegramUser {
    username: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TelegramUpdate {
    update_id: i64,
    message: Option<TelegramMessage>,
}

#[derive(Debug, Deserialize)]
struct TelegramMessage {
    chat: TelegramChat,
    text: Option<String>,
    #[serde(default)]
    message_thread_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct TelegramChat {
    id: i64,
}

pub fn telegram_settings_path() -> PathBuf {
    config::get_ccem_dir().join("telegram.json")
}

pub fn read_telegram_settings() -> Result<TelegramSettings, String> {
    let path = telegram_settings_path();
    if !path.exists() {
        return Ok(TelegramSettings::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read telegram settings: {}", error))?;
    let mut settings: TelegramSettings = serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse telegram settings: {}", error))?;
    settings.bot_token = settings
        .bot_token
        .map(|token| crypto::decrypt(&token).unwrap_or(token));
    Ok(settings)
}

pub fn write_telegram_settings(settings: &TelegramSettings) -> Result<(), String> {
    config::ensure_ccem_dir().map_err(|error| format!("Failed to create config dir: {}", error))?;
    let mut persisted = settings.clone();
    persisted.bot_token = persisted
        .bot_token
        .as_ref()
        .filter(|value| !value.trim().is_empty())
        .map(|value| crypto::encrypt(value));
    let content = serde_json::to_string_pretty(&persisted)
        .map_err(|error| format!("Failed to serialize telegram settings: {}", error))?;
    fs::write(telegram_settings_path(), content)
        .map_err(|error| format!("Failed to write telegram settings: {}", error))
}

pub fn send_configured_message(text: &str) -> Result<bool, String> {
    let settings = read_telegram_settings()?;
    if !settings.enabled {
        return Ok(false);
    }

    let token = match settings
        .bot_token
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        Some(token) => token.to_string(),
        None => return Ok(false),
    };
    let chat_id = match settings.allowed_chat_id {
        Some(chat_id) => chat_id,
        None => return Ok(false),
    };

    send_message(&token, chat_id, settings.notifications_thread_id, text)?;
    Ok(true)
}

fn scope_key(chat_id: i64, thread_id: Option<i64>) -> String {
    format!("{}:{}", chat_id, thread_id.unwrap_or(0))
}

fn find_topic_binding<'a>(
    settings: &'a TelegramSettings,
    thread_id: Option<i64>,
) -> Option<&'a TelegramTopicBinding> {
    let thread_id = thread_id?;
    settings
        .topic_bindings
        .iter()
        .find(|binding| binding.thread_id == thread_id)
}

fn upsert_topic_binding(settings: &mut TelegramSettings, binding: TelegramTopicBinding) {
    if let Some(existing) = settings
        .topic_bindings
        .iter_mut()
        .find(|existing| existing.thread_id == binding.thread_id)
    {
        *existing = binding;
    } else {
        settings.topic_bindings.push(binding);
        settings
            .topic_bindings
            .sort_by(|left, right| left.thread_id.cmp(&right.thread_id));
    }
}

fn remove_topic_binding(settings: &mut TelegramSettings, thread_id: i64) -> bool {
    let before = settings.topic_bindings.len();
    settings
        .topic_bindings
        .retain(|binding| binding.thread_id != thread_id);
    before != settings.topic_bindings.len()
}

fn with_telegram_settings_mut<T>(
    update: impl FnOnce(&mut TelegramSettings) -> T,
) -> Result<T, String> {
    let mut settings = read_telegram_settings()?;
    let result = update(&mut settings);
    write_telegram_settings(&settings)?;
    Ok(result)
}

fn sync_topic_binding_runtime(
    thread_id: i64,
    active_runtime_id: Option<Option<String>>,
    last_claude_session_id: Option<Option<String>>,
) -> Result<(), String> {
    with_telegram_settings_mut(|settings| {
        if let Some(binding) = settings
            .topic_bindings
            .iter_mut()
            .find(|binding| binding.thread_id == thread_id)
        {
            if let Some(active_runtime_id) = active_runtime_id {
                binding.active_runtime_id = active_runtime_id;
            }
            if let Some(last_claude_session_id) = last_claude_session_id {
                binding.last_claude_session_id = last_claude_session_id;
            }
        }
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct BindCommand {
    project_dir: String,
    preferred_env: Option<String>,
    preferred_perm_mode: Option<String>,
}

fn parse_bind_command(text: &str) -> Result<BindCommand, String> {
    let args = text
        .strip_prefix("/bind")
        .map(str::trim)
        .unwrap_or_default();
    if args.is_empty() {
        return Err("Usage: /bind <project_dir> [env=<name>] [perm=<mode>]".to_string());
    }

    let mut project_parts = Vec::new();
    let mut preferred_env = None;
    let mut preferred_perm_mode = None;

    for token in args.split_whitespace() {
        if let Some(value) = token.strip_prefix("env=") {
            preferred_env = (!value.trim().is_empty()).then(|| value.trim().to_string());
            continue;
        }

        if let Some(value) = token.strip_prefix("perm=") {
            preferred_perm_mode = (!value.trim().is_empty()).then(|| value.trim().to_string());
            continue;
        }

        project_parts.push(token);
    }

    let project_dir = project_parts.join(" ").trim().to_string();
    if project_dir.is_empty() {
        return Err("Topic binding requires a project directory".to_string());
    }

    Ok(BindCommand {
        project_dir,
        preferred_env,
        preferred_perm_mode,
    })
}

fn format_topic_binding(binding: &TelegramTopicBinding) -> String {
    let mut lines = vec![
        format!("Thread: {}", binding.thread_id),
        format!("Project: {}", binding.project_dir),
    ];

    if let Some(env) = binding.preferred_env.as_ref() {
        lines.push(format!("Env: {}", env));
    }
    if let Some(perm) = binding.preferred_perm_mode.as_ref() {
        lines.push(format!("Permission: {}", perm));
    }
    if let Some(runtime_id) = binding.active_runtime_id.as_ref() {
        lines.push(format!("Active runtime: {}", runtime_id));
    }
    if let Some(session_id) = binding.last_claude_session_id.as_ref() {
        lines.push(format!("Last Claude session: {}", session_id));
    }

    lines.join("\n")
}

fn format_topic_bindings_message(settings: &TelegramSettings) -> String {
    if settings.topic_bindings.is_empty() {
        return "No Telegram topic bindings configured yet.".to_string();
    }

    settings
        .topic_bindings
        .iter()
        .take(20)
        .map(|binding| {
            let env = binding.preferred_env.as_deref().unwrap_or("current-env");
            let perm = binding
                .preferred_perm_mode
                .as_deref()
                .unwrap_or("app-default");
            format!(
                "#{} · {} · {} · {}",
                binding.thread_id, binding.project_dir, env, perm
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn run_bridge_loop(
    manager: Arc<TelegramBridgeManager>,
    app: AppHandle,
    runtime_manager: Arc<HeadlessRuntimeManager>,
    token: String,
    settings: TelegramSettings,
    username: Option<String>,
) {
    while !manager.stop_flag.load(Ordering::SeqCst) {
        match get_updates(&token, manager.next_update_id()) {
            Ok(updates) => {
                manager.clear_last_error();
                for update in updates {
                    manager.advance_update_id(update.update_id);
                    if let Some(message) = update.message {
                        let effective_settings =
                            read_telegram_settings().unwrap_or_else(|_| settings.clone());
                        if let Err(error) = handle_message(
                            &manager,
                            &app,
                            &runtime_manager,
                            &token,
                            &effective_settings,
                            username.as_deref(),
                            message,
                        ) {
                            manager.set_last_error(error);
                        }
                    }
                }
            }
            Err(error) => {
                manager.set_last_error(error);
                thread::sleep(Duration::from_secs(5));
            }
        }
    }
}

fn handle_message(
    manager: &Arc<TelegramBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    token: &str,
    settings: &TelegramSettings,
    bot_username: Option<&str>,
    message: TelegramMessage,
) -> Result<(), String> {
    let chat_id = message.chat.id;
    if let Some(allowed_chat_id) = settings.allowed_chat_id {
        if allowed_chat_id != chat_id {
            return Ok(());
        }
    }

    let raw_text = match message.text.as_deref().map(str::trim) {
        Some(text) if !text.is_empty() => text,
        _ => return Ok(()),
    };
    let text = normalize_command_text(raw_text, bot_username);
    let thread_id = message.message_thread_id;
    let topic_binding = find_topic_binding(settings, thread_id).cloned();

    if text == "/start" || text == "/help" {
        send_message(
            token,
            chat_id,
            thread_id,
            "CCEM Telegram bridge is running.\nCommands:\n/help\n/sessions\n/new <prompt>\n/resume [prompt]\n/stop [runtime_id]\n/topics\n/topic\n/topic clear\n/bind <project_dir> [env=<name>] [perm=<mode>]\n/cron list\n/cron toggle <task>\n/cron run <task>\nPlain text in a bound topic will continue or start that topic's project console.",
        )?;
        return Ok(());
    }

    if text == "/cron" || text == "/cron help" {
        send_message(
            token,
            chat_id,
            thread_id,
            "Cron commands:\n/cron list\n/cron toggle <task id or prefix>\n/cron run <task id or prefix>",
        )?;
        return Ok(());
    }

    if text == "/cron list" {
        let tasks = cron::list_cron_tasks()?;
        send_message(token, chat_id, thread_id, &format_cron_list_message(&tasks))?;
        return Ok(());
    }

    if let Some(selector) = text.strip_prefix("/cron toggle ").map(str::trim) {
        let task = resolve_cron_task(selector)?;
        let toggled = cron::toggle_cron_task(task.id.clone())?;
        send_message(
            token,
            chat_id,
            thread_id,
            &format!(
                "Cron task {} is now {}.",
                toggled.name,
                if toggled.enabled {
                    "enabled"
                } else {
                    "disabled"
                }
            ),
        )?;
        return Ok(());
    }

    if let Some(selector) = text.strip_prefix("/cron run ").map(str::trim) {
        let task = resolve_cron_task(selector)?;
        cron::run_cron_task_now(app.clone(), Arc::clone(runtime_manager), &task.id)?;
        send_message(
            token,
            chat_id,
            thread_id,
            &format!(
                "Running cron task {} now.\nResults will be sent to the configured Telegram notification target.",
                task.name
            ),
        )?;
        return Ok(());
    }

    if text == "/sessions" {
        let sessions = runtime_manager.list_sessions();
        let body = if sessions.is_empty() {
            "No active headless sessions.".to_string()
        } else {
            sessions
                .into_iter()
                .take(12)
                .map(|session| {
                    format!(
                        "{} · {} · {}",
                        session.runtime_id, session.status, session.project_dir
                    )
                })
                .collect::<Vec<_>>()
                .join("\n")
        };
        send_message(token, chat_id, thread_id, &body)?;
        return Ok(());
    }

    if text == "/topics" {
        send_message(
            token,
            chat_id,
            thread_id,
            &format_topic_bindings_message(settings),
        )?;
        return Ok(());
    }

    if text == "/topic" {
        let message = match topic_binding.as_ref() {
            Some(binding) => format_topic_binding(binding),
            None if thread_id.is_some() => {
                "This topic is not bound yet. Use /bind <project_dir> [env=<name>] [perm=<mode>] to attach it to a project."
                    .to_string()
            }
            None => "Send this command inside a Telegram forum topic to inspect its binding."
                .to_string(),
        };
        send_message(token, chat_id, thread_id, &message)?;
        return Ok(());
    }

    if text == "/topic clear" {
        let Some(thread_id) = thread_id else {
            send_message(
                token,
                chat_id,
                thread_id,
                "Topic bindings only work inside Telegram forum topics.",
            )?;
            return Ok(());
        };

        let removed =
            with_telegram_settings_mut(|settings| remove_topic_binding(settings, thread_id))?;
        let message = if removed {
            "Removed the topic binding for this thread."
        } else {
            "This topic does not have a saved binding."
        };
        send_message(token, chat_id, Some(thread_id), message)?;
        return Ok(());
    }

    if text.starts_with("/bind") {
        let Some(thread_id) = thread_id else {
            send_message(
                token,
                chat_id,
                thread_id,
                "Use /bind from inside a Telegram forum topic so CCEM can map the thread to a project.",
            )?;
            return Ok(());
        };

        let bind = parse_bind_command(&text)?;
        let binding = with_telegram_settings_mut(|settings| {
            let existing = settings
                .topic_bindings
                .iter()
                .find(|binding| binding.thread_id == thread_id)
                .cloned();
            let binding = TelegramTopicBinding {
                thread_id,
                project_dir: bind.project_dir.clone(),
                preferred_env: bind.preferred_env.clone(),
                preferred_perm_mode: bind.preferred_perm_mode.clone(),
                active_runtime_id: existing
                    .as_ref()
                    .and_then(|binding| binding.active_runtime_id.clone()),
                last_claude_session_id: existing
                    .as_ref()
                    .and_then(|binding| binding.last_claude_session_id.clone()),
                created_at: existing
                    .map(|binding| binding.created_at)
                    .unwrap_or_else(Utc::now),
            };
            upsert_topic_binding(settings, binding.clone());
            binding
        })?;
        send_message(
            token,
            chat_id,
            Some(thread_id),
            &format!("Bound this topic to:\n{}", format_topic_binding(&binding)),
        )?;
        return Ok(());
    }

    if let Some(prompt) = text.strip_prefix("/new ").map(str::trim) {
        return create_telegram_session(
            manager,
            app,
            runtime_manager,
            token,
            settings,
            chat_id,
            thread_id,
            prompt,
            None,
            topic_binding.as_ref(),
        );
    }

    if text == "/new" {
        send_message(token, chat_id, thread_id, "Usage: /new <prompt>")?;
        return Ok(());
    }

    if let Some(follow_up) = text.strip_prefix("/resume").map(str::trim) {
        let Some(binding) = topic_binding.as_ref() else {
            send_message(
                token,
                chat_id,
                thread_id,
                "This topic is not bound. Bind it first or use /new <prompt>.",
            )?;
            return Ok(());
        };
        let Some(session_id) = binding.last_claude_session_id.clone() else {
            send_message(
                token,
                chat_id,
                thread_id,
                "No saved Claude session is available for this topic yet.",
            )?;
            return Ok(());
        };
        return create_telegram_session(
            manager,
            app,
            runtime_manager,
            token,
            settings,
            chat_id,
            thread_id,
            if follow_up.is_empty() { "" } else { follow_up },
            Some(session_id),
            Some(binding),
        );
    }

    if let Some(argument) = text.strip_prefix("/stop").map(str::trim) {
        let runtime_id = if argument.is_empty() {
            manager.active_runtime_for_scope(chat_id, thread_id)
        } else {
            Some(argument.to_string())
        };

        if let Some(runtime_id) = runtime_id {
            runtime_manager.stop_session(app, &runtime_id)?;
            send_message(
                token,
                chat_id,
                thread_id,
                &format!("Stopping session {runtime_id}"),
            )?;
        } else {
            send_message(
                token,
                chat_id,
                thread_id,
                "No active Telegram session to stop.",
            )?;
        }
        return Ok(());
    }

    if let Some(runtime_id) = manager.active_runtime_for_scope(chat_id, thread_id) {
        runtime_manager.send_user_message(app, &runtime_id, &text)?;
        send_message(
            token,
            chat_id,
            thread_id,
            &format!("Sent follow-up to {runtime_id}"),
        )?;
        return Ok(());
    }

    if let Some(binding) = topic_binding.as_ref() {
        return create_telegram_session(
            manager,
            app,
            runtime_manager,
            token,
            settings,
            chat_id,
            thread_id,
            &text,
            binding.last_claude_session_id.clone(),
            Some(binding),
        );
    }

    send_message(
        token,
        chat_id,
        thread_id,
        "No active Telegram session. Use /new <prompt> to start one.",
    )?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn create_telegram_session(
    manager: &Arc<TelegramBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    token: &str,
    settings: &TelegramSettings,
    chat_id: i64,
    thread_id: Option<i64>,
    prompt: &str,
    resume_session_id: Option<String>,
    binding: Option<&TelegramTopicBinding>,
) -> Result<(), String> {
    let env_name = binding
        .and_then(|binding| binding.preferred_env.clone())
        .or_else(|| settings.default_env_name.clone())
        .clone()
        .or_else(|| config::read_config().ok().and_then(|cfg| cfg.current))
        .unwrap_or_else(|| "official".to_string());
    let perm_mode = binding
        .and_then(|binding| binding.preferred_perm_mode.clone())
        .or_else(|| settings.default_perm_mode.clone())
        .clone()
        .unwrap_or_else(|| "dev".to_string());
    let working_dir = binding
        .map(|binding| binding.project_dir.clone())
        .or_else(|| settings.default_working_dir.clone())
        .clone()
        .or_else(config::get_default_working_dir)
        .or_else(|| dirs::home_dir().map(|path| path.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string());
    let resolved = config::resolve_claude_env(&env_name)?;

    let summary = runtime_manager.create_session(
        app.clone(),
        HeadlessSessionOptions {
            env_name: resolved.env_name,
            perm_mode,
            working_dir: working_dir.clone(),
            resume_session_id,
            initial_prompt: (!prompt.trim().is_empty()).then(|| prompt.to_string()),
            max_budget_usd: None,
            allowed_tools: Vec::new(),
            disallowed_tools: Vec::new(),
            env_vars: resolved.env_vars,
            source: HeadlessSessionSource::Telegram {
                chat_id,
                thread_id: thread_id.unwrap_or(0),
            },
        },
    )?;

    manager.remember_runtime_for_scope(chat_id, thread_id, summary.runtime_id.clone());
    if let Some(thread_id) = thread_id {
        let _ = sync_topic_binding_runtime(thread_id, Some(Some(summary.runtime_id.clone())), None);
    }
    send_message(
        token,
        chat_id,
        thread_id,
        &format!(
            "Started {} in {}\nI will reply here when it finishes.",
            summary.runtime_id, working_dir
        ),
    )?;

    let manager = Arc::clone(manager);
    let runtime_manager = Arc::clone(runtime_manager);
    let token = token.to_string();
    let runtime_id = summary.runtime_id.clone();
    thread::spawn(move || {
        monitor_session_completion(
            manager,
            runtime_manager,
            token,
            chat_id,
            thread_id,
            runtime_id,
        );
    });

    Ok(())
}

fn monitor_session_completion(
    manager: Arc<TelegramBridgeManager>,
    runtime_manager: Arc<HeadlessRuntimeManager>,
    token: String,
    chat_id: i64,
    thread_id: Option<i64>,
    runtime_id: String,
) {
    let started = Instant::now();
    let timeout = Duration::from_secs(60 * 15);

    loop {
        if started.elapsed() > timeout {
            let _ = send_message(
                &token,
                chat_id,
                thread_id,
                &format!("Session {runtime_id} timed out while waiting for completion."),
            );
            manager.clear_runtime_for_scope(chat_id, thread_id, &runtime_id);
            if let Some(thread_id) = thread_id {
                let _ = sync_topic_binding_runtime(thread_id, Some(None), None);
            }
            break;
        }

        match runtime_manager.summary(&runtime_id) {
            Some(summary)
                if !summary.is_active
                    || matches!(summary.status.as_str(), "completed" | "stopped" | "error") =>
            {
                let replay =
                    runtime_manager
                        .replay_events(&runtime_id, None)
                        .unwrap_or(ReplayBatch {
                            gap_detected: false,
                            oldest_available_seq: None,
                            newest_available_seq: None,
                            events: Vec::new(),
                        });
                let (stdout, stderr) = collect_runtime_output(&replay);
                let message = format_result_message(&runtime_id, &summary.status, &stdout, &stderr);
                let _ = send_message(&token, chat_id, thread_id, &message);
                let _ = runtime_manager.remove_session(&runtime_id);
                manager.clear_runtime_for_scope(chat_id, thread_id, &runtime_id);
                if let Some(thread_id) = thread_id {
                    let _ = sync_topic_binding_runtime(
                        thread_id,
                        Some(None),
                        Some(summary.claude_session_id.clone()),
                    );
                }
                break;
            }
            Some(_) => {
                thread::sleep(Duration::from_millis(700));
            }
            None => {
                manager.clear_runtime_for_scope(chat_id, thread_id, &runtime_id);
                if let Some(thread_id) = thread_id {
                    let _ = sync_topic_binding_runtime(thread_id, Some(None), None);
                }
                break;
            }
        }
    }
}

fn collect_runtime_output(replay: &ReplayBatch) -> (String, String) {
    let mut stdout_lines = Vec::new();
    let mut stderr_lines = Vec::new();

    for event in &replay.events {
        match &event.payload {
            SessionEventPayload::AssistantChunk { text } => stdout_lines.push(text.clone()),
            SessionEventPayload::SystemMessage { message } => stdout_lines.push(message.clone()),
            SessionEventPayload::StdErrLine { line } => stderr_lines.push(line.clone()),
            SessionEventPayload::Lifecycle { stage, detail } => {
                if matches!(
                    stage.as_str(),
                    "stderr_error" | "stdout_error" | "process_failure"
                ) {
                    stderr_lines.push(format!("[{stage}] {detail}"));
                }
            }
            SessionEventPayload::SessionCompleted { reason } => {
                if reason != "completed" && reason != "stopped" {
                    stderr_lines.push(reason.clone());
                }
            }
            _ => {}
        }
    }

    (stdout_lines.join("\n"), stderr_lines.join("\n"))
}

fn format_result_message(runtime_id: &str, status: &str, stdout: &str, stderr: &str) -> String {
    let mut lines = vec![format!(
        "Session {runtime_id} finished with status: {status}"
    )];
    if !stdout.trim().is_empty() {
        lines.push(String::new());
        lines.push("Output:".to_string());
        lines.push(truncate_for_telegram(stdout));
    }
    if !stderr.trim().is_empty() {
        lines.push(String::new());
        lines.push("Errors:".to_string());
        lines.push(truncate_for_telegram(stderr));
    }
    lines.join("\n")
}

fn format_cron_list_message(tasks: &[cron::CronTask]) -> String {
    if tasks.is_empty() {
        return "No cron tasks configured.".to_string();
    }

    tasks
        .iter()
        .take(20)
        .map(|task| {
            format!(
                "{} {} · {} · {} · {}",
                if task.enabled { "✅" } else { "⏸" },
                task.name,
                task.execution_profile,
                task.cron_expression,
                task.id
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn resolve_cron_task(selector: &str) -> Result<cron::CronTask, String> {
    let selector = selector.trim();
    if selector.is_empty() {
        return Err("Cron task id or name is required".to_string());
    }

    let exact_matches = cron::list_cron_tasks()?
        .into_iter()
        .filter(|task| {
            task.id.eq_ignore_ascii_case(selector) || task.name.eq_ignore_ascii_case(selector)
        })
        .collect::<Vec<_>>();

    if exact_matches.len() == 1 {
        return Ok(exact_matches[0].clone());
    }

    let normalized = selector.to_lowercase();
    let partial_matches = cron::list_cron_tasks()?
        .into_iter()
        .filter(|task| {
            task.id.to_lowercase().starts_with(&normalized)
                || task.name.to_lowercase().contains(&normalized)
        })
        .collect::<Vec<_>>();

    if partial_matches.len() == 1 {
        return Ok(partial_matches[0].clone());
    }

    if partial_matches.is_empty() && exact_matches.is_empty() {
        return Err(format!("Cron task not found: {}", selector));
    }

    let candidates = if !exact_matches.is_empty() {
        exact_matches
    } else {
        partial_matches
    };
    Err(format!(
        "Cron task selector is ambiguous: {}",
        candidates
            .into_iter()
            .take(5)
            .map(|task| format!("{} ({})", task.name, task.id))
            .collect::<Vec<_>>()
            .join(", ")
    ))
}

fn truncate_for_telegram(value: &str) -> String {
    const MAX_LEN: usize = 3500;
    if value.len() <= MAX_LEN {
        return value.to_string();
    }

    let mut truncated = value.chars().take(MAX_LEN).collect::<String>();
    truncated.push_str("\n…");
    truncated
}

fn normalize_command_text(text: &str, bot_username: Option<&str>) -> String {
    let mut parts = text.splitn(2, ' ');
    let command = parts.next().unwrap_or_default();
    let remainder = parts.next().unwrap_or_default().trim();

    let normalized_command = if let Some(username) = bot_username {
        let suffix = format!("@{username}");
        command.strip_suffix(&suffix).unwrap_or(command).to_string()
    } else {
        command.to_string()
    };

    if remainder.is_empty() {
        normalized_command
    } else {
        format!("{normalized_command} {remainder}")
    }
}

fn get_me(token: &str) -> Result<TelegramUser, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{TELEGRAM_API_BASE}/bot{token}/getMe");
    let response = client
        .get(url)
        .send()
        .map_err(|error| format!("Telegram getMe failed: {}", error))?;
    let payload = response
        .json::<TelegramApiResponse<TelegramUser>>()
        .map_err(|error| format!("Failed to parse Telegram getMe response: {}", error))?;
    if payload.ok {
        Ok(payload.result)
    } else {
        Err(payload
            .description
            .unwrap_or_else(|| "Telegram getMe returned an error".to_string()))
    }
}

fn get_updates(token: &str, offset: Option<i64>) -> Result<Vec<TelegramUpdate>, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(35))
        .build()
        .map_err(|error| format!("Failed to build Telegram client: {}", error))?;
    let url = format!("{TELEGRAM_API_BASE}/bot{token}/getUpdates");
    let mut query = vec![("timeout", "20".to_string())];
    if let Some(offset) = offset {
        query.push(("offset", offset.to_string()));
    }

    let response = client
        .get(url)
        .query(&query)
        .send()
        .map_err(|error| format!("Telegram getUpdates failed: {}", error))?;
    let payload = response
        .json::<TelegramApiResponse<Vec<TelegramUpdate>>>()
        .map_err(|error| format!("Failed to parse Telegram updates: {}", error))?;
    if payload.ok {
        Ok(payload.result)
    } else {
        Err(payload
            .description
            .unwrap_or_else(|| "Telegram getUpdates returned an error".to_string()))
    }
}

fn send_message(
    token: &str,
    chat_id: i64,
    thread_id: Option<i64>,
    text: &str,
) -> Result<(), String> {
    #[derive(Serialize)]
    struct SendMessageBody<'a> {
        chat_id: i64,
        text: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        message_thread_id: Option<i64>,
    }

    let client = reqwest::blocking::Client::new();
    let url = format!("{TELEGRAM_API_BASE}/bot{token}/sendMessage");
    let response = client
        .post(url)
        .json(&SendMessageBody {
            chat_id,
            text,
            message_thread_id: thread_id,
        })
        .send()
        .map_err(|error| format!("Telegram sendMessage failed: {}", error))?;
    let payload = response
        .json::<TelegramApiResponse<serde_json::Value>>()
        .map_err(|error| format!("Failed to parse Telegram sendMessage response: {}", error))?;
    if payload.ok {
        Ok(())
    } else {
        Err(payload
            .description
            .unwrap_or_else(|| "Telegram sendMessage returned an error".to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_command_text, parse_bind_command, remove_topic_binding, upsert_topic_binding,
        TelegramSettings, TelegramTopicBinding,
    };
    use chrono::Utc;

    #[test]
    fn normalize_command_text_strips_bot_username() {
        assert_eq!(
            normalize_command_text("/new@ccem_bot hello world", Some("ccem_bot")),
            "/new hello world"
        );
    }

    #[test]
    fn normalize_command_text_keeps_plain_text() {
        assert_eq!(
            normalize_command_text("continue this task", Some("ccem_bot")),
            "continue this task"
        );
    }

    #[test]
    fn parse_bind_command_supports_env_and_perm() {
        let parsed =
            parse_bind_command("/bind /Users/g/Github/home env=glm perm=dev").expect("parse bind");
        assert_eq!(parsed.project_dir, "/Users/g/Github/home");
        assert_eq!(parsed.preferred_env.as_deref(), Some("glm"));
        assert_eq!(parsed.preferred_perm_mode.as_deref(), Some("dev"));
    }

    #[test]
    fn upsert_topic_binding_replaces_existing_thread_binding() {
        let created_at = Utc::now();
        let mut settings = TelegramSettings::default();
        upsert_topic_binding(
            &mut settings,
            TelegramTopicBinding {
                thread_id: 42,
                project_dir: "/tmp/one".to_string(),
                preferred_env: None,
                preferred_perm_mode: None,
                active_runtime_id: None,
                last_claude_session_id: None,
                created_at,
            },
        );
        upsert_topic_binding(
            &mut settings,
            TelegramTopicBinding {
                thread_id: 42,
                project_dir: "/tmp/two".to_string(),
                preferred_env: Some("glm".to_string()),
                preferred_perm_mode: Some("dev".to_string()),
                active_runtime_id: Some("headless-1".to_string()),
                last_claude_session_id: Some("claude-1".to_string()),
                created_at,
            },
        );

        assert_eq!(settings.topic_bindings.len(), 1);
        assert_eq!(settings.topic_bindings[0].project_dir, "/tmp/two");
        assert_eq!(
            settings.topic_bindings[0].preferred_env.as_deref(),
            Some("glm")
        );
    }

    #[test]
    fn remove_topic_binding_returns_whether_a_binding_was_removed() {
        let mut settings = TelegramSettings {
            topic_bindings: vec![TelegramTopicBinding {
                thread_id: 99,
                project_dir: "/tmp/project".to_string(),
                preferred_env: None,
                preferred_perm_mode: None,
                active_runtime_id: None,
                last_claude_session_id: None,
                created_at: Utc::now(),
            }],
            ..TelegramSettings::default()
        };

        assert!(remove_topic_binding(&mut settings, 99));
        assert!(settings.topic_bindings.is_empty());
        assert!(!remove_topic_binding(&mut settings, 99));
    }
}
