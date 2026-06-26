import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, MIN_REQUEST_KEY_LENGTH, readRequestKey, parseTrustProxy } from './index.js';

const VALID_KEY = 'ccem_k1_valid0001';
const INVALID_KEY = 'ccem_k1_invalid0001';

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const withServer = async (t, options = {}) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-server-test-'));
  const keysFile = path.join(tmpDir, 'keys.json');
  const environmentsFile = path.join(tmpDir, 'environments.json');

  writeJson(keysFile, {
    [VALID_KEY]: {
      environments: ['dev']
    }
  });
  writeJson(environmentsFile, {
    dev: {
      ANTHROPIC_BASE_URL: 'https://example.invalid/api',
      ANTHROPIC_AUTH_TOKEN: 'sk-placeholder-do-not-use',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus-placeholder',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'sonnet-placeholder',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'haiku-placeholder'
    }
  });

  const logs = [];
  const app = createApp({
    keysFile,
    environmentsFile,
    secret: 'test-secret',
    logger: (level, ip, message) => logs.push({ level, ip, message }),
    ...options
  });

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (urlPath, init = {}) => {
    const response = await fetch(`${baseUrl}${urlPath}`, init);
    const body = await response.json();
    return { response, body };
  };

  return { request, logs };
};

// Capture console.error / console.warn during an async block.
// Used to assert express-rate-limit does not leak ValidationError stack noise
// on requests that are intentionally handled (e.g. spoofed X-Forwarded-For
// in default mode where the header is correctly ignored).
const captureConsoleErrors = async (fn) => {
  const captured = [];
  const orig = { error: console.error, warn: console.warn };
  console.error = (...args) => captured.push(...args);
  console.warn = (...args) => captured.push(...args);
  try {
    await fn();
  } finally {
    console.error = orig.error;
    console.warn = orig.warn;
  }
  return captured;
};

const isErlValidationError = (item) => {
  if (item instanceof Error) return typeof item.code === 'string' && item.code.startsWith('ERR_ERL');
  if (typeof item === 'string') return item.includes('ERR_ERL');
  return false;
};

test('readRequestKey accepts exactly one header or query key and rejects malformed input', () => {
  assert.deepEqual(
    readRequestKey({ headers: { 'x-ccem-key': VALID_KEY }, query: {} }),
    { ok: true, key: VALID_KEY, source: 'header' }
  );
  assert.deepEqual(
    readRequestKey({ headers: {}, query: { key: `  ${VALID_KEY}  ` } }),
    { ok: true, key: VALID_KEY, source: 'query' }
  );
  assert.deepEqual(
    readRequestKey({ headers: { 'x-ccem-key': [VALID_KEY, INVALID_KEY] }, query: {} }),
    { ok: false, reason: 'header_multiple', source: 'header' }
  );
  assert.deepEqual(
    readRequestKey({ headers: {}, query: { key: [VALID_KEY, INVALID_KEY] } }),
    { ok: false, reason: 'query_multiple', source: 'query' }
  );
  assert.deepEqual(
    readRequestKey({ headers: { 'x-ccem-key': '   ' }, query: {} }),
    { ok: false, reason: 'blank', source: 'header' }
  );
  assert.deepEqual(
    readRequestKey({ headers: {}, query: { key: 'a'.repeat(MIN_REQUEST_KEY_LENGTH - 1) } }),
    { ok: false, reason: 'too_short', source: 'query' }
  );
  assert.deepEqual(
    readRequestKey({ headers: {}, query: { key: { nested: VALID_KEY } } }),
    { ok: false, reason: 'not_string', source: 'query' }
  );
});

test('header key and deprecated query key both authorize existing clients', async (t) => {
  const { request, logs } = await withServer(t);

  const headerResult = await request('/api/env', {
    headers: { 'x-ccem-key': VALID_KEY }
  });
  assert.equal(headerResult.response.status, 200);
  assert.equal(typeof headerResult.body.encrypted, 'string');

  const queryResult = await request(`/api/env?key=${encodeURIComponent(VALID_KEY)}`);
  assert.equal(queryResult.response.status, 200);
  assert.equal(typeof queryResult.body.encrypted, 'string');
  assert.ok(
    logs.some((entry) => entry.level === 'WARN' && entry.message.includes('deprecated query parameter')),
    'query-key compatibility should log a deprecation warning'
  );
});

