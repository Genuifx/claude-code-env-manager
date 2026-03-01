#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 读取 CLI 包的版本号(作为主版本)
const cliPackageJson = JSON.parse(
  readFileSync(join(rootDir, 'apps/cli/package.json'), 'utf-8')
);
const version = cliPackageJson.version;

// 更新 Desktop 的 package.json
const desktopPackageJsonPath = join(rootDir, 'apps/desktop/package.json');
const desktopPackageJson = JSON.parse(readFileSync(desktopPackageJsonPath, 'utf-8'));
desktopPackageJson.version = version;
writeFileSync(desktopPackageJsonPath, JSON.stringify(desktopPackageJson, null, 2) + '\n');

// 更新 Tauri 配置
const tauriConfigPath = join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json');
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'));
tauriConfig.version = version;
writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');

console.log(`✅ Synced version to ${version}`);
console.log(`   - apps/desktop/package.json`);
console.log(`   - apps/desktop/src-tauri/tauri.conf.json`);
