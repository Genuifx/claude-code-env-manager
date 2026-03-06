use reqwest::blocking::Client;
use reqwest::header::HeaderMap;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, SyncSender};
use std::sync::{Arc, Mutex, RwLock};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

use crate::config::{self, DesktopSettings};
use crate::session::SessionManager;

const FIXED_PROXY_PORT: u16 = 17890;
const DEFAULT_OVERLOAD_THRESHOLD: u64 = 200;
const DEFAULT_CODEX_UPSTREAM: &str = "https://api.openai.com/v1";
const DEFAULT_LOG_MAX_BYTES: u64 = 500 * 1024 * 1024;
const HEADER_READ_LIMIT: usize = 8 * 1024 * 1024;
const BODY_READ_LIMIT: usize = 64 * 1024 * 1024;
const LIST_LIMIT_MAX: usize = 200;
const LOG_SAMPLE_LIMIT_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyDebugState {
    pub enabled: bool,
    pub running: bool,
    pub listen_port: Option<u16>,
    pub base_url: Option<String>,
    pub codex_upstream_base_url: String,
    pub log_max_bytes: u64,
    pub record_mode: String,
    pub route_count: usize,
    pub metrics: ProxyMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProxyMetrics {
    pub total_requests: u64,
    pub success_requests: u64,
    pub failed_requests: u64,
    pub route_not_found_requests: u64,
    pub avg_response_ms: u64,
    pub active_connections: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyTrafficPage {
    pub items: Vec<ProxyTrafficItem>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyTrafficItem {
    pub id: String,
    pub timestamp: i64,
    pub client: String,
    pub session_id: String,
    pub env_name: String,
    pub method: String,
    pub path: String,
    pub query: Option<String>,
    pub status: u16,
    pub duration_ms: u64,
    pub request_body_size: u64,
    pub response_body_size: u64,
    pub prompt_preview: Option<String>,
    pub log_dropped: bool,
    pub response_incomplete: bool,
    pub log_partial: bool,
    pub log_dropped_bytes: u64,
    pub reduced: Option<ReducedStreamLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyTrafficDetail {
    pub item: ProxyTrafficItem,
    pub request_headers: HashMap<String, String>,
    pub response_headers: HashMap<String, String>,
    pub request_body: Option<String>,
    pub response_body: Option<String>,
    pub reduced: Option<ReducedStreamLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ReducedStreamLog {
    pub final_text: String,
    pub finish_reason: Option<String>,
    pub stream_status: String,
    pub first_token_ms: Option<u64>,
    pub total_stream_ms: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct RegisterRouteRequest {
    pub session_id: String,
    pub client: String,
    pub env_name: String,
    pub upstream_base_url: String,
}

#[derive(Debug, Clone)]
struct RouteBinding {
    session_id: String,
    client: String,
    env_name: String,
    upstream_base_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TrafficRecord {
    id: String,
    timestamp: i64,
    client: String,
    session_id: String,
    env_name: String,
    method: String,
    path: String,
    query: Option<String>,
    status: u16,
    duration_ms: u64,
    request_headers: HashMap<String, String>,
    response_headers: HashMap<String, String>,
    request_body_size: u64,
    response_body_size: u64,
    request_body_file: Option<String>,
    response_body_file: Option<String>,
    prompt_preview: Option<String>,
    log_dropped: bool,
    response_incomplete: bool,
    log_partial: bool,
    log_dropped_bytes: u64,
    reduced: Option<ReducedStreamLog>,
}

impl TrafficRecord {
    fn to_item(&self) -> ProxyTrafficItem {
        ProxyTrafficItem {
            id: self.id.clone(),
            timestamp: self.timestamp,
            client: self.client.clone(),
            session_id: self.session_id.clone(),
            env_name: self.env_name.clone(),
            method: self.method.clone(),
            path: self.path.clone(),
            query: self.query.clone(),
            status: self.status,
            duration_ms: self.duration_ms,
            request_body_size: self.request_body_size,
            response_body_size: self.response_body_size,
            prompt_preview: self.prompt_preview.clone(),
            log_dropped: self.log_dropped,
            response_incomplete: self.response_incomplete,
            log_partial: self.log_partial,
            log_dropped_bytes: self.log_dropped_bytes,
            reduced: self.reduced.clone(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RecordMode {
    Full,
    Metadata,
}

impl RecordMode {
    fn from_str(raw: &str) -> Self {
        match raw.trim().to_ascii_lowercase().as_str() {
            "metadata" => Self::Metadata,
            _ => Self::Full,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Metadata => "metadata",
        }
    }
}

#[derive(Debug, Clone)]
struct RuntimeConfig {
    enabled: bool,
    codex_upstream_base_url: String,
    log_max_bytes: u64,
    record_mode: RecordMode,
}

impl RuntimeConfig {
    fn from_settings(settings: &DesktopSettings) -> Self {
        let codex_url = if settings
            .proxy_debug_codex_upstream_base_url
            .trim()
            .is_empty()
        {
            DEFAULT_CODEX_UPSTREAM.to_string()
        } else {
            settings.proxy_debug_codex_upstream_base_url.clone()
        };

        let max_bytes = if settings.proxy_debug_log_max_bytes == 0 {
            DEFAULT_LOG_MAX_BYTES
        } else {
            settings.proxy_debug_log_max_bytes
        };

        Self {
            enabled: settings.proxy_debug_enabled,
            codex_upstream_base_url: codex_url,
            log_max_bytes: max_bytes,
            record_mode: RecordMode::from_str(&settings.proxy_debug_record_mode),
        }
    }
}

#[derive(Default)]
struct MetricsState {
    total_requests: u64,
    success_requests: u64,
    failed_requests: u64,
    route_not_found_requests: u64,
    total_response_ms: u64,
    active_connections: u64,
}

struct ProxyRuntime {
    port: u16,
    shutdown_flag: Arc<AtomicBool>,
    join_handle: Option<std::thread::JoinHandle<()>>,
}

#[derive(Clone)]
struct ParsedProxyPath {
    client: String,
    route_id: String,
    upstream_path: String,
}

struct ParsedRequest {
    method: String,
    target: String,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

#[derive(Default)]
struct LogSpoolState {
    dropped: AtomicBool,
    partial: AtomicBool,
    dropped_bytes: AtomicU64,
    response_bytes: AtomicU64,
}

#[derive(Default)]
struct WriterOutcome {
    error: Option<String>,
}

struct ForwardMeta {
    id: String,
    timestamp: i64,
    client: String,
    session_id: String,
    env_name: String,
    method: String,
    path: String,
    query: Option<String>,
    request_headers: HashMap<String, String>,
    response_headers: HashMap<String, String>,
    request_body_size: u64,
    request_body_file: Option<String>,
    response_file_tmp: Option<PathBuf>,
    response_file_final: Option<PathBuf>,
    start: Instant,
    status: u16,
    prompt_preview: Option<String>,
    is_sse: bool,
}

pub struct ProxyDebugManager {
    session_manager: Arc<SessionManager>,
    app_handle: Mutex<Option<AppHandle>>,
    runtime: Mutex<Option<ProxyRuntime>>,
    runtime_config: Mutex<RuntimeConfig>,
    routes: RwLock<HashMap<String, RouteBinding>>,
    metrics: Mutex<MetricsState>,
    client: Client,
}

impl ProxyDebugManager {
    pub fn new(session_manager: Arc<SessionManager>) -> Result<Arc<Self>, String> {
        let settings = config::read_settings().unwrap_or_default();
        let runtime_config = RuntimeConfig::from_settings(&settings);
        ensure_proxy_debug_dirs()?;

        let client = Client::builder()
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(60 * 60))
            .pool_idle_timeout(Duration::from_secs(90))
            .build()
            .map_err(|e| format!("Failed to build proxy client: {}", e))?;

        Ok(Arc::new(Self {
            session_manager,
            app_handle: Mutex::new(None),
            runtime: Mutex::new(None),
            runtime_config: Mutex::new(runtime_config),
            routes: RwLock::new(HashMap::new()),
            metrics: Mutex::new(MetricsState::default()),
            client,
        }))
    }

    pub fn set_app_handle(&self, app: AppHandle) {
        *self.app_handle.lock().unwrap() = Some(app);
    }

    pub fn is_enabled(&self) -> bool {
        self.runtime_config.lock().unwrap().enabled
    }

    pub fn codex_upstream_base_url(&self) -> String {
        self.runtime_config
            .lock()
            .unwrap()
            .codex_upstream_base_url
            .clone()
    }

    pub async fn maybe_start_on_boot(self: &Arc<Self>) {
        if !self.is_enabled() {
            return;
        }
        if let Err(err) = self.ensure_running().await {
            eprintln!("Proxy debug startup failed: {}", err);
            self.emit_status();
        }
    }

    pub async fn shutdown(self: &Arc<Self>) {
        self.stop_runtime();
    }

    pub async fn ensure_running(self: &Arc<Self>) -> Result<u16, String> {
        if let Some(port) = self.current_port() {
            return Ok(port);
        }

        let listener = match TcpListener::bind(("127.0.0.1", FIXED_PROXY_PORT)) {
            Ok(listener) => listener,
            Err(_) => TcpListener::bind(("127.0.0.1", 0))
                .map_err(|e| format!("Failed to bind proxy listener: {}", e))?,
        };

        listener
            .set_nonblocking(true)
            .map_err(|e| format!("Failed to set proxy listener nonblocking: {}", e))?;

        let port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get proxy listen address: {}", e))?
            .port();

        let shutdown_flag = Arc::new(AtomicBool::new(false));
        let manager = Arc::clone(self);
        let shutdown_for_thread = Arc::clone(&shutdown_flag);

        let join_handle = thread::spawn(move || {
            while !shutdown_for_thread.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((stream, _addr)) => {
                        let manager = Arc::clone(&manager);
                        thread::spawn(move || {
                            manager.handle_connection(stream);
                        });
                    }
                    Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(20));
                    }
                    Err(err) => {
                        eprintln!("Proxy accept error: {}", err);
                        thread::sleep(Duration::from_millis(50));
                    }
                }
            }
        });

        *self.runtime.lock().unwrap() = Some(ProxyRuntime {
            port,
            shutdown_flag,
            join_handle: Some(join_handle),
        });

        self.emit_status();
        Ok(port)
    }

    fn stop_runtime(&self) {
        let runtime = self.runtime.lock().unwrap().take();
        if let Some(mut runtime) = runtime {
            runtime.shutdown_flag.store(true, Ordering::Relaxed);
            if let Some(handle) = runtime.join_handle.take() {
                let _ = handle.join();
            }
        }
        self.routes.write().unwrap().clear();
        self.emit_status();
    }

    pub fn current_port(&self) -> Option<u16> {
        self.runtime.lock().unwrap().as_ref().map(|r| r.port)
    }

    pub async fn register_route(
        self: &Arc<Self>,
        req: RegisterRouteRequest,
    ) -> Result<String, String> {
        validate_upstream_url(&req.upstream_base_url)?;

        let port = self.ensure_running().await?;
        let route_id = generate_route_id();
        let binding = RouteBinding {
            session_id: req.session_id,
            client: req.client.clone(),
            env_name: req.env_name,
            upstream_base_url: req.upstream_base_url,
        };

        self.routes
            .write()
            .unwrap()
            .insert(route_id.clone(), binding);
        self.emit_status();

        Ok(format!(
            "http://127.0.0.1:{}/proxy/{}/{}",
            port, req.client, route_id
        ))
    }

    pub fn remove_session_routes(&self, session_id: &str) {
        let mut routes = self.routes.write().unwrap();
        routes.retain(|_, route| route.session_id != session_id);
        drop(routes);
        self.emit_status();
    }

    pub fn get_state(&self) -> ProxyDebugState {
        let runtime_config = self.runtime_config.lock().unwrap().clone();
        let runtime_guard = self.runtime.lock().unwrap();
        let metrics_guard = self.metrics.lock().unwrap();
        let route_count = self.routes.read().unwrap().len();

        let avg_response_ms = if metrics_guard.success_requests > 0 {
            metrics_guard.total_response_ms / metrics_guard.success_requests
        } else {
            0
        };

        let listen_port = runtime_guard.as_ref().map(|runtime| runtime.port);

        ProxyDebugState {
            enabled: runtime_config.enabled,
            running: runtime_guard.is_some(),
            listen_port,
            base_url: listen_port.map(|p| format!("http://127.0.0.1:{}", p)),
            codex_upstream_base_url: runtime_config.codex_upstream_base_url,
            log_max_bytes: runtime_config.log_max_bytes,
            record_mode: runtime_config.record_mode.as_str().to_string(),
            route_count,
            metrics: ProxyMetrics {
                total_requests: metrics_guard.total_requests,
                success_requests: metrics_guard.success_requests,
                failed_requests: metrics_guard.failed_requests,
                route_not_found_requests: metrics_guard.route_not_found_requests,
                avg_response_ms,
                active_connections: metrics_guard.active_connections,
            },
        }
    }

    pub async fn set_enabled(self: &Arc<Self>, enabled: bool) -> Result<ProxyDebugState, String> {
        let mut settings = config::read_settings().unwrap_or_default();
        settings.proxy_debug_enabled = enabled;
        config::write_settings(&settings)?;
        *self.runtime_config.lock().unwrap() = RuntimeConfig::from_settings(&settings);

        if enabled {
            self.ensure_running().await?;
        } else {
            self.stop_runtime();
        }

        self.emit_status();
        Ok(self.get_state())
    }

    pub async fn update_config(
        self: &Arc<Self>,
        codex_upstream_base_url: String,
        record_mode: Option<String>,
    ) -> Result<ProxyDebugState, String> {
        validate_upstream_url(&codex_upstream_base_url)?;

        let selected_mode = match record_mode.as_deref() {
            Some(raw) if raw.eq_ignore_ascii_case("full") => RecordMode::Full,
            Some(raw) if raw.eq_ignore_ascii_case("metadata") => RecordMode::Metadata,
            Some(raw) => {
                return Err(format!(
                    "Invalid record mode '{}'. Use 'full' or 'metadata'.",
                    raw
                ))
            }
            None => self.runtime_config.lock().unwrap().record_mode,
        };

        let mut settings = config::read_settings().unwrap_or_default();
        settings.proxy_debug_codex_upstream_base_url = codex_upstream_base_url;
        settings.proxy_debug_record_mode = selected_mode.as_str().to_string();
        config::write_settings(&settings)?;
        *self.runtime_config.lock().unwrap() = RuntimeConfig::from_settings(&settings);

        if self.is_enabled() {
            self.ensure_running().await?;
        }

        self.emit_status();
        Ok(self.get_state())
    }

    pub fn list_traffic(
        &self,
        limit: u32,
        cursor: Option<String>,
    ) -> Result<ProxyTrafficPage, String> {
        let mut records = read_all_records()?;
        records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp).then_with(|| b.id.cmp(&a.id)));

        if let Some(cursor) = cursor {
            if let Some((cursor_ts, cursor_id)) = parse_cursor(&cursor) {
                records.retain(|record| {
                    record.timestamp < cursor_ts
                        || (record.timestamp == cursor_ts
                            && record.id.as_str() < cursor_id.as_str())
                });
            }
        }

        let limit = (limit as usize).clamp(1, LIST_LIMIT_MAX);
        let has_more = records.len() > limit;
        records.truncate(limit);

        let next_cursor = if has_more {
            records
                .last()
                .map(|record| format!("{}:{}", record.timestamp, record.id))
        } else {
            None
        };

        Ok(ProxyTrafficPage {
            items: records.into_iter().map(|record| record.to_item()).collect(),
            next_cursor,
        })
    }

    pub fn get_traffic_detail(&self, id: String) -> Result<ProxyTrafficDetail, String> {
        let record = read_all_records()?
            .into_iter()
            .find(|record| record.id == id)
            .ok_or_else(|| "Traffic record not found".to_string())?;

        // Request body should stay complete for JSON-friendly debug rendering.
        // Response body can be much larger (especially SSE), keep a safety cap.
        let request_body = read_body_preview(record.request_body_file.as_deref(), None)?;
        let response_body = read_body_preview(record.response_body_file.as_deref(), Some(200_000))?;
        let reduced = recompute_reduced_detail(&record)?;

        Ok(ProxyTrafficDetail {
            item: record.to_item(),
            request_headers: record.request_headers.clone(),
            response_headers: record.response_headers.clone(),
            request_body,
            response_body,
            reduced,
        })
    }

    pub fn clear_traffic(&self) -> Result<(), String> {
        let root = proxy_debug_dir();
        if root.exists() {
            fs::remove_dir_all(&root)
                .map_err(|e| format!("Failed to remove proxy debug logs: {}", e))?;
        }
        ensure_proxy_debug_dirs()?;
        Ok(())
    }

    fn emit_status(&self) {
        if let Some(app) = self.app_handle.lock().unwrap().as_ref() {
            let _ = app.emit("proxy-status", self.get_state());
        }
    }

    fn emit_traffic(&self, item: &ProxyTrafficItem) {
        if let Some(app) = self.app_handle.lock().unwrap().as_ref() {
            let _ = app.emit("proxy-traffic", item);
        }
    }

    fn handle_connection(self: Arc<Self>, mut stream: TcpStream) {
        let _ = stream.set_read_timeout(Some(Duration::from_secs(30)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(30)));

        {
            let mut metrics = self.metrics.lock().unwrap();
            metrics.total_requests = metrics.total_requests.saturating_add(1);
            if metrics.active_connections >= DEFAULT_OVERLOAD_THRESHOLD {
                metrics.failed_requests = metrics.failed_requests.saturating_add(1);
                drop(metrics);
                let _ =
                    write_error_response(&mut stream, 503, "PROXY_OVERLOADED", "Proxy overloaded");
                return;
            }
            metrics.active_connections = metrics.active_connections.saturating_add(1);
        }

        let req = match read_http_request(&mut stream) {
            Ok(req) => req,
            Err(err) => {
                self.finish_failed_request(None);
                let _ = write_error_response(
                    &mut stream,
                    400,
                    "BAD_REQUEST",
                    &format!("Failed to parse request: {}", err),
                );
                return;
            }
        };

        let (raw_path, query) = split_target(&req.target);
        let parsed = match parse_proxy_path(raw_path) {
            Some(parsed) => parsed,
            None => {
                self.finish_failed_request(None);
                let _ =
                    write_error_response(&mut stream, 404, "ROUTE_NOT_FOUND", "Route not found");
                return;
            }
        };

        let route = {
            let routes = self.routes.read().unwrap();
            routes.get(&parsed.route_id).cloned()
        };

        let route = match route {
            Some(route) => route,
            None => {
                {
                    let mut metrics = self.metrics.lock().unwrap();
                    metrics.route_not_found_requests =
                        metrics.route_not_found_requests.saturating_add(1);
                }
                self.finish_failed_request(None);
                let _ =
                    write_error_response(&mut stream, 404, "ROUTE_NOT_FOUND", "Route not found");
                return;
            }
        };

        if route.client != parsed.client {
            self.finish_failed_request(None);
            let _ = write_error_response(&mut stream, 404, "ROUTE_NOT_FOUND", "Route not found");
            return;
        }

        if let Some(session) = self.session_manager.get_session(&route.session_id) {
            if session.status != "running" {
                self.finish_failed_request(None);
                let _ = write_error_response(&mut stream, 410, "ROUTE_EXPIRED", "Route expired");
                return;
            }
        } else {
            self.finish_failed_request(None);
            let _ = write_error_response(&mut stream, 410, "ROUTE_EXPIRED", "Route expired");
            return;
        }

        let upstream_url =
            match compose_upstream_url(&route.upstream_base_url, &parsed.upstream_path, query) {
                Ok(url) => url,
                Err(err) => {
                    self.finish_failed_request(None);
                    let _ = write_error_response(&mut stream, 502, "UPSTREAM_CONNECT_ERROR", &err);
                    return;
                }
            };

        let config = self.runtime_config.lock().unwrap().clone();
        let start = Instant::now();
        let timestamp = now_ms();
        let request_id = generate_request_id();

        let prompt_preview = extract_prompt_preview(&route.client, &req.body);

        let mut request_body_file = None;
        if config.record_mode == RecordMode::Full {
            let relative = format!("bodies/{}-req.bin", request_id);
            let full = proxy_debug_dir().join(&relative);
            if fs::write(&full, &req.body).is_ok() {
                apply_private_file_permissions(&full);
                request_body_file = Some(relative);
            }
        }

        let method = match Method::from_bytes(req.method.as_bytes()) {
            Ok(method) => method,
            Err(err) => {
                self.finish_failed_request(None);
                let _ = write_error_response(
                    &mut stream,
                    400,
                    "BAD_REQUEST",
                    &format!("Unsupported HTTP method: {}", err),
                );
                return;
            }
        };

        let mut upstream_builder = self.client.request(method, upstream_url.clone());
        for (name, value) in &req.headers {
            if should_skip_request_header(name) {
                continue;
            }
            upstream_builder = upstream_builder.header(name, value);
        }

        upstream_builder = upstream_builder.body(req.body.clone());

        let mut upstream_response = match upstream_builder.send() {
            Ok(response) => response,
            Err(err) => {
                self.finish_failed_request(None);
                if err.is_timeout() {
                    let _ = write_error_response(
                        &mut stream,
                        504,
                        "UPSTREAM_TIMEOUT",
                        "Upstream timeout",
                    );
                } else {
                    let _ = write_error_response(
                        &mut stream,
                        502,
                        "UPSTREAM_CONNECT_ERROR",
                        &format!("Failed to connect upstream: {}", err),
                    );
                }
                return;
            }
        };

        let status_code = upstream_response.status().as_u16();
        let response_headers = headers_to_map(upstream_response.headers());
        let is_sse = response_headers
            .get("content-type")
            .map(|value| value.contains("text/event-stream"))
            .unwrap_or(false);

        let (response_file_tmp, response_file_final, writer_tx, writer_handle, spool_state, sample) =
            if config.record_mode == RecordMode::Full {
                let tmp_relative = format!("bodies/{}-res.tmp", request_id);
                let final_relative = format!("bodies/{}-res.bin", request_id);
                let tmp_path = proxy_debug_dir().join(&tmp_relative);
                let final_path = proxy_debug_dir().join(&final_relative);
                let spool_state = Arc::new(LogSpoolState::default());
                let (tx, rx) = mpsc::sync_channel::<Vec<u8>>(128);
                let spool_state_writer = Arc::clone(&spool_state);
                let writer_tmp_path = tmp_path.clone();
                let writer_handle =
                    thread::spawn(move || writer_loop(writer_tmp_path, rx, spool_state_writer));

                (
                    Some(tmp_path),
                    Some(final_path),
                    Some(tx),
                    Some(writer_handle),
                    Some(spool_state),
                    Some(Arc::new(Mutex::new(Vec::new()))),
                )
            } else {
                (None, None, None, None, None, None)
            };

        if let Err(err) = write_response_headers(
            &mut stream,
            status_code,
            upstream_response
                .status()
                .canonical_reason()
                .unwrap_or("OK"),
            upstream_response.headers(),
        ) {
            self.finish_failed_request(None);
            eprintln!("Failed to write proxy response headers: {}", err);
            return;
        }

        let meta = ForwardMeta {
            id: request_id,
            timestamp,
            client: route.client,
            session_id: route.session_id,
            env_name: route.env_name,
            method: req.method,
            path: parsed.upstream_path,
            query: query.map(|q| q.to_string()),
            request_headers: req.headers,
            response_headers,
            request_body_size: req.body.len() as u64,
            request_body_file,
            response_file_tmp,
            response_file_final,
            start,
            status: status_code,
            prompt_preview,
            is_sse,
        };

        self.forward_response_stream(
            &mut stream,
            &mut upstream_response,
            writer_tx,
            writer_handle,
            spool_state,
            sample,
            meta,
        );
    }

    fn forward_response_stream(
        &self,
        stream: &mut TcpStream,
        upstream_response: &mut reqwest::blocking::Response,
        writer_tx: Option<SyncSender<Vec<u8>>>,
        writer_handle: Option<thread::JoinHandle<WriterOutcome>>,
        spool_state: Option<Arc<LogSpoolState>>,
        sample: Option<Arc<Mutex<Vec<u8>>>>,
        meta: ForwardMeta,
    ) {
        let mut writer_tx = writer_tx;
        let mut writer_error = None;
        let mut response_incomplete = false;
        let mut client_cancelled = false;
        let mut upstream_error = false;
        let mut first_token_ms = None;

        let mut read_buf = [0u8; 8192];
        loop {
            let n = match upstream_response.read(&mut read_buf) {
                Ok(0) => break,
                Ok(n) => n,
                Err(err) => {
                    upstream_error = true;
                    response_incomplete = true;
                    eprintln!("Upstream read error: {}", err);
                    break;
                }
            };

            if first_token_ms.is_none() {
                first_token_ms = Some(meta.start.elapsed().as_millis() as u64);
            }

            let chunk = &read_buf[..n];

            if let Some(sample) = &sample {
                let mut guard = sample.lock().unwrap();
                if guard.len() < LOG_SAMPLE_LIMIT_BYTES {
                    let remain = LOG_SAMPLE_LIMIT_BYTES - guard.len();
                    let take = remain.min(chunk.len());
                    guard.extend_from_slice(&chunk[..take]);
                }
            }

            if let Some(spool_state) = &spool_state {
                spool_state
                    .response_bytes
                    .fetch_add(chunk.len() as u64, Ordering::Relaxed);
            }

            if let Some(tx) = &writer_tx {
                if let Some(spool_state) = &spool_state {
                    match tx.try_send(chunk.to_vec()) {
                        Ok(_) => {}
                        Err(mpsc::TrySendError::Full(dropped_chunk)) => {
                            spool_state.partial.store(true, Ordering::Relaxed);
                            spool_state
                                .dropped_bytes
                                .fetch_add(dropped_chunk.len() as u64, Ordering::Relaxed);
                        }
                        Err(mpsc::TrySendError::Disconnected(dropped_chunk)) => {
                            spool_state.dropped.store(true, Ordering::Relaxed);
                            spool_state
                                .dropped_bytes
                                .fetch_add(dropped_chunk.len() as u64, Ordering::Relaxed);
                        }
                    }
                }
            }

            if let Err(err) = write_chunk(stream, chunk) {
                response_incomplete = true;
                client_cancelled = true;
                eprintln!("Proxy downstream write error: {}", err);
                break;
            }
        }

        let _ = write_chunk_end(stream);
        let _ = stream.flush();

        drop(writer_tx.take());

        if let Some(handle) = writer_handle {
            match handle.join() {
                Ok(outcome) => writer_error = outcome.error,
                Err(_) => writer_error = Some("writer thread panic".to_string()),
            }
        }

        let (log_dropped, log_partial, log_dropped_bytes, response_body_size) =
            if let Some(spool_state) = spool_state {
                (
                    spool_state.dropped.load(Ordering::Relaxed) || writer_error.is_some(),
                    spool_state.partial.load(Ordering::Relaxed),
                    spool_state.dropped_bytes.load(Ordering::Relaxed),
                    spool_state.response_bytes.load(Ordering::Relaxed),
                )
            } else {
                (false, false, 0, 0)
            };

        let reduced = if meta.is_sse {
            sample.as_ref().map(|sample| {
                build_sse_reduced(
                    sample.lock().unwrap().as_slice(),
                    response_incomplete,
                    client_cancelled,
                    upstream_error,
                    first_token_ms,
                    meta.start.elapsed().as_millis() as u64,
                )
            })
        } else {
            None
        };

        let response_file_relative = match (&meta.response_file_tmp, &meta.response_file_final) {
            (Some(tmp), Some(final_path)) => {
                if writer_error.is_none() && !response_incomplete {
                    if fs::rename(tmp, final_path).is_ok() {
                        apply_private_file_permissions(final_path);
                        final_path
                            .file_name()
                            .map(|name| format!("bodies/{}", name.to_string_lossy()))
                    } else {
                        None
                    }
                } else {
                    tmp.file_name()
                        .map(|name| format!("bodies/{}", name.to_string_lossy()))
                }
            }
            _ => None,
        };

        let duration_ms = meta.start.elapsed().as_millis() as u64;

        let record = TrafficRecord {
            id: meta.id,
            timestamp: meta.timestamp,
            client: meta.client,
            session_id: meta.session_id,
            env_name: meta.env_name,
            method: meta.method,
            path: meta.path,
            query: meta.query,
            status: meta.status,
            duration_ms,
            request_headers: meta.request_headers,
            response_headers: meta.response_headers,
            request_body_size: meta.request_body_size,
            response_body_size,
            request_body_file: meta.request_body_file,
            response_body_file: response_file_relative,
            prompt_preview: meta.prompt_preview,
            log_dropped,
            response_incomplete,
            log_partial,
            log_dropped_bytes,
            reduced,
        };

        if let Err(err) = append_record(&record) {
            eprintln!("Failed to append proxy traffic record: {}", err);
        } else {
            let item = record.to_item();
            self.emit_traffic(&item);
            let max_bytes = self.runtime_config.lock().unwrap().log_max_bytes;
            if let Err(err) = enforce_log_retention(max_bytes) {
                eprintln!("Failed to enforce proxy log retention: {}", err);
            }
        }

        self.finish_success_request(
            duration_ms,
            response_incomplete || upstream_error || client_cancelled,
        );
    }

    fn finish_success_request(&self, duration_ms: u64, failed: bool) {
        let mut metrics = self.metrics.lock().unwrap();
        metrics.total_response_ms = metrics.total_response_ms.saturating_add(duration_ms);
        if failed {
            metrics.failed_requests = metrics.failed_requests.saturating_add(1);
        } else {
            metrics.success_requests = metrics.success_requests.saturating_add(1);
        }
        if metrics.active_connections > 0 {
            metrics.active_connections -= 1;
        }
        drop(metrics);
        self.emit_status();
    }

    fn finish_failed_request(&self, duration_ms: Option<u64>) {
        let mut metrics = self.metrics.lock().unwrap();
        if let Some(duration_ms) = duration_ms {
            metrics.total_response_ms = metrics.total_response_ms.saturating_add(duration_ms);
        }
        metrics.failed_requests = metrics.failed_requests.saturating_add(1);
        if metrics.active_connections > 0 {
            metrics.active_connections -= 1;
        }
        drop(metrics);
        self.emit_status();
    }
}

fn writer_loop(
    path: PathBuf,
    rx: Receiver<Vec<u8>>,
    spool_state: Arc<LogSpoolState>,
) -> WriterOutcome {
    let mut file = match OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
    {
        Ok(file) => file,
        Err(err) => {
            spool_state.dropped.store(true, Ordering::Relaxed);
            return WriterOutcome {
                error: Some(err.to_string()),
            };
        }
    };

    apply_private_file_permissions(&path);

    while let Ok(chunk) = rx.recv() {
        if let Err(err) = file.write_all(&chunk) {
            spool_state.dropped.store(true, Ordering::Relaxed);
            return WriterOutcome {
                error: Some(err.to_string()),
            };
        }
    }

    if let Err(err) = file.flush() {
        spool_state.dropped.store(true, Ordering::Relaxed);
        return WriterOutcome {
            error: Some(err.to_string()),
        };
    }

    WriterOutcome::default()
}

fn write_response_headers(
    stream: &mut TcpStream,
    status_code: u16,
    reason: &str,
    headers: &HeaderMap,
) -> Result<(), String> {
    write!(stream, "HTTP/1.1 {} {}\r\n", status_code, reason)
        .map_err(|e| format!("Failed to write status line: {}", e))?;

    for (name, value) in headers.iter() {
        let name = name.as_str();
        if should_skip_response_header(name) || name.eq_ignore_ascii_case("content-length") {
            continue;
        }

        let value = value.to_str().unwrap_or("");
        write!(stream, "{}: {}\r\n", name, value)
            .map_err(|e| format!("Failed to write response header: {}", e))?;
    }

    write!(stream, "Transfer-Encoding: chunked\r\n")
        .map_err(|e| format!("Failed to write chunked header: {}", e))?;
    write!(stream, "Connection: close\r\n\r\n")
        .map_err(|e| format!("Failed to write response header terminator: {}", e))?;
    stream
        .flush()
        .map_err(|e| format!("Failed to flush headers: {}", e))
}

fn write_chunk(stream: &mut TcpStream, bytes: &[u8]) -> Result<(), String> {
    write!(stream, "{:X}\r\n", bytes.len())
        .map_err(|e| format!("Failed to write chunk size: {}", e))?;
    stream
        .write_all(bytes)
        .map_err(|e| format!("Failed to write chunk body: {}", e))?;
    stream
        .write_all(b"\r\n")
        .map_err(|e| format!("Failed to write chunk terminator: {}", e))?;
    stream
        .flush()
        .map_err(|e| format!("Failed to flush chunk: {}", e))
}

fn write_chunk_end(stream: &mut TcpStream) -> Result<(), String> {
    stream
        .write_all(b"0\r\n\r\n")
        .map_err(|e| format!("Failed to write chunk ending: {}", e))
}

fn write_error_response(
    stream: &mut TcpStream,
    status_code: u16,
    code: &str,
    message: &str,
) -> Result<(), String> {
    let payload = serde_json::json!({
        "error": {
            "code": code,
            "message": message,
            "request_id": generate_request_id(),
        }
    })
    .to_string();

    let reason = status_reason(status_code);
    write!(stream, "HTTP/1.1 {} {}\r\n", status_code, reason)
        .map_err(|e| format!("Failed to write error status line: {}", e))?;
    write!(stream, "content-type: application/json\r\n")
        .map_err(|e| format!("Failed to write error content-type: {}", e))?;
    write!(stream, "content-length: {}\r\n", payload.as_bytes().len())
        .map_err(|e| format!("Failed to write error content-length: {}", e))?;
    write!(stream, "connection: close\r\n\r\n")
        .map_err(|e| format!("Failed to write error headers terminator: {}", e))?;
    stream
        .write_all(payload.as_bytes())
        .map_err(|e| format!("Failed to write error body: {}", e))?;
    stream
        .flush()
        .map_err(|e| format!("Failed to flush error response: {}", e))
}

fn status_reason(status: u16) -> &'static str {
    match status {
        200 => "OK",
        400 => "Bad Request",
        404 => "Not Found",
        410 => "Gone",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "Unknown",
    }
}

fn read_http_request(stream: &mut TcpStream) -> Result<ParsedRequest, String> {
    let mut raw = Vec::<u8>::new();
    let mut buf = [0u8; 8192];
    let header_end;

    loop {
        let n = stream
            .read(&mut buf)
            .map_err(|e| format!("Failed reading request bytes: {}", e))?;
        if n == 0 {
            return Err("Client closed before full headers".to_string());
        }
        raw.extend_from_slice(&buf[..n]);

        if raw.len() > HEADER_READ_LIMIT {
            return Err("Request headers exceed limit".to_string());
        }

        if let Some(pos) = find_double_crlf(&raw) {
            header_end = pos;
            break;
        }
    }

    let header_blob = &raw[..header_end];
    let mut body_rest = raw[header_end + 4..].to_vec();

    let header_text = String::from_utf8(header_blob.to_vec())
        .map_err(|e| format!("Request headers are not UTF-8: {}", e))?;

    let mut lines = header_text.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Missing request line".to_string())?;

    let mut request_line_parts = request_line.split_whitespace();
    let method = request_line_parts
        .next()
        .ok_or_else(|| "Missing HTTP method".to_string())?
        .to_string();
    let target = request_line_parts
        .next()
        .ok_or_else(|| "Missing request target".to_string())?
        .to_string();

    let _version = request_line_parts
        .next()
        .ok_or_else(|| "Missing HTTP version".to_string())?;

    let mut headers = HashMap::new();
    for line in lines {
        if line.trim().is_empty() {
            continue;
        }
        if let Some((name, value)) = line.split_once(':') {
            headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
        }
    }

    let body = if is_chunked_request(&headers) {
        read_chunked_body(stream, &mut body_rest)?
    } else if let Some(content_length) = headers
        .get("content-length")
        .and_then(|v| v.parse::<usize>().ok())
    {
        if content_length > BODY_READ_LIMIT {
            return Err("Request body exceeds limit".to_string());
        }

        while body_rest.len() < content_length {
            let n = stream
                .read(&mut buf)
                .map_err(|e| format!("Failed reading request body bytes: {}", e))?;
            if n == 0 {
                return Err("Client closed before full request body".to_string());
            }
            body_rest.extend_from_slice(&buf[..n]);
        }

        body_rest.truncate(content_length);
        body_rest
    } else {
        Vec::new()
    };

    Ok(ParsedRequest {
        method,
        target,
        headers,
        body,
    })
}

fn read_chunked_body(stream: &mut TcpStream, remain: &mut Vec<u8>) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();

    loop {
        let size_line = read_line_from_buffer_or_stream(stream, remain)?;
        let size_hex = size_line.split(';').next().unwrap_or("").trim();
        let size = usize::from_str_radix(size_hex, 16)
            .map_err(|e| format!("Invalid chunk size '{}': {}", size_hex, e))?;

        if size == 0 {
            // Consume trailing CRLF and optional trailer headers.
            let _ = read_line_from_buffer_or_stream(stream, remain)?;
            break;
        }

        let chunk_with_crlf = read_exact_bytes(stream, remain, size + 2)?;
        out.extend_from_slice(&chunk_with_crlf[..size]);

        if out.len() > BODY_READ_LIMIT {
            return Err("Chunked request body exceeds limit".to_string());
        }
    }

    Ok(out)
}

fn read_line_from_buffer_or_stream(
    stream: &mut TcpStream,
    remain: &mut Vec<u8>,
) -> Result<String, String> {
    loop {
        if let Some(pos) = find_crlf(remain) {
            let line = remain[..pos].to_vec();
            remain.drain(..pos + 2);
            return String::from_utf8(line)
                .map_err(|e| format!("Invalid UTF-8 in chunked line: {}", e));
        }

        let mut buf = [0u8; 4096];
        let n = stream
            .read(&mut buf)
            .map_err(|e| format!("Failed reading chunked line: {}", e))?;
        if n == 0 {
            return Err("Unexpected EOF while reading chunked line".to_string());
        }
        remain.extend_from_slice(&buf[..n]);
    }
}

fn read_exact_bytes(
    stream: &mut TcpStream,
    remain: &mut Vec<u8>,
    len: usize,
) -> Result<Vec<u8>, String> {
    while remain.len() < len {
        let mut buf = [0u8; 4096];
        let n = stream
            .read(&mut buf)
            .map_err(|e| format!("Failed reading chunked body: {}", e))?;
        if n == 0 {
            return Err("Unexpected EOF while reading chunked body".to_string());
        }
        remain.extend_from_slice(&buf[..n]);
    }

    let out: Vec<u8> = remain.drain(..len).collect();
    Ok(out)
}

fn split_target(target: &str) -> (&str, Option<&str>) {
    if let Some((path, query)) = target.split_once('?') {
        (path, Some(query))
    } else {
        (target, None)
    }
}

fn parse_proxy_path(path: &str) -> Option<ParsedProxyPath> {
    let segments: Vec<&str> = path.trim_start_matches('/').split('/').collect();
    if segments.len() < 3 || segments[0] != "proxy" {
        return None;
    }

    let client = segments[1].trim().to_ascii_lowercase();
    if client != "claude" && client != "codex" {
        return None;
    }

    let route_id = segments[2].trim().to_string();
    if route_id.is_empty() {
        return None;
    }

    let upstream_path = if segments.len() > 3 {
        format!("/{}", segments[3..].join("/"))
    } else {
        "/".to_string()
    };

    Some(ParsedProxyPath {
        client,
        route_id,
        upstream_path,
    })
}

fn compose_upstream_url(base_url: &str, path: &str, query: Option<&str>) -> Result<String, String> {
    validate_upstream_url(base_url)?;

    let mut composed = base_url.trim_end_matches('/').to_string();
    let path = path.trim_start_matches('/');
    if !path.is_empty() {
        composed.push('/');
        composed.push_str(path);
    }

    if let Some(query) = query {
        if !query.is_empty() {
            composed.push('?');
            composed.push_str(query);
        }
    }

    Ok(composed)
}

fn validate_upstream_url(url: &str) -> Result<(), String> {
    let parsed = reqwest::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("Only http/https upstream URLs are supported".to_string()),
    }
    if parsed.host_str().is_none() {
        return Err("Upstream URL must include host".to_string());
    }
    Ok(())
}

fn should_skip_request_header(name: &str) -> bool {
    matches_ignore_case(name, "connection")
        || matches_ignore_case(name, "keep-alive")
        || matches_ignore_case(name, "proxy-authenticate")
        || matches_ignore_case(name, "proxy-authorization")
        || matches_ignore_case(name, "te")
        || matches_ignore_case(name, "trailer")
        || matches_ignore_case(name, "transfer-encoding")
        || matches_ignore_case(name, "upgrade")
        || matches_ignore_case(name, "host")
        || matches_ignore_case(name, "proxy-connection")
}

fn should_skip_response_header(name: &str) -> bool {
    matches_ignore_case(name, "connection")
        || matches_ignore_case(name, "keep-alive")
        || matches_ignore_case(name, "proxy-authenticate")
        || matches_ignore_case(name, "proxy-authorization")
        || matches_ignore_case(name, "te")
        || matches_ignore_case(name, "trailer")
        || matches_ignore_case(name, "transfer-encoding")
        || matches_ignore_case(name, "upgrade")
        || matches_ignore_case(name, "proxy-connection")
}

fn matches_ignore_case(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

fn headers_to_map(headers: &HeaderMap) -> HashMap<String, String> {
    let mut output = HashMap::new();
    for (name, value) in headers.iter() {
        output.insert(
            name.as_str().to_string(),
            value.to_str().unwrap_or("<binary>").to_string(),
        );
    }
    output
}

fn is_chunked_request(headers: &HashMap<String, String>) -> bool {
    headers
        .get("transfer-encoding")
        .map(|value| value.to_ascii_lowercase().contains("chunked"))
        .unwrap_or(false)
}

fn find_double_crlf(bytes: &[u8]) -> Option<usize> {
    bytes.windows(4).position(|window| window == b"\r\n\r\n")
}

fn find_crlf(bytes: &[u8]) -> Option<usize> {
    bytes.windows(2).position(|window| window == b"\r\n")
}

fn extract_prompt_preview(client: &str, request_body: &[u8]) -> Option<String> {
    let parsed = serde_json::from_slice::<Value>(request_body).ok();

    let mut preview = if client == "claude" {
        parsed
            .as_ref()
            .and_then(extract_claude_prompt)
            .or_else(|| fallback_preview(request_body))
    } else {
        parsed
            .as_ref()
            .and_then(extract_codex_prompt)
            .or_else(|| fallback_preview(request_body))
    };

    if let Some(text) = preview.as_mut() {
        *text = text.chars().take(300).collect();
    }

    preview
}

fn extract_claude_prompt(value: &Value) -> Option<String> {
    let messages = value.get("messages")?.as_array()?;
    for message in messages.iter().rev() {
        if message.get("role").and_then(|v| v.as_str()) != Some("user") {
            continue;
        }

        if let Some(text) = message.get("content").and_then(|c| c.as_str()) {
            if !text.trim().is_empty() {
                return Some(text.to_string());
            }
        }

        if let Some(parts) = message.get("content").and_then(|c| c.as_array()) {
            let mut merged = String::new();
            for part in parts {
                if part.get("type").and_then(|v| v.as_str()) == Some("text") {
                    if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                        merged.push_str(text);
                    }
                }
            }
            if !merged.trim().is_empty() {
                return Some(merged);
            }
        }
    }
    None
}

fn extract_codex_prompt(value: &Value) -> Option<String> {
    if let Some(input) = value.get("input") {
        if let Some(text) = input.as_str() {
            if !text.trim().is_empty() {
                return Some(text.to_string());
            }
        }

        if let Some(items) = input.as_array() {
            let mut merged = String::new();
            for item in items {
                if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                    merged.push_str(text);
                    merged.push('\n');
                }
                if let Some(content) = item.get("content").and_then(|v| v.as_array()) {
                    for part in content {
                        if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                            merged.push_str(text);
                            merged.push('\n');
                        }
                    }
                }
            }
            if !merged.trim().is_empty() {
                return Some(merged);
            }
        }
    }

    None
}

