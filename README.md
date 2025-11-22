# Claude Code Env Manager (ccem)

**一键管理和切换 Claude Code 的多环境配置工具**

`ccem` 是一个受 `nrm` 启发的命令行工具，专为 Claude Code 用户设计。它可以帮助你轻松管理多个 API 配置（如官方 API、Kimi、DeepSeek 等），并在它们之间快速切换。

## ✨ 特性

*   🚀 **一键切换**：在不同的模型服务商之间快速切换。
*   🔒 **安全存储**：API Key 经过 AES 加密存储，保护你的隐私。
*   ⚡️ **预设配置**：内置 GLM、Kimi、MiniMax、DeepSeek 等常用服务商配置，开箱即用。
*   🛠 **灵活运行**：支持直接使用指定环境运行命令，或导出环境变量到 Shell。

## 📦 安装

### 全局安装（推荐）

使用 npm 或 pnpm 全局安装：

```bash
npm install -g claude-code-env-manager
# 或者
pnpm add -g claude-code-env-manager
```

### 免安装运行

你也可以直接使用 `npx` 或 `pnpx` 运行（无需安装）：

```bash
npx claude-code-env-manager
# 或者
pnpx claude-code-env-manager
```

## 🚀 快速开始

### 1. 添加配置

使用 `add` 命令添加一个新的环境配置。支持选择预设，省去手动输入 URL 和模型名称的麻烦。

```bash
ccem add my-env
```

按照提示操作即可：
1.  选择是否使用预设（如 Kimi, DeepSeek 等）。
2.  输入你的 API Key。

### 2. 切换环境

使用 `use` 命令切换到你想要的环境：

```bash
ccem use my-env
```

### 3. 启动 Claude Code

最简单的使用方式是直接通过 `ccem` 启动：

```bash
# 方式一：交互式菜单（推荐）
ccem
# 然后选择 "🚀 Start Claude Code"

# 方式二：命令行直接运行
ccem run claude
```

这样 `claude` 就会自动使用你当前配置的环境变量运行。

---

## 📖 详细指南

### 查看所有环境

```bash
ccem ls
```

### 查看当前环境

```bash
ccem current
```

### 删除环境

```bash
ccem del my-env
```

### 进阶：Shell 集成（自动生效）

如果你希望 `ccem use` 能直接修改当前终端的环境变量（就像 `nvm` 那样），请将以下函数添加到你的 `~/.zshrc` 或 `~/.bashrc` 文件末尾：

```bash
ccem() {
  command ccem "$@"
  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    if [[ "$1" == "use" || -z "$1" ]]; then
      eval "$(command ccem env)"
    fi
  fi
  return $exit_code
}
```

添加后，运行 `source ~/.zshrc` (或 `~/.bashrc`) 使其生效。之后你执行 `ccem use xxx` 时，环境变量就会立即在当前窗口生效。

### 手动导出环境变量

如果你不想配置 Shell 集成，也可以手动执行：

```bash
eval $(ccem env)
```

## 📝 预设列表

目前内置了以下服务商的推荐配置：

*   **GLM** (智谱 AI)
*   **KIMI** (月之暗面)
*   **MiniMax**
*   **DeepSeek**

## License

MIT
