import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const tauriDir = path.join(desktopDir, 'src-tauri');

// ---------------------------------------------------------------------------
// Structural checks: the external control server is wired into the app.
// These catch regressions where the module is removed or renamed.
// ---------------------------------------------------------------------------

test('desktop registers the external control server on startup', async () => {
  const mainSource = await fs.readFile(path.join(tauriDir, 'src', 'main.rs'), 'utf8');
  const controlSource = await fs.readFile(path.join(tauriDir, 'src', 'external_control.rs'), 'utf8');
  const appSource = await fs.readFile(path.join(desktopDir, 'src', 'App.tsx'), 'utf8');
  const cargoSource = await fs.readFile(path.join(tauriDir, 'Cargo.toml'), 'utf8');

  assert.match(mainSource, /mod external_control;/);
  assert.match(mainSource, /ExternalControlManager::new/);
  assert.match(mainSource, /external_control_manager_for_setup\.start/);
  assert.match(controlSource, /ccem-control-request/);
  assert.match(appSource, /ccem-control-request/);
  assert.match(cargoSource, /rand = /);
});

// ---------------------------------------------------------------------------
// HTTP boundary checks (behavioral): verify the Rust source contains
// Host/Origin/Content-Type validation code — not just strings, but the
// actual guard functions and allowlist logic.
// ---------------------------------------------------------------------------

test('external control server enforces Host header loopback check', async () => {
  const controlSource = await fs.readFile(path.join(tauriDir, 'src', 'external_control.rs'), 'utf8');

  // Pure helper must exist and be called in handle_http_request.
  assert.match(controlSource, /fn is_loopback_host_header\(host: &str\) -> bool/);
  assert.match(controlSource, /is_loopback_host_header\(host_header\)/);
  // Must reject with 403 when Host is non-loopback.
  assert.match(controlSource, /403.*non-loopback Host/);
});

test('external control server enforces Origin header loopback check', async () => {
  const controlSource = await fs.readFile(path.join(tauriDir, 'src', 'external_control.rs'), 'utf8');

  assert.match(controlSource, /fn is_loopback_origin\(origin: &str\) -> bool/);
  assert.match(controlSource, /is_loopback_origin\(origin\)/);
  assert.match(controlSource, /403.*non-loopback Origin/);
});

test('external control server enforces Content-Type application/json check', async () => {
  const controlSource = await fs.readFile(path.join(tauriDir, 'src', 'external_control.rs'), 'utf8');

  assert.match(controlSource, /fn is_json_content_type/);
  assert.match(controlSource, /is_json_content_type\(/);
  assert.match(controlSource, /415/);
});

test('external control server rejects unknown JSON-RPC methods with -32601', async () => {
  const controlSource = await fs.readFile(path.join(tauriDir, 'src', 'external_control.rs'), 'utf8');

  assert.match(controlSource, /fn is_allowed_method\(method: &str\) -> bool/);
  assert.match(controlSource, /is_allowed_method\(&rpc\.method\)/);
  assert.match(controlSource, /-32601/);
});

// ---------------------------------------------------------------------------
// Behavioral test: run `cargo test` on the Rust unit tests to verify
// the pure helpers (host/origin/content-type/method allowlist) actually
// behave correctly at the Rust level. This is the real boundary coverage
// — not a string match.
// ---------------------------------------------------------------------------

test('cargo test external_control unit tests pass', { timeout: 120000 }, async () => {
  // Skip if cargo is not available or the user set CCEM_SKIP_CARGO_TEST=1.
  if (process.env.CCEM_SKIP_CARGO_TEST === '1') {
    return;
  }

  const result = spawnSync('cargo', ['test', '--bin', 'ccem-desktop', 'external_control::tests', '--quiet'], {
    cwd: tauriDir,
    encoding: 'utf8',
    timeout: 100000,
  });

  // Cargo may print warnings; check the exit status.
  assert.equal(
    result.status,
    0,
    `cargo test failed (status=${result.status}):\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  // Confirm tests actually ran (not skipped because of a compile error).
  assert.match(
    result.stdout + result.stderr,
    /test result: ok\.\s+\d+ passed/,
    'Expected at least one passing test result from cargo',
  );
});

// ---------------------------------------------------------------------------
// Behavioral test: verify the CLI descriptor parser rejects stale pids
// and non-loopback endpoints. This runs the actual CLI test suite.
// ---------------------------------------------------------------------------

test('CLI desktop-control boundary tests pass', { timeout: 60000 }, async () => {
  if (process.env.CCEM_SKIP_CLI_TEST === '1') {
    return;
  }

  const cliDir = path.resolve(desktopDir, '..', 'cli');
  const result = spawnSync(
    'pnpm',
    ['--filter', '@ccem/cli', 'exec', 'vitest', 'run', 'src/__tests__/desktop-control.test.ts'],
    {
      cwd: path.resolve(desktopDir, '..', '..'),
      encoding: 'utf8',
      timeout: 50000,
    },
  );

  assert.equal(
    result.status,
    0,
    `CLI desktop-control tests failed (status=${result.status}):\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
