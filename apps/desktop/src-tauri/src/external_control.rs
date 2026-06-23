use crate::config::{self, resolve_claude_env, resolve_codex_runtime};
use crate::event_bus::ReplayBatch;
use crate::native_runtime::{
    NativeProvider, NativeRuntimeManager, NativeSessionOptions, NativeSessionSummary,
};
use crate::session_provenance::{register_launch, SessionProvenanceUpsert, DEFAULT_CONFIG_SOURCE};
use crate::system_proxy;
use crate::terminal;
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

const HEADER_READ_LIMIT: usize = 1024 * 1024;
const BODY_READ_LIMIT: usize = 4 * 1024 * 1024;
const SOCKET_IO_TIMEOUT: Duration = Duration::from_secs(10);
const SOCKET_RETRY_SLEEP: Duration = Duration::from_millis(10);

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalControlDescriptor {
    pub endpoint: String,
    pub token: String,
    pub pid: u32,
    pub created_at: String,
}

#[derive(Debug)]
struct ExternalControlRuntime {
    port: u16,
    shutdown_flag: Arc<AtomicBool>,
    join_handle: Option<thread::JoinHandle<()>>,
    published_descriptor: Option<PublishedControlDescriptor>,
}

#[derive(Debug)]
struct PublishedControlDescriptor {
    path: PathBuf,
    descriptor: ExternalControlDescriptor,
}

pub struct ExternalControlManager {
    runtime: Mutex<Option<ExternalControlRuntime>>,
    native_runtime: Arc<NativeRuntimeManager>,
    token: String,
}

