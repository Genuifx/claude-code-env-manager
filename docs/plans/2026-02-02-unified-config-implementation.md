# 配置统一到 ~/.ccem/ 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 CLI 和 Desktop 的配置统一到 `~/.ccem/` 目录，实现配置共享和无缝迁移。

**Architecture:** CLI 修改 Conf 存储路径，添加 postinstall 迁移脚本和 `setup migrate` 命令。Desktop 实现 Rust 版加密/解密模块，读写共享配置文件，启动时自动迁移。

**Tech Stack:** TypeScript (CLI), Rust (Desktop), AES-256-CBC 加密, scrypt 密钥派生

---

## Phase 1: CLI 配置路径迁移

### Task 1.1: 添加 CCEM 配置路径常量到 core 包

**Files:**
- Modify: `packages/core/src/utils.ts`

**Step 1: 添加配置路径常量和辅助函数**

在 `packages/core/src/utils.ts` 末尾添加:

```typescript
/**
 * CCEM 配置目录路径 (~/.ccem/)
 */
export const getCcemConfigDir = (): string => {
  return path.join(getHomeDir(), '.ccem');
};

/**
 * CCEM 主配置文件路径 (~/.ccem/config.json)
 */
export const getCcemConfigPath = (): string => {
  return path.join(getCcemConfigDir(), 'config.json');
};

/**
 * 确保 ~/.ccem 目录存在
 */
export const ensureCcemDir = (): string => {
  const ccemDir = getCcemConfigDir();
  if (!fs.existsSync(ccemDir)) {
    fs.mkdirSync(ccemDir, { recursive: true });
  }
  return ccemDir;
};

/**
 * 获取旧配置路径 (conf 包默认路径)
 * macOS: ~/Library/Preferences/claude-code-env-manager-nodejs/config.json
 * Linux: ~/.config/claude-code-env-manager-nodejs/config.json
 */
export const getLegacyConfigPath = (): string => {
  const home = getHomeDir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Preferences', 'claude-code-env-manager-nodejs', 'config.json');
  }
  return path.join(home, '.config', 'claude-code-env-manager-nodejs', 'config.json');
};
```

**Step 2: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager && pnpm run build`
Expected: 编译成功，无错误

**Step 3: Commit**

```bash
git add packages/core/src/utils.ts
git commit -m "feat(core): add CCEM config path utilities"
```

---

### Task 1.2: 修改 CLI 使用新配置路径

**Files:**
- Modify: `apps/cli/src/index.ts:57-70`

**Step 1: 导入新的路径函数并修改 Conf 配置**

修改 `apps/cli/src/index.ts` 第 21 行的导入:

```typescript
import { encrypt, decrypt, ENV_PRESETS, PERMISSION_PRESETS, getCcemConfigDir, ensureCcemDir } from '@ccem/core';
```

修改第 57-70 行的 Conf 初始化:

```typescript
// 确保配置目录存在
ensureCcemDir();

const config = new Conf({
  projectName: 'claude-code-env-manager',
  cwd: getCcemConfigDir(),  // 使用新路径
  defaults: {
    registries: {
      'official': {
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_MODEL: 'claude-sonnet-4-5-20250929',
        ANTHROPIC_SMALL_FAST_MODEL: 'claude-haiku-4-5-20251001'
      }
    },
    current: 'official',
    defaultMode: null as string | null
  }
});
```

**Step 2: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager && pnpm run build`
Expected: 编译成功

**Step 3: Commit**

```bash
git add apps/cli/src/index.ts
git commit -m "feat(cli): use ~/.ccem/ for config storage"
```

---

### Task 1.3: 创建迁移脚本

**Files:**
- Create: `apps/cli/scripts/migrate.js`

**Step 1: 创建迁移脚本**

```javascript
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
```

**Step 2: 添加 postinstall 到 package.json**

修改 `apps/cli/package.json` 的 scripts 部分:

```json
"scripts": {
  "build": "tsup",
  "dev": "tsup --watch",
  "start": "node dist/index.js",
  "postinstall": "node ./scripts/migrate.js",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

**Step 3: 更新 files 字段确保脚本被打包**

修改 `apps/cli/package.json` 的 files 部分:

```json
"files": ["dist", "model-prices.json", "scripts"]
```

**Step 4: 验证脚本可执行**

Run: `node /Users/wzt/G/Github/claude-code-env-manager/apps/cli/scripts/migrate.js`
Expected: 静默完成 (无输出表示无需迁移)

**Step 5: Commit**

```bash
git add apps/cli/scripts/migrate.js apps/cli/package.json
git commit -m "feat(cli): add postinstall migration script"
```

---

### Task 1.4: 添加 setup migrate 命令

**Files:**
- Modify: `apps/cli/src/index.ts`

**Step 1: 在 setup init 命令后添加 migrate 命令**

在 `apps/cli/src/index.ts` 的 `setupCmd.command('init')` 之后 (约第 583 行后) 添加:

```typescript
setupCmd
  .command('migrate')
  .description('迁移旧版配置到 ~/.ccem/')
  .option('--clean', '迁移后删除旧配置文件')
  .option('--force', '强制重新迁移（覆盖现有配置）')
  .action(async function(this: any) {
    const options = this.opts();
    const { getCcemConfigPath, getLegacyConfigPath, ensureCcemDir } = await import('@ccem/core');

    const newConfigPath = getCcemConfigPath();
    const legacyConfigPath = getLegacyConfigPath();

    console.log(chalk.cyan('\n🔄 配置迁移\n'));

    // 检查旧配置是否存在
    if (!fs.existsSync(legacyConfigPath)) {
      console.log(chalk.yellow('未找到旧版配置文件'));
      console.log(chalk.gray(`  旧路径: ${legacyConfigPath}`));
      return;
    }

    // 检查新配置是否存在
    if (fs.existsSync(newConfigPath) && !options.force) {
      console.log(chalk.green('✓ 配置已在新路径'));
      console.log(chalk.gray(`  路径: ${newConfigPath}`));
      console.log(chalk.gray('\n使用 --force 强制重新迁移'));
      return;
    }

    try {
      // 确保目录存在
      ensureCcemDir();

      // 复制配置
      fs.copyFileSync(legacyConfigPath, newConfigPath);
      console.log(chalk.green('✓ 配置已迁移'));
      console.log(chalk.gray(`  从: ${legacyConfigPath}`));
      console.log(chalk.gray(`  到: ${newConfigPath}`));

      // 清理旧文件
      if (options.clean) {
        fs.unlinkSync(legacyConfigPath);
        // 尝试删除空目录
        const legacyDir = path.dirname(legacyConfigPath);
        try {
          fs.rmdirSync(legacyDir);
        } catch {
          // 目录非空，忽略
        }
        console.log(chalk.green('✓ 已删除旧配置文件'));
      }
    } catch (err) {
      console.error(chalk.red(`✗ 迁移失败: ${err}`));
    }
  });
```

**Step 2: 添加导入 (如果需要)**

确保文件顶部已导入 `getLegacyConfigPath`:

```typescript
import { encrypt, decrypt, ENV_PRESETS, PERMISSION_PRESETS, getCcemConfigDir, ensureCcemDir, getCcemConfigPath, getLegacyConfigPath } from '@ccem/core';
```

**Step 3: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager && pnpm run build`
Expected: 编译成功

**Step 4: 测试命令**

Run: `node /Users/wzt/G/Github/claude-code-env-manager/apps/cli/dist/index.js setup migrate --help`
Expected: 显示 migrate 命令帮助

**Step 5: Commit**

```bash
git add apps/cli/src/index.ts
git commit -m "feat(cli): add setup migrate command"
```

---

## Phase 2: Desktop 加密模块

### Task 2.1: 添加 Rust 加密依赖

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`

**Step 1: 添加加密相关依赖**

在 `[dependencies]` 部分添加:

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dirs = "5"
chrono = { version = "0.4", features = ["serde"] }
# 新增加密依赖
scrypt = "0.11"
aes = "0.8"
cbc = "0.1"
rand = "0.8"
hex = "0.4"
```

