use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

pub const BROWSER_LABEL: &str = "ccem-browser";

const DEFAULT_BROWSER_SESSION_ID: &str = "workspace";
const DEFAULT_BROWSER_URL: &str = "https://www.google.com/search?q=ccem";
const SAFARI_DESKTOP_UA: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const BROWSER_DATA_STORE_ID: [u8; 16] = [
    0xcc, 0xe0, 0xb1, 0x0f, 0x19, 0x87, 0x4e, 0x60, 0x9d, 0x19, 0x11, 0xe8, 0x78, 0xfa, 0x11, 0x6d,
];

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BrowserBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Default for BrowserBounds {
    fn default() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowserInfo {
    pub label: String,
    pub session_id: String,
    pub url: Option<String>,
    pub title: Option<String>,
    pub visible: bool,
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BrowserToolRequest {
    pub request_id: String,
    pub tool: String,
    #[serde(default)]
    pub args: Value,
}

#[derive(Debug, Clone)]
struct BrowserSessionState {
    session_id: String,
    label: String,
    bounds: BrowserBounds,
    visible: bool,
    data_store_id: [u8; 16],
    current_url: Option<String>,
    title: Option<String>,
}

impl BrowserSessionState {
    fn new(session_id: &str, bounds: BrowserBounds) -> Self {
        Self {
            session_id: session_id.to_string(),
            label: browser_label_for_session_id(session_id),
            bounds,
            visible: false,
            data_store_id: browser_data_store_id_for_session_id(session_id),
            current_url: None,
            title: None,
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum BrowserHistoryDirection {
    Back,
    Forward,
}

#[derive(Debug, Clone, Copy, Default)]
struct BrowserHistoryState {
    can_go_back: bool,
    can_go_forward: bool,
}

#[derive(Debug, Clone, Default)]
struct BrowserPageMetadata {
    url: Option<String>,
    title: Option<String>,
    history: BrowserHistoryState,
}

pub struct BrowserManager {
    sessions: Mutex<HashMap<String, BrowserSessionState>>,
    active_session_id: Mutex<String>,
    last_bounds: Mutex<BrowserBounds>,
}

impl Default for BrowserManager {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            active_session_id: Mutex::new(DEFAULT_BROWSER_SESSION_ID.to_string()),
            last_bounds: Mutex::new(BrowserBounds::default()),
        }
    }
}

impl BrowserManager {
    pub fn set_active_session(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        visible: bool,
    ) -> Result<(), String> {
        let session_id = normalize_browser_session_id(session_id);
        {
            *self
                .active_session_id
                .lock()
                .map_err(|_| "Failed to lock active browser session".to_string())? =
                session_id.clone();
        }
        self.with_session_state(&session_id, |state| {
            state.visible = visible;
        })?;
        self.sync_webview_visibility(app)
    }

    pub fn open(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        url: Option<&str>,
    ) -> Result<BrowserInfo, String> {
        let session_id = normalize_browser_session_id(session_id);
        let requested = url.map(str::trim).filter(|value| !value.is_empty());
        let parsed_requested = requested.map(parse_browser_url).transpose()?;
        let target = parsed_requested
            .as_ref()
            .map(|value| value.as_str())
            .unwrap_or(DEFAULT_BROWSER_URL);
        let target_url = target.to_string();
        let session = self.session_snapshot(&session_id)?;
        let existed = app.get_webview(&session.label).is_some();
        let webview = ensure_browser_webview(app, &session.label, session.data_store_id, target)?;
        if existed {
            if let Some(parsed) = parsed_requested {
                let next_url = parsed.as_str().to_string();
                webview
                    .navigate(parsed)
                    .map_err(|error| format!("navigate browser webview: {error}"))?;
                self.record_browser_page_metadata(&session_id, Some(next_url), None)?;
            }
        } else {
            self.record_browser_page_metadata(&session_id, Some(target_url), None)?;
        }
        apply_browser_bounds(&webview, session.bounds)?;
        self.set_visible_state(&session_id, true)?;
        self.sync_webview_visibility(app)?;
        emit_browser_opened(app, &session_id, &session.label);
        self.info(app, Some(&session_id))
    }

    pub fn set_bounds(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        bounds: BrowserBounds,
    ) -> Result<(), String> {
        let session_id = normalize_browser_session_id(session_id);
        let sanitized = sanitize_bounds(bounds);
        *self
            .last_bounds
            .lock()
            .map_err(|_| "Failed to lock last browser bounds".to_string())? = sanitized;
        let session = self.with_session_state(&session_id, |state| {
            state.bounds = sanitized;
        })?;
        if let Some(webview) = app.get_webview(&session.label) {
            apply_browser_bounds(&webview, sanitized)?;
        }
        Ok(())
    }

    pub fn set_visible(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        visible: bool,
    ) -> Result<(), String> {
        let session_id = normalize_browser_session_id(session_id);
        self.set_visible_state(&session_id, visible)?;
        self.sync_webview_visibility(app)
    }

    pub fn close(&self, app: &AppHandle, session_id: Option<&str>) -> Result<(), String> {
        let session_id = normalize_browser_session_id(session_id);
        let session = self.session_snapshot(&session_id)?;
        if let Some(webview) = app.get_webview(&session.label) {
            webview
                .close()
                .map_err(|error| format!("close browser webview: {error}"))?;
        }
        self.set_visible_state(&session_id, false)?;
        Ok(())
    }

    pub fn navigate(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        url: &str,
    ) -> Result<BrowserInfo, String> {
        let session_id = normalize_browser_session_id(session_id);
        let parsed = parse_browser_url(url)?;
        let next_url = parsed.as_str().to_string();
        let session = self.session_snapshot(&session_id)?;
        let webview = match app.get_webview(&session.label) {
            Some(webview) => webview,
            None => {
                ensure_browser_webview(app, &session.label, session.data_store_id, parsed.as_str())?
            }
        };
        webview
            .navigate(parsed)
            .map_err(|error| format!("navigate browser webview: {error}"))?;
        self.record_browser_page_metadata(&session_id, Some(next_url), None)?;
        apply_browser_bounds(&webview, session.bounds)?;
        self.set_visible_state(&session_id, true)?;
        self.sync_webview_visibility(app)?;
        emit_browser_opened(app, &session_id, &session.label);
        self.info(app, Some(&session_id))
    }

    pub fn reload(&self, app: &AppHandle, session_id: Option<&str>) -> Result<BrowserInfo, String> {
        let session_id = normalize_browser_session_id(session_id);
        let session = self.session_snapshot(&session_id)?;
        let webview = require_browser_webview(app, &session.label)?;
        webview
            .reload()
            .map_err(|error| format!("reload browser webview: {error}"))?;
        self.info(app, Some(&session.session_id))
    }

    pub fn back(&self, app: &AppHandle, session_id: Option<&str>) -> Result<BrowserInfo, String> {
        self.navigate_history(app, session_id, BrowserHistoryDirection::Back)
    }

    pub fn forward(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
    ) -> Result<BrowserInfo, String> {
        self.navigate_history(app, session_id, BrowserHistoryDirection::Forward)
    }

    fn navigate_history(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        direction: BrowserHistoryDirection,
    ) -> Result<BrowserInfo, String> {
        let session_id = normalize_browser_session_id(session_id);
        let session = self.session_snapshot(&session_id)?;
        let webview = require_browser_webview(app, &session.label)?;
        let before_url = session.current_url.clone();
        let did_start = navigate_browser_history(&webview, direction)?;
        if !did_start {
            return self.info(app, Some(&session.session_id));
        }
        self.wait_for_history_navigation(app, &session.session_id, before_url, direction)
    }

    pub fn eval_js(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        js: &str,
    ) -> Result<String, String> {
        let session_id = normalize_browser_session_id(session_id);
        let session = self.session_snapshot(&session_id)?;
        let webview = require_browser_webview(app, &session.label)?;
        eval_webview_js(&webview, js)
    }

    pub fn screenshot_base64(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
    ) -> Result<String, String> {
        let session_id = normalize_browser_session_id(session_id);
        let session = self.session_snapshot(&session_id)?;
        let webview = require_browser_webview(app, &session.label)?;
        snapshot_webview_png(&webview)
    }

    pub fn info(&self, app: &AppHandle, session_id: Option<&str>) -> Result<BrowserInfo, String> {
        let session_id = normalize_browser_session_id(session_id);
        let session = self.session_snapshot(&session_id)?;
        let Some(webview) = app.get_webview(&session.label) else {
            return Ok(BrowserInfo {
                label: session.label,
                session_id,
                url: session.current_url,
                title: session.title,
                visible: false,
                can_go_back: false,
                can_go_forward: false,
            });
        };
        let BrowserPageMetadata {
            url: observed_url,
            title: observed_title,
            history,
        } = browser_page_metadata(&webview).unwrap_or_default();
        if observed_url.is_some() || observed_title.is_some() {
            self.record_browser_page_metadata(
                &session_id,
                observed_url.clone(),
                observed_title.clone(),
            )?;
        }
        let url = observed_url.or(session.current_url);
        let title = observed_title.or(session.title);
        let active_session_id = self
            .active_session_id
            .lock()
            .map_err(|_| "Failed to lock active browser session".to_string())?
            .clone();
        Ok(BrowserInfo {
            label: session.label,
            session_id,
            url,
            title,
            visible: session.visible && session.session_id == active_session_id,
            can_go_back: history.can_go_back,
            can_go_forward: history.can_go_forward,
        })
    }

    pub fn run_tool(
        &self,
        app: &AppHandle,
        session_id: &str,
        request: &BrowserToolRequest,
    ) -> Result<Value, String> {
        let session_id = normalize_browser_session_id(Some(session_id));
        match request.tool.as_str() {
            "navigate" => {
                let url = required_string_arg(&request.args, "url")?;
                let info = self.navigate(app, Some(&session_id), &url)?;
                serde_json::to_value(info).map_err(|error| error.to_string())
            }
            "get_url" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let info = self.info(app, Some(&session_id))?;
                Ok(json!({ "url": info.url, "title": info.title }))
            }
            "snapshot" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                self.snapshot(app, Some(&session_id))
            }
            "click" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let reference = required_u32_arg(&request.args, "ref")?;
                self.eval_json(
                    app,
                    Some(&session_id),
                    &format!(
                        r#"
                    (() => {{
                      const node = window.__ccemRefs && window.__ccemRefs[{reference}];
                      if (!node) return {{ ok: false, error: 'Unknown browser ref {reference}' }};
                      node.scrollIntoView({{ block: 'center', inline: 'center' }});
                      node.click();
                      return {{ ok: true }};
                    }})()
                    "#
                    ),
                )
            }
            "type" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let reference = required_u32_arg(&request.args, "ref")?;
                let text = required_string_arg(&request.args, "text")?;
                let text_json = serde_json::to_string(&text).map_err(|error| error.to_string())?;
                self.eval_json(
                    app,
                    Some(&session_id),
                    &format!(
                        r#"
                    (() => {{
                      const node = window.__ccemRefs && window.__ccemRefs[{reference}];
                      if (!node) return {{ ok: false, error: 'Unknown browser ref {reference}' }};
                      node.focus();
                      if ('value' in node) {{
                        node.value = {text_json};
                        node.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        node.dispatchEvent(new Event('change', {{ bubbles: true }}));
                      }} else {{
                        node.textContent = {text_json};
                      }}
                      return {{ ok: true }};
                    }})()
                    "#
                    ),
                )
            }
            "press_key" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let key = required_string_arg(&request.args, "key")?;
                let key_json = serde_json::to_string(&key).map_err(|error| error.to_string())?;
                self.eval_json(app, Some(&session_id), &format!(
                    r#"
                    (() => {{
                      const active = document.activeElement || document.body;
                      for (const type of ['keydown', 'keyup']) {{
                        active.dispatchEvent(new KeyboardEvent(type, {{ key: {key_json}, bubbles: true }}));
                      }}
                      return {{ ok: true }};
                    }})()
                    "#
                ))
            }
            "scroll" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let delta_y = request
                    .args
                    .get("deltaY")
                    .or_else(|| request.args.get("delta_y"))
                    .and_then(Value::as_f64)
                    .unwrap_or(640.0);
                self.eval_json(
                    app,
                    Some(&session_id),
                    &format!(
                        r#"
                    (() => {{
                      window.scrollBy(0, {delta_y});
                      return {{
                        ok: true,
                        scrollY: window.scrollY
                      }};
                    }})()
                    "#
                    ),
                )
            }
            "screenshot" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let data = self.screenshot_base64(app, Some(&session_id))?;
                Ok(json!({ "mime_type": "image/png", "data": data }))
            }
            "evaluate" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let script = required_string_arg(&request.args, "script")?;
                let result = self.eval_js(app, Some(&session_id), &script)?;
                Ok(json!({ "result": decode_eval_value(&result) }))
            }
            "wait_for" => {
                self.reveal_for_agent_tool(app, &session_id)?;
                let text = required_string_arg(&request.args, "text")?;
                let timeout_ms = request
                    .args
                    .get("timeoutMs")
                    .or_else(|| request.args.get("timeout_ms"))
                    .and_then(Value::as_u64)
                    .unwrap_or(5_000);
                self.wait_for_text(app, Some(&session_id), &text, timeout_ms)
            }
            other => Err(format!("Unsupported browser tool: {other}")),
        }
    }

    fn reveal_for_agent_tool(&self, app: &AppHandle, session_id: &str) -> Result<(), String> {
        let session = self.session_snapshot(session_id)?;
        if app.get_webview(&session.label).is_none() {
            self.open(app, Some(session_id), None)?;
        } else {
            self.set_visible_state(session_id, true)?;
            self.sync_webview_visibility(app)?;
            emit_browser_opened(app, session_id, &session.label);
        }
        Ok(())
    }

    fn snapshot(&self, app: &AppHandle, session_id: Option<&str>) -> Result<Value, String> {
        let session_id = normalize_browser_session_id(session_id);
        let snapshot = self.eval_json(app, Some(&session_id), SNAPSHOT_SCRIPT)?;
        self.record_browser_page_metadata_from_value(&session_id, &snapshot)?;
        Ok(snapshot)
    }

    fn eval_json(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        expression: &str,
    ) -> Result<Value, String> {
        let script = build_eval_json_script(expression)?;
        let raw = self.eval_js(app, session_id, &script)?;
        decode_eval_json_string(&raw).and_then(|json_text| {
            serde_json::from_str(&json_text)
                .map_err(|error| format!("decode browser JSON: {error}"))
        })
    }

    fn wait_for_text(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
        text: &str,
        timeout_ms: u64,
    ) -> Result<Value, String> {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms.min(30_000));
        let needle = serde_json::to_string(text).map_err(|error| error.to_string())?;
        loop {
            let found = self.eval_json(
                app,
                session_id,
                &format!("({{ ok: true, found: document.body && document.body.innerText.includes({needle}) }})"),
            )?;
            if found.get("found").and_then(Value::as_bool).unwrap_or(false) {
                return Ok(found);
            }
            if Instant::now() >= deadline {
                return Ok(json!({ "ok": false, "found": false, "timeout_ms": timeout_ms }));
            }
            std::thread::sleep(Duration::from_millis(150));
        }
    }

    fn record_browser_page_metadata(
        &self,
        session_id: &str,
        url: Option<String>,
        title: Option<String>,
    ) -> Result<(), String> {
        if url.is_none() && title.is_none() {
            return Ok(());
        }
        self.with_session_state(session_id, |state| {
            if let Some(url) = url {
                state.current_url = Some(url);
            }
            if let Some(title) = title {
                state.title = Some(title);
            }
        })?;
        Ok(())
    }

    fn record_browser_page_metadata_from_value(
        &self,
        session_id: &str,
        value: &Value,
    ) -> Result<(), String> {
        let url = value
            .get("url")
            .and_then(Value::as_str)
            .map(str::to_string)
            .filter(|value| !value.is_empty());
        let title = value
            .get("title")
            .and_then(Value::as_str)
            .map(str::to_string)
            .filter(|value| !value.is_empty());
        self.record_browser_page_metadata(session_id, url, title)
    }

    fn wait_for_history_navigation(
        &self,
        app: &AppHandle,
        session_id: &str,
        before_url: Option<String>,
        direction: BrowserHistoryDirection,
    ) -> Result<BrowserInfo, String> {
        let deadline = Instant::now() + Duration::from_millis(2_000);
        let mut changed_info: Option<BrowserInfo> = None;
        loop {
            let info = self.info(app, Some(session_id))?;
            if info.url != before_url {
                let history_settled = match direction {
                    BrowserHistoryDirection::Back => info.can_go_forward,
                    BrowserHistoryDirection::Forward => info.can_go_back,
                };
                if history_settled {
                    return Ok(info);
                }
                changed_info = Some(info.clone());
            }
            if Instant::now() >= deadline {
                return Ok(changed_info.unwrap_or(info));
            }
            std::thread::sleep(Duration::from_millis(80));
        }
    }

    fn session_snapshot(&self, session_id: &str) -> Result<BrowserSessionState, String> {
        let default_bounds = *self
            .last_bounds
            .lock()
            .map_err(|_| "Failed to lock last browser bounds".to_string())?;
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| "Failed to lock browser sessions".to_string())?;
        Ok(sessions
            .entry(session_id.to_string())
            .or_insert_with(|| BrowserSessionState::new(session_id, default_bounds))
            .clone())
    }

    fn with_session_state<F>(
        &self,
        session_id: &str,
        update: F,
    ) -> Result<BrowserSessionState, String>
    where
        F: FnOnce(&mut BrowserSessionState),
    {
        let default_bounds = *self
            .last_bounds
            .lock()
            .map_err(|_| "Failed to lock last browser bounds".to_string())?;
        let mut sessions = self
            .sessions
            .lock()
            .map_err(|_| "Failed to lock browser sessions".to_string())?;
        let state = sessions
            .entry(session_id.to_string())
            .or_insert_with(|| BrowserSessionState::new(session_id, default_bounds));
        update(state);
        Ok(state.clone())
    }

    fn set_visible_state(&self, session_id: &str, visible: bool) -> Result<(), String> {
        self.with_session_state(session_id, |state| {
            state.visible = visible;
        })?;
        Ok(())
    }

    fn sync_webview_visibility(&self, app: &AppHandle) -> Result<(), String> {
        let active_session_id = self
            .active_session_id
            .lock()
            .map_err(|_| "Failed to lock active browser session".to_string())?
            .clone();
        let sessions = self
            .sessions
            .lock()
            .map_err(|_| "Failed to lock browser sessions".to_string())?
            .values()
            .cloned()
            .collect::<Vec<_>>();

        for session in sessions {
            let Some(webview) = app.get_webview(&session.label) else {
                continue;
            };
            if session.session_id == active_session_id && session.visible {
                webview
                    .show()
                    .map_err(|error| format!("show browser webview: {error}"))?;
            } else {
                webview
                    .hide()
                    .map_err(|error| format!("hide browser webview: {error}"))?;
            }
        }
        Ok(())
    }
}

