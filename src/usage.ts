import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TokenUsage, TokenUsageWithCost, UsageStats, ModelPrice, UsageCache, FileMeta, FileStats, FileStatsEntry } from './types.js';

// Claude 项目数据目录
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

// ccem 数据目录
const CCEM_DIR = path.join(os.homedir(), '.ccem');

// 缓存版本号（修改缓存结构时递增）
const CACHE_VERSION = 1;

// 缓存文件路径
const getCachePath = () => path.join(CCEM_DIR, 'usage-cache.json');
const getPricesPath = () => path.join(CCEM_DIR, 'model-prices.json');

// 确保 ccem 目录存在
function ensureCcemDir(): void {
  if (!fs.existsSync(CCEM_DIR)) {
    fs.mkdirSync(CCEM_DIR, { recursive: true });
  }
}

// LiteLLM 价格数据 URL
const LITELLM_PRICES_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

// 获取 ccem 安装目录下的 model-prices.json 路径
const getBundledPricesPath = () => {
  // 使用 import.meta.url 获取当前模块路径，兼容 ESM
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  return path.join(currentDir, '..', 'model-prices.json');
};

// 内置默认价格（fallback）
const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'claude-opus-4-5': {
    input_cost_per_token: 5e-6,
    output_cost_per_token: 25e-6,
    cache_read_input_token_cost: 0.5e-6,
    cache_creation_input_token_cost: 6.25e-6,
  },
  'claude-sonnet-4-5': {
    input_cost_per_token: 3e-6,
    output_cost_per_token: 15e-6,
    cache_read_input_token_cost: 0.3e-6,
    cache_creation_input_token_cost: 3.75e-6,
  },
  'claude-haiku-4-5': {
    input_cost_per_token: 1e-6,
    output_cost_per_token: 5e-6,
    cache_read_input_token_cost: 0.1e-6,
    cache_creation_input_token_cost: 1.25e-6,
  },
};

// 模型名称标准化映射
function normalizeModelName(model: string): string {
  // 移除版本后缀，统一格式
  const normalized = model
    .replace(/-20\d{6}.*$/, '') // 移除日期版本号
    .replace(/-v\d+:\d+$/, '')  // 移除 bedrock 版本号
    .replace(/^anthropic\./, '') // 移除 anthropic. 前缀
    .replace(/^vertex_ai\//, '') // 移除 vertex_ai/ 前缀
    .replace(/@.*$/, '');        // 移除 @ 后缀
  return normalized;
}

// 加载价格数据
let pricesCache: Record<string, ModelPrice> | null = null;

export async function loadPrices(): Promise<Record<string, ModelPrice>> {
  if (pricesCache) return pricesCache;

  ensureCcemDir();
  const pricesPath = getPricesPath();

  // 尝试从远程获取
  try {
    const response = await fetch(LITELLM_PRICES_URL, { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      const data = await response.json() as Record<string, Record<string, unknown>>;
      const prices: Record<string, ModelPrice> = {};

      for (const [key, value] of Object.entries(data)) {
        if (value.input_cost_per_token && value.output_cost_per_token) {
          prices[key] = {
            input_cost_per_token: value.input_cost_per_token as number,
            output_cost_per_token: value.output_cost_per_token as number,
            cache_read_input_token_cost: value.cache_read_input_token_cost as number | undefined,
            cache_creation_input_token_cost: value.cache_creation_input_token_cost as number | undefined,
          };
        }
      }

      // 保存到本地
      fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));
      pricesCache = prices;
      return prices;
    }
  } catch {
    // 远程获取失败，尝试本地
  }

  // 尝试从用户缓存目录加载
  try {
    if (fs.existsSync(pricesPath)) {
      const data = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
      pricesCache = data;
      return data;
    }
  } catch {
    // 用户缓存加载失败
  }

  // 尝试从 ccem 安装目录加载内置价格文件
  try {
    const bundledPath = getBundledPricesPath();
    if (fs.existsSync(bundledPath)) {
      const data = JSON.parse(fs.readFileSync(bundledPath, 'utf-8'));
      pricesCache = data;
      return data;
    }
  } catch {
    // 内置价格文件加载失败
  }

  // 使用默认价格
  pricesCache = DEFAULT_PRICES;
  return DEFAULT_PRICES;
}