#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSessionParams {
    provider: String,
    #[serde(alias = "workingDir")]
    cwd: Option<String>,
    prompt: String,
    env_name: Option<String>,
    permission_mode: Option<String>,
    runtime_permission_mode: Option<String>,
    provider_session_id: Option<String>,
    effort: Option<String>,
    open: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListSessionsParams {
    cwd: Option<String>,
    provider: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeIdParams {
    runtime_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventsParams {
    runtime_id: String,
    since_seq: Option<u64>,
    limit: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendInputParams {
    runtime_id: String,
    text: String,
    display_text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenSessionParams {
    link: String,
}

impl ExternalControlManager {
    pub fn new(native_runtime: Arc<NativeRuntimeManager>) -> Self {
        Self {
            runtime: Mutex::new(None),
            native_runtime,
            token: generate_token(),
        }
    }

    pub fn start(self: &Arc<Self>, app: AppHandle) -> Result<u16, String> {
        if let Some(port) = self.current_port() {
            return Ok(port);
        }

        let listener = TcpListener::bind(("127.0.0.1", 0))
            .map_err(|error| format!("Failed to bind external control listener: {}", error))?;
        listener
            .set_nonblocking(true)
            .map_err(|error| format!("Failed to configure external control listener: {}", error))?;
        let port = listener
            .local_addr()
            .map_err(|error| {
                format!(
                    "Failed to read external control listener address: {}",
                    error
                )
            })?
            .port();

        let endpoint = format!("http://127.0.0.1:{}/rpc", port);
        let descriptor = ExternalControlDescriptor {
            endpoint,
            token: self.token.clone(),
            pid: std::process::id(),
            created_at: now_rfc3339(),
        };
        let published_descriptor = if should_publish_control_descriptor() {
            let path = control_descriptor_path();
            write_descriptor_at(&path, &descriptor)?;
            Some(PublishedControlDescriptor {
                path,
                descriptor: descriptor.clone(),
            })
        } else {
            None
        };

        let shutdown_flag = Arc::new(AtomicBool::new(false));
        let shutdown_for_thread = Arc::clone(&shutdown_flag);
        let manager = Arc::clone(self);
        let join_handle = thread::spawn(move || {
            while !shutdown_for_thread.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((stream, _addr)) => {
                        let manager = Arc::clone(&manager);
                        let app = app.clone();
                        thread::spawn(move || {
                            manager.handle_connection(&app, stream);
                        });
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(20));
                    }
                    Err(error) => {
                        eprintln!("External control accept error: {}", error);
                        thread::sleep(Duration::from_millis(50));
                    }
                }
            }
        });

        *self.runtime.lock().unwrap() = Some(ExternalControlRuntime {
            port,
            shutdown_flag,
            join_handle: Some(join_handle),
            published_descriptor,
        });

        Ok(port)
    }

    pub fn shutdown(&self) {
        let runtime = self.runtime.lock().unwrap().take();
        let mut published_descriptor = None;
        if let Some(mut runtime) = runtime {
            runtime.shutdown_flag.store(true, Ordering::Relaxed);
            if let Some(handle) = runtime.join_handle.take() {
                let _ = handle.join();
            }
            published_descriptor = runtime.published_descriptor.take();
        }
        if let Some(published) = published_descriptor {
            remove_descriptor_if_owned(&published.path, &published.descriptor);
        }
    }

    pub fn current_port(&self) -> Option<u16> {
        self.runtime
            .lock()
            .unwrap()
            .as_ref()
            .map(|runtime| runtime.port)
    }

    fn handle_connection(self: &Arc<Self>, app: &AppHandle, mut stream: TcpStream) {
        let _ = stream.set_read_timeout(Some(SOCKET_IO_TIMEOUT));
        let _ = stream.set_write_timeout(Some(SOCKET_IO_TIMEOUT));
        let response = match read_http_request(&mut stream) {
            Ok(request) => self.handle_http_request(app, request),
            Err(error) => HttpResponse::json_error(400, None, -32700, &error),
        };
        let _ = stream.write_all(&response.to_bytes());
    }

    fn handle_http_request(&self, app: &AppHandle, request: HttpRequest) -> HttpResponse {
        if request.method != "POST" || request.path != "/rpc" {
            return HttpResponse::plain(404, "Not found");
        }
        let expected_auth = format!("Bearer {}", self.token);
        if request.headers.get("authorization").map(String::as_str) != Some(expected_auth.as_str())
        {
            return HttpResponse::json_error(401, None, -32001, "Unauthorized");
        }

        let rpc = match serde_json::from_slice::<JsonRpcRequest>(&request.body) {
            Ok(rpc) => rpc,
            Err(error) => {
                return HttpResponse::json_error(
                    400,
                    None,
                    -32700,
                    &format!("Invalid JSON: {}", error),
                );
            }
        };
        let id = rpc.id.clone();
        match self.handle_rpc(app, rpc) {
            Ok(result) => HttpResponse::json_result(id, result),
            Err(error) => HttpResponse::json_error(200, id, -32000, &error),
        }
    }

    fn handle_rpc(&self, app: &AppHandle, rpc: JsonRpcRequest) -> Result<Value, String> {
        match rpc.method.as_str() {
            "ccem.health" => Ok(json!({
                "ok": true,
                "pid": std::process::id(),
                "running": true,
                "version": env!("CARGO_PKG_VERSION"),
            })),
            "ccem.workspace.listSessions" => {
                let params = deserialize_params::<ListSessionsParams>(rpc.params)?;
                let sessions = self
                    .native_runtime
                    .list_sessions()
                    .into_iter()
                    .filter(|session| session_matches(session, &params))
                    .map(ControlSessionSummary::from)
                    .collect::<Vec<_>>();
                Ok(serde_json::to_value(sessions).map_err(|error| error.to_string())?)
            }
            "ccem.workspace.getSession" => {
                let params = deserialize_params::<RuntimeIdParams>(rpc.params)?;
                let session = self
                    .native_runtime
                    .list_sessions()
                    .into_iter()
                    .find(|session| session.runtime_id == params.runtime_id)
                    .map(ControlSessionSummary::from)
                    .ok_or_else(|| format!("Native runtime {} not found", params.runtime_id))?;
                Ok(serde_json::to_value(session).map_err(|error| error.to_string())?)
            }
            "ccem.workspace.getEvents" => {
                let params = deserialize_params::<EventsParams>(rpc.params)?;
                let events = self.native_runtime.replay_events_limited(
                    &params.runtime_id,
                    params.since_seq,
                    params.limit,
                )?;
                Ok(serde_json::to_value(ControlReplayBatch::from(events))
                    .map_err(|error| error.to_string())?)
            }
            "ccem.workspace.sendInput" => {
                let params = deserialize_params::<SendInputParams>(rpc.params)?;
                self.native_runtime.send_user_message(
                    app,
                    &params.runtime_id,
                    &params.text,
                    params.display_text.as_deref(),
                    None,
                )?;
                Ok(json!({ "ok": true }))
            }
            "ccem.workspace.openSession" => {
                let params = deserialize_params::<OpenSessionParams>(rpc.params)?;
                app.emit(
                    "ccem-control-request",
                    json!({
                        "kind": "openSession",
                        "link": params.link,
                    }),
                )
                .map_err(|error| format!("Failed to emit workspace open request: {}", error))?;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                Ok(json!({ "ok": true }))
            }
            "ccem.workspace.createSession" => {
                let params = deserialize_params::<CreateSessionParams>(rpc.params)?;
                let summary = self.create_session(app.clone(), params)?;
                Ok(serde_json::to_value(summary).map_err(|error| error.to_string())?)
            }
            method => Err(format!("Unknown method: {}", method)),
        }
    }

    fn create_session(
        &self,
        app: AppHandle,
        params: CreateSessionParams,
    ) -> Result<ControlCreateSessionResult, String> {
        let provider = parse_native_provider(&params.provider)?;
        let env_name = params
            .env_name
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .or_else(resolve_current_env)
            .unwrap_or_else(|| "official".to_string());
        let working_dir = resolve_working_dir(params.cwd);
        let perm_mode = resolve_effective_perm_mode(params.permission_mode);
        let runtime_perm_mode = params
            .runtime_permission_mode
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty() && value != &perm_mode);

        let options = match provider {
            NativeProvider::Claude => {
                let resolved = resolve_claude_env(&env_name)?;
                NativeSessionOptions {
                    provider,
                    env_name: resolved.env_name,
                    perm_mode,
                    runtime_perm_mode,
                    working_dir,
                    initial_prompt: Some(params.prompt),
                    display_prompt: None,
                    initial_images: None,
                    provider_session_id: params.provider_session_id,
                    helper_env_vars: resolved.env_vars.clone(),
                    terminal_env_vars: resolved.env_vars,
                    claude_path: terminal::resolve_claude_path(),
                    codex_path: None,
                    codex_base_url: None,
                    codex_api_key: None,
                    effort: params.effort,
                }
            }
            NativeProvider::Codex => {
                let resolved = resolve_codex_runtime(&env_name)?;
                let proxy_env_vars = system_proxy::resolve_codex_proxy_env();
                NativeSessionOptions {
                    provider,
                    env_name: if resolved.env_name.is_empty() {
                        env_name
                    } else {
                        resolved.env_name
                    },
                    perm_mode,
                    runtime_perm_mode,
                    working_dir,
                    initial_prompt: Some(params.prompt),
                    display_prompt: None,
                    initial_images: None,
                    provider_session_id: params.provider_session_id,
                    helper_env_vars: proxy_env_vars.clone(),
                    terminal_env_vars: proxy_env_vars,
                    claude_path: None,
                    codex_path: terminal::resolve_codex_path(),
                    codex_base_url: None,
                    codex_api_key: None,
                    effort: params.effort,
                }
            }
        };

        let open = params.open.unwrap_or(false);
        let summary = self.native_runtime.create_session(app.clone(), options)?;
        if let Err(error) = register_launch(SessionProvenanceUpsert {
            ccem_session_id: summary.runtime_id.clone(),
            client: summary.provider.as_str().to_string(),
            env_name: summary.env_name.clone(),
            config_source: Some(DEFAULT_CONFIG_SOURCE.to_string()),
            working_dir: summary.project_dir.clone(),
            perm_mode: Some(summary.perm_mode.clone()),
            launch_mode: "external_control".to_string(),
            started_via: "desktop_control".to_string(),
            source_session_id: summary.provider_session_id.clone(),
        }) {
            eprintln!(
                "Failed to register external-control launch provenance for {}: {}",
                summary.runtime_id, error
            );
        }

        let result = ControlCreateSessionResult::from(summary);
        if open {
            let _ = app.emit(
                "ccem-control-request",
                json!({
                    "kind": "openSession",
                    "link": result.link,
                }),
            );
        }
        Ok(result)
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ControlCreateSessionResult {
    runtime_id: String,
    provider: String,
    provider_session_id: Option<String>,
    cwd: String,
    status: String,
    link: String,
}

impl From<NativeSessionSummary> for ControlCreateSessionResult {
    fn from(summary: NativeSessionSummary) -> Self {
        let link = build_runtime_link(&summary);
        Self {
            runtime_id: summary.runtime_id,
            provider: summary.provider.as_str().to_string(),
            provider_session_id: summary.provider_session_id,
            cwd: summary.project_dir,
            status: summary.status,
            link,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ControlSessionSummary {
    runtime_id: String,
    provider: String,
    provider_session_id: Option<String>,
    project_dir: String,
    env_name: String,
    perm_mode: String,
    runtime_perm_mode: Option<String>,
    effort: Option<String>,
    status: String,
    created_at: String,
    updated_at: String,
    is_active: bool,
    last_event_seq: Option<u64>,
    last_error: Option<String>,
    link: String,
}

impl From<NativeSessionSummary> for ControlSessionSummary {
    fn from(summary: NativeSessionSummary) -> Self {
        let link = build_runtime_link(&summary);
        Self {
            runtime_id: summary.runtime_id,
            provider: summary.provider.as_str().to_string(),
            provider_session_id: summary.provider_session_id,
            project_dir: summary.project_dir,
            env_name: summary.env_name,
            perm_mode: summary.perm_mode,
            runtime_perm_mode: summary.runtime_perm_mode,
            effort: summary.effort,
            status: summary.status,
            created_at: summary.created_at.to_rfc3339(),
            updated_at: summary.updated_at.to_rfc3339(),
            is_active: summary.is_active,
            last_event_seq: summary.last_event_seq,
            last_error: summary.last_error,
            link,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ControlReplayBatch {
    gap_detected: bool,
    oldest_available_seq: Option<u64>,
    newest_available_seq: Option<u64>,
    events: Vec<Value>,
}

impl From<ReplayBatch> for ControlReplayBatch {
    fn from(batch: ReplayBatch) -> Self {
        Self {
            gap_detected: batch.gap_detected,
            oldest_available_seq: batch.oldest_available_seq,
            newest_available_seq: batch.newest_available_seq,
            events: batch
                .events
                .into_iter()
                .filter_map(|event| serde_json::to_value(event).ok())
                .collect(),
        }
    }
}

struct HttpRequest {
    method: String,
    path: String,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

struct HttpResponse {
    status: u16,
    content_type: &'static str,
    body: Vec<u8>,
}

impl HttpResponse {
    fn plain(status: u16, body: &str) -> Self {
        Self {
            status,
            content_type: "text/plain; charset=utf-8",
            body: body.as_bytes().to_vec(),
        }
    }

    fn json_result(id: Option<Value>, result: Value) -> Self {
        Self::json(
            200,
            json!({
                "jsonrpc": "2.0",
                "id": id.unwrap_or(Value::Null),
                "result": result,
            }),
        )
    }

    fn json_error(status: u16, id: Option<Value>, code: i64, message: &str) -> Self {
        Self::json(
            status,
            json!({
                "jsonrpc": "2.0",
                "id": id.unwrap_or(Value::Null),
                "error": {
                    "code": code,
                    "message": message,
                }
            }),
        )
    }

    fn json(status: u16, body: Value) -> Self {
        Self {
            status,
            content_type: "application/json",
            body: serde_json::to_vec(&body).unwrap_or_else(|_| b"{}".to_vec()),
        }
    }

    fn to_bytes(&self) -> Vec<u8> {
        let status_text = match self.status {
            200 => "OK",
            400 => "Bad Request",
            401 => "Unauthorized",
            404 => "Not Found",
            _ => "OK",
        };
        let mut output = format!(
            "HTTP/1.1 {} {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            self.status,
            status_text,
            self.content_type,
            self.body.len()
        )
        .into_bytes();
        output.extend_from_slice(&self.body);
        output
    }
}

fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest, String> {
    let mut buffer = Vec::new();
    let header_end = loop {
        let mut chunk = [0_u8; 4096];
        match stream.read(&mut chunk) {
            Ok(0) => return Err("Connection closed before headers".to_string()),
            Ok(size) => {
                buffer.extend_from_slice(&chunk[..size]);
                if buffer.len() > HEADER_READ_LIMIT {
                    return Err("Request headers are too large".to_string());
                }
                if let Some(pos) = find_header_end(&buffer) {
                    break pos;
                }
            }
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                ) =>
            {
                thread::sleep(SOCKET_RETRY_SLEEP);
            }
            Err(error) => return Err(format!("Failed to read request: {}", error)),
        }
    };

    let headers_raw = String::from_utf8_lossy(&buffer[..header_end]);
    let mut lines = headers_raw.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Missing request line".to_string())?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts.next().unwrap_or_default().to_string();
    let path = request_parts.next().unwrap_or_default().to_string();
    let mut headers = HashMap::new();
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            headers.insert(name.trim().to_lowercase(), value.trim().to_string());
        }
    }

    let content_length = headers
        .get("content-length")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);
    if content_length > BODY_READ_LIMIT {
        return Err("Request body is too large".to_string());
    }

    let body_start = header_end + 4;
    let mut body = buffer.get(body_start..).unwrap_or_default().to_vec();
    while body.len() < content_length {
        let mut chunk = [0_u8; 4096];
        match stream.read(&mut chunk) {
            Ok(0) => break,
            Ok(size) => body.extend_from_slice(&chunk[..size]),
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                ) =>
            {
                thread::sleep(SOCKET_RETRY_SLEEP);
            }
            Err(error) => return Err(format!("Failed to read request body: {}", error)),
        }
    }
    body.truncate(content_length);

    Ok(HttpRequest {
        method,
        path,
        headers,
        body,
    })
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

fn deserialize_params<T: for<'de> Deserialize<'de>>(params: Value) -> Result<T, String> {
    serde_json::from_value(params).map_err(|error| format!("Invalid params: {}", error))
}

fn session_matches(session: &NativeSessionSummary, params: &ListSessionsParams) -> bool {
    if let Some(cwd) = params
        .cwd
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if session.project_dir != cwd {
            return false;
        }
    }
    if let Some(provider) = params
        .provider
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if session.provider.as_str() != provider {
            return false;
        }
    }
    if let Some(status) = params
        .status
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if session.status != status {
            return false;
        }
    }
    true
}

fn parse_native_provider(provider: &str) -> Result<NativeProvider, String> {
    match provider.trim().to_lowercase().as_str() {
        "claude" => Ok(NativeProvider::Claude),
        "codex" => Ok(NativeProvider::Codex),
        other => Err(format!(
            "Unsupported native provider '{}'. Use claude or codex.",
            other
        )),
    }
}

fn resolve_current_env() -> Option<String> {
    config::read_config()
        .ok()
        .and_then(|cfg| cfg.current)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn resolve_working_dir(cwd: Option<String>) -> String {
    cwd.map(|dir| dir.trim().to_string())
        .filter(|dir| !dir.is_empty())
        .or_else(config::get_default_working_dir)
        .or_else(|| dirs::home_dir().map(|path| path.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string())
}

fn resolve_default_perm_mode() -> String {
    config::read_config()
        .ok()
        .and_then(|cfg| cfg.default_mode)
        .map(|mode| mode.trim().to_string())
        .filter(|mode| !mode.is_empty())
        .unwrap_or_else(|| "dev".to_string())
}

fn resolve_effective_perm_mode(perm_mode: Option<String>) -> String {
    perm_mode
        .map(|mode| mode.trim().to_string())
        .filter(|mode| !mode.is_empty())
        .unwrap_or_else(resolve_default_perm_mode)
}

fn build_runtime_link(summary: &NativeSessionSummary) -> String {
    let mut link = format!(
        "ccem://workspace/session?source={}&idKind=runtime&id={}&runtimeId={}&cwd={}&focus=live",
        summary.provider.as_str(),
        urlencoding::encode(&summary.runtime_id),
        urlencoding::encode(&summary.runtime_id),
        urlencoding::encode(&summary.project_dir),
    );
    if let Some(provider_session_id) = summary.provider_session_id.as_deref() {
        link.push_str("&providerSessionId=");
        link.push_str(&urlencoding::encode(provider_session_id));
    }
    link
}

fn control_descriptor_path() -> PathBuf {
    config::get_ccem_dir().join("control.json")
}

fn should_publish_control_descriptor() -> bool {
    let override_value = std::env::var("CCEM_DESKTOP_PUBLISH_CONTROL_DESCRIPTOR").ok();
    should_publish_control_descriptor_for_env(cfg!(debug_assertions), override_value.as_deref())
}

// Debug builds include `pnpm tauri dev`; keep them from overwriting the release
// app's global discovery descriptor unless a developer opts in explicitly.
fn should_publish_control_descriptor_for_env(
    debug_assertions: bool,
    override_value: Option<&str>,
) -> bool {
    if !debug_assertions {
        return true;
    }
    override_value
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

fn write_descriptor_at(path: &Path, descriptor: &ExternalControlDescriptor) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create CCEM config directory: {}", error))?;
    }
    let content = serde_json::to_vec_pretty(descriptor)
        .map_err(|error| format!("Failed to encode control descriptor: {}", error))?;
    let temp_path = path.with_extension(format!("json.{}.tmp", std::process::id()));
    write_private_file(&temp_path, &content)?;
    fs::rename(&temp_path, &path)
        .map_err(|error| format!("Failed to publish control descriptor: {}", error))?;
    apply_private_file_permissions(path);
    Ok(())
}

#[cfg(unix)]
fn write_private_file(path: &Path, content: &[u8]) -> Result<(), String> {
    use std::os::unix::fs::OpenOptionsExt;
    let mut file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .mode(0o600)
        .open(path)
        .map_err(|error| format!("Failed to write control descriptor: {}", error))?;
    file.write_all(content)
        .map_err(|error| format!("Failed to write control descriptor: {}", error))
}

#[cfg(not(unix))]
fn write_private_file(path: &Path, content: &[u8]) -> Result<(), String> {
    fs::write(path, content)
        .map_err(|error| format!("Failed to write control descriptor: {}", error))
}

#[cfg(unix)]
fn apply_private_file_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(metadata) = fs::metadata(path) {
        let mut permissions = metadata.permissions();
        permissions.set_mode(0o600);
        let _ = fs::set_permissions(path, permissions);
    }
}

#[cfg(not(unix))]
fn apply_private_file_permissions(_path: &Path) {}

fn remove_descriptor_if_owned(path: &Path, expected: &ExternalControlDescriptor) {
    let Ok(content) = fs::read_to_string(path) else {
        return;
    };
    let Ok(current) = serde_json::from_str::<ExternalControlDescriptor>(&content) else {
        return;
    };
    if descriptor_owned_by_runtime(&current, expected) {
        let _ = fs::remove_file(path);
    }
}

fn descriptor_owned_by_runtime(
    current: &ExternalControlDescriptor,
    expected: &ExternalControlDescriptor,
) -> bool {
    current.endpoint == expected.endpoint
        && current.pid == expected.pid
        && current.token == expected.token
}

fn generate_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(48)
        .map(char::from)
        .collect()
}

fn now_rfc3339() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    format!("{}", timestamp)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_descriptor(endpoint: &str, token: &str, pid: u32) -> ExternalControlDescriptor {
        ExternalControlDescriptor {
            endpoint: endpoint.to_string(),
            token: token.to_string(),
            pid,
            created_at: "1234567890".to_string(),
        }
    }

    fn temp_control_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or_default();
        std::env::temp_dir().join(format!(
            "ccem-external-control-{name}-{}-{unique}.json",
            std::process::id()
        ))
    }

    #[test]
    fn debug_build_does_not_publish_descriptor_without_override() {
        assert!(!should_publish_control_descriptor_for_env(true, None));
        assert!(!should_publish_control_descriptor_for_env(true, Some("")));
        assert!(!should_publish_control_descriptor_for_env(true, Some("0")));
        assert!(!should_publish_control_descriptor_for_env(
            true,
            Some("false")
        ));
    }

    #[test]
    fn debug_build_allows_explicit_descriptor_publish_override() {
        assert!(should_publish_control_descriptor_for_env(true, Some("1")));
        assert!(should_publish_control_descriptor_for_env(
            true,
            Some("true")
        ));
        assert!(should_publish_control_descriptor_for_env(
            true,
            Some(" YES ")
        ));
        assert!(should_publish_control_descriptor_for_env(true, Some("on")));
    }

    #[test]
    fn release_build_publishes_descriptor_by_default() {
        assert!(should_publish_control_descriptor_for_env(false, None));
        assert!(should_publish_control_descriptor_for_env(false, Some("0")));
    }

    #[test]
    fn descriptor_ownership_requires_endpoint_pid_and_token() {
        let expected = test_descriptor("http://127.0.0.1:1234/rpc", "token-a", 111);
        assert!(descriptor_owned_by_runtime(&expected, &expected));
        assert!(!descriptor_owned_by_runtime(
            &test_descriptor("http://127.0.0.1:5678/rpc", "token-a", 111),
            &expected
        ));
        assert!(!descriptor_owned_by_runtime(
            &test_descriptor("http://127.0.0.1:1234/rpc", "token-b", 111),
            &expected
        ));
        assert!(!descriptor_owned_by_runtime(
            &test_descriptor("http://127.0.0.1:1234/rpc", "token-a", 222),
            &expected
        ));
    }

    #[test]
    fn remove_descriptor_if_owned_deletes_matching_descriptor() {
        let path = temp_control_path("owned");
        let descriptor = test_descriptor("http://127.0.0.1:1234/rpc", "token-a", 111);
        write_descriptor_at(&path, &descriptor).unwrap();

        remove_descriptor_if_owned(&path, &descriptor);

        assert!(!path.exists());
    }

    #[test]
    fn remove_descriptor_if_owned_keeps_other_runtime_descriptor() {
        let path = temp_control_path("other-runtime");
        let expected = test_descriptor("http://127.0.0.1:1234/rpc", "token-a", 111);
        let other_runtime = test_descriptor("http://127.0.0.1:5678/rpc", "token-b", 222);
        write_descriptor_at(&path, &other_runtime).unwrap();

        remove_descriptor_if_owned(&path, &expected);

        assert!(path.exists());
        let _ = fs::remove_file(path);
    }
}