#[tauri::command]
pub fn browser_set_active_session(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
    visible: Option<bool>,
) -> Result<(), String> {
    state.set_active_session(&app, session_id.as_deref(), visible.unwrap_or(false))
}

#[tauri::command]
pub fn browser_open(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
    url: Option<String>,
) -> Result<BrowserInfo, String> {
    state.open(&app, session_id.as_deref(), url.as_deref())
}

#[tauri::command]
pub fn browser_set_bounds(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    state.set_bounds(
        &app,
        session_id.as_deref(),
        BrowserBounds {
            x,
            y,
            width,
            height,
        },
    )
}

#[tauri::command]
pub fn browser_set_visible(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
    visible: bool,
) -> Result<(), String> {
    state.set_visible(&app, session_id.as_deref(), visible)
}

#[tauri::command]
pub fn browser_close(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<(), String> {
    state.close(&app, session_id.as_deref())
}

#[tauri::command]
pub fn browser_navigate(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
    url: String,
) -> Result<BrowserInfo, String> {
    state.navigate(&app, session_id.as_deref(), &url)
}

#[tauri::command]
pub fn browser_reload(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<BrowserInfo, String> {
    state.reload(&app, session_id.as_deref())
}

async fn run_blocking_browser_command<T, F>(
    app: AppHandle,
    state: std::sync::Arc<BrowserManager>,
    command: F,
) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(std::sync::Arc<BrowserManager>, AppHandle) -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || command(state, app))
        .await
        .map_err(|error| format!("join browser command: {error}"))?
}

