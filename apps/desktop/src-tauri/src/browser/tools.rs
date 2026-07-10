use super::registry::BrowserOperationToken;
use super::{
    build_eval_json_script, decode_eval_json_string, decode_eval_value, emit_browser_opened,
    emit_browser_state, normalize_browser_session_id, required_string_arg, required_u32_arg,
    BrowserManager, BrowserToolRequest,
};
use rand::rngs::OsRng;
use rand::RngCore;
use serde_json::{json, Value};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

impl BrowserManager {
    pub fn run_tool(
        &self,
        app: &AppHandle,
        session_id: &str,
        workspace_dir: &str,
        request: &BrowserToolRequest,
    ) -> Result<Value, String> {
        let session_id = normalize_browser_session_id(Some(session_id));
        let session = self.session_snapshot(&session_id)?;
        if session.paused {
            return Err("Browser agent control is paused by the user.".to_string());
        }
        let actor = self.registry.actor(&session_id)?;
        let _permit = actor
            .lock()
            .map_err(|_| format!("Browser session {session_id} actor is unavailable"))?;
        self.reveal_for_agent_tool(app, &session_id)?;
        self.wait_for_visible_agent_control(app, &session_id)?;
        let (active, token) = self
            .registry
            .begin_agent_action(&session_id, &request.tool)?;
        emit_browser_state(app, &active, "agent_action_started");

        let outcome = self
            .run_tool_inner(app, &session_id, workspace_dir, request, &token)
            .and_then(|value| {
                self.registry.validate_operation(&token)?;
                Ok(value)
            });
        let finish_error = outcome.as_ref().err().map(String::as_str);
        if let Some(finished) = self.registry.finish_agent_action(&token, finish_error)? {
            emit_browser_state(
                app,
                &finished,
                if outcome.is_ok() {
                    "agent_action_finished"
                } else {
                    "agent_action_failed"
                },
            );
        }
        outcome
    }

