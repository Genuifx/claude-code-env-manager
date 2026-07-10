use super::registry::BrowserOperationToken;
use super::{
    build_eval_json_script, decode_eval_json_string, decode_eval_value, emit_browser_opened,
    emit_browser_state, normalize_browser_session_id, required_string_arg, required_u32_arg,
    BrowserManager, BrowserToolRequest,
};
use serde_json::{json, Value};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

impl BrowserManager {
    pub fn run_tool(
        &self,
        app: &AppHandle,
        session_id: &str,
        request: &BrowserToolRequest,
    ) -> Result<Value, String> {
        let session_id = normalize_browser_session_id(Some(session_id));
        self.session_snapshot(&session_id)?;
        let actor = self.registry.actor(&session_id)?;
        let _permit = actor
            .lock()
            .map_err(|_| format!("Browser session {session_id} actor is unavailable"))?;
        let (active, token) = self
            .registry
            .begin_agent_action(&session_id, &request.tool)?;
        emit_browser_state(app, &active, "agent_action_started");

        let outcome = self
            .run_tool_inner(app, &session_id, request, &token)
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
                self.reveal_for_agent_tool(app, session_id)?;
                let info = self.info(app, Some(session_id))?;
                Ok(json!({ "url": info.url, "title": info.title }))
            }
            "snapshot" => {
                self.reveal_for_agent_tool(app, session_id)?;
                self.snapshot(app, Some(session_id))
            }
            "click" => {
                self.reveal_for_agent_tool(app, session_id)?;
                let reference = required_u32_arg(&request.args, "ref")?;
                self.eval_json(
                    app,
                    Some(session_id),
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
                self.reveal_for_agent_tool(app, session_id)?;
                let reference = required_u32_arg(&request.args, "ref")?;
                let text = required_string_arg(&request.args, "text")?;
                let text_json = serde_json::to_string(&text).map_err(|error| error.to_string())?;
                self.eval_json(
                    app,
                    Some(session_id),
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
                self.reveal_for_agent_tool(app, session_id)?;
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
                self.reveal_for_agent_tool(app, session_id)?;
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
            "screenshot" => {
                self.reveal_for_agent_tool(app, session_id)?;
                let data = self.screenshot_base64(app, Some(session_id))?;
                Ok(json!({ "mime_type": "image/png", "data": data }))
            }
            "evaluate" => {
                self.reveal_for_agent_tool(app, session_id)?;
                let script = required_string_arg(&request.args, "script")?;
                let result = self.eval_js(app, Some(session_id), &script)?;
                Ok(json!({ "result": decode_eval_value(&result) }))
            }
            "wait_for" => {
                self.reveal_for_agent_tool(app, session_id)?;
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
        if app.get_webview(&session.label).is_none() {
            self.open(app, Some(session_id), None)?;
        } else {
            let state = self.registry.set_visible(session_id, true)?;
            self.sync_webview_visibility(app)?;
            emit_browser_opened(app, session_id, &session.label, "agent_reveal");
            emit_browser_state(app, &state, "agent_reveal");
        }
        Ok(())
    }

    pub(super) fn snapshot(
        &self,
        app: &AppHandle,
        session_id: Option<&str>,
    ) -> Result<Value, String> {
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
