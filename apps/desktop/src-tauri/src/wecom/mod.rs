mod channel;
mod media;
mod message;
mod types;

use crate::config;
use crate::crypto;
use crate::remote::RemotePlatform;
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
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tungstenite::stream::MaybeTlsStream;
use tungstenite::{connect, Error as WsError, Message, WebSocket};

use self::channel::WecomChannel;
use self::media::prepare_message_attachments;
use self::message::{
    build_user_admission_prompt, build_user_policy_prompt, contains_mention, is_actor_allowed,
    is_admin, is_group_allowed, normalize_message, parse_admission_decision, peer_id_for_message,
    UserAdmissionDecision, WecomIncomingMessage,
};
pub use self::types::{
    default_ws_url, WecomBotConfig, WecomBotStatus, WecomBridgeStatus, WecomSettings,
    WecomTaskBindingTargetType,
};

const WECOM_READ_TIMEOUT_MS: u64 = 500;
const WECOM_HEARTBEAT_MS: u64 = 30_000;
const WECOM_RECONNECT_BASE_MS: u64 = 1_000;
const WECOM_RECONNECT_MAX_MS: u64 = 30_000;
const WECOM_TEXT_LIMIT: usize = 20_000;
const WECOM_ADMISSION_TIMEOUT_MS: u64 = 30_000;
const WECOM_ADMISSION_POLL_MS: u64 = 250;
const WECOM_SEND_ACK_TIMEOUT_MS: u64 = 5_000;

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
    connections: Mutex<HashMap<String, Arc<WecomConnection>>>,
    stop_flag: AtomicBool,
    workers: Mutex<Vec<thread::JoinHandle<()>>>,
}

