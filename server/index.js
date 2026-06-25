import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ 配置 ============
const PORT = process.env.PORT || 3000;
const KEYS_FILE = path.join(__dirname, 'keys.json');
const ENVS_FILE = path.join(__dirname, 'environments.json');
const SECRET_FILE = path.join(__dirname, '.secret');
export const MIN_REQUEST_KEY_LENGTH = 8;
const FAILED_ATTEMPT_BASE_COOLDOWN_MS = 60 * 1000;
const FAILED_ATTEMPT_MAX_COOLDOWN_MS = 30 * 60 * 1000;
const FAILED_ATTEMPT_RETENTION_MS = 60 * 60 * 1000;

// ============ 工具函数 ============
const log = (level, ip, message) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${timestamp}] ${level} | IP: ${ip} | ${message}`);
};

const generateSecret = () => {
  return 's_' + crypto.randomBytes(24).toString('hex');
};

const getOrCreateSecret = () => {
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf-8').trim();
  }
  const secret = generateSecret();
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
};

const loadJsonFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err.message);
    return null;
  }
};

const getIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';

const getRequestId = (req) => {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  if (Array.isArray(header) && typeof header[0] === 'string' && header[0].trim()) {
    return header[0].trim();
  }
  return crypto.randomUUID();
};

const normalizeKeyCandidate = (value) => {
  if (typeof value !== 'string') return { ok: false, reason: 'not_string' };

  const key = value.trim();
  if (!key) return { ok: false, reason: 'blank' };
  if (key.length < MIN_REQUEST_KEY_LENGTH) return { ok: false, reason: 'too_short' };

  return { ok: true, key };
};

export const readRequestKey = (req) => {
  const headerValue = req.headers['x-ccem-key'];
  if (Array.isArray(headerValue)) return { ok: false, reason: 'header_multiple', source: 'header' };
  if (headerValue !== undefined) {
    const normalized = normalizeKeyCandidate(headerValue);
    return { ...normalized, source: 'header' };
  }

  const queryValue = req.query?.key;
  if (Array.isArray(queryValue)) return { ok: false, reason: 'query_multiple', source: 'query' };
  if (queryValue !== undefined) {
    const normalized = normalizeKeyCandidate(queryValue);
    return { ...normalized, source: 'query' };
  }

  return { ok: false, reason: 'missing', source: 'none' };
};

const keyHashForLog = (key, secret) => {
  return crypto.createHmac('sha256', secret).update(key).digest('hex').slice(0, 12);
};

const cooldownMsFor = (count) => {
  return Math.min(
    Math.pow(2, Math.max(count, 1) - 1) * FAILED_ATTEMPT_BASE_COOLDOWN_MS,
    FAILED_ATTEMPT_MAX_COOLDOWN_MS
  );
};

const cleanupFailedAttempts = (failedAttempts, now) => {
  for (const [ip, record] of failedAttempts.entries()) {
    if (now - record.lastAttempt >= FAILED_ATTEMPT_RETENTION_MS) {
      failedAttempts.delete(ip);
    }
  }
};

const recordFailedAttempt = (failedAttempts, ip, now) => {
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  record.count += 1;
  record.lastAttempt = now;
  failedAttempts.set(ip, record);
  return record;
};

const getCooldownState = (failedAttempts, ip, now) => {
  const record = failedAttempts.get(ip);
  if (!record) return null;

  const cooldownMs = cooldownMsFor(record.count);
  const retryAfterMs = cooldownMs - (now - record.lastAttempt);
  if (retryAfterMs <= 0) return null;

  return {
    count: record.count,
    retryAfterMs,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
  };
};

// ============ 加密 ============
// Envelope versioning:
//   v1 (legacy): base64(iv(16) + AES-256-CBC ciphertext) — no integrity tag.
//   v2 (current, default): AES-256-GCM with random 12-byte nonce.
//     The JSON envelope {v:2,nonce,ciphertext,tag} is base64-encoded and
//     stuffed into the existing `encrypted` field so the HTTP response shape
//     ({ encrypted: string }) stays unchanged for middleware/proxies.
//
// Clients MUST prefer v2 and fail-closed on GCM tag mismatch (no silent
// downgrade). v1 remains only as a fallback for older clients; a future
// release will remove it once all clients are upgraded.

const ENVELOPE_VERSION = 2;
const ENCRYPTION_ALGORITHM_V2 = 'aes-256-gcm';
const ENCRYPTION_ALGORITHM_V1 = 'aes-256-cbc';
const GCM_NONCE_BYTES = 12;

// Allow operators to force v1 output during a migration window.
// Set CCEM_REMOTE_ENCRYPTION=v1 in the server environment to enable.
const FORCE_LEGACY_ENCRYPTION = process.env.CCEM_REMOTE_ENCRYPTION === 'v1';

const deriveKey = (secret) => crypto.scryptSync(secret, 'ccem-salt', 32);

// v2: authenticated AES-256-GCM. Returns base64(JSON envelope).
const encryptV2 = (text, secret) => {
  const key = deriveKey(secret);
  const nonce = crypto.randomBytes(GCM_NONCE_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM_V2, key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const envelope = {
    v: ENVELOPE_VERSION,
    nonce: nonce.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
  };
  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
};

// v1 (legacy): AES-256-CBC, no authentication. Kept only for backward compat.
const encryptV1 = (text, secret) => {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM_V1, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
  return combined.toString('base64');
};

const encrypt = (text, secret) => {
  if (FORCE_LEGACY_ENCRYPTION) return encryptV1(text, secret);
  return encryptV2(text, secret);
};

const HOST = process.env.HOST || '127.0.0.1';

export const createApp = ({
  keysFile = KEYS_FILE,
  environmentsFile = ENVS_FILE,
  secret = getOrCreateSecret(),
  logger = log,
  now = () => Date.now(),
  failedAttempts = new Map()
} = {}) => {
  const app = express();

  // 信任代理（nginx 反代时获取真实 IP）
  app.set('trust proxy', 1);

  // ============ 安全中间件 ============

  // 1. Helmet - 安全响应头
  app.use(helmet());

  app.use('/api/env', (req, res, next) => {
    const ip = getIp(req);
    const currentTime = now();
    cleanupFailedAttempts(failedAttempts, currentTime);

    const cooldown = getCooldownState(failedAttempts, ip, currentTime);
    if (!cooldown) return next();

    res.set('Retry-After', String(cooldown.retryAfterSeconds));
    logger(
      'BLOCKED',
      ip,
      `Auth cooldown active | requestId=${getRequestId(req)} | attempts=${cooldown.count} | retryAfter=${cooldown.retryAfterSeconds}s`
    );
    return res.status(429).json({ error: 'Too many failed attempts, please try again later' });
  });

  // 2. Rate Limiter - 限流防爆破
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: 10, // 每分钟最多 10 次请求
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const ip = getIp(req);
      logger('BLOCKED', ip, 'Rate limit exceeded');
      res.status(429).json({ error: 'Too many requests, please try again later' });
    }
  });

  app.use('/api/env', limiter);

  // ============ API 路由 ============
  app.get('/api/env', (req, res) => {
    const ip = getIp(req);
    const requestId = getRequestId(req);

    // 优先从 header 读取密钥（安全），兼容 query 参数（过渡期）
    const keyResult = readRequestKey(req);

    if (!keyResult.ok) {
      if (keyResult.reason === 'missing') {
        logger('FAIL', ip, `Missing key parameter | requestId=${requestId}`);
        return res.status(400).json({ error: 'Missing key parameter' });
      }

      recordFailedAttempt(failedAttempts, ip, now());
      logger(
        'FAIL',
        ip,
        `Rejected malformed key | requestId=${requestId} | source=${keyResult.source} | reason=${keyResult.reason}`
      );
      return res.status(401).json({ error: 'Invalid key' });
    }

    const key = keyResult.key;

    // 如果使用了 query 参数，记录 deprecation 警告
    if (keyResult.source === 'query') {
      logger('WARN', ip, 'Using deprecated query parameter for key (use X-CCEM-Key header instead)');
    }

    // 热加载配置文件
    const keys = loadJsonFile(keysFile);
    const environments = loadJsonFile(environmentsFile);

    if (!keys || !environments) {
      logger('ERROR', ip, 'Failed to load config files');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 验证 key
    const keyConfig = Object.prototype.hasOwnProperty.call(keys, key) ? keys[key] : null;
    const keyHash = keyHashForLog(key, secret);
    if (!keyConfig) {
      recordFailedAttempt(failedAttempts, ip, now());

      logger('FAIL', ip, `Invalid key | requestId=${requestId} | keyHash=${keyHash}`);
      return res.status(401).json({ error: 'Invalid key' });
    }

    // 成功 - 重置失败计数
    failedAttempts.delete(ip);

    // 构建响应数据
    const envNames = keyConfig.environments || [];
    const responseEnvs = {};
    for (const name of envNames) {
      if (environments[name]) {
        responseEnvs[name] = environments[name];
      }
    }

    const responseData = { environments: responseEnvs };
    const jsonStr = JSON.stringify(responseData);

    // AES 加密
    const encrypted = encrypt(jsonStr, secret);

    logger('OK', ip, `Authorized key | requestId=${requestId} | keyHash=${keyHash} | Envs: ${envNames.join(', ')}`);

    res.json({ encrypted });
  });

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};

export const startServer = ({
  port = PORT,
  host = HOST,
  secretFile = SECRET_FILE
} = {}) => {
  const app = createApp();
  return app.listen(port, host, () => {
    console.log('================================');
    console.log(`Server started on ${host}:${port}`);
    console.log(`Auth: configured (secret stored at ${secretFile})`);
    console.log('To view the secret: cat server/.secret');
    console.log('================================');
  });
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