fn fallback_preview(body: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(body).trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn build_sse_reduced(
    raw: &[u8],
    response_incomplete: bool,
    client_cancelled: bool,
    upstream_error: bool,
    first_token_ms: Option<u64>,
    total_stream_ms: u64,
) -> ReducedStreamLog {
    let content = String::from_utf8_lossy(raw);
    let mut final_text = String::new();
    let mut finish_reason = None;

    for line in content.lines() {
        let trimmed = line.trim_start();
        if !trimmed.starts_with("data:") {
            continue;
        }

        let payload = trimmed.trim_start_matches("data:").trim();
        if payload.is_empty() || payload == "[DONE]" {
            continue;
        }

        let parsed = match serde_json::from_str::<Value>(payload) {
            Ok(value) => value,
            Err(_) => continue,
        };

        if finish_reason.is_none() {
            finish_reason = extract_finish_reason(&parsed);
        }

        for fragment in collect_text_fragments(&parsed) {
            final_text.push_str(&fragment);
        }
    }

    let stream_status = if response_incomplete {
        if client_cancelled {
            "client_cancelled"
        } else if upstream_error {
            "upstream_error"
        } else {
            "interrupted"
        }
    } else {
        "completed"
    }
    .to_string();

    ReducedStreamLog {
        final_text,
        finish_reason,
        stream_status,
        first_token_ms,
        total_stream_ms: Some(total_stream_ms),
    }
}

fn extract_finish_reason(value: &Value) -> Option<String> {
    value
        .get("finish_reason")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            value
                .get("stop_reason")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            value
                .pointer("/delta/stop_reason")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            value
                .get("choices")
                .and_then(|v| v.as_array())
                .and_then(|choices| {
                    choices.iter().find_map(|choice| {
                        choice
                            .get("finish_reason")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    })
                })
        })
}

