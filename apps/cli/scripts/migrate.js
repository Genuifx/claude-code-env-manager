#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';

const home = os.homedir();

// 新配置路径
const newConfigDir = path.join(home, '.ccem');
const newConfigPath = path.join(newConfigDir, 'config.json');

// 旧配置路径
const legacyConfigPath = process.platform === 'darwin'
  ? path.join(home, 'Library', 'Preferences', 'claude-code-env-manager-nodejs', 'config.json')
  : path.join(home, '.config', 'claude-code-env-manager-nodejs', 'config.json');

function migrate() {
  // 如果新配置已存在，跳过迁移
  if (fs.existsSync(newConfigPath)) {
    return;
  }

  // 如果旧配置不存在，跳过迁移
  if (!fs.existsSync(legacyConfigPath)) {
    return;
  }

  try {
    // 确保新目录存在
    if (!fs.existsSync(newConfigDir)) {
      fs.mkdirSync(newConfigDir, { recursive: true });
    }

    // 复制配置文件
    fs.copyFileSync(legacyConfigPath, newConfigPath);
    console.log('CCEM: 配置已迁移到 ~/.ccem/');
  } catch (err) {
    // 静默失败，不阻塞安装
    console.warn('CCEM: 配置迁移失败，请手动运行 ccem setup migrate');
  }
}

migrate();
