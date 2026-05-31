mod channel;
mod media;
mod message;
mod types;

use crate::config;
use crate::crypto;
use crate::runtime::{HeadlessRuntimeManager, HeadlessSessionOptions, HeadlessSessionSource};
use chrono::Utc;
use rand::RngCore;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::net::TcpStream;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tungstenite::stream::MaybeTlsStream;
use tungstenite::{connect, Error as WsError, Message, WebSocket};

use self::channel::WecomChannel;
use self::media::prepare_message_attachments;
use self::message::{
    build_restricted_prompt, contains_mention, detect_intent, is_actor_allowed, is_admin,
    is_group_allowed, normalize_message, peer_id_for_message, WecomIncomingMessage,
};
pub use self::types::{
    default_ws_url, WecomBotConfig, WecomBotStatus, WecomBridgeStatus, WecomSettings,
};

const WECOM_READ_TIMEOUT_MS: u64 = 500;
const WECOM_HEARTBEAT_MS: u64 = 30_000;
const WECOM_RECONNECT_BASE_MS: u64 = 1_000;
const WECOM_RECONNECT_MAX_MS: u64 = 30_000;
const WECOM_TEXT_LIMIT: usize = 20_000;

type WecomSocket = WebSocket<MaybeTlsStream<TcpStream>>;

#[derive(Debug, Clone, Default)]
struct WecomState {
    running: bool,
    last_error: Option<String>,
    bot_statuses: HashMap<String, WecomBotStatus>,
    active_runtime_by_scope: HashMap<String, String>,
    permission_owner_by_request: HashMap<String, (String, String)>,
}

pub struct WecomBridgeManager {
    state: Mutex<WecomState>,
    stop_flag: AtomicBool,
    workers: Mutex<Vec<thread::JoinHandle<()>>>,
}

impl Default for WecomBridgeManager {
    fn default() -> Self {
        Self {
            state: Mutex::new(WecomState::default()),
            stop_flag: AtomicBool::new(false),
            workers: Mutex::new(Vec::new()),
        }
    }
}

impl WecomBridgeManager {
    pub fn status(&self) -> WecomBridgeStatus {
        self.cleanup_finished_workers();
        let state = self
            .state
            .lock()
            .map(|state| state.clone())
            .unwrap_or_default();
        let bots = state.bot_statuses.values().cloned().collect::<Vec<_>>();
        WecomBridgeStatus {
            configured: bots.iter().any(|bot| bot.configured),
            running: state.running,
            active_bot_count: bots.iter().filter(|bot| bot.running).count(),
            last_error: state.last_error,
            bots,
        }
    }

    pub fn start(
        self: &Arc<Self>,
        app: AppHandle,
        runtime_manager: Arc<HeadlessRuntimeManager>,
    ) -> Result<WecomBridgeStatus, String> {
        self.stop();
        let settings = read_wecom_settings()?;
        if !settings.enabled {
            return Err("WeCom bridge is disabled.".to_string());
        }
        let bots = settings
            .bots
            .into_iter()
            .filter(|bot| bot.enabled && !bot.bot_id.trim().is_empty())
            .collect::<Vec<_>>();
        if bots.is_empty() {
            return Err("No enabled WeCom bots are configured.".to_string());
        }

        self.stop_flag.store(false, Ordering::SeqCst);
        {
            let mut state = self
                .state
                .lock()
                .map_err(|_| "Failed to lock WeCom bridge state".to_string())?;
            state.running = true;
            state.last_error = None;
            state.bot_statuses.clear();
            for bot in &bots {
                state.bot_statuses.insert(
                    bot.id.clone(),
                    WecomBotStatus {
                        id: bot.id.clone(),
                        bot_id: bot.bot_id.clone(),
                        name: bot_display_name(bot),
                        configured: bot
                            .secret
                            .as_ref()
                            .is_some_and(|value| !value.trim().is_empty()),
                        running: false,
                        last_error: None,
                        connected_at: None,
                    },
                );
            }
        }

        let mut handles = Vec::new();
        for bot in bots {
            let manager = Arc::clone(self);
            let app = app.clone();
            let runtime_manager = Arc::clone(&runtime_manager);
            handles.push(thread::spawn(move || {
                run_bot_loop(manager, app, runtime_manager, bot);
            }));
        }
        *self
            .workers
            .lock()
            .map_err(|_| "Failed to lock WeCom workers".to_string())? = handles;
        Ok(self.status())
    }

