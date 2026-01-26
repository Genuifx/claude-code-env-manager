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

// AES-256-CBC 加密
const encrypt = (text, secret) => {
  const key = crypto.scryptSync(secret, 'ccem-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // 返回 base64(iv + ciphertext)
  const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
  return combined.toString('base64');
};

// ============ 初始化 ============
const SECRET = getOrCreateSecret();

const app = express();

// ============ 安全中间件 ============

// 1. Helmet - 安全响应头
app.use(helmet());

// 2. Rate Limiter - 限流防爆破
const failedAttempts = new Map(); // IP -> { count, lastAttempt }

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10, // 每分钟最多 10 次请求
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    log('BLOCKED', ip, 'Rate limit exceeded');
    res.status(429).json({ error: 'Too many requests, please try again later' });
  },
  skip: (req) => {
    // 检查是否在惩罚期
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const record = failedAttempts.get(ip);
    if (record) {
      const cooldown = Math.min(Math.pow(2, record.count - 1) * 60 * 1000, 30 * 60 * 1000); // 最长 30 分钟
      if (Date.now() - record.lastAttempt < cooldown) {
        return false; // 不跳过，继续限流
      }
    }
    return false;
  }
});

app.use('/api/env', limiter);

// 信任代理（nginx 反代时获取真实 IP）
app.set('trust proxy', 1);

// ============ API 路由 ============
app.get('/api/env', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = req.query.key;

  if (!key) {
    log('FAIL', ip, 'Missing key parameter');
    return res.status(400).json({ error: 'Missing key parameter' });
  }

  // 热加载配置文件
  const keys = loadJsonFile(KEYS_FILE);
  const environments = loadJsonFile(ENVS_FILE);

  if (!keys || !environments) {
    log('ERROR', ip, 'Failed to load config files');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 验证 key
  const keyConfig = keys[key];
  if (!keyConfig) {
    // 记录失败尝试
    const record = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    record.count++;
    record.lastAttempt = Date.now();
    failedAttempts.set(ip, record);

    log('FAIL', ip, `Key: ${key.slice(0, 10)}***`);
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
  const encrypted = encrypt(jsonStr, SECRET);

  log('OK', ip, `Key: ${key.slice(0, 10)}*** | Envs: ${envNames.join(', ')}`);

  res.json({ encrypted });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============ 启动服务 ============
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log('================================');
  console.log(`Server started on ${HOST}:${PORT}`);
  console.log(`Secret: ${SECRET}`);
  console.log('(Save this for ccem load --secret)');
  console.log('================================');
});