fn collect_text_fragments(value: &Value) -> Vec<String> {
    if let Some(event_type) = value.get("type").and_then(|v| v.as_str()) {
        return collect_typed_text_fragments(event_type, value);
    }

    collect_chat_completion_text_fragments(value)
}

fn collect_typed_text_fragments(event_type: &str, value: &Value) -> Vec<String> {
    match event_type {
        "content_block_delta" | "response.output_text.delta" | "response.refusal.delta" => {
            extract_delta_text(value)
        }
        _ => Vec::new(),
    }
}

fn extract_delta_text(value: &Value) -> Vec<String> {
    match value.get("delta") {
        Some(Value::String(text)) => vec![text.to_string()],
        Some(Value::Object(obj)) => obj
            .get("text")
            .and_then(|v| v.as_str())
            .map(|text| vec![text.to_string()])
            .unwrap_or_default(),
        _ => Vec::new(),
    }
}

fn collect_chat_completion_text_fragments(value: &Value) -> Vec<String> {
    let mut output = Vec::new();
    let Some(choices) = value.get("choices").and_then(|v| v.as_array()) else {
        return output;
    };

    for choice in choices {
        if let Some(content) = choice.pointer("/delta/content") {
            append_chat_completion_content(content, &mut output);
            continue;
        }

        if let Some(text) = choice.pointer("/delta/text").and_then(|v| v.as_str()) {
            output.push(text.to_string());
            continue;
        }

        if let Some(text) = choice.get("text").and_then(|v| v.as_str()) {
            output.push(text.to_string());
        }
    }

    output
}