#[tauri::command]
pub async fn browser_back(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<BrowserInfo, String> {
    run_blocking_browser_command(app, state.inner().clone(), move |state, app| {
        state.back(&app, session_id.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn browser_forward(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<BrowserInfo, String> {
    run_blocking_browser_command(app, state.inner().clone(), move |state, app| {
        state.forward(&app, session_id.as_deref())
    })
    .await
}

#[tauri::command]
pub fn browser_info(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<BrowserInfo, String> {
    state.info(&app, session_id.as_deref())
}

#[tauri::command]
pub async fn browser_snapshot(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<Value, String> {
    run_blocking_browser_command(app, state.inner().clone(), move |state, app| {
        state.snapshot(&app, session_id.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn browser_screenshot(
    app: AppHandle,
    state: tauri::State<'_, std::sync::Arc<BrowserManager>>,
    session_id: Option<String>,
) -> Result<String, String> {
    run_blocking_browser_command(app, state.inner().clone(), move |state, app| {
        state.screenshot_base64(&app, session_id.as_deref())
    })
    .await
}

fn sanitize_bounds(bounds: BrowserBounds) -> BrowserBounds {
    BrowserBounds {
        x: bounds.x.max(0.0),
        y: bounds.y.max(0.0),
        width: bounds.width.max(1.0),
        height: bounds.height.max(1.0),
    }
}

fn parse_browser_url(raw: &str) -> Result<tauri::Url, String> {
    let trimmed = raw.trim();
    let candidate = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    tauri::Url::parse(&candidate).map_err(|error| format!("Invalid browser URL: {error}"))
}

fn normalize_browser_session_id(raw: Option<&str>) -> String {
    raw.map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_BROWSER_SESSION_ID)
        .to_string()
}

fn stable_hash64(seed: u64, value: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325_u64 ^ seed;
    for byte in value.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn browser_label_for_session_id(session_id: &str) -> String {
    if session_id == DEFAULT_BROWSER_SESSION_ID {
        return BROWSER_LABEL.to_string();
    }
    format!("{BROWSER_LABEL}-{:016x}", stable_hash64(0, session_id))
}

fn browser_data_store_id_for_session_id(session_id: &str) -> [u8; 16] {
    if session_id == DEFAULT_BROWSER_SESSION_ID {
        return BROWSER_DATA_STORE_ID;
    }

    let left = stable_hash64(0x6363656d5f627273, session_id);
    let right = stable_hash64(0x73657373696f6e5f, session_id);
    let mut bytes = [0_u8; 16];
    bytes[..8].copy_from_slice(&left.to_be_bytes());
    bytes[8..].copy_from_slice(&right.to_be_bytes());
    bytes
}

fn required_string_arg(args: &Value, key: &str) -> Result<String, String> {
    args.get(key)
        .and_then(Value::as_str)
        .map(str::to_string)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("Missing browser tool string arg: {key}"))
}

fn required_u32_arg(args: &Value, key: &str) -> Result<u32, String> {
    let value = args
        .get(key)
        .and_then(Value::as_u64)
        .ok_or_else(|| format!("Missing browser tool numeric arg: {key}"))?;
    u32::try_from(value).map_err(|_| format!("Browser tool arg out of range: {key}"))
}

fn decode_eval_value(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or_else(|_| Value::String(raw.to_string()))
}

fn decode_eval_json_string(raw: &str) -> Result<String, String> {
    match serde_json::from_str::<Value>(raw)
        .map_err(|error| format!("decode browser eval: {error}"))?
    {
        Value::String(value) => Ok(value),
        other => Ok(other.to_string()),
    }
}

fn build_eval_json_script(expression: &str) -> Result<String, String> {
    Ok(format!(
        r#"
(() => {{
  try {{
    const value = (
{expression}
    );
    return JSON.stringify(value === undefined ? null : value);
  }} catch (error) {{
    return JSON.stringify({{ ok: false, error: String(error && error.message || error) }});
  }}
}})()
"#
    ))
}

fn emit_browser_opened(app: &AppHandle, session_id: &str, label: &str) {
    let _ = app.emit(
        "browser_panel_requested",
        json!({
            "label": label,
            "sessionId": session_id,
        }),
    );
}

#[cfg(target_os = "macos")]
fn ensure_browser_webview(
    app: &AppHandle,
    label: &str,
    data_store_id: [u8; 16],
    url: &str,
) -> Result<tauri::Webview, String> {
    if let Some(webview) = app.get_webview(label) {
        return Ok(webview);
    }

    let parsed = parse_browser_url(url)?;
    let window = app
        .get_window("main")
        .ok_or_else(|| "Main window is not available".to_string())?;
    let builder = tauri::WebviewBuilder::new(label, tauri::WebviewUrl::External(parsed))
        .user_agent(SAFARI_DESKTOP_UA)
        .incognito(false)
        .data_store_identifier(data_store_id);

    window
        .add_child(
            builder,
            tauri::LogicalPosition::new(0.0, 0.0),
            tauri::LogicalSize::new(1.0, 1.0),
        )
        .map_err(|error| format!("add browser webview: {error}"))
}

#[cfg(not(target_os = "macos"))]
fn ensure_browser_webview(
    _app: &AppHandle,
    _label: &str,
    _data_store_id: [u8; 16],
    _url: &str,
) -> Result<tauri::Webview, String> {
    Err("Embedded browser is only supported on macOS in this version.".to_string())
}

fn require_browser_webview(app: &AppHandle, label: &str) -> Result<tauri::Webview, String> {
    app.get_webview(label)
        .ok_or_else(|| "Browser panel is not open.".to_string())
}

fn apply_browser_bounds(webview: &tauri::Webview, bounds: BrowserBounds) -> Result<(), String> {
    webview
        .set_bounds(tauri::Rect {
            position: tauri::Position::Logical(tauri::LogicalPosition::new(bounds.x, bounds.y)),
            size: tauri::Size::Logical(tauri::LogicalSize::new(bounds.width, bounds.height)),
        })
        .map_err(|error| format!("set browser bounds: {error}"))
}

#[cfg(target_os = "macos")]
fn navigate_browser_history(
    webview: &tauri::Webview,
    direction: BrowserHistoryDirection,
) -> Result<bool, String> {
    use objc2_web_kit::WKWebView;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();
    webview
        .with_webview(move |platform| unsafe {
            let view: &WKWebView = &*platform.inner().cast();
            let can_navigate = match direction {
                BrowserHistoryDirection::Back => view.canGoBack(),
                BrowserHistoryDirection::Forward => view.canGoForward(),
            };
            if can_navigate {
                match direction {
                    BrowserHistoryDirection::Back => {
                        let _ = view.goBack();
                    }
                    BrowserHistoryDirection::Forward => {
                        let _ = view.goForward();
                    }
                }
            }
            let _ = tx.send(can_navigate);
        })
        .map_err(|error| format!("schedule browser history navigation: {error}"))?;

    rx.recv_timeout(Duration::from_secs(3))
        .map_err(|_| "Timed out waiting for browser history navigation.".to_string())
}

#[cfg(not(target_os = "macos"))]
fn navigate_browser_history(
    _webview: &tauri::Webview,
    _direction: BrowserHistoryDirection,
) -> Result<bool, String> {
    Err(
        "Embedded browser history navigation is only supported on macOS in this version."
            .to_string(),
    )
}

#[cfg(target_os = "macos")]
fn browser_page_metadata(webview: &tauri::Webview) -> Result<BrowserPageMetadata, String> {
    use objc2_web_kit::WKWebView;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();
    webview
        .with_webview(move |platform| unsafe {
            let view: &WKWebView = &*platform.inner().cast();
            let url = view
                .URL()
                .and_then(|url| url.absoluteString())
                .map(|value| value.to_string())
                .filter(|value| !value.is_empty());
            let title = view
                .title()
                .map(|value| value.to_string())
                .filter(|value| !value.is_empty());
            let _ = tx.send(BrowserPageMetadata {
                url,
                title,
                history: BrowserHistoryState {
                    can_go_back: view.canGoBack(),
                    can_go_forward: view.canGoForward(),
                },
            });
        })
        .map_err(|error| format!("schedule browser metadata read: {error}"))?;

    rx.recv_timeout(Duration::from_secs(3))
        .map_err(|_| "Timed out waiting for browser metadata.".to_string())
}

#[cfg(not(target_os = "macos"))]
fn browser_page_metadata(_webview: &tauri::Webview) -> Result<BrowserPageMetadata, String> {
    Ok(BrowserPageMetadata::default())
}

#[cfg(target_os = "macos")]
fn eval_webview_js(webview: &tauri::Webview, js: &str) -> Result<String, String> {
    use block2::RcBlock;
    use objc2::runtime::AnyObject;
    use objc2::ClassType;
    use objc2_foundation::{
        NSError, NSJSONSerialization, NSJSONWritingOptions, NSString, NSUTF8StringEncoding,
    };
    use objc2_web_kit::WKWebView;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();
    let script = js.to_string();
    webview
        .with_webview(move |platform| unsafe {
            let view: &WKWebView = &*platform.inner().cast();
            let handler = RcBlock::new(move |value: *mut AnyObject, error: *mut NSError| {
                let result = if !error.is_null() {
                    Err("JavaScript evaluation failed in browser webview.".to_string())
                } else if value.is_null() {
                    Ok("null".to_string())
                } else {
                    NSJSONSerialization::dataWithJSONObject_options_error(
                        &*value,
                        NSJSONWritingOptions::NSJSONWritingFragmentsAllowed,
                    )
                    .ok()
                    .and_then(|data| {
                        NSString::initWithData_encoding(
                            NSString::alloc(),
                            &data,
                            NSUTF8StringEncoding,
                        )
                    })
                    .map(|string| string.to_string())
                    .ok_or_else(|| "Failed to serialize JavaScript result.".to_string())
                };
                let _ = tx.send(result);
            });
            view.evaluateJavaScript_completionHandler(&NSString::from_str(&script), Some(&handler));
        })
        .map_err(|error| format!("schedule browser eval: {error}"))?;

    rx.recv_timeout(Duration::from_secs(15))
        .map_err(|_| "Timed out waiting for browser eval.".to_string())?
}

#[cfg(not(target_os = "macos"))]
fn eval_webview_js(_webview: &tauri::Webview, _js: &str) -> Result<String, String> {
    Err("Embedded browser eval is only supported on macOS in this version.".to_string())
}

#[cfg(target_os = "macos")]
fn snapshot_webview_png(webview: &tauri::Webview) -> Result<String, String> {
    use block2::RcBlock;
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
    use objc2_foundation::{NSDictionary, NSError};
    use objc2_web_kit::WKWebView;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();
    webview
        .with_webview(move |platform| unsafe {
            let view: &WKWebView = &*platform.inner().cast();
            let handler = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
                let result = if !error.is_null() {
                    Err("Browser screenshot failed.".to_string())
                } else if image.is_null() {
                    Err("Browser screenshot returned no image.".to_string())
                } else {
                    let image = &*image;
                    image
                        .TIFFRepresentation()
                        .and_then(|tiff| NSBitmapImageRep::imageRepWithData(&tiff))
                        .and_then(|rep| {
                            let properties: objc2::rc::Retained<
                                NSDictionary<objc2_app_kit::NSBitmapImageRepPropertyKey, AnyObject>,
                            > = NSDictionary::new();
                            rep.representationUsingType_properties(
                                NSBitmapImageFileType::PNG,
                                &properties,
                            )
                        })
                        .map(|png| base64::engine::general_purpose::STANDARD.encode(png.bytes()))
                        .ok_or_else(|| "Failed to convert browser screenshot to PNG.".to_string())
                };
                let _ = tx.send(result);
            });
            view.takeSnapshotWithConfiguration_completionHandler(None, &handler);
        })
        .map_err(|error| format!("schedule browser screenshot: {error}"))?;

    rx.recv_timeout(Duration::from_secs(15))
        .map_err(|_| "Timed out waiting for browser screenshot.".to_string())?
}

#[cfg(not(target_os = "macos"))]
fn snapshot_webview_png(_webview: &tauri::Webview) -> Result<String, String> {
    Err("Embedded browser screenshot is only supported on macOS in this version.".to_string())
}

const SNAPSHOT_SCRIPT: &str = r#"
(() => {
  const interesting = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[contenteditable="true"]'))
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    })
    .slice(0, 80);
  window.__ccemRefs = Object.create(null);
  const items = interesting.map((node, index) => {
    const ref = index + 1;
    window.__ccemRefs[ref] = node;
    const rect = node.getBoundingClientRect();
    const label = (node.getAttribute('aria-label') || node.innerText || node.value || node.placeholder || node.href || node.name || node.id || node.tagName)
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    return {
      ref,
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute('role') || null,
      type: node.getAttribute('type') || null,
      label,
      href: node.href || null,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  });
  const text = (document.body && document.body.innerText || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
  return {
    ok: true,
    url: location.href,
    title: document.title,
    text,
    elements: items,
  };
})()
"#;

#[cfg(test)]
mod tests {
    use super::{
        browser_data_store_id_for_session_id, browser_label_for_session_id, build_eval_json_script,
        normalize_browser_session_id, parse_browser_url, sanitize_bounds, BrowserBounds,
        BROWSER_DATA_STORE_ID, BROWSER_LABEL, DEFAULT_BROWSER_SESSION_ID,
    };

    #[test]
    fn parse_browser_url_adds_https_when_missing() {
        let parsed = parse_browser_url("example.com").expect("parse url");
        assert_eq!(parsed.as_str(), "https://example.com/");
    }

    #[test]
    fn sanitize_bounds_keeps_browser_renderable() {
        let bounds = sanitize_bounds(BrowserBounds {
            x: -10.0,
            y: -4.0,
            width: 0.0,
            height: -1.0,
        });
        assert_eq!(bounds.x, 0.0);
        assert_eq!(bounds.y, 0.0);
        assert_eq!(bounds.width, 1.0);
        assert_eq!(bounds.height, 1.0);
    }

    #[test]
    fn build_eval_json_script_runs_without_page_eval() {
        let script = build_eval_json_script(
            r#"
            (() => {
              window.scrollBy(0, 100);
              return { ok: true };
            })()
            "#,
        )
        .expect("script");
        assert!(!script.contains("eval("));
        assert!(script.contains("window.scrollBy"));
        assert!(script.contains("JSON.stringify"));
    }

    #[test]
    fn browser_session_ids_default_to_workspace() {
        assert_eq!(
            normalize_browser_session_id(None),
            DEFAULT_BROWSER_SESSION_ID.to_string()
        );
        assert_eq!(
            normalize_browser_session_id(Some("  ")),
            DEFAULT_BROWSER_SESSION_ID.to_string()
        );
        assert_eq!(normalize_browser_session_id(Some("native-a")), "native-a");
    }

    #[test]
    fn browser_labels_are_scoped_per_session() {
        assert_eq!(
            browser_label_for_session_id(DEFAULT_BROWSER_SESSION_ID),
            BROWSER_LABEL
        );
        let first = browser_label_for_session_id("native-a");
        let second = browser_label_for_session_id("native-b");
        assert!(first.starts_with(&format!("{BROWSER_LABEL}-")));
        assert!(second.starts_with(&format!("{BROWSER_LABEL}-")));
        assert_ne!(first, second);
    }

    #[test]
    fn browser_data_stores_are_scoped_per_session() {
        assert_eq!(
            browser_data_store_id_for_session_id(DEFAULT_BROWSER_SESSION_ID),
            BROWSER_DATA_STORE_ID
        );
        assert_ne!(
            browser_data_store_id_for_session_id("native-a"),
            browser_data_store_id_for_session_id("native-b")
        );
        assert_ne!(
            browser_data_store_id_for_session_id("native-a"),
            BROWSER_DATA_STORE_ID
        );
    }
}
