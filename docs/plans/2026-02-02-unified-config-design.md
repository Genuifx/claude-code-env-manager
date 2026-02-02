# 配置统一到 ~/.ccem/ 设计方案

## 背景

Desktop App 当前没有读取 CLI 已存储的环境配置，两者配置路径和加密逻辑不兼容。需要统一配置存储，实现 CLI 和 Desktop 共享。

## 目录结构

```
~/.ccem/
├── config.json          # 环境配置 (CLI + Desktop 共享)
│                        # 结构: { registries, current, defaultMode }
├── app.json             # Desktop 独有配置
│                        # 如: 终端偏好、窗口状态等
└── usage-cache.json     # 用量统计缓存 (已存在，位置不变)
```

**旧路径** (迁移源):
- macOS: `~/Library/Preferences/claude-code-env-manager-nodejs/config.json`
- Linux: `~/.config/claude-code-env-manager-nodejs/config.json`

## 加密实现

### CLI (TypeScript) - 保持不变

```typescript
// 密钥派生
const SECRET_KEY = crypto.scryptSync('claude-code-env-manager-secret', 'salt', 32);
// 加密格式: "enc:${iv_hex}:${encrypted_hex}"
```

### Desktop (Rust) - 实现完整加密/解密

```rust
// 密钥派生 (与 CLI 完全一致)
// scrypt: password="claude-code-env-manager-secret", salt="salt", n=16384, r=8, p=1, len=32

// 解密: 解析 "enc:iv:data" -> AES-256-CBC 解密
// 加密: 生成随机 iv -> AES-256-CBC 加密 -> 格式化为 "enc:iv:data"
```

**Rust 依赖**:
- `scrypt` - 密钥派生
- `aes` + `cbc` - AES-256-CBC
- `rand` - 生成随机 IV
- `hex` - 十六进制编解码

**新增模块**: `src-tauri/src/crypto.rs`
- `fn derive_key() -> [u8; 32]`
- `fn encrypt(plaintext: &str) -> String`
- `fn decrypt(ciphertext: &str) -> Result<String, Error>`

## 迁移逻辑

### CLI 迁移 - postinstall 脚本

```
package.json:
  "scripts": {
    "postinstall": "node ./scripts/migrate.js"
  }

scripts/migrate.js:
  1. 检查 ~/.ccem/config.json 是否存在
  2. 如果不存在且旧路径存在:
     a. 创建 ~/.ccem/ 目录
     b. 复制配置文件
     c. 输出: "配置已迁移到 ~/.ccem/"
  3. 静默退出 (不阻塞安装)
```

### Desktop 迁移 - 启动时检测

```rust
// main.rs setup 阶段
fn migrate_config_if_needed() {
    // 1. 检查新路径是否存在
    // 2. 不存在则从旧路径复制
    // 3. 记录日志
}
```

### 手动命令 `ccem setup migrate`

```
选项:
  --clean    迁移后删除旧配置文件
  --force    强制重新迁移 (覆盖新路径)

用途: 手动触发迁移、清理旧文件、或强制覆盖
```

## 代码改动范围

### CLI (`apps/cli/`)

- `src/index.ts` - 修改 `Conf` 配置路径到 `~/.ccem/`
- `scripts/migrate.js` - 新增 postinstall 迁移脚本
- `package.json` - 添加 postinstall hook
- `src/index.ts` - 添加 `setup migrate` 子命令

### Desktop (`apps/desktop/src-tauri/`)

- `src/crypto.rs` - 新增加密/解密模块
- `src/config.rs` - 新增配置管理模块 (路径、读写、迁移)
- `src/main.rs` - 修改 `get_config_path()` 指向 `~/.ccem/`
- `src/main.rs` - setup 阶段调用迁移检测
- `Cargo.toml` - 添加 scrypt, aes, cbc, rand, hex 依赖

### 共享 (`packages/core/`)

- 可选: 将配置路径常量提取到 core 包

### 删除

- Desktop 现有的硬编码路径 `~/.config/claude-code-env-manager/`

## 实现顺序

### Phase 1: CLI 配置路径迁移

- 修改 Conf 存储路径到 `~/.ccem/`
- 添加 postinstall 迁移脚本
- 添加 `ccem setup migrate` 命令

### Phase 2: Desktop 加密模块

- 实现 `crypto.rs` (encrypt/decrypt)
- 单元测试验证与 CLI 加密兼容

### Phase 3: Desktop 配置共享

- 实现 `config.rs` 配置管理
- 修改 `main.rs` 使用新路径
- 启动时自动迁移检测

### Phase 4: 测试验证

- CLI 添加环境 → Desktop 能读取
- Desktop 添加环境 → CLI 能读取
- 加密 API Key 双向兼容