fn append_chat_completion_content(value: &Value, output: &mut Vec<String>) {
    match value {
        Value::String(text) => output.push(text.to_string()),
        Value::Array(parts) => {
            for part in parts {
                append_chat_completion_content(part, output);
            }
        }
        Value::Object(map) => {
            if let Some(text) = map.get("text").and_then(|v| v.as_str()) {
                output.push(text.to_string());
            } else if let Some(text) = map
                .get("text")
                .and_then(|v| v.get("value"))
                .and_then(|v| v.as_str())
            {
                output.push(text.to_string());
            }
        }
        _ => {}
    }
}

fn proxy_debug_dir() -> PathBuf {
    config::get_ccem_dir().join("proxy-debug")
}

fn bodies_dir() -> PathBuf {
    proxy_debug_dir().join("bodies")
}

fn traffic_jsonl_path() -> PathBuf {
    proxy_debug_dir().join("traffic.jsonl")
}

fn traffic_idx_path() -> PathBuf {
    proxy_debug_dir().join("traffic.idx")
}

fn ensure_proxy_debug_dirs() -> Result<(), String> {
    let root = proxy_debug_dir();
    if !root.exists() {
        fs::create_dir_all(&root)
            .map_err(|e| format!("Failed to create proxy debug directory: {}", e))?;
    }
    apply_private_dir_permissions(&root);

    let bodies = bodies_dir();
    if !bodies.exists() {
        fs::create_dir_all(&bodies)
            .map_err(|e| format!("Failed to create proxy debug bodies directory: {}", e))?;
    }
    apply_private_dir_permissions(&bodies);

    let traffic = traffic_jsonl_path();
    if !traffic.exists() {
        File::create(&traffic)
            .map_err(|e| format!("Failed to initialize traffic log file: {}", e))?;
    }
    apply_private_file_permissions(&traffic);

    let index = traffic_idx_path();
    if !index.exists() {
        File::create(&index)
            .map_err(|e| format!("Failed to initialize traffic index file: {}", e))?;
    }
    apply_private_file_permissions(&index);

    Ok(())
}