test('malformed keys fail closed without indexing config or throwing', async (t) => {
  const { request, logs } = await withServer(t);

  const arrayQuery = await request(`/api/env?key=${encodeURIComponent(VALID_KEY)}&key=${encodeURIComponent(INVALID_KEY)}`);
  assert.equal(arrayQuery.response.status, 401);
  assert.equal(arrayQuery.body.error, 'Invalid key');

  const messages = logs.map((entry) => entry.message).join('\n');
  assert.ok(messages.includes('Rejected malformed key'));
  assert.ok(!messages.includes(VALID_KEY));
  assert.ok(!messages.includes(VALID_KEY.slice(0, 10)));
});

test('invalid keys use auth cooldown before ordinary rate limiting', async (t) => {
  let currentTime = 1_000;
  const { request } = await withServer(t, { now: () => currentTime });

  const firstInvalid = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY }
  });
  assert.equal(firstInvalid.response.status, 401);

  const cooledValid = await request('/api/env', {
    headers: { 'x-ccem-key': VALID_KEY }
  });
  assert.equal(cooledValid.response.status, 429);
  assert.equal(cooledValid.response.headers.get('retry-after'), '60');
  assert.equal(cooledValid.body.error, 'Too many failed attempts, please try again later');

  currentTime += 60_001;
  const secondInvalid = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY }
  });
  assert.equal(secondInvalid.response.status, 401);

  const longerCooldown = await request('/api/env', {
    headers: { 'x-ccem-key': VALID_KEY }
  });
  assert.equal(longerCooldown.response.status, 429);
  assert.equal(longerCooldown.response.headers.get('retry-after'), '120');
});

test('successful authorization after cooldown clears failed attempt history', async (t) => {
  let currentTime = 1_000;
  const { request } = await withServer(t, { now: () => currentTime });

  const firstInvalid = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY }
  });
  assert.equal(firstInvalid.response.status, 401);

  currentTime += 60_001;
  const validAfterCooldown = await request('/api/env', {
    headers: { 'x-ccem-key': VALID_KEY }
  });
  assert.equal(validAfterCooldown.response.status, 200);

  const invalidAfterSuccess = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY }
  });
  assert.equal(invalidAfterSuccess.response.status, 401);

  const resetCooldown = await request('/api/env', {
    headers: { 'x-ccem-key': VALID_KEY }
  });
  assert.equal(resetCooldown.response.status, 429);
  assert.equal(resetCooldown.response.headers.get('retry-after'), '60');
});

test('auth logs use stable hashes and never include key fragments', async (t) => {
  const { request, logs } = await withServer(t);

  const invalid = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY }
  });
  assert.equal(invalid.response.status, 401);

  const messages = logs.map((entry) => entry.message).join('\n');
  assert.match(messages, /keyHash=[a-f0-9]{12}/);
  assert.ok(!messages.includes(INVALID_KEY));
  assert.ok(!messages.includes(INVALID_KEY.slice(0, 10)));
});

// ============ Trust proxy 单元测试 ============
// 守住 parseTrustProxy 的契约：true/false/非负整数通过，其余 fail-closed 抛错。
// 非法 env 在 startServer 时直接 throw，让进程退出而非静默运行在错误模式。
test('parseTrustProxy accepts true, false, and non-negative integers; rejects everything else', () => {
  // 缺省视为 false（不信任）
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy(null), false);
  assert.equal(parseTrustProxy(''), false);
  assert.equal(parseTrustProxy('   '), false);

  // 布尔字面量
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(parseTrustProxy('TRUE'), true);
  assert.equal(parseTrustProxy('  True  '), true);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('False'), false);

  // 非负整数 hop count
  assert.equal(parseTrustProxy('0'), 0);
  assert.equal(parseTrustProxy('1'), 1);
  assert.equal(parseTrustProxy('  2 '), 2);
  assert.equal(parseTrustProxy('10'), 10);

  // 非法值必须抛错——不能静默降级
  assert.throws(() => parseTrustProxy('yes'), /Invalid CCEM_TRUST_PROXY/);
  assert.throws(() => parseTrustProxy('nginx'), /Invalid CCEM_TRUST_PROXY/);
  assert.throws(() => parseTrustProxy('1.5'), /Invalid CCEM_TRUST_PROXY/);
  assert.throws(() => parseTrustProxy('-1'), /Invalid CCEM_TRUST_PROXY/);
  assert.throws(() => parseTrustProxy('127.0.0.1'), /Invalid CCEM_TRUST_PROXY/);
});