    pub fn stop(&self) -> WecomBridgeStatus {
        self.stop_flag.store(true, Ordering::SeqCst);
        self.cleanup_finished_workers();
        if let Ok(mut workers) = self.workers.lock() {
            for handle in workers.drain(..) {
                if handle.is_finished() {
                    let _ = handle.join();
                }
            }
        }
        if let Ok(mut state) = self.state.lock() {
            state.running = false;
            state.active_runtime_by_scope.clear();
            state.permission_owner_by_request.clear();
            for status in state.bot_statuses.values_mut() {
                status.running = false;
            }
        }
        self.status()
    }

    pub fn sync_settings(&self, settings: &WecomSettings) {
        if let Ok(mut state) = self.state.lock() {
            for bot in &settings.bots {
                state
                    .bot_statuses
                    .entry(bot.id.clone())
                    .or_insert_with(|| WecomBotStatus {
                        id: bot.id.clone(),
                        bot_id: bot.bot_id.clone(),
                        name: bot_display_name(bot),
                        configured: bot
                            .secret
                            .as_ref()
                            .is_some_and(|value| !value.trim().is_empty()),
                        running: false,
                        last_error: None,
                        connected_at: None,
                    });
            }
        }
    }

    fn cleanup_finished_workers(&self) {
        if let Ok(mut workers) = self.workers.lock() {
            let mut active = Vec::new();
            for handle in workers.drain(..) {
                if handle.is_finished() {
                    let _ = handle.join();
                } else {
                    active.push(handle);
                }
            }
            *workers = active;
        }
    }

    fn set_bot_status(&self, bot: &WecomBotConfig, running: bool, error: Option<String>) {
        if let Ok(mut state) = self.state.lock() {
            if let Some(error) = error.as_ref() {
                state.last_error = Some(error.clone());
            }
            state.bot_statuses.insert(
                bot.id.clone(),
                WecomBotStatus {
                    id: bot.id.clone(),
                    bot_id: bot.bot_id.clone(),
                    name: bot_display_name(bot),
                    configured: bot
                        .secret
                        .as_ref()
                        .is_some_and(|value| !value.trim().is_empty()),
                    running,
                    last_error: error,
                    connected_at: running.then(Utc::now),
                },
            );
        }
    }

    fn remember_runtime_for_scope(&self, bot_id: &str, peer_id: &str, runtime_id: String) {
        if let Ok(mut state) = self.state.lock() {
            state
                .active_runtime_by_scope
                .insert(scope_key(bot_id, peer_id), runtime_id);
        }
    }

    fn active_runtime_for_scope(&self, bot_id: &str, peer_id: &str) -> Option<String> {
        self.state.lock().ok().and_then(|state| {
            state
                .active_runtime_by_scope
                .get(&scope_key(bot_id, peer_id))
                .cloned()
        })
    }

    pub fn clear_runtime_for_scope_if_matches(
        &self,
        bot_id: &str,
        peer_id: &str,
        runtime_id: &str,
    ) {
        if let Ok(mut state) = self.state.lock() {
            let key = scope_key(bot_id, peer_id);
            if state
                .active_runtime_by_scope
                .get(&key)
                .is_some_and(|value| value == runtime_id)
            {
                state.active_runtime_by_scope.remove(&key);
            }
            state
                .permission_owner_by_request
                .retain(|_, (_, owner_runtime)| owner_runtime != runtime_id);
        }
    }