// 获取模型价格
export function getModelPrice(model: string, prices: Record<string, ModelPrice>): ModelPrice {
  // 直接匹配
  if (prices[model]) return prices[model];

  // 标准化后匹配
  const normalized = normalizeModelName(model);
  if (prices[normalized]) return prices[normalized];

  // 模糊匹配
  for (const [key, value] of Object.entries(prices)) {
    if (key.includes(normalized) || normalized.includes(normalizeModelName(key))) {
      return value;
    }
  }

  // 默认价格
  if (model.includes('opus')) return DEFAULT_PRICES['claude-opus-4-5'];
  if (model.includes('sonnet')) return DEFAULT_PRICES['claude-sonnet-4-5'];
  if (model.includes('haiku')) return DEFAULT_PRICES['claude-haiku-4-5'];

  return DEFAULT_PRICES['claude-sonnet-4-5']; // 默认使用 sonnet 价格
}

// 计算费用
export function calculateCost(usage: TokenUsage, price: ModelPrice): number {
  return (
    usage.inputTokens * price.input_cost_per_token +
    usage.outputTokens * price.output_cost_per_token +
    usage.cacheReadTokens * (price.cache_read_input_token_cost || 0) +
    usage.cacheCreationTokens * (price.cache_creation_input_token_cost || 0)
  );
}

// 创建空的 TokenUsage
function emptyUsage(): TokenUsageWithCost {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    cost: 0,
  };
}

// 合并 TokenUsage
function mergeUsage(a: TokenUsageWithCost, b: TokenUsageWithCost): TokenUsageWithCost {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
    cost: a.cost + b.cost,
  };
}

// 获取文件元数据
function getFileMeta(filePath: string): FileMeta | null {
  try {
    const stat = fs.statSync(filePath);
    return {
      mtime: stat.mtimeMs,
      size: stat.size,
    };
  } catch {
    return null;
  }
}

// 加载缓存
function loadCache(): UsageCache | null {
  try {
    const cachePath = getCachePath();
    if (!fs.existsSync(cachePath)) return null;

    const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as UsageCache;

    // 检查缓存版本
    if (data.version !== CACHE_VERSION) return null;

    return data;
  } catch {
    return null;
  }
}

// 从缓存快速聚合统计（不重新解析文件）
export function getUsageStatsFromCache(): UsageStats | null {
  const cache = loadCache();
  if (!cache) return null;

  // 从缓存中聚合统计
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const stats: UsageStats = {
    today: emptyUsage(),
    week: emptyUsage(),
    total: emptyUsage(),
    byModel: {},
    lastUpdated: now.toISOString(),
  };

  for (const fileData of Object.values(cache.files)) {
    for (const entry of fileData.stats.entries) {
      const entryTime = new Date(entry.timestamp);

      stats.total = mergeUsage(stats.total, entry.usage);

      const normalizedModel = normalizeModelName(entry.model);
      if (!stats.byModel[normalizedModel]) {
        stats.byModel[normalizedModel] = emptyUsage();
      }
      stats.byModel[normalizedModel] = mergeUsage(stats.byModel[normalizedModel], entry.usage);

      if (entryTime >= todayStart) {
        stats.today = mergeUsage(stats.today, entry.usage);
      }

      if (entryTime >= weekStart) {
        stats.week = mergeUsage(stats.week, entry.usage);
      }
    }
  }

  return stats;
}

// 保存缓存
function saveCache(cache: UsageCache): void {
  try {
    ensureCcemDir();
    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2));
  } catch {
    // 保存失败，忽略
  }
}