// ============ Trust proxy 行为测试 ============

test('default mode (trustProxy=false) keys cooldown on socket IP — X-Forwarded-For cannot bypass it', async (t) => {
  let currentTime = 1_000;
  const { request, logs } = await withServer(t, { now: () => currentTime });

  // Capture stderr during the spoofed-header requests — express-rate-limit
  // must NOT emit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR noise on each request.
  // The header is intentionally ignored in default mode (regression-tested here),
  // so the library's "this could be a misconfiguration" warning is a false positive.
  const stderr = await captureConsoleErrors(async () => {
    // 同一 TCP 连接，伪造不同的 X-Forwarded-For：
    // 默认不信任 forwarded header，两次失败必须落到同一 IP bucket → 第二次触发 cooldown。
    const first = await request('/api/env', {
      headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '203.0.113.1' }
    });
    assert.equal(first.response.status, 401);

    const second = await request('/api/env', {
      headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '198.51.100.2' }
    });
    assert.equal(second.response.status, 429);
    assert.equal(second.response.headers.get('retry-after'), '60');
    assert.equal(second.body.error, 'Too many failed attempts, please try again later');
  });

  const erlNoise = stderr.filter(isErlValidationError);
  assert.equal(erlNoise.length, 0,
    `express-rate-limit leaked ValidationError noise for spoofed X-Forwarded-For in default mode: ` +
    erlNoise.map((e) => e.code || e.message || String(e)).join(', '));

  // 所有日志条目必须引用 socket IP，绝不出现伪造的 forwarded IP
  const blocked = logs.find((entry) => entry.level === 'BLOCKED');
  assert.ok(blocked, 'expected a BLOCKED log entry when cooldown triggers');
  for (const entry of logs) {
    const text = `IP: ${entry.ip} | ${entry.message}`;
    assert.ok(!text.includes('203.0.113.1'), `spoofed X-Forwarded-For leaked into log: ${text}`);
    assert.ok(!text.includes('198.51.100.2'), `spoofed X-Forwarded-For leaked into log: ${text}`);
  }
});

test('trustProxy=true keys cooldown on forwarded IP — distinct forwarded IPs get distinct buckets', async (t) => {
  // Note: trustProxy=true intentionally keeps the express-rate-limit
  // ERR_ERL_PERMISSIVE_TRUST_PROXY warning enabled — `true` trusts ALL proxies
  // and is unsafe for production. The warning nudges operators toward a hop
  // count (e.g., CCEM_TRUST_PROXY=1). This test does NOT suppress that noise
  // because the warning is correct signal, not a false positive.
  let currentTime = 1_000;
  const { request } = await withServer(t, { now: () => currentTime, trustProxy: true });

  // 反代模式下，X-Forwarded-For 决定 req.ip：
  // 两个不同的 forwarded IP 必须落入两个独立 bucket，互不影响。
  const firstSpoofed = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '203.0.113.10' }
  });
  assert.equal(firstSpoofed.response.status, 401);

  const secondSpoofed = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '198.51.100.20' }
  });
  assert.equal(secondSpoofed.response.status, 401, 'different forwarded IP must not inherit cooldown');

  // 回到第一个 forwarded IP → 同一 bucket → 触发 cooldown
  const thirdSpoofed = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '203.0.113.10' }
  });
  assert.equal(thirdSpoofed.response.status, 429);
  assert.equal(thirdSpoofed.response.headers.get('retry-after'), '60');
});

test('trustProxy=1 (hop count) behaves like true for a single forwarded header', async (t) => {
  let currentTime = 1_000;
  const { request } = await withServer(t, { now: () => currentTime, trustProxy: 1 });

  // hop count = 1 应与 true 行为一致：取最右侧 1 跳前的 IP
  const first = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '203.0.113.30' }
  });
  assert.equal(first.response.status, 401);

  const sameForwarded = await request('/api/env', {
    headers: { 'x-ccem-key': INVALID_KEY, 'x-forwarded-for': '203.0.113.30' }
  });
  assert.equal(sameForwarded.response.status, 429, 'same forwarded IP must accumulate cooldown');
});