    fn remember_permission(&self, request_id: &str, bot_id: &str, runtime_id: &str) {
        if let Ok(mut state) = self.state.lock() {
            state.permission_owner_by_request.insert(
                request_id.to_string(),
                (bot_id.to_string(), runtime_id.to_string()),
            );
        }
    }
}

pub struct WecomConnection {
    socket: Mutex<Option<WecomSocket>>,
    connected: AtomicBool,
}

impl Default for WecomConnection {
    fn default() -> Self {
        Self {
            socket: Mutex::new(None),
            connected: AtomicBool::new(false),
        }
    }
}

impl WecomConnection {
    fn set_socket(&self, socket: WecomSocket) -> Result<(), String> {
        let mut guard = self
            .socket
            .lock()
            .map_err(|_| "Failed to lock WeCom socket".to_string())?;
        *guard = Some(socket);
        self.connected.store(true, Ordering::SeqCst);
        Ok(())
    }

    fn clear_socket(&self) {
        if let Ok(mut guard) = self.socket.lock() {
            *guard = None;
        }
        self.connected.store(false, Ordering::SeqCst);
    }

    pub fn is_connected(&self) -> bool {
        self.connected.load(Ordering::SeqCst)
    }

    fn send_frame(&self, frame: Value) -> Result<(), String> {
        let mut guard = self
            .socket
            .lock()
            .map_err(|_| "Failed to lock WeCom socket".to_string())?;
        let socket = guard
            .as_mut()
            .ok_or_else(|| "WeCom socket is not connected".to_string())?;
        socket
            .send(Message::Text(frame.to_string().into()))
            .map_err(|error| format!("Failed to send WeCom frame: {}", error))
    }

    pub fn send_stream(
        &self,
        req_id: &str,
        stream_id: &str,
        content: &str,
        finish: bool,
    ) -> Result<(), String> {
        self.send_frame(json!({
            "cmd": "aibot_respond_msg",
            "headers": { "req_id": req_id },
            "body": {
                "msgtype": "stream",
                "stream": {
                    "id": stream_id,
                    "finish": finish,
                    "content": truncate_utf8(content, WECOM_TEXT_LIMIT),
                }
            }
        }))
    }
}

fn run_bot_loop(
    manager: Arc<WecomBridgeManager>,
    app: AppHandle,
    runtime_manager: Arc<HeadlessRuntimeManager>,
    bot: WecomBotConfig,
) {
    let Some(secret) = bot
        .secret
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        manager.set_bot_status(&bot, false, Some("Missing WeCom bot secret.".to_string()));
        return;
    };
    let connection = Arc::new(WecomConnection::default());
    let mut reconnect_attempt = 0u32;

    while !manager.stop_flag.load(Ordering::SeqCst) {
        match connect(bot.ws_url.as_str()) {
            Ok((mut socket, _)) => {
                set_socket_read_timeout(&mut socket);
                if connection.set_socket(socket).is_err() {
                    return;
                }
                manager.set_bot_status(&bot, true, None);
                reconnect_attempt = 0;
                let _ = send_auth(&connection, &bot, secret);
                let mut last_heartbeat = Instant::now();

                while !manager.stop_flag.load(Ordering::SeqCst) && connection.is_connected() {
                    if last_heartbeat.elapsed() >= Duration::from_millis(WECOM_HEARTBEAT_MS) {
                        let _ = send_ping(&connection);
                        last_heartbeat = Instant::now();
                    }

                    match read_next_frame(&connection) {
                        Ok(Some(frame)) => {
                            if handle_frame(
                                &manager,
                                &app,
                                &runtime_manager,
                                &connection,
                                &bot,
                                frame,
                            )
                            .is_err()
                            {
                                break;
                            }
                        }
                        Ok(None) => {}
                        Err(error) => {
                            manager.set_bot_status(&bot, false, Some(error));
                            break;
                        }
                    }
                }
                connection.clear_socket();
            }
            Err(error) => {
                manager.set_bot_status(
                    &bot,
                    false,
                    Some(format!("Failed to connect WeCom bot: {}", error)),
                );
            }
        }

        reconnect_attempt = reconnect_attempt.saturating_add(1);
        let delay = (WECOM_RECONNECT_BASE_MS * 2u64.saturating_pow(reconnect_attempt.min(5)))
            .min(WECOM_RECONNECT_MAX_MS);
        interruptible_sleep(&manager, Duration::from_millis(delay));
    }
    connection.clear_socket();
    manager.set_bot_status(&bot, false, None);
}