**Step 2: 验证依赖可下载**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop/src-tauri && cargo check`
Expected: 依赖下载成功，编译检查通过

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/Cargo.toml
git commit -m "feat(desktop): add crypto dependencies"
```

---

### Task 2.2: 实现加密模块

**Files:**
- Create: `apps/desktop/src-tauri/src/crypto.rs`

**Step 1: 创建 crypto.rs 模块**

```rust
use aes::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use scrypt::{scrypt, Params};
use rand::Rng;

type Aes256CbcEnc = cbc::Encryptor<aes::Aes256>;
type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

const PASSWORD: &[u8] = b"claude-code-env-manager-secret";
const SALT: &[u8] = b"salt";

/// Derive the same 32-byte key as Node.js crypto.scryptSync
fn derive_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    // Node.js scrypt defaults: N=16384, r=8, p=1
    let params = Params::new(14, 8, 1, 32).unwrap(); // log2(16384) = 14
    scrypt(PASSWORD, SALT, &params, &mut key).unwrap();
    key
}

/// Encrypt plaintext using AES-256-CBC, returns "enc:iv_hex:ciphertext_hex"
pub fn encrypt(plaintext: &str) -> String {
    if plaintext.is_empty() {
        return plaintext.to_string();
    }

    let key = derive_key();
    let iv: [u8; 16] = rand::thread_rng().gen();

    // PKCS7 padding
    let block_size = 16;
    let padding_len = block_size - (plaintext.len() % block_size);
    let mut buffer = plaintext.as_bytes().to_vec();
    buffer.extend(std::iter::repeat(padding_len as u8).take(padding_len));

    let cipher = Aes256CbcEnc::new(&key.into(), &iv.into());
    cipher.encrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer, buffer.len()).unwrap();

    format!("enc:{}:{}", hex::encode(iv), hex::encode(&buffer))
}

/// Decrypt "enc:iv_hex:ciphertext_hex" format, returns plaintext
pub fn decrypt(ciphertext: &str) -> Result<String, String> {
    // If not encrypted, return as-is
    if !ciphertext.starts_with("enc:") {
        return Ok(ciphertext.to_string());
    }

    let parts: Vec<&str> = ciphertext.split(':').collect();
    if parts.len() != 3 {
        return Ok(ciphertext.to_string());
    }

    let iv = hex::decode(parts[1]).map_err(|e| format!("Invalid IV: {}", e))?;
    let encrypted = hex::decode(parts[2]).map_err(|e| format!("Invalid ciphertext: {}", e))?;

    if iv.len() != 16 {
        return Err("Invalid IV length".to_string());
    }

    let key = derive_key();
    let iv_array: [u8; 16] = iv.try_into().unwrap();

    let mut buffer = encrypted.clone();
    let cipher = Aes256CbcDec::new(&key.into(), &iv_array.into());

    cipher
        .decrypt_padded_mut::<aes::cipher::block_padding::NoPadding>(&mut buffer)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // Remove PKCS7 padding
    if let Some(&padding_len) = buffer.last() {
        let padding_len = padding_len as usize;
        if padding_len > 0 && padding_len <= 16 {
            buffer.truncate(buffer.len() - padding_len);
        }
    }

    String::from_utf8(buffer).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let plaintext = "sk-ant-api03-test-key";
        let encrypted = encrypt(plaintext);
        assert!(encrypted.starts_with("enc:"));

        let decrypted = decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_unencrypted() {
        let plaintext = "plain-text";
        let result = decrypt(plaintext).unwrap();
        assert_eq!(result, plaintext);
    }

    #[test]
    fn test_encrypt_empty() {
        let result = encrypt("");
        assert_eq!(result, "");
    }
}
```

**Step 2: 在 main.rs 中添加模块声明**

在 `apps/desktop/src-tauri/src/main.rs` 顶部添加:

```rust
mod crypto;
```

