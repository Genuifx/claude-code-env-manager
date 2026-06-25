import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, MIN_REQUEST_KEY_LENGTH, readRequestKey } from './index.js';

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