fn handle_frame(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    connection: &Arc<WecomConnection>,
    bot: &WecomBotConfig,
    frame: WecomFrame,
) -> Result<(), String> {
    if frame.cmd.as_deref() == Some("aibot_msg_callback") {
        let req_id = frame.headers.req_id.clone();
        let Some(body) = frame.body.clone() else {
            return Ok(());
        };
        let message: WecomIncomingMessage = serde_json::from_value(body)
            .map_err(|error| format!("Failed to parse WeCom message: {}", error))?;
        let manager = Arc::clone(manager);
        let app = app.clone();
        let runtime_manager = Arc::clone(runtime_manager);
        let connection = Arc::clone(connection);
        let bot = bot.clone();
        thread::spawn(move || {
            if let Err(error) = handle_message(
                &manager,
                &app,
                &runtime_manager,
                &connection,
                &bot,
                frame,
                message,
            ) {
                let _ = connection.send_stream(
                    req_id.as_str(),
                    &generate_req_id("stream"),
                    &format!("WeCom message failed: {error}"),
                    true,
                );
            }
        });
        return Ok(());
    }

    if frame.cmd.as_deref() == Some("aibot_event_callback")
        && frame
            .body
            .as_ref()
            .and_then(|body| body.get("event"))
            .and_then(|event| event.get("eventtype"))
            .and_then(Value::as_str)
            == Some("disconnected_event")
    {
        return Err(
            "Server disconnected this bot because a new connection was established.".to_string(),
        );
    }

    if frame.headers.req_id.starts_with("aibot_subscribe")
        && frame.errcode.is_some_and(|code| code != 0)
    {
        return Err(format!(
            "WeCom auth failed: {}",
            frame.errmsg.unwrap_or_else(|| "unknown error".to_string())
        ));
    }
    Ok(())
}