**Step 3: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop/src-tauri && cargo build`
Expected: 编译成功

**Step 4: 运行测试**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop/src-tauri && cargo test crypto`
Expected: 所有测试通过

**Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/crypto.rs apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): implement AES-256-CBC crypto module"
```

---

### Task 2.3: 验证与 CLI 加密兼容

**Files:**
- Modify: `apps/desktop/src-tauri/src/crypto.rs` (添加兼容性测试)

**Step 1: 添加与 CLI 兼容性测试**

在 crypto.rs 的 tests 模块中添加:

```rust
    #[test]
    fn test_decrypt_cli_encrypted() {
        // 这个测试值需要从 CLI 生成一个加密字符串来验证
        // 运行: node -e "const {encrypt} = require('@ccem/core'); console.log(encrypt('test-api-key'))"
        // 将输出替换到下面的 cli_encrypted 变量中

        // 示例 (实际值会不同，因为 IV 是随机的):
        // let cli_encrypted = "enc:abcd1234...:efgh5678...";
        // let decrypted = decrypt(cli_encrypted).unwrap();
        // assert_eq!(decrypted, "test-api-key");
    }
```

**Step 2: 手动验证兼容性**

1. 从 CLI 生成加密字符串:
Run: `cd /Users/wzt/G/Github/claude-code-env-manager && node -e "import('@ccem/core').then(m => console.log(m.encrypt('test-api-key')))"`

2. 将输出值硬编码到测试中验证

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/crypto.rs
git commit -m "test(desktop): add CLI encryption compatibility test"
```

---

## Phase 3: Desktop 配置共享

### Task 3.1: 创建配置管理模块

**Files:**
- Create: `apps/desktop/src-tauri/src/config.rs`

**Step 1: 创建 config.rs 模块**

```rust
use crate::crypto;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub base_url: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_MODEL")]
    pub model: Option<String>,
    #[serde(rename = "ANTHROPIC_SMALL_FAST_MODEL")]
    pub small_model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CcemConfig {
    pub registries: HashMap<String, EnvConfig>,
    pub current: Option<String>,
    #[serde(rename = "defaultMode")]
    pub default_mode: Option<String>,
}

impl Default for CcemConfig {
    fn default() -> Self {
        let mut registries = HashMap::new();
        registries.insert(
            "official".to_string(),
            EnvConfig {
                base_url: Some("https://api.anthropic.com".to_string()),
                api_key: None,
                model: Some("claude-sonnet-4-5-20250929".to_string()),
                small_model: Some("claude-haiku-4-5-20251001".to_string()),
            },
        );
        Self {
            registries,
            current: Some("official".to_string()),
            default_mode: None,
        }
    }
}

/// Get ~/.ccem/ directory path
pub fn get_ccem_dir() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".ccem")
}

/// Get ~/.ccem/config.json path
pub fn get_config_path() -> PathBuf {
    get_ccem_dir().join("config.json")
}

/// Get legacy config path (conf package default)
pub fn get_legacy_config_path() -> PathBuf {
    let home = dirs::home_dir().expect("Could not find home directory");
    #[cfg(target_os = "macos")]
    {
        home.join("Library")
            .join("Preferences")
            .join("claude-code-env-manager-nodejs")
            .join("config.json")
    }
    #[cfg(not(target_os = "macos"))]
    {
        home.join(".config")
            .join("claude-code-env-manager-nodejs")
            .join("config.json")
    }
}

/// Get ~/.ccem/app.json path (desktop-only config)
pub fn get_app_config_path() -> PathBuf {
    get_ccem_dir().join("app.json")
}

/// Ensure ~/.ccem/ directory exists
pub fn ensure_ccem_dir() -> std::io::Result<()> {
    let dir = get_ccem_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// Migrate config from legacy path if needed
pub fn migrate_if_needed() -> Result<bool, String> {
    let new_path = get_config_path();
    let legacy_path = get_legacy_config_path();

    // Already migrated
    if new_path.exists() {
        return Ok(false);
    }

    // No legacy config
    if !legacy_path.exists() {
        return Ok(false);
    }

    // Perform migration
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;
    fs::copy(&legacy_path, &new_path).map_err(|e| format!("Failed to copy config: {}", e))?;

    println!("CCEM: Config migrated to ~/.ccem/");
    Ok(true)
}

/// Read config from ~/.ccem/config.json
pub fn read_config() -> Result<CcemConfig, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        return Ok(CcemConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

/// Write config to ~/.ccem/config.json
pub fn write_config(config: &CcemConfig) -> Result<(), String> {
    ensure_ccem_dir().map_err(|e| format!("Failed to create config dir: {}", e))?;

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(get_config_path(), content).map_err(|e| format!("Failed to write config: {}", e))
}

/// Get environment config with decrypted API key
pub fn get_env_with_decrypted_key(env: &EnvConfig) -> EnvConfig {
    EnvConfig {
        base_url: env.base_url.clone(),
        api_key: env.api_key.as_ref().map(|k| crypto::decrypt(k).unwrap_or_else(|_| k.clone())),
        model: env.model.clone(),
        small_model: env.small_model.clone(),
    }
}

/// Create environment config with encrypted API key
pub fn create_env_with_encrypted_key(
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
    small_model: Option<String>,
) -> EnvConfig {
    EnvConfig {
        base_url,
        api_key: api_key.map(|k| crypto::encrypt(&k)),
        model,
        small_model,
    }
}
```