fn append_record(record: &TrafficRecord) -> Result<(), String> {
    ensure_proxy_debug_dirs()?;

    let traffic_path = traffic_jsonl_path();
    let mut traffic_file = OpenOptions::new()
        .create(true)
        .read(true)
        .append(true)
        .open(&traffic_path)
        .map_err(|e| format!("Failed to open traffic log file: {}", e))?;

    let offset = traffic_file
        .metadata()
        .map_err(|e| format!("Failed to read traffic log metadata: {}", e))?
        .len();

    let line = serde_json::to_string(record)
        .map_err(|e| format!("Failed to serialize traffic record: {}", e))?;

    writeln!(traffic_file, "{}", line)
        .map_err(|e| format!("Failed to append traffic record: {}", e))?;
    apply_private_file_permissions(&traffic_path);

    let idx_path = traffic_idx_path();
    let mut idx_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&idx_path)
        .map_err(|e| format!("Failed to open traffic index file: {}", e))?;

    writeln!(idx_file, "{},{},{}", record.timestamp, record.id, offset)
        .map_err(|e| format!("Failed to append traffic index line: {}", e))?;
    apply_private_file_permissions(&idx_path);

    Ok(())
}

fn read_all_records() -> Result<Vec<TrafficRecord>, String> {
    ensure_proxy_debug_dirs()?;

    let file = File::open(traffic_jsonl_path())
        .map_err(|e| format!("Failed to open traffic log file: {}", e))?;
    let reader = BufReader::new(file);

    let mut records = Vec::new();
    for line in reader.lines() {
        let line = match line {
            Ok(line) => line,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(record) = serde_json::from_str::<TrafficRecord>(&line) {
            records.push(record);
        }
    }

    Ok(records)
}

fn parse_cursor(cursor: &str) -> Option<(i64, String)> {
    let (timestamp, id) = cursor.split_once(':')?;
    let timestamp = timestamp.parse::<i64>().ok()?;
    Some((timestamp, id.to_string()))
}

fn read_body_preview(
    relative_path: Option<&str>,
    max_chars: Option<usize>,
) -> Result<Option<String>, String> {
    let Some(relative_path) = relative_path else {
        return Ok(None);
    };

    let full = proxy_debug_dir().join(relative_path);
    if !full.exists() {
        return Ok(None);
    }

    let mut file = File::open(&full)
        .map_err(|e| format!("Failed to open body file '{}': {}", full.display(), e))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|e| format!("Failed to read body file '{}': {}", full.display(), e))?;

    let text = String::from_utf8_lossy(&bytes).to_string();
    if let Some(limit) = max_chars {
        return Ok(Some(text.chars().take(limit).collect()));
    }

    Ok(Some(text))
}

