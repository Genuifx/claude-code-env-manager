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

// 更新 Cargo.toml 版本
const cargoTomlPath = join(rootDir, 'apps/desktop/src-tauri/Cargo.toml');
let cargoToml = readFileSync(cargoTomlPath, 'utf-8');
cargoToml = cargoToml.replace(
  /^version\s*=\s*"[^"]*"/m,
  `version = "${version}"`
);
writeFileSync(cargoTomlPath, cargoToml);

// 更新 Cargo.lock 中当前应用包的版本
const cargoLockPath = join(rootDir, 'apps/desktop/src-tauri/Cargo.lock');
let cargoLock = readFileSync(cargoLockPath, 'utf-8');
const cargoPackagePattern = /(\[\[package\]\]\nname = "ccem-desktop"\nversion = ")[^"]+("\n)/;

if (!cargoPackagePattern.test(cargoLock)) {
  throw new Error('Could not find ccem-desktop package version in Cargo.lock');
}

cargoLock = cargoLock.replace(
  cargoPackagePattern,
  (_match, prefix, suffix) => `${prefix}${version}${suffix}`,
);
writeFileSync(cargoLockPath, cargoLock);

console.log(`✅ Synced version to ${version}`);
console.log(`   - apps/desktop/package.json`);
console.log(`   - apps/desktop/src-tauri/tauri.conf.json`);
console.log(`   - apps/desktop/src-tauri/Cargo.toml`);
console.log(`   - apps/desktop/src-tauri/Cargo.lock`);
