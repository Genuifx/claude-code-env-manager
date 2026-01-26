import crypto from 'crypto';
import chalk from 'chalk';
import Conf from 'conf';
import type { EnvConfig } from './types.js';
import { encrypt } from './utils.js';

const config = new Conf({
  projectName: 'claude-code-env-manager',
});

/**
 * AES-256-CBC 解密（与 server 端加密对应）
 */
const decryptWithSecret = (encryptedBase64: string, secret: string): string => {
  const key = crypto.scryptSync(secret, 'ccem-salt', 32);
  const combined = Buffer.from(encryptedBase64, 'base64');
  const iv = combined.subarray(0, 16);
  const encryptedHex = combined.subarray(16).toString('hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * 生成不冲突的环境名称
 */
const getUniqueName = (baseName: string, existingNames: Set<string>): string => {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let suffix = 1;
  let newName = `${baseName}-remote`;
  while (existingNames.has(newName)) {
    suffix++;
    newName = `${baseName}-remote-${suffix}`;
  }
  return newName;
};

interface RemoteResponse {
  encrypted: string;
}

interface RemoteEnvironments {
  environments: Record<string, EnvConfig>;
}

interface LoadResult {
  name: string;
  originalName: string;
  renamed: boolean;
}

/**
 * 从远程 URL 加载环境配置
 */
export const loadFromRemote = async (url: string, secret: string): Promise<void> => {
  // 1. 发送请求
  console.log(chalk.gray('Fetching from remote...'));

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error(chalk.red('Error: Failed to connect to server'));
    console.error(chalk.gray((err as Error).message));
    process.exit(1);
  }

  // 2. 检查响应状态
  if (response.status === 401) {
    console.error(chalk.red('Error: Invalid key (HTTP 401)'));
    process.exit(1);
  }

  if (response.status === 429) {
    console.error(chalk.red('Error: Too many requests, please try again later'));
    process.exit(1);
  }

  if (!response.ok) {
    console.error(chalk.red(`Error: Server returned HTTP ${response.status}`));
    process.exit(1);
  }

  // 3. 解析响应
  let data: RemoteResponse;
  try {
    data = await response.json() as RemoteResponse;
  } catch {
    console.error(chalk.red('Error: Invalid response format from server'));
    process.exit(1);
  }

  if (!data.encrypted) {
    console.error(chalk.red('Error: Invalid response format from server'));
    process.exit(1);
  }

  // 4. 解密
  let decrypted: RemoteEnvironments;
  try {
    const jsonStr = decryptWithSecret(data.encrypted, secret);
    decrypted = JSON.parse(jsonStr) as RemoteEnvironments;
  } catch {
    console.error(chalk.red('Error: Decryption failed, check your --secret'));
    process.exit(1);
  }

  if (!decrypted.environments || typeof decrypted.environments !== 'object') {
    console.error(chalk.red('Error: Invalid response format from server'));
    process.exit(1);
  }

  // 5. 导入到本地
  const registries = config.get('registries') as Record<string, EnvConfig>;
  const existingNames = new Set(Object.keys(registries));
  const results: LoadResult[] = [];

  for (const [name, envConfig] of Object.entries(decrypted.environments)) {
    const uniqueName = getUniqueName(name, existingNames);
    const renamed = uniqueName !== name;

    // 加密 API key
    const configToSave: EnvConfig = { ...envConfig };
    if (configToSave.ANTHROPIC_API_KEY) {
      configToSave.ANTHROPIC_API_KEY = encrypt(configToSave.ANTHROPIC_API_KEY);
    }

    registries[uniqueName] = configToSave;
    existingNames.add(uniqueName);

    results.push({
      name: uniqueName,
      originalName: name,
      renamed,
    });
  }

  config.set('registries', registries);

  // 6. 输出结果
  console.log(chalk.green(`\nLoaded ${results.length} environment(s) from remote:`));
  for (const result of results) {
    if (result.renamed) {
      console.log(chalk.yellow(`  + ${result.originalName} → ${result.name} (renamed, local exists)`));
    } else {
      console.log(chalk.green(`  + ${result.name} (new)`));
    }
  }
  console.log(chalk.gray("\nRun 'ccem ls' to see all environments."));
};