fn recompute_reduced_detail(record: &TrafficRecord) -> Result<Option<ReducedStreamLog>, String> {
    let is_sse = record
        .response_headers
        .get("content-type")
        .map(|value| value.contains("text/event-stream"))
        .unwrap_or(false);
    if !is_sse || record.log_partial || record.log_dropped {
        return Ok(record.reduced.clone());
    }

    let Some(raw_response) = read_body_preview(record.response_body_file.as_deref(), None)? else {
        return Ok(record.reduced.clone());
    };

    let client_cancelled = matches!(
        record
            .reduced
            .as_ref()
            .map(|reduced| reduced.stream_status.as_str()),
        Some("client_cancelled")
    );
    let upstream_error = matches!(
        record
            .reduced
            .as_ref()
            .map(|reduced| reduced.stream_status.as_str()),
        Some("upstream_error")
    );
    let first_token_ms = record
        .reduced
        .as_ref()
        .and_then(|reduced| reduced.first_token_ms);
    let total_stream_ms = record
        .reduced
        .as_ref()
        .and_then(|reduced| reduced.total_stream_ms)
        .unwrap_or(record.duration_ms);

    Ok(Some(build_sse_reduced(
        raw_response.as_bytes(),
        record.response_incomplete,
        client_cancelled,
        upstream_error,
        first_token_ms,
        total_stream_ms,
    )))
}