// 解析单个 JSONL 文件
interface JSONLEntry {
  type?: string;
  timestamp?: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

function parseJSONLFile(filePath: string, prices: Record<string, ModelPrice>): FileStats {
  const entries: FileStatsEntry[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as JSONLEntry;

        // 只处理 assistant 消息
        if (entry.type !== 'assistant' || !entry.message?.usage) continue;

        const model = entry.message.model || 'unknown';
        const rawUsage = entry.message.usage;

        const usage: TokenUsage = {
          inputTokens: rawUsage.input_tokens || 0,
          outputTokens: rawUsage.output_tokens || 0,
          cacheReadTokens: rawUsage.cache_read_input_tokens || 0,
          cacheCreationTokens: rawUsage.cache_creation_input_tokens || 0,
        };

        const price = getModelPrice(model, prices);
        const cost = calculateCost(usage, price);

        entries.push({
          timestamp: entry.timestamp || new Date().toISOString(),
          model,
          usage: { ...usage, cost },
        });
      } catch {
        // 跳过无效行
      }
    }
  } catch {
    // 文件读取失败
  }

  return { entries };
}

// 获取所有 JSONL 文件
function getAllJSONLFiles(): string[] {
  const files: string[] = [];

  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) return files;

  try {
    const projects = fs.readdirSync(CLAUDE_PROJECTS_DIR);

    for (const project of projects) {
      const projectPath = path.join(CLAUDE_PROJECTS_DIR, project);
      const stat = fs.statSync(projectPath);

      if (stat.isDirectory()) {
        const projectFiles = fs.readdirSync(projectPath);
        for (const file of projectFiles) {
          if (file.endsWith('.jsonl')) {
            files.push(path.join(projectPath, file));
          }
        }
      }
    }
  } catch {
    // 目录读取失败
  }

  return files;
}

// 获取使用统计（带增量缓存）
export async function getUsageStats(): Promise<UsageStats> {
  const prices = await loadPrices();
  const files = getAllJSONLFiles();
  const cache = loadCache();

  // 构建新的缓存
  const newCache: UsageCache = {
    version: CACHE_VERSION,
    files: {},
    lastUpdated: new Date().toISOString(),
  };

  // 收集所有 entries（从缓存或重新解析）
  const allEntries: FileStatsEntry[] = [];

  for (const file of files) {
    const meta = getFileMeta(file);
    if (!meta) continue;

    // 检查缓存是否有效
    const cachedFile = cache?.files[file];
    const cacheValid = cachedFile &&
      cachedFile.meta.mtime === meta.mtime &&
      cachedFile.meta.size === meta.size;

    let fileStats: FileStats;

    if (cacheValid) {
      // 使用缓存
      fileStats = cachedFile.stats;
    } else {
      // 重新解析
      fileStats = parseJSONLFile(file, prices);
    }

    // 保存到新缓存
    newCache.files[file] = {
      meta,
      stats: fileStats,
    };

    // 收集 entries
    allEntries.push(...fileStats.entries);
  }

  // 保存缓存
  saveCache(newCache);

  // 聚合统计（每次都重新聚合，因为时间窗口会变化）
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 本周日开始

  const stats: UsageStats = {
    today: emptyUsage(),
    week: emptyUsage(),
    total: emptyUsage(),
    byModel: {},
    lastUpdated: now.toISOString(),
  };

  for (const entry of allEntries) {
    const entryTime = new Date(entry.timestamp);

    // 总计
    stats.total = mergeUsage(stats.total, entry.usage);

    // 按模型
    const normalizedModel = normalizeModelName(entry.model);
    if (!stats.byModel[normalizedModel]) {
      stats.byModel[normalizedModel] = emptyUsage();
    }
    stats.byModel[normalizedModel] = mergeUsage(stats.byModel[normalizedModel], entry.usage);

    // 今日
    if (entryTime >= todayStart) {
      stats.today = mergeUsage(stats.today, entry.usage);
    }

    // 本周
    if (entryTime >= weekStart) {
      stats.week = mergeUsage(stats.week, entry.usage);
    }
  }

  return stats;
}

// 格式化 token 数量
export function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1) + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1) + 'K';
  }
  return n.toString();
}

// 格式化费用
export function formatCost(n: number): string {
  if (n >= 1) {
    return '$' + n.toFixed(2);
  }
  if (n >= 0.01) {
    return '$' + n.toFixed(2);
  }
  return '$' + n.toFixed(4);
}

// 获取总 token 数
export function getTotalTokens(usage: TokenUsage): number {
  return usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
}