fn handle_message(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    connection: &Arc<WecomConnection>,
    bot: &WecomBotConfig,
    frame: WecomFrame,
    message: WecomIncomingMessage,
) -> Result<(), String> {
    let actor = message.from.userid.trim().to_string();
    if actor.is_empty() || !is_actor_allowed(bot, &actor) {
        return Ok(());
    }
    if message.chattype == "group" && !is_group_allowed(bot, message.chatid.as_deref()) {
        return Ok(());
    }

    let mut normalized = normalize_message(&message);
    if normalized.text.trim().is_empty() && normalized.attachments.is_empty() {
        return Ok(());
    }
    if message.chattype == "group"
        && bot.require_mention
        && !contains_mention(bot, &normalized.text)
    {
        return Ok(());
    }

    let role = if is_admin(bot, &actor) {
        UserRole::Admin
    } else {
        UserRole::User
    };
    let user_intent = match role {
        UserRole::Admin => None,
        UserRole::User => {
            let Some(intent) = detect_intent(&normalized.text) else {
                reply_text(
                    connection,
                    &frame,
                    "普通用户只能发起已允许的任务，例如“生成本周周报”。",
                )?;
                return Ok(());
            };
            if !bot.allowed_intents.iter().any(|allowed| allowed == &intent) {
                reply_text(
                    connection,
                    &frame,
                    "该任务不在普通用户允许范围内。请联系管理员执行。",
                )?;
                return Ok(());
            }
            Some(intent)
        }
    };

    let peer_id = peer_id_for_message(&message);
    prepare_message_attachments(bot, &peer_id, &frame.headers.req_id, &mut normalized);
    let prompt = match role {
        UserRole::Admin => normalized.to_prompt(),
        UserRole::User => {
            let intent = user_intent.as_deref().unwrap_or("restricted");
            build_restricted_prompt(&intent, &normalized)
        }
    };
    let stream_id = generate_req_id("stream");
    connection.send_stream(
        &frame.headers.req_id,
        &stream_id,
        "收到，正在处理...",
        false,
    )?;

    if let Some(runtime_id) = manager.active_runtime_for_scope(&bot.bot_id, &peer_id) {
        if runtime_manager
            .summary(&runtime_id)
            .is_some_and(|summary| summary.is_active)
        {
            attach_wecom_output_channel(
                manager,
                app,
                runtime_manager,
                connection,
                bot,
                &peer_id,
                &runtime_id,
                &frame.headers.req_id,
                &stream_id,
            )?;
            runtime_manager.send_user_message(app, &runtime_id, &prompt)?;
            return Ok(());
        }
        manager.clear_runtime_for_scope_if_matches(&bot.bot_id, &peer_id, &runtime_id);
    }

    create_wecom_session(
        manager,
        app,
        runtime_manager,
        connection,
        bot,
        &peer_id,
        &frame.headers.req_id,
        &stream_id,
        &prompt,
        role,
    )
}