**Step 2: 在 main.rs 中添加模块声明**

在 `apps/desktop/src-tauri/src/main.rs` 顶部添加:

```rust
mod config;
```

**Step 3: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop/src-tauri && cargo build`
Expected: 编译成功

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/config.rs apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): add config management module"
```

---

### Task 3.2: 重构 main.rs 使用新配置模块

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: 删除旧的配置结构和函数**

删除 main.rs 中的以下代码 (约第 19-42 行):

```rust
// 删除这些
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig { ... }

#[derive(Debug, Serialize, Deserialize)]
pub struct CcemConfig { ... }

fn get_config_path() -> PathBuf { ... }
```

**Step 2: 导入新的配置模块**

在文件顶部添加:

```rust
use config::{CcemConfig, EnvConfig, get_env_with_decrypted_key, create_env_with_encrypted_key};
```

**Step 3: 重写 get_environments 命令**

```rust
#[tauri::command]
fn get_environments() -> Result<HashMap<String, EnvConfig>, String> {
    let cfg = config::read_config()?;
    Ok(cfg.registries)
}
```

**Step 4: 重写 get_current_env 命令**

```rust
#[tauri::command]
fn get_current_env() -> Result<String, String> {
    let cfg = config::read_config()?;
    Ok(cfg.current.unwrap_or_else(|| "official".to_string()))
}
```

**Step 5: 重写 set_current_env 命令**

```rust
#[tauri::command]
fn set_current_env(name: String) -> Result<(), String> {
    let mut cfg = config::read_config()?;
    cfg.current = Some(name);
    config::write_config(&cfg)
}
```

**Step 6: 重写 add_environment 命令**

```rust
#[tauri::command]
fn add_environment(
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' already exists", name));
    }

    let env_config = create_env_with_encrypted_key(
        Some(base_url),
        api_key,
        Some(model),
        small_model,
    );

    cfg.registries.insert(name, env_config);
    config::write_config(&cfg)
}
```

**Step 7: 重写 update_environment 命令**

```rust
#[tauri::command]
fn update_environment(
    name: String,
    base_url: String,
    api_key: Option<String>,
    model: String,
    small_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if !cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
    }

    let env_config = create_env_with_encrypted_key(
        Some(base_url),
        api_key,
        Some(model),
        small_model,
    );

    cfg.registries.insert(name, env_config);
    config::write_config(&cfg)
}
```

**Step 8: 重写 delete_environment 命令**