impl Default for WecomBridgeManager {
    fn default() -> Self {
        Self {
            state: Mutex::new(WecomState::default()),
            connections: Mutex::new(HashMap::new()),
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
                let _ = handle.join();
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
        if let Ok(mut connections) = self.connections.lock() {
            connections.clear();
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

    fn remember_connection(&self, bot: &WecomBotConfig, connection: Arc<WecomConnection>) {
        if let Ok(mut connections) = self.connections.lock() {
            connections.insert(bot.id.clone(), Arc::clone(&connection));
            connections.insert(bot.bot_id.clone(), connection);
        }
    }

    fn forget_connection(&self, bot: &WecomBotConfig, connection: &Arc<WecomConnection>) {
        if let Ok(mut connections) = self.connections.lock() {
            connections.retain(|key, value| {
                let same_key = key == &bot.id || key == &bot.bot_id;
                !(same_key && Arc::ptr_eq(value, connection))
            });
        }
    }

    pub fn send_markdown_message(
        &self,
        bot_id: Option<&str>,
        peer_id: &str,
        content: &str,
    ) -> Result<String, String> {
        let connection = self.connection_for_bot(bot_id)?;
        if !connection.is_connected() {
            return Err("WeCom bot connection is not active.".to_string());
        }
        connection.send_markdown_message(&wecom_chatid_from_peer_id(peer_id), content)
    }

    fn connection_for_bot(&self, bot_id: Option<&str>) -> Result<Arc<WecomConnection>, String> {
        let connections = self
            .connections
            .lock()
            .map_err(|_| "Failed to lock WeCom connections".to_string())?;
        if let Some(bot_id) = bot_id.map(str::trim).filter(|value| !value.is_empty()) {
            return connections
                .get(bot_id)
                .cloned()
                .ok_or_else(|| format!("WeCom bot is not connected: {bot_id}"));
        }

        let mut unique = Vec::<Arc<WecomConnection>>::new();
        for connection in connections.values() {
            if !unique
                .iter()
                .any(|candidate| Arc::ptr_eq(candidate, connection))
            {
                unique.push(Arc::clone(connection));
            }
        }
        match unique.as_slice() {
            [connection] => Ok(Arc::clone(connection)),
            [] => Err("No WeCom bot connection is active.".to_string()),
            _ => Err("Multiple WeCom bot connections are active; bot_id is required.".to_string()),
        }
    }
}

pub struct WecomConnection {
    socket: Mutex<Option<WecomSocket>>,
    pending_acks: Mutex<HashMap<String, mpsc::Sender<Result<(), String>>>>,
    connected: AtomicBool,
}

impl Default for WecomConnection {
    fn default() -> Self {
        Self {
            socket: Mutex::new(None),
            pending_acks: Mutex::new(HashMap::new()),
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

    pub fn send_markdown_message(&self, chatid: &str, content: &str) -> Result<String, String> {
        let req_id = generate_req_id("aibot_send_msg");
        self.send_frame_waiting_for_ack(
            &req_id,
            json!({
                "cmd": "aibot_send_msg",
                "headers": { "req_id": req_id.clone() },
                "body": {
                    "chatid": chatid,
                    "msgtype": "markdown",
                    "markdown": {
                        "content": truncate_utf8(content, WECOM_TEXT_LIMIT),
                    }
                }
            }),
        )?;
        Ok(req_id)
    }

    fn send_frame_waiting_for_ack(&self, req_id: &str, frame: Value) -> Result<(), String> {
        let (sender, receiver) = mpsc::channel();
        self.pending_acks
            .lock()
            .map_err(|_| "Failed to lock WeCom pending acks".to_string())?
            .insert(req_id.to_string(), sender);
        if let Err(error) = self.send_frame(frame) {
            if let Ok(mut pending) = self.pending_acks.lock() {
                pending.remove(req_id);
            }
            return Err(error);
        }
        match receiver.recv_timeout(Duration::from_millis(WECOM_SEND_ACK_TIMEOUT_MS)) {
            Ok(result) => result,
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if let Ok(mut pending) = self.pending_acks.lock() {
                    pending.remove(req_id);
                }
                Err(format!("WeCom send ack timed out: {req_id}"))
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                Err(format!("WeCom send ack channel closed: {req_id}"))
            }
        }
    }

    fn complete_pending_ack(&self, frame: &WecomFrame) -> bool {
        let req_id = frame.headers.req_id.as_str();
        let sender = self
            .pending_acks
            .lock()
            .ok()
            .and_then(|mut pending| pending.remove(req_id));
        let Some(sender) = sender else {
            return false;
        };
        let result = match frame.errcode {
            Some(code) if code != 0 => Err(format!(
                "WeCom send ack failed: {}",
                frame
                    .errmsg
                    .clone()
                    .unwrap_or_else(|| format!("errcode {code}"))
            )),
            _ => Ok(()),
        };
        let _ = sender.send(result);
        true
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
                if manager.stop_flag.load(Ordering::SeqCst) {
                    connection.clear_socket();
                    return;
                }
                manager.remember_connection(&bot, Arc::clone(&connection));
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
                manager.forget_connection(&bot, &connection);
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
    manager.forget_connection(&bot, &connection);
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
    if connection.complete_pending_ack(&frame) {
        return Ok(());
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
    let peer_id = peer_id_for_message(&message);
    let stream_id = generate_req_id("stream");
    if try_route_bot_binding_message(
        manager,
        app,
        runtime_manager,
        connection,
        bot,
        &actor,
        role,
        &peer_id,
        &frame,
        &mut normalized,
        &stream_id,
    )? {
        return Ok(());
    }

    let prompt = match role {
        UserRole::Admin => {
            prepare_message_attachments(bot, &peer_id, &frame.headers.req_id, &mut normalized);
            normalized.to_prompt()
        }
        UserRole::User => {
            connection.send_stream(
                &frame.headers.req_id,
                &stream_id,
                "收到，正在判断是否符合普通用户范围...",
                false,
            )?;
            let decision = match evaluate_user_admission(
                manager,
                app,
                runtime_manager,
                bot,
                &actor,
                &normalized,
            ) {
                Ok(decision) => decision,
                Err(error) => {
                    connection.send_stream(
                        &frame.headers.req_id,
                        &stream_id,
                        &format!("普通用户准入判断失败：{}", error),
                        true,
                    )?;
                    return Ok(());
                }
            };
            if !decision.allow {
                connection.send_stream(
                    &frame.headers.req_id,
                    &stream_id,
                    &format!("未通过普通用户权限策略：{}", decision.reason),
                    true,
                )?;
                return Ok(());
            }
            prepare_message_attachments(bot, &peer_id, &frame.headers.req_id, &mut normalized);
            build_user_policy_prompt(&bot.user_access_policy, &normalized)
        }
    };
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

fn evaluate_user_admission(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    bot: &WecomBotConfig,
    actor: &str,
    normalized: &self::message::NormalizedMessage,
) -> Result<UserAdmissionDecision, String> {
    let policy = bot.user_access_policy.trim();
    if policy.is_empty() {
        return Ok(UserAdmissionDecision {
            allow: false,
            reason: "管理员未配置普通用户允许范围。".to_string(),
        });
    }

    let env_name = bot
        .default_env_name
        .clone()
        .or_else(|| config::read_config().ok().and_then(|cfg| cfg.current))
        .unwrap_or_else(|| "official".to_string());
    let resolved = config::resolve_claude_env(&env_name)?;
    let admission_peer_id = format!("admission:{actor}:{}", Utc::now().timestamp_millis());
    let prompt = build_user_admission_prompt(policy, actor, normalized);
    let summary = runtime_manager.create_session(
        app.clone(),
        HeadlessSessionOptions {
            env_name: resolved.env_name,
            perm_mode: "readonly".to_string(),
            working_dir: bot.workspace_dir.clone(),
            resume_session_id: None,
            initial_prompt: Some(prompt),
            max_budget_usd: Some(0.05),
            allowed_tools: Vec::new(),
            disallowed_tools: Vec::new(),
            env_vars: resolved.env_vars,
            source: HeadlessSessionSource::Wecom {
                bot_id: bot.bot_id.clone(),
                peer_id: admission_peer_id.clone(),
            },
        },
    )?;

    let result = wait_for_admission_decision(runtime_manager, &summary.runtime_id);
    if runtime_manager
        .summary(&summary.runtime_id)
        .is_some_and(|summary| summary.is_active)
    {
        let _ = runtime_manager.stop_session(app, &summary.runtime_id);
    }
    manager.clear_runtime_for_scope_if_matches(
        &bot.bot_id,
        &admission_peer_id,
        &summary.runtime_id,
    );
    result
}

fn wait_for_admission_decision(
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    runtime_id: &str,
) -> Result<UserAdmissionDecision, String> {
    let started_at = Instant::now();
    let mut last_error = None;
    while started_at.elapsed() < Duration::from_millis(WECOM_ADMISSION_TIMEOUT_MS) {
        let batch = runtime_manager.replay_events(runtime_id, None)?;
        for event in batch.events.iter().rev() {
            if let crate::event_bus::SessionEventPayload::ClaudeJson {
                message_type,
                raw_json,
            } = &event.payload
            {
                if message_type.as_deref() == Some("result") {
                    let text = extract_claude_result_text(raw_json)?;
                    match parse_admission_decision(&text) {
                        Ok(decision) => return Ok(decision),
                        Err(error) => last_error = Some(error),
                    }
                }
            }
        }

        if runtime_manager
            .summary(runtime_id)
            .is_some_and(|summary| !summary.is_active)
        {
            break;
        }
        thread::sleep(Duration::from_millis(WECOM_ADMISSION_POLL_MS));
    }

    Err(last_error
        .unwrap_or_else(|| "普通用户准入判断超时，未能得到模型返回的 JSON 决策。".to_string()))
}

fn extract_claude_result_text(raw_json: &str) -> Result<String, String> {
    let value: Value = serde_json::from_str(raw_json)
        .map_err(|error| format!("Failed to parse admission result event: {}", error))?;
    value
        .get("result")
        .or_else(|| value.get("error"))
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .filter(|text| !text.trim().is_empty())
        .ok_or_else(|| "Admission result event did not include result text.".to_string())
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

struct BotBindingRouteMarkers {
    quoted_task_id: Option<String>,
    correlation_marker: Option<String>,
}

fn extract_bot_binding_route_markers(
    message: &self::message::NormalizedMessage,
) -> BotBindingRouteMarkers {
    let texts = [
        message.quote.as_deref().unwrap_or(""),
        message.text.as_str(),
    ];
    BotBindingRouteMarkers {
        quoted_task_id: texts
            .iter()
            .find_map(|text| extract_marker_token(text, "ccem-task-")),
        correlation_marker: texts
            .iter()
            .find_map(|text| extract_marker_token(text, "ccem-bot-binding:")),
    }
}

fn extract_marker_token(text: &str, prefix: &str) -> Option<String> {
    let start = text.find(prefix)?;
    let token = text[start..]
        .split(|ch: char| {
            ch.is_whitespace()
                || matches!(
                    ch,
                    '`' | '"' | '\'' | '<' | '>' | '(' | ')' | '[' | ']' | '，' | '。' | '；'
                )
        })
        .next()
        .unwrap_or("")
        .trim_matches(|ch: char| matches!(ch, '.' | ',' | ':' | ';' | '。' | '，'))
        .to_string();
    (!token.is_empty()).then_some(token)
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

fn wecom_chatid_from_peer_id(peer_id: &str) -> String {
    peer_id
        .trim()
        .strip_prefix("single:")
        .or_else(|| peer_id.trim().strip_prefix("group:"))
        .unwrap_or_else(|| peer_id.trim())
        .to_string()
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

#[allow(clippy::too_many_arguments)]
fn try_route_bot_binding_message(
    manager: &Arc<WecomBridgeManager>,
    app: &AppHandle,
    runtime_manager: &Arc<HeadlessRuntimeManager>,
    connection: &Arc<WecomConnection>,
    bot: &WecomBotConfig,
    actor: &str,
    role: UserRole,
    peer_id: &str,
    frame: &WecomFrame,
    normalized: &mut self::message::NormalizedMessage,
    stream_id: &str,
) -> Result<bool, String> {
    let markers = extract_bot_binding_route_markers(normalized);
    if markers.quoted_task_id.is_none() && markers.correlation_marker.is_none() {
        return Ok(false);
    }

    let bot_binding_manager = app.state::<Arc<crate::bot_binding::BotBindingManager>>();
    let Some(binding) = bot_binding_manager.find_binding_for_route(
        RemotePlatform::Wecom,
        Some(&bot.bot_id),
        peer_id,
        markers.quoted_task_id.as_deref(),
        markers.correlation_marker.as_deref(),
    ) else {
        return Ok(false);
    };

    let prompt = match role {
        UserRole::Admin => {
            prepare_message_attachments(bot, peer_id, &frame.headers.req_id, normalized);
            normalized.to_prompt()
        }
        UserRole::User => {
            connection.send_stream(
                &frame.headers.req_id,
                stream_id,
                "收到，正在判断是否符合普通用户范围...",
                false,
            )?;
            let decision = match evaluate_user_admission(
                manager,
                app,
                runtime_manager,
                bot,
                actor,
                normalized,
            ) {
                Ok(decision) => decision,
                Err(error) => {
                    connection.send_stream(
                        &frame.headers.req_id,
                        stream_id,
                        &format!("普通用户准入判断失败：{}", error),
                        true,
                    )?;
                    return Ok(true);
                }
            };
            if !decision.allow {
                connection.send_stream(
                    &frame.headers.req_id,
                    stream_id,
                    &format!("未通过普通用户权限策略：{}", decision.reason),
                    true,
                )?;
                return Ok(true);
            }
            prepare_message_attachments(bot, peer_id, &frame.headers.req_id, normalized);
            build_user_policy_prompt(&bot.user_access_policy, normalized)
        }
    };

    let unified_state = app.state::<Arc<crate::unified_runtime::UnifiedSessionManager>>();
    let native_state = app.state::<Arc<crate::native_runtime::NativeRuntimeManager>>();
    bot_binding_manager.send_inbound_command(
        app,
        unified_state.inner().as_ref(),
        native_state.inner().clone(),
        crate::bot_binding::BotBindingInboundRequest {
            binding_id: binding.binding_id.clone(),
            text: prompt,
            quoted_task_id: markers
                .quoted_task_id
                .or_else(|| Some(binding.task_id.clone())),
            responder: Some(actor.to_string()),
        },
    )?;
    connection.send_stream(
        &frame.headers.req_id,
        stream_id,
        "已转入绑定的 CCEM 会话。",
        true,
    )?;
    Ok(true)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wecom_chatid_from_peer_id_strips_internal_scope_prefixes() {
        assert_eq!(wecom_chatid_from_peer_id("single:user_a"), "user_a");
        assert_eq!(wecom_chatid_from_peer_id("group:chat_1"), "chat_1");
        assert_eq!(wecom_chatid_from_peer_id(" raw_id "), "raw_id");
    }

    #[test]
    fn extract_bot_binding_route_markers_reads_quote_before_text() {
        let message = self::message::NormalizedMessage {
            text: "继续推进 ccem-task-other".to_string(),
            attachments: Vec::new(),
            quote: Some(
                "**Task**\n任务：`ccem-task-runtime`\n标记：`ccem-bot-binding:binding:ccem-task-runtime`"
                    .to_string(),
            ),
        };

        let markers = extract_bot_binding_route_markers(&message);

        assert_eq!(markers.quoted_task_id.as_deref(), Some("ccem-task-runtime"));
        assert_eq!(
            markers.correlation_marker.as_deref(),
            Some("ccem-bot-binding:binding:ccem-task-runtime")
        );
    }
}
