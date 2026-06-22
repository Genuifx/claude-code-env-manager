import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Patterns that indicate a real credential. Example files must not match.
// - Real sk- keys (Anthropic/OpenAI) contain mixed letters AND digits after
//   the prefix, e.g. `sk-ant-api03-Abc123...`. Dictionary placeholders like
//   `sk-placeholder-do-not-use` lack digits so they are allowed.
// - Real ccem key ids look like `ccem_k1_a3b2c1d4e5f6g7h8` (lowercase + digits,
//   no dictionary words). Uppercase placeholders are excluded.
const hasLetter = (s) => /[A-Za-z]/.test(s);
const hasDigit = (s) => /[0-9]/.test(s);

const REAL_TOKEN_PATTERNS = [
  {
    name: 'sk- key',
    re: /sk-([A-Za-z0-9_-]{16,})/,
    realCheck: (captured) => hasLetter(captured) && hasDigit(captured)
  },
  {
    name: 's_ local secret',
    re: /s_([a-f0-9]{16,})/,
    realCheck: (captured) => true // hex is always real
  }
];

const isRealCcemKeyId = (s) => {
  const m = /^ccem_k\d+_([A-Za-z0-9]+)$/.exec(s);
  if (!m) return false;
  const tail = m[1];
  if (tail.length < 8) return false;
  // Real keys have lowercase hex-ish + digits (e.g. a3b2c1d4).
  // Uppercase dictionary placeholders like REPLACE_WITH_RANDOM_ID are excluded.
  return /[a-z]/.test(tail) && /[0-9]/.test(tail);
};

const loadJson = (rel) => {
  const p = path.join(__dirname, rel);
  assert.ok(fs.existsSync(p), `${rel} should exist`);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
};

test('keys.example.json parses and has correct schema shape', () => {
  const data = loadJson('keys.example.json');
  assert.equal(typeof data, 'object', 'keys.example.json must be an object');
  assert.ok(data !== null, 'keys.example.json must not be null');
  const keys = Object.keys(data);
  assert.ok(keys.length >= 1, 'keys.example.json needs at least one example entry');
  for (const [k, v] of Object.entries(data)) {
    assert.equal(typeof k, 'string', 'each key id must be a string');
    assert.ok(k.length > 0, 'key id must be non-empty');
    assert.equal(typeof v, 'object', `entry "${k}" must be an object`);
    assert.ok(v !== null, `entry "${k}" must be non-null`);
    assert.ok(Array.isArray(v.environments), `entry "${k}" must have environments array`);
    for (const env of v.environments) {
      assert.equal(typeof env, 'string', `environments in "${k}" must be strings`);
    }
  }
});

test('environments.example.json parses and has correct schema shape', () => {
  const data = loadJson('environments.example.json');
  assert.equal(typeof data, 'object', 'environments.example.json must be an object');
  assert.ok(data !== null, 'environments.example.json must not be null');
  const entries = Object.entries(data);
  assert.ok(entries.length >= 1, 'needs at least one example environment');
  const REQUIRED_FIELDS = [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_DEFAULT_OPUS_MODEL',
    'ANTHROPIC_DEFAULT_SONNET_MODEL',
    'ANTHROPIC_DEFAULT_HAIKU_MODEL'
  ];
  for (const [envName, env] of entries) {
    assert.equal(typeof envName, 'string', 'env name must be a string');
    assert.equal(typeof env, 'object', `${envName} must be an object`);
    for (const field of REQUIRED_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(env, field),
        `${envName} must have field ${field}`
      );
      assert.equal(typeof env[field], 'string', `${envName}.${field} must be a string`);
    }
  }
});

const matchesRealToken = (s) => {
  for (const { re, realCheck } of REAL_TOKEN_PATTERNS) {
    const m = re.exec(s);
    if (m && realCheck(m[1])) return true;
  }
  return false;
};

test('keys.example.json entries are not real-looking key ids', () => {
  const data = loadJson('keys.example.json');
  for (const k of Object.keys(data)) {
    assert.ok(
      !isRealCcemKeyId(k),
      `example key id "${k.slice(0, 20)}..." looks like a real key id; use a placeholder form`
    );
    assert.ok(
      !matchesRealToken(k),
      `example key id "${k.slice(0, 20)}..." must not match real-token pattern`
    );
  }
});

test('environments.example.json has no real-looking token values', () => {
  const data = loadJson('environments.example.json');
  const serialized = JSON.stringify(data);
  assert.ok(
    !matchesRealToken(serialized),
    'environments.example.json must not contain real-looking token values'
  );
});

test('git does not track real keys.json or environments.json', () => {
  let tracked;
  try {
    const out = execSync('git ls-files server/keys.json server/environments.json', {
      cwd: ROOT,
      encoding: 'utf-8'
    }).trim();
    tracked = out ? out.split('\n') : [];
  } catch {
    tracked = [];
  }
  assert.deepEqual(
    tracked,
    [],
    'server/keys.json and server/environments.json must not be tracked by git'
  );
});

test('git tracks the example files', () => {
  let tracked;
  try {
    const out = execSync('git ls-files server/keys.example.json server/environments.example.json', {
      cwd: ROOT,
      encoding: 'utf-8'
    }).trim();
    tracked = out ? out.split('\n').filter(Boolean) : [];
  } catch {
    tracked = [];
  }
  assert.ok(
    tracked.includes('server/keys.example.json'),
    'server/keys.example.json must be tracked'
  );
  assert.ok(
    tracked.includes('server/environments.example.json'),
    'server/environments.example.json must be tracked'
  );
});