```rust
#[tauri::command]
fn delete_environment(name: String) -> Result<(), String> {
    if name == "official" {
        return Err("Cannot delete the 'official' environment".to_string());
    }

    let mut cfg = config::read_config()?;

    if !cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
    }

    cfg.registries.remove(&name);

    // Reset current to "official" if we deleted the current environment
    if cfg.current.as_ref() == Some(&name) {
        cfg.current = Some("official".to_string());
    }

    config::write_config(&cfg)
}
```

**Step 9: 重写 launch_claude_code 使用解密的 API Key**

在 launch_claude_code 函数中，修改读取配置的部分:

```rust
#[tauri::command]
fn launch_claude_code(
    state: State<Arc<SessionManager>>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
) -> Result<Session, String> {
    let cfg = config::read_config()?;

    // Get environment config with decrypted API key
    let env_config = cfg.registries.get(&env_name).map(get_env_with_decrypted_key);

    // Build environment variables map
    let mut env_vars: HashMap<String, String> = HashMap::new();
    if let Some(env) = env_config {
        if let Some(url) = env.base_url {
            env_vars.insert("ANTHROPIC_BASE_URL".to_string(), url);
        }
        if let Some(key) = env.api_key {
            env_vars.insert("ANTHROPIC_API_KEY".to_string(), key);
        }
        if let Some(model) = env.model {
            env_vars.insert("ANTHROPIC_MODEL".to_string(), model);
        }
        if let Some(small_model) = env.small_model {
            env_vars.insert("ANTHROPIC_SMALL_FAST_MODEL".to_string(), small_model);
        }
    }

    // ... rest of the function remains the same
}
```

**Step 10: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop/src-tauri && cargo build`
Expected: 编译成功

**Step 11: Commit**

```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "refactor(desktop): use new config module"
```

---

### Task 3.3: 添加启动时自动迁移

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: 在 setup 阶段添加迁移逻辑**

修改 main 函数中的 `.setup()` 部分:

```rust
.setup(move |app| {
    // 自动迁移配置
    if let Err(e) = config::migrate_if_needed() {
        eprintln!("Config migration warning: {}", e);
    }

    let _ = create_tray(app.handle())?;

    // Start session monitor background task
    start_session_monitor(app.handle().clone(), session_manager.clone());

    Ok(())
})
```

**Step 2: 验证编译通过**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop/src-tauri && cargo build`
Expected: 编译成功

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): add auto-migration on startup"
```

---

## Phase 4: 测试验证

### Task 4.1: CLI 端到端测试

**Step 1: 验证 CLI 配置路径**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager && pnpm run build && node apps/cli/dist/index.js ls`
Expected: 显示环境列表，配置保存到 ~/.ccem/config.json

**Step 2: 验证配置文件位置**

Run: `cat ~/.ccem/config.json`
Expected: 显示配置内容

**Step 3: 验证迁移命令**

Run: `node apps/cli/dist/index.js setup migrate --help`
Expected: 显示帮助信息

---

### Task 4.2: Desktop 端到端测试

**Step 1: 构建 Desktop 应用**

Run: `cd /Users/wzt/G/Github/claude-code-env-manager/apps/desktop && pnpm tauri build --debug`
Expected: 构建成功

**Step 2: 启动应用验证配置读取**

手动启动应用，验证能读取 CLI 创建的环境配置

---

### Task 4.3: 双向兼容性测试

**Step 1: CLI 添加环境**

Run: `node apps/cli/dist/index.js add test-env`
按提示添加一个测试环境

**Step 2: Desktop 读取**

启动 Desktop 应用，验证能看到 test-env

**Step 3: Desktop 添加环境**

在 Desktop 应用中添加一个 desktop-env

**Step 4: CLI 读取**

Run: `node apps/cli/dist/index.js ls`
Expected: 能看到 desktop-env

**Step 5: 清理测试环境**

Run: `node apps/cli/dist/index.js del test-env && node apps/cli/dist/index.js del desktop-env`

---

### Task 4.4: 最终提交

**Step 1: 确保所有更改已提交**

Run: `git status`
Expected: 工作区干净

**Step 2: 创建功能分支合并准备**

Run: `git log --oneline -10`
Expected: 显示本次所有提交