fn enforce_log_retention(max_bytes: u64) -> Result<(), String> {
    ensure_proxy_debug_dirs()?;

    let mut records = read_all_records()?;
    let mut total_size = dir_size(proxy_debug_dir())?;
    if total_size <= max_bytes {
        return Ok(());
    }

    records.sort_by(|a, b| a.timestamp.cmp(&b.timestamp).then_with(|| a.id.cmp(&b.id)));

    let mut removed_ids = Vec::new();
    for record in &records {
        if total_size <= max_bytes {
            break;
        }

        let removed_size = remove_record_files(record);
        total_size = total_size.saturating_sub(removed_size);
        removed_ids.push(record.id.clone());
    }

    if removed_ids.is_empty() {
        return Ok(());
    }

    let kept: Vec<TrafficRecord> = records
        .into_iter()
        .filter(|record| !removed_ids.iter().any(|id| id == &record.id))
        .collect();

    rewrite_records(&kept)?;
    Ok(())
}

fn remove_record_files(record: &TrafficRecord) -> u64 {
    let mut removed = 0u64;
    for relative in [&record.request_body_file, &record.response_body_file] {
        let Some(relative) = relative else {
            continue;
        };

        let path = proxy_debug_dir().join(relative);
        if let Ok(meta) = fs::metadata(&path) {
            removed = removed.saturating_add(meta.len());
        }
        let _ = fs::remove_file(path);
    }
    removed
}

fn rewrite_records(records: &[TrafficRecord]) -> Result<(), String> {
    ensure_proxy_debug_dirs()?;

    let jsonl_path = traffic_jsonl_path();
    let idx_path = traffic_idx_path();

    let mut jsonl = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&jsonl_path)
        .map_err(|e| format!("Failed to rewrite traffic log: {}", e))?;

    let mut idx = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&idx_path)
        .map_err(|e| format!("Failed to rewrite traffic index: {}", e))?;

    let mut offset = 0u64;
    for record in records {
        let line = serde_json::to_string(record)
            .map_err(|e| format!("Failed to serialize retained traffic record: {}", e))?;
        writeln!(jsonl, "{}", line)
            .map_err(|e| format!("Failed to rewrite traffic record line: {}", e))?;
        writeln!(idx, "{},{},{}", record.timestamp, record.id, offset)
            .map_err(|e| format!("Failed to rewrite traffic index line: {}", e))?;
        offset = offset.saturating_add(line.as_bytes().len() as u64 + 1);
    }

    apply_private_file_permissions(&jsonl_path);
    apply_private_file_permissions(&idx_path);

    Ok(())
}

