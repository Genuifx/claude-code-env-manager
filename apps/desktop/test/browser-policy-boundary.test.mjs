import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const desktopDir = path.resolve(import.meta.dirname, '..');
const rustDir = path.join(desktopDir, 'src-tauri', 'src');

test('browser tool dispatch uses the authoritative native session permission record', async () => {
  const [nativeRuntimeSource, browserSource, policySource] = await Promise.all([
    fs.readFile(path.join(rustDir, 'native_runtime.rs'), 'utf8'),
    fs.readFile(path.join(rustDir, 'browser.rs'), 'utf8'),
    fs.readFile(path.join(rustDir, 'browser', 'policy.rs'), 'utf8'),
  ]);

  const requestShape = browserSource.match(
    /pub struct BrowserToolRequest \{[\s\S]*?\n\}/,
  )?.[0] ?? '';
  assert.doesNotMatch(requestShape, /perm_mode|permission_mode/);

  const dispatch = nativeRuntimeSource.match(
    /fn handle_browser_tool_request\([\s\S]*?\n    fn mark_process_exit/,
  )?.[0] ?? '';
  const recordAuthorization = nativeRuntimeSource.match(
    /fn authorize_browser_tool_for_record\([\s\S]*?\n\}/,
  )?.[0] ?? '';
  assert.match(dispatch, /handle[\s\S]*record[\s\S]*authorize_browser_tool_for_record/);
  assert.ok(
    dispatch.indexOf('authorize_browser_tool_for_record') < dispatch.indexOf('browser.run_tool'),
  );
  assert.match(recordAuthorization, /effective_native_perm_mode/);
  assert.match(recordAuthorization, /authorize_browser_tool/);

  assert.match(policySource, /"readonly" \| "audit" \| "plan" \| "safe" \| "ci"/);
  assert.match(policySource, /READ_ONLY_BROWSER_TOOLS\.contains\(&tool\)/);
});

test('browser actions require exact visible session control and support cancellation', async () => {
  const [toolsSource, registrySource, panelSource] = await Promise.all([
    fs.readFile(path.join(rustDir, 'browser', 'tools.rs'), 'utf8'),
    fs.readFile(path.join(rustDir, 'browser', 'registry.rs'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'workspace', 'BrowserPanel.tsx'), 'utf8'),
  ]);

  const dispatch = toolsSource.match(/pub fn run_tool\([\s\S]*?\n    fn run_tool_inner/)?.[0] ?? '';
  assert.ok(dispatch.indexOf('wait_for_visible_agent_control') < dispatch.indexOf('begin_agent_action'));
  assert.match(toolsSource, /main_visible[\s\S]*get_webview[\s\S]*is_visible_for_agent/);
  assert.match(registrySource, /active_session_id == session_id[\s\S]*session\.visible && !session\.paused/);
  assert.match(registrySource, /cancel_epoch = session\.cancel_epoch\.saturating_add\(1\)/);
  assert.match(panelSource, /browser_set_paused/);
  assert.match(panelSource, /browserAgentControlling/);
});