    fn run_tool_inner(
        &self,
        app: &AppHandle,
        session_id: &str,
        workspace_dir: &str,
        request: &BrowserToolRequest,
        token: &BrowserOperationToken,
    ) -> Result<Value, String> {
        match request.tool.as_str() {
            "navigate" => {
                let url = required_string_arg(&request.args, "url")?;
                let info = self.navigate(app, Some(session_id), &url)?;
                serde_json::to_value(info).map_err(|error| error.to_string())
            }
            "get_url" => {
                let info = self.info(app, Some(session_id))?;
                Ok(json!({ "url": info.url, "title": info.title }))
            }
            "snapshot" => {
                let snapshot = self.snapshot(app, Some(session_id))?;
                self.store_interaction_snapshot_artifact(session_id, workspace_dir, &snapshot)
            }
            "click" => {
                let snapshot_id = required_string_arg(&request.args, "snapshotId")?;
                self.registry
                    .validate_interaction_snapshot(session_id, &snapshot_id)?;
                let reference = required_u32_arg(&request.args, "ref")?;
                let snapshot_id_json =
                    serde_json::to_string(&snapshot_id).map_err(|error| error.to_string())?;
                ensure_page_action_ok(self.eval_json(
                    app,
                    Some(session_id),
                    &format!(
                        r#"
                    (() => {{
                      const snapshotId = {snapshot_id_json};
                      const refs = window[`__ccemSnapshot_${{snapshotId}}`];
                      if (window.__ccemCurrentSnapshotId !== snapshotId || !refs) {{
                        return {{ ok: false, error: 'Browser interaction snapshot is stale' }};
                      }}
                      const node = refs[{reference}];
                      if (!node) return {{ ok: false, error: 'Unknown browser ref {reference}' }};
                      node.scrollIntoView({{ block: 'center', inline: 'center' }});
                      node.click();
                      return {{ ok: true }};
                    }})()
                    "#
                    ),
                )?)
            }
            "type" => {
                let snapshot_id = required_string_arg(&request.args, "snapshotId")?;
                self.registry
                    .validate_interaction_snapshot(session_id, &snapshot_id)?;
                let reference = required_u32_arg(&request.args, "ref")?;
                let text = required_string_arg(&request.args, "text")?;
                let text_json = serde_json::to_string(&text).map_err(|error| error.to_string())?;
                let snapshot_id_json =
                    serde_json::to_string(&snapshot_id).map_err(|error| error.to_string())?;
                ensure_page_action_ok(self.eval_json(
                    app,
                    Some(session_id),
                    &format!(
                        r#"
                    (() => {{
                      const snapshotId = {snapshot_id_json};
                      const refs = window[`__ccemSnapshot_${{snapshotId}}`];
                      if (window.__ccemCurrentSnapshotId !== snapshotId || !refs) {{
                        return {{ ok: false, error: 'Browser interaction snapshot is stale' }};
                      }}
                      const node = refs[{reference}];
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
                )?)
            }
            "press_key" => {
                let key = required_string_arg(&request.args, "key")?;
                let key_json = serde_json::to_string(&key).map_err(|error| error.to_string())?;
                self.eval_json(app, Some(session_id), &format!(
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
                let delta_y = request
                    .args
                    .get("deltaY")
                    .or_else(|| request.args.get("delta_y"))
                    .and_then(Value::as_f64)
                    .unwrap_or(640.0);
                self.eval_json(
                    app,
                    Some(session_id),
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
            "screenshot" => self.capture_screenshot_artifact(app, session_id, workspace_dir),
            "evaluate" => {
                let script = required_string_arg(&request.args, "script")?;
                let result = self.eval_js(app, Some(session_id), &script)?;
                Ok(json!({ "result": decode_eval_value(&result) }))
            }
            "wait_for" => {
                let text = required_string_arg(&request.args, "text")?;
                let timeout_ms = request
                    .args
                    .get("timeoutMs")
                    .or_else(|| request.args.get("timeout_ms"))
                    .and_then(Value::as_u64)
                    .unwrap_or(5_000);
                self.wait_for_text(app, Some(session_id), &text, timeout_ms, Some(token))
            }
            other => Err(format!("Unsupported browser tool: {other}")),
        }
    }

    fn reveal_for_agent_tool(&self, app: &AppHandle, session_id: &str) -> Result<(), String> {
        let session = self.session_snapshot(session_id)?;
        if let Some(window) = app.get_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        emit_browser_opened(app, session_id, &session.label, "agent_reveal");
        emit_browser_state(app, &session, "agent_visibility_requested");
        Ok(())
    }

    fn wait_for_visible_agent_control(
        &self,
        app: &AppHandle,
        session_id: &str,
    ) -> Result<(), String> {
        let deadline = Instant::now() + Duration::from_secs(8);
        loop {
            let session = self
                .registry
                .snapshot(session_id)?
                .ok_or_else(|| "Browser session ended before it became visible.".to_string())?;
            if session.paused {
                return Err("Browser agent control is paused by the user.".to_string());
            }
            let main_visible = app
                .get_window("main")
                .and_then(|window| window.is_visible().ok())
                .unwrap_or(false);
            if main_visible
                && app.get_webview(&session.label).is_some()
                && self.registry.is_visible_for_agent(session_id)?
            {
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err(
                    "Browser action was cancelled because the matching Preview Browser session did not become visible."
                        .to_string(),
                );
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    }

    pub(crate) fn snapshot(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
    ) -> Result<Value, String> {
        let session_id = normalize_browser_session_id(session_id);
        let snapshot_id = random_snapshot_id();
        let script = build_snapshot_script(&snapshot_id)?;
        let mut snapshot = self.eval_json(app, Some(&session_id), &script)?;
        self.record_browser_page_metadata_from_value(&session_id, &snapshot)?;
        let token = self
            .registry
            .record_interaction_snapshot(&session_id, &snapshot_id)?;
        let object = snapshot
            .as_object_mut()
            .ok_or_else(|| "Browser interaction snapshot is not an object.".to_string())?;
        object.insert("snapshot_id".to_string(), Value::String(snapshot_id));
        object.insert("generation".to_string(), json!(token.generation));
        object.insert("navigation_seq".to_string(), json!(token.navigation_seq));
        object.insert("frame_id".to_string(), Value::String("main".to_string()));
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
        operation: Option<&BrowserOperationToken>,
    ) -> Result<Value, String> {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms.min(30_000));
        let needle = serde_json::to_string(text).map_err(|error| error.to_string())?;
        loop {
            if let Some(operation) = operation {
                self.registry.validate_operation(operation)?;
            }
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
        self.registry.record_metadata(session_id, url, title)?;
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
}

fn random_snapshot_id() -> String {
    let mut bytes = [0_u8; 16];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

fn build_snapshot_script(snapshot_id: &str) -> Result<String, String> {
    if snapshot_id.len() != 32 || !snapshot_id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("Browser snapshot id is invalid.".to_string());
    }
    Ok(SNAPSHOT_SCRIPT_TEMPLATE.replace("__CCEM_SNAPSHOT_ID__", snapshot_id))
}

fn ensure_page_action_ok(result: Value) -> Result<Value, String> {
    if result.get("ok").and_then(Value::as_bool) == Some(false) {
        return Err(result
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("Browser page rejected the interaction.")
            .to_string());
    }
    Ok(result)
}

const SNAPSHOT_SCRIPT_TEMPLATE: &str = r#"
(() => {
  const snapshotId = '__CCEM_SNAPSHOT_ID__';
  const normalize = (value, limit = 160) => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
  const isRendered = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE || node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0
      && rect.height > 0
      && style.visibility !== 'hidden'
      && style.display !== 'none'
      && style.opacity !== '0';
  };
  const safeUrl = (value) => {
    if (!value) return null;
    try {
      const url = new URL(String(value), location.href);
      url.username = '';
      url.password = '';
      for (const key of Array.from(url.searchParams.keys())) {
        if (/(token|secret|pass(word)?|api.?key|auth|session|otp|one.?time|code)/i.test(key)) {
          url.searchParams.set(key, '[REDACTED]');
        }
      }
      return url.href.slice(0, 2048);
    } catch (_) {
      return null;
    }
  };
  const inferredRole = (node) => {
    const explicit = node.getAttribute('role');
    if (explicit) return explicit;
    const tag = node.tagName.toLowerCase();
    if (tag === 'a' && node.href) return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (tag === 'input') {
      const type = (node.type || 'text').toLowerCase();
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
      return 'textbox';
    }
    return null;
  };
  const accessibleName = (node) => {
    const labelledBy = (node.getAttribute('aria-labelledby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((label) => label.innerText || label.textContent || '')
      .join(' ');
    const associatedLabel = node.labels && node.labels.length
      ? Array.from(node.labels).map((label) => label.innerText || '').join(' ')
      : '';
    return normalize(
      node.getAttribute('aria-label')
        || labelledBy
        || associatedLabel
        || node.innerText
        || node.placeholder
        || node.getAttribute('title')
        || node.name
        || node.id
        || node.tagName,
    );
  };
  const isSensitiveInput = (node) => {
    const attributes = [
      node.type,
      node.name,
      node.id,
      node.autocomplete,
      node.getAttribute('aria-label'),
      node.placeholder,
    ].join(' ');
    return /(password|token|secret|api.?key|auth|session|otp|one.?time)/i.test(attributes);
  };
  const interesting = Array.from(document.querySelectorAll([
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[contenteditable="true"]',
    '[tabindex]',
  ].join(',')))
    .filter(isRendered)
    .slice(0, 80);
  const refs = Object.create(null);
  const priorSlot = window.__ccemCurrentSnapshotSlot;
  if (typeof priorSlot === 'string' && priorSlot.startsWith('__ccemSnapshot_')) {
    try { delete window[priorSlot]; } catch (_) {}
  }
  const snapshotSlot = `__ccemSnapshot_${snapshotId}`;
  window[snapshotSlot] = refs;
  window.__ccemCurrentSnapshotSlot = snapshotSlot;
  window.__ccemCurrentSnapshotId = snapshotId;
  const items = interesting.map((node, index) => {
    const ref = index + 1;
    refs[ref] = node;
    const rect = node.getBoundingClientRect();
    const disabled = Boolean(node.disabled) || node.getAttribute('aria-disabled') === 'true';
    const editable = !disabled && !node.readOnly && (
      node.isContentEditable
      || node.tagName === 'TEXTAREA'
      || node.tagName === 'SELECT'
      || (node.tagName === 'INPUT' && !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden'].includes((node.type || '').toLowerCase()))
    );
    const focusable = !disabled && (
      node.tabIndex >= 0
      || node.isContentEditable
      || ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)
    );
    const rawValue = 'value' in node ? String(node.value || '') : '';
    const valueRedacted = Boolean(rawValue) && isSensitiveInput(node);
    const name = accessibleName(node);
    return {
      ref,
      element_id: `${snapshotId}:${ref}`,
      tag: node.tagName.toLowerCase(),
      role: inferredRole(node),
      type: node.getAttribute('type') || null,
      name,
      label: name,
      href: safeUrl(node.href),
      disabled,
      hidden: false,
      focusable,
      editable,
      readonly: Boolean(node.readOnly),
      checked: typeof node.checked === 'boolean' ? node.checked : null,
      value: valueRedacted ? '[REDACTED]' : normalize(rawValue),
      value_redacted: valueRedacted,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  });
  const blockSelector = 'h1,h2,h3,h4,h5,h6,p,li,pre,code,label,legend,td,th,dt,dd,blockquote';
  const textBlocks = Array.from(document.querySelectorAll(blockSelector))
    .filter(isRendered)
    .map((node) => ({ tag: node.tagName.toLowerCase(), text: normalize(node.innerText, 500) }))
    .filter((block) => block.text)
    .slice(0, 200);
  const hiddenCandidatesAll = document.body ? Array.from(document.body.querySelectorAll('*')) : [];
  const hiddenCandidates = hiddenCandidatesAll.slice(0, 2000);
  const hiddenTextCount = hiddenCandidates.reduce((count, node) => {
    const ownText = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent || '')
      .join(' ')
      .trim();
    return count + (ownText && !isRendered(node) ? 1 : 0);
  }, 0);
  const text = (document.body && document.body.innerText || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
  return {
    ok: true,
    url: location.href,
    title: document.title,
    text,
    text_blocks: textBlocks,
    hidden_text_count: hiddenTextCount,
    hidden_text_scan_truncated: hiddenCandidatesAll.length > hiddenCandidates.length,
    elements: items,
  };
})()
"#;