#[allow(clippy::too_many_arguments)]
fn create_wecom_session(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    connection: &Arc<WecomConnection>,
    bot: &WecomBotConfig,
    peer_id: &str,
    req_id: &str,
    stream_id: &str,
    prompt: &str,
    role: UserRole,
) -> Result<(), String> {
    let metadata = fs::metadata(&bot.workspace_dir)
        .map_err(|error| format!("Workspace directory is not accessible: {}", error))?;
    if !metadata.is_dir() {
        return Err(format!(
            "Workspace path is not a directory: {}",
            bot.workspace_dir
        ));
    }

    let env_name = bot
        .default_env_name
        .clone()
        .or_else(|| config::read_config().ok().and_then(|cfg| cfg.current))
        .unwrap_or_else(|| "official".to_string());
    let perm_mode = match role {
        UserRole::Admin => bot.admin_perm_mode.clone(),
        UserRole::User => bot.user_perm_mode.clone(),
    };
    let resolved = config::resolve_claude_env(&env_name)?;

    let summary = runtime_manager.create_session(
        app.clone(),
        HeadlessSessionOptions {
            env_name: resolved.env_name,
            perm_mode,
            working_dir: bot.workspace_dir.clone(),
            resume_session_id: None,
            initial_prompt: (!prompt.trim().is_empty()).then(|| prompt.to_string()),
            max_budget_usd: None,
            allowed_tools: Vec::new(),
            disallowed_tools: Vec::new(),
            env_vars: resolved.env_vars,
            source: HeadlessSessionSource::Wecom {
                bot_id: bot.bot_id.clone(),
                peer_id: peer_id.to_string(),
            },
        },
    )?;
    manager.remember_runtime_for_scope(&bot.bot_id, peer_id, summary.runtime_id.clone());
    attach_wecom_output_channel(
        manager,
        app,
        runtime_manager,
        connection,
        bot,
        peer_id,
        &summary.runtime_id,
        req_id,
        stream_id,
    )?;
    spawn_session_monitor(
        manager,
        app,
        runtime_manager,
        &bot.bot_id,
        peer_id,
        &summary.runtime_id,
    );
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn attach_wecom_output_channel(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    connection: &Arc<WecomConnection>,
    bot: &WecomBotConfig,
    peer_id: &str,
    runtime_id: &str,
    req_id: &str,
    stream_id: &str,
) -> Result<(), String> {
    let unified_runtime_manager = app.state::<Arc<crate::unified_runtime::UnifiedSessionManager>>();
    let channel = Arc::new(WecomChannel::new(
        Arc::clone(manager),
        Arc::clone(connection),
        runtime_id.to_string(),
        bot.bot_id.clone(),
        peer_id.to_string(),
        req_id.to_string(),
        stream_id.to_string(),
    ));
    unified_runtime_manager
        .inner()
        .attach_output_channel(runtime_id, channel.clone())?;
    if let Ok(batch) = runtime_manager.replay_events(runtime_id, None) {
        for event in batch.events {
            if let crate::event_bus::SessionEventPayload::PermissionRequired {
                request_id, ..
            } = &event.payload
            {
                manager.remember_permission(request_id, &bot.bot_id, runtime_id);
            }
            let _ = channel.replay_event(&event);
        }
    }
    channel.finish_initial_replay()?;
    Ok(())
}

fn spawn_session_monitor(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    bot_id: &str,
    peer_id: &str,
    runtime_id: &str,
) {
    let manager = Arc::clone(manager);
    let runtime_manager = Arc::clone(runtime_manager);
    let app = app.clone();
    let bot_id = bot_id.to_string();
    let peer_id = peer_id.to_string();
    let runtime_id = runtime_id.to_string();
    thread::spawn(move || {
        while runtime_manager
            .summary(&runtime_id)
            .is_some_and(|summary| summary.is_active)
        {
            thread::sleep(Duration::from_millis(500));
        }
        manager.clear_runtime_for_scope_if_matches(&bot_id, &peer_id, &runtime_id);
        let unified_runtime_manager =
            app.state::<Arc<crate::unified_runtime::UnifiedSessionManager>>();
        let _ = unified_runtime_manager.inner().detach_channel(
            &runtime_id,
            &crate::channel::ChannelKind::Wecom { bot_id, peer_id },
        );
    });
}

pub fn wecom_settings_path() -> PathBuf {
    config::get_ccem_dir().join("wecom.json")
}

pub fn read_wecom_settings() -> Result<WecomSettings, String> {
    let path = wecom_settings_path();
    if !path.exists() {
        return Ok(WecomSettings {
            enabled: false,
            bots: Vec::new(),
        });
    }
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read WeCom settings: {}", error))?;
    let mut settings: WecomSettings = serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse WeCom settings: {}", error))?;
    for bot in &mut settings.bots {
        bot.secret = bot
            .secret
            .clone()
            .map(|value| crypto::decrypt(&value).unwrap_or(value));
        if bot.id.trim().is_empty() {
            bot.id = generate_req_id("bot");
        }
        if bot.ws_url.trim().is_empty() {
            bot.ws_url = default_ws_url();
        }
    }
    Ok(settings)
}

pub fn write_wecom_settings(settings: &WecomSettings) -> Result<(), String> {
    config::ensure_ccem_dir().map_err(|error| format!("Failed to create config dir: {}", error))?;
    let mut persisted = settings.clone();
    for bot in &mut persisted.bots {
        bot.secret = bot
            .secret
            .as_ref()
            .filter(|value| !value.trim().is_empty())
            .map(|value| crypto::encrypt(value));
        if bot.id.trim().is_empty() {
            bot.id = generate_req_id("bot");
        }
    }
    let content = serde_json::to_string_pretty(&persisted)
        .map_err(|error| format!("Failed to serialize WeCom settings: {}", error))?;
    fs::write(wecom_settings_path(), content)
        .map_err(|error| format!("Failed to write WeCom settings: {}", error))
}

#[derive(Debug, Clone, Deserialize)]
struct WecomFrame {
    #[serde(default)]
    cmd: Option<String>,
    headers: WecomHeaders,
    #[serde(default)]
    body: Option<Value>,
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct WecomHeaders {
    req_id: String,
}

#[derive(Clone, Copy)]
enum UserRole {
    Admin,
    User,
}

fn reply_text(connection: &WecomConnection, frame: &WecomFrame, text: &str) -> Result<(), String> {
    connection.send_stream(
        &frame.headers.req_id,
        &generate_req_id("stream"),
        text,
        true,
    )
}

fn send_auth(
    connection: &WecomConnection,
    bot: &WecomBotConfig,
    secret: &str,
) -> Result<(), String> {
    connection.send_frame(json!({
        "cmd": "aibot_subscribe",
        "headers": { "req_id": generate_req_id("aibot_subscribe") },
        "body": { "bot_id": bot.bot_id, "secret": secret }
    }))
}

fn send_ping(connection: &WecomConnection) -> Result<(), String> {
    connection.send_frame(json!({
        "cmd": "ping",
        "headers": { "req_id": generate_req_id("ping") }
    }))
}

fn read_next_frame(connection: &WecomConnection) -> Result<Option<WecomFrame>, String> {
    let mut guard = connection
        .socket
        .lock()
        .map_err(|_| "Failed to lock WeCom socket".to_string())?;
    let Some(socket) = guard.as_mut() else {
        return Ok(None);
    };
    match socket.read() {
        Ok(Message::Text(text)) => serde_json::from_str::<WecomFrame>(text.as_ref())
            .map(Some)
            .map_err(|error| format!("Failed to parse WeCom frame: {}", error)),
        Ok(Message::Binary(bytes)) => serde_json::from_slice::<WecomFrame>(&bytes)
            .map(Some)
            .map_err(|error| format!("Failed to parse WeCom binary frame: {}", error)),
        Ok(Message::Ping(payload)) => {
            let _ = socket.send(Message::Pong(payload));
            Ok(None)
        }
        Ok(Message::Close(_)) => Err("WeCom WebSocket closed".to_string()),
        Ok(_) => Ok(None),
        Err(WsError::Io(error))
            if matches!(
                error.kind(),
                std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
            ) =>
        {
            Ok(None)
        }
        Err(error) => Err(format!("WeCom WebSocket read failed: {}", error)),
    }
}

fn set_socket_read_timeout(socket: &mut WecomSocket) {
    let _ = match socket.get_mut() {
        MaybeTlsStream::Plain(stream) => {
            stream.set_read_timeout(Some(Duration::from_millis(WECOM_READ_TIMEOUT_MS)))
        }
        MaybeTlsStream::NativeTls(stream) => stream
            .get_ref()
            .set_read_timeout(Some(Duration::from_millis(WECOM_READ_TIMEOUT_MS))),
        #[allow(unreachable_patterns)]
        _ => Ok(()),
    };
}

fn interruptible_sleep(manager: &WecomBridgeManager, duration: Duration) {
    let deadline = Instant::now() + duration;
    while Instant::now() < deadline && !manager.stop_flag.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(100));
    }
}

fn scope_key(bot_id: &str, peer_id: &str) -> String {
    format!("{bot_id}:{peer_id}")
}

fn bot_display_name(bot: &WecomBotConfig) -> String {
    if bot.name.trim().is_empty() {
        bot.bot_id.clone()
    } else {
        bot.name.clone()
    }
}

pub fn truncate_utf8(text: &str, limit: usize) -> String {
    if text.len() <= limit {
        return text.to_string();
    }
    let mut end = limit;
    while !text.is_char_boundary(end) {
        end = end.saturating_sub(1);
    }
    format!("{}…", &text[..end])
}

fn generate_req_id(prefix: &str) -> String {
    let mut random = [0u8; 4];
    rand::thread_rng().fill_bytes(&mut random);
    format!(
        "{prefix}_{}_{}",
        Utc::now().timestamp_millis(),
        hex::encode(random)
    )
}
