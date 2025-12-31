# Claude Code Env Manager

优雅的使用Claude Code 🍷。 快速切换环境，一个命令启动 Claude Code。API Key 加密存储，内置常用服务商配置。

![Demo](./index.png)

## 核心功能

### 多环境管理

支持同时管理多个 API 服务商配置，包括官方 Anthropic、GLM（智谱 AI）、KIMI（月之暗面）、MiniMax、DeepSeek。每个环境独立存储 Base URL、API Key、模型名称。API Key 使用 AES-256-CBC 加密本地存储。

### 权限模式快捷切换

不想使用`--dangerously-skip-permissions`，又被繁琐的权限请求许可搞烦了？ ccem 内置 6 种权限预设，一键切换 Claude Code 的权限配置，减少 9 成的权限许可同时保证安全性：

| 模式 | 说明 |
|------|------|
| yolo | 允许所有操作，无任何限制 |
| dev | 标准开发权限，保护敏感文件 |
| readonly | 只读模式，禁止任何修改 |
| safe | 保守模式，适合不熟悉的代码库 |
| ci | CI/CD 流水线专用权限 |
| audit | 只读加搜索，用于安全审计 |

### 用量统计

自动解析 Claude Code 的日志文件，统计 token 使用量和费用。支持按项目、按时间段查看，价格数据从 LiteLLM 实时获取。

## 安装

```bash
npm install -g claude-code-env-manager
```

或者用 pnpm

```bash
pnpm add -g claude-code-env-manager
```

直接 npx 运行也可以

```bash
npx claude-code-env-manager
```

## 快速上手

终端里敲 `ccem` 回车，进入交互式菜单。当前环境、Base URL、模型名称一目了然。

添加新环境：

```bash
ccem add kimi
```

选择预设后输入 API Key，URL 和模型名自动填充。

切换环境：

```bash
ccem use kimi
```

![Demo](./demo.png)

## 权限模式

临时切换（退出后自动还原）：

```bash
ccem yolo    # 放飞模式
ccem safe    # 保守模式
ccem audit   # 审计模式
```

永久设置：

```bash
ccem setup perms --dev
```

## Shell 集成

让 `ccem use` 后环境变量立刻在当前终端生效，把下面这段加到 `~/.zshrc` 或 `~/.bashrc`：

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

然后 `source ~/.zshrc` 生效。

## 命令一览

```bash
ccem              # 交互式菜单
ccem ls           # 列出所有环境
ccem use <name>   # 切换环境
ccem add <name>   # 添加环境
ccem del <name>   # 删除环境
ccem current      # 显示当前环境
ccem env          # 输出环境变量（用于 eval）
ccem run <cmd>    # 注入环境变量后执行命令
ccem --mode       # 显示当前权限模式
ccem --list-modes # 列出所有权限模式
```

## License

MIT