fn dir_size(path: PathBuf) -> Result<u64, String> {
    if !path.exists() {
        return Ok(0);
    }

    let mut total = 0u64;
    for entry in fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();
        let meta = fs::metadata(&path)
            .map_err(|e| format!("Failed to read metadata '{}': {}", path.display(), e))?;
        if meta.is_dir() {
            total = total.saturating_add(dir_size(path)?);
        } else {
            total = total.saturating_add(meta.len());
        }
    }

    Ok(total)
}

#[cfg(unix)]
fn apply_private_dir_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o700));
}

#[cfg(not(unix))]
fn apply_private_dir_permissions(_path: &Path) {}

#[cfg(unix)]
fn apply_private_file_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
}

#[cfg(not(unix))]
fn apply_private_file_permissions(_path: &Path) {}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn generate_route_id() -> String {
    format!("route-{}-{}", now_ms(), rand::random::<u32>())
}

fn generate_request_id() -> String {
    format!("req-{}-{}", now_ms(), rand::random::<u32>())
}

#[cfg(test)]
mod tests {
    use super::{
        build_sse_reduced, compose_upstream_url, parse_proxy_path, recompute_reduced_detail,
        validate_upstream_url, ReducedStreamLog, TrafficRecord,
    };
    use std::collections::HashMap;

    #[test]
    fn parse_proxy_path_extracts_components() {
        let parsed = parse_proxy_path("/proxy/claude/route-1/v1/messages").unwrap();
        assert_eq!(parsed.client, "claude");
        assert_eq!(parsed.route_id, "route-1");
        assert_eq!(parsed.upstream_path, "/v1/messages");
    }

    #[test]
    fn compose_upstream_url_keeps_query() {
        let url = compose_upstream_url(
            "https://api.anthropic.com",
            "/v1/messages",
            Some("stream=true"),
        )
        .unwrap();
        assert_eq!(url, "https://api.anthropic.com/v1/messages?stream=true");
    }

    #[test]
    fn upstream_url_validation_rejects_non_http_scheme() {
        assert!(validate_upstream_url("ftp://example.com").is_err());
        assert!(validate_upstream_url("https://api.openai.com/v1").is_ok());
    }

    #[test]
    fn build_sse_reduced_deduplicates_claude_content_deltas() {
        let raw = concat!(
            "event: message_start\n",
            "data: {\"type\":\"message_start\",\"message\":{\"content\":[]}}\n\n",
            "event: content_block_start\n",
            "data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\n",
            "event: content_block_delta\n",
            "data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"我\"}}\n\n",
            "event: content_block_delta\n",
            "data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"可以帮你查询天气。\"}}\n\n",
            "event: content_block_delta\n",
            "data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"我需要知道你想查询哪个城市的天气？\"}}\n\n",
            "event: message_delta\n",
            "data: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"}}\n\n",
            "event: message_stop\n",
            "data: {\"type\":\"message_stop\"}\n\n"
        );

        let reduced = build_sse_reduced(raw.as_bytes(), false, false, false, Some(12), 34);

        assert_eq!(
            reduced.final_text,
            "我可以帮你查询天气。我需要知道你想查询哪个城市的天气？"
        );
        assert_eq!(reduced.finish_reason.as_deref(), Some("end_turn"));
        assert_eq!(reduced.stream_status, "completed");
        assert_eq!(reduced.first_token_ms, Some(12));
        assert_eq!(reduced.total_stream_ms, Some(34));
    }

    #[test]
    fn build_sse_reduced_ignores_response_done_snapshots() {
        let raw = concat!(
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\"你\"}\n\n",
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\"好\"}\n\n",
            "data: {\"type\":\"response.output_text.done\",\"text\":\"你好\"}\n\n",
            "data: {\"type\":\"response.completed\"}\n\n",
            "data: [DONE]\n\n"
        );

        let reduced = build_sse_reduced(raw.as_bytes(), false, false, false, None, 20);

        assert_eq!(reduced.final_text, "你好");
    }

    #[test]
    fn build_sse_reduced_collects_chat_completion_deltas() {
        let raw = concat!(
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"},\"finish_reason\":null}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"lo\"},\"finish_reason\":\"stop\"}]}\n\n",
            "data: [DONE]\n\n"
        );

        let reduced = build_sse_reduced(raw.as_bytes(), false, false, false, None, 15);

        assert_eq!(reduced.final_text, "Hello");
        assert_eq!(reduced.finish_reason.as_deref(), Some("stop"));
    }

    #[test]
    fn build_sse_reduced_collects_chat_completion_delta_text() {
        let raw = concat!(
            "data: {\"choices\":[{\"delta\":{\"text\":\"Hel\"},\"finish_reason\":null}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"text\":\"lo\"},\"finish_reason\":\"stop\"}]}\n\n",
            "data: [DONE]\n\n"
        );

        let reduced = build_sse_reduced(raw.as_bytes(), false, false, false, None, 15);

        assert_eq!(reduced.final_text, "Hello");
        assert_eq!(reduced.finish_reason.as_deref(), Some("stop"));
    }

    #[test]
    fn recompute_reduced_detail_keeps_original_when_log_file_is_partial() {
        let reduced = ReducedStreamLog {
            final_text: "stored".to_string(),
            finish_reason: Some("stop".to_string()),
            stream_status: "completed".to_string(),
            first_token_ms: Some(12),
            total_stream_ms: Some(34),
        };
        let record = TrafficRecord {
            id: "req-1".to_string(),
            timestamp: 0,
            client: "codex".to_string(),
            session_id: "session-1".to_string(),
            env_name: "default".to_string(),
            method: "POST".to_string(),
            path: "/v1/responses".to_string(),
            query: None,
            status: 200,
            duration_ms: 34,
            request_headers: HashMap::new(),
            response_headers: HashMap::from([(
                "content-type".to_string(),
                "text/event-stream".to_string(),
            )]),
            request_body_size: 0,
            response_body_size: 0,
            request_body_file: None,
            response_body_file: Some("missing.bin".to_string()),
            prompt_preview: None,
            log_dropped: false,
            response_incomplete: false,
            log_partial: true,
            log_dropped_bytes: 0,
            reduced: Some(reduced.clone()),
        };

        let result = recompute_reduced_detail(&record).unwrap();

        assert_eq!(result.unwrap().final_text, reduced.final_text);
    }

    #[test]
    fn recompute_reduced_detail_keeps_original_when_log_file_is_dropped() {
        let reduced = ReducedStreamLog {
            final_text: "stored".to_string(),
            finish_reason: Some("stop".to_string()),
            stream_status: "completed".to_string(),
            first_token_ms: Some(12),
            total_stream_ms: Some(34),
        };
        let record = TrafficRecord {
            id: "req-1".to_string(),
            timestamp: 0,
            client: "codex".to_string(),
            session_id: "session-1".to_string(),
            env_name: "default".to_string(),
            method: "POST".to_string(),
            path: "/v1/responses".to_string(),
            query: None,
            status: 200,
            duration_ms: 34,
            request_headers: HashMap::new(),
            response_headers: HashMap::from([(
                "content-type".to_string(),
                "text/event-stream".to_string(),
            )]),
            request_body_size: 0,
            response_body_size: 0,
            request_body_file: None,
            response_body_file: Some("missing.bin".to_string()),
            prompt_preview: None,
            log_dropped: true,
            response_incomplete: false,
            log_partial: false,
            log_dropped_bytes: 16,
            reduced: Some(reduced.clone()),
        };

        let result = recompute_reduced_detail(&record).unwrap();

        assert_eq!(result.unwrap().final_text, reduced.final_text);
    }
}
