<p align="center">
  <img src="./logo.png" alt="CCEM Logo" width="160" />
</p>

<h1 align="center">CCEM</h1>
<p align="center">Claude Code & Codex Environment Manager</p>

<p align="center">
  Use Claude Code & Codex like a pro.
</p>

<p align="center">
  <a href="./README.md">English</a> | <a href="./README_zh.md">中文</a>
</p>

[![npm version](https://img.shields.io/npm/v/ccem.svg)](https://www.npmjs.com/package/ccem)
[![GitHub stars](https://img.shields.io/github/stars/Genuifx/claude-code-env-manager)](https://github.com/Genuifx/claude-code-env-manager)
[![GitHub release](https://img.shields.io/github/v/release/Genuifx/claude-code-env-manager)](https://github.com/Genuifx/claude-code-env-manager/releases)
[![license](https://img.shields.io/npm/l/ccem.svg)](https://github.com/Genuifx/claude-code-env-manager/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Genuifx/claude-code-env-manager/pulls)

![Shot](./screenshots/shots.webp)

---

## Why This Exists

Honestly, after using Claude Code for a while, some things just get really annoying.

You want KIMI for frontend, Opus for architecture, DeepSeek for scripts. But every time you switch models you're manually `export`-ing a bunch of env vars, forgetting which terminal is connected to which model, ending up with eight tabs open and no idea what's going on.

Permissions too. Approving every single command gets old fast. But `--dangerously-skip-permissions` is a bit too yolo — what if it nukes your `.env`?

Then you want to check how much you've spent this month. Claude Code won't tell you. Codex won't tell you. The combined bill across both? No idea.

And here's the real kicker — you're out grabbing coffee, and you need Claude to fix something. Your computer's at home running. You're just... stuck.

Or maybe you want Claude to automatically run tests every night, review your PRs, and push the results to your phone. That's not a crazy ask, right? But nothing out there does this.

So I built ccem.

Environment switching, permission management, multi-model parallel sessions, usage analytics, cron tasks, remote control from your phone — one tool, all covered.

Two flavors — pick whichever you like:

| | CLI | Desktop App |
|--|-----|-------------|
| Best for | Terminal lovers, scripting | GUI fans, power features |
| Environment management | ✅ | ✅ |
| Permission modes | ✅ | ✅ |
| Usage analytics | ✅ | ✅ Heatmap + trends |
| Skill management | ✅ | ✅ Streaming search |
| Claude Code + Codex dual engine | — | ✅ |
| Telegram remote control | — | ✅ |
| WeChat remote control | — | ✅ |
| Cron tasks | — | ✅ |
| Conversation history | — | ✅ |
| API request debugging | — | ✅ |

Both share the same config file (`~/.ccem/config.json`). Change an environment in Desktop and the CLI picks it up instantly, and vice versa.

---

# CLI

Environment switching, permission management, usage stats, and skill installation — all from your terminal.

## Install

```bash
npm install -g ccem
# or
pnpm add -g ccem
# or just run it
npx ccem
```

## Quick Start

```bash
ccem              # Interactive menu
ccem add kimi     # Add KIMI env with pre-filled URL and models
ccem use kimi     # Switch to KIMI
ccem dev          # Launch Claude Code in dev permission mode
ccem usage        # View token usage and costs
ccem skill add    # Interactive skill installer
```

![Demo](./screenshots/cli-index.webp)

![CLI Demo](./demo.png)

## Environment Management

### Built-in Presets

When adding an environment, choose a preset to auto-fill the URL and models:

| Preset | Base URL | Main Model | Fast Model |
|--------|----------|------------|------------|
| GLM (Zhipu) | `https://open.bigmodel.cn/api/anthropic` | glm-4.6 | glm-4.5-air |
| KIMI (Moonshot) | `https://api.moonshot.cn/anthropic` | kimi-k2-thinking-turbo | kimi-k2-turbo-preview |
| MiniMax | `https://api.minimaxi.com/anthropic` | MiniMax-M2 | MiniMax-M2 |
| DeepSeek | `https://api.deepseek.com/anthropic` | deepseek-chat | deepseek-chat |

> Official environment defaults to `claude-sonnet-4-5-20250929` + `claude-haiku-4-5-20251001`

### Commands

```bash
ccem ls              # List all environments
ccem use <name>      # Switch environment
ccem add <name>      # Add environment
ccem del <name>      # Delete (can't delete "official")
ccem rename <a> <b>  # Rename
ccem cp <src> <dst>  # Copy
ccem current         # Show current environment
ccem env             # Output export commands (pipe-friendly)
ccem env --json      # JSON format
ccem run <cmd>       # Run command with env vars injected
```

### Shell Integration

After `ccem use`, the current shell's env vars won't update automatically. Add this to `~/.zshrc`:

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

Then run `source ~/.zshrc`.

## Permission Modes

6 presets that sit between "approve everything" and "approve nothing."

| Mode | Description | When to use |
|------|-------------|-------------|
| yolo | Allow everything | Your own project, full trust |
| dev | Dev permissions, block sensitive files | Daily development |
| readonly | Read-only access | Code review, learning |
| safe | Restrict network and writes | Unfamiliar codebases |
| ci | CI/CD suitable | Automation pipelines |
| audit | Read + search only | Security audits |

### Temporary (reverts on exit)

```bash
ccem yolo / dev / readonly / safe / ci / audit
```

### Permanent (writes to config)

```bash
ccem setup perms --dev        # Apply permanently
ccem setup perms --reset      # Reset
ccem setup default-mode --dev # Set default mode
```

### View

```bash
ccem --mode        # Current mode
ccem --list-modes  # All modes
```

<details>
<summary><b>What dev mode allows / blocks</b></summary>

**Allowed:** Read, Edit, Write, Glob, Grep, LSP, NotebookEdit, npm/pnpm/yarn/bun/node/npx/git/tsc/tsx, eslint/prettier/jest/vitest, cargo/python/go/make, ls/cat/head/tail/find/wc/mkdir/cp/mv/touch, WebSearch

**Blocked:** .env/.env.*/secrets/*.pem/*.key/*credential*, rm -rf/sudo/chmod/chown

</details>

<details>
<summary><b>What safe mode allows / blocks</b></summary>

**Allowed:** Read, Glob, Grep, LSP, git status/log/diff, ls/cat/head/tail/find/wc

**Blocked:** .env/secrets/*.pem/*.key/*credential*/*password*, Edit/Write/NotebookEdit, curl/wget/ssh/scp/WebFetch, rm/mv

</details>

## Usage Analytics

```bash
ccem usage          # Interactive with calendar heatmap
ccem usage --json   # Machine-readable
```

Parses JSONL logs from `~/.claude/projects/` to calculate token usage and costs. Price data fetched from LiteLLM and cached locally.

## Skill Management

```bash
ccem skill add              # Interactive picker (Tab to switch groups)
ccem skill add <name>       # Install preset
ccem skill add <github-url> # Install from GitHub
ccem skill ls               # List installed
ccem skill rm <name>        # Remove
```

<details>
<summary><b>Preset Skills</b></summary>

**Official:** frontend-design, skill-creator, web-artifacts-builder, canvas-design, algorithmic-art, theme-factory, mcp-builder, webapp-testing, pdf/docx/pptx/xlsx, brand-guidelines, doc-coauthoring

**Curated:** superpowers (enhanced Plan mode), ui-ux-pro-max (pro UI/UX design), Humanizer-zh (de-AI-ify Chinese text)

</details>

## Remote Config

Share API configurations across your team with encrypted transport:

```bash
ccem load https://your-server.com/api/env?key=YOUR_KEY --secret YOUR_SECRET
```

<details>
<summary><b>Server deployment</b></summary>

Server code lives in `server/`. Configure `keys.json` (access keys) and `environments.json` (env vars), then run `node index.js`. Features AES-256-CBC encryption, rate limiting, and hot-reload. PM2 recommended for production.

</details>

## Setup

```bash
ccem setup init
```

Skips onboarding + disables telemetry + installs chrome-devtools MCP.

## CLI Command Reference

<details>
<summary><b>Full list</b></summary>

| Command | Description |
|---------|-------------|
| `ccem` | Interactive menu |
| `ccem ls` | List environments |
| `ccem use <name>` | Switch |
| `ccem add <name>` | Add |
| `ccem del <name>` | Delete |
| `ccem rename <a> <b>` | Rename |
| `ccem cp <src> <dst>` | Copy |
| `ccem current` | Current environment |
| `ccem env [--json]` | Output env vars |
| `ccem run <cmd>` | Run with env |
| `ccem load <url>` | Load remote config |
| `ccem yolo/dev/readonly/safe/ci/audit` | Temporary permission mode |
| `ccem --mode` | Current mode |
| `ccem --list-modes` | All modes |
| `ccem setup perms --<mode>` | Permanent permissions |
| `ccem setup default-mode --<mode>` | Default mode |
| `ccem setup init` | Initialize |
| `ccem usage [--json]` | Usage stats |
| `ccem skill add/ls/rm` | Skill management |

</details>

---

# Desktop App

A native desktop app built with Tauri 2.0. Real macOS vibrancy and glassmorphism — not an Electron wrapper.

On top of everything the CLI offers, Desktop brings several exclusive capabilities: dual engine support, remote control via Telegram, cron tasks, conversation history, and API traffic debugging.

## Install

Download `.dmg` from [GitHub Releases](https://github.com/genuifx/claude-code-env-manager/releases) and drag to Applications.

> Requires macOS 10.15 Catalina or later.

## Claude Code + Codex Dual Engine

<!-- TODO: screenshot of History page showing Claude/Codex conversations -->
![History](./screenshots/history.webp)

This might be the feature you didn't know you wanted.

Desktop supports both **Claude Code** and **OpenAI Codex CLI** as runtime engines. The Dashboard launch panel has a dropdown — pick Claude or Codex, hit launch.

When Claude is selected, environment switching and permission modes work as usual. When Codex is selected, those controls hide automatically — Codex has its own config, no need for ccem's environment settings.

Both session types are managed in a unified view on the Sessions page, each with proper icons and status indicators. Proxy Debug also captures API traffic from both engines.

In short, ccem Desktop isn't just a Claude Code manager — it's a control center for your local AI coding assistants.

## Telegram Remote Control

<!-- TODO: screenshot of ChatApp / Telegram panel -->
![Telegram](./screenshots/telegram.webp)

Control Claude Code sessions running on your computer from your phone.

Unlike the official Claude mobile app which requires an Anthropic subscription, ccem works with any API key you've configured — your own key, a third-party provider, whatever. If it works in your ccem environment, it works from Telegram.

The magic is in Telegram's Forum Topics. Each Topic maps to a project directory on your machine — one Topic, one project, one persistent session. Your "backend" Topic talks to your backend repo, your "frontend" Topic talks to your frontend repo. Clean separation, no cross-talk.

Here's how it works:

1. **Configure your bot** — Enter your Telegram Bot Token and allowed user IDs in the ChatApp page
2. **Bind projects** — Map each Forum Topic to a local project directory, with its own environment and permission mode
3. **Send messages as commands** — Text the relevant Topic from your phone, ccem spawns (or reuses) a Claude Code session locally and forwards your message
4. **Results stream back** — Claude's responses are pushed to Telegram in real time, with optional tool call visibility

Need Claude to run something while you're out? Just grab your phone.

<details>
<summary><b>How to create a Telegram Bot</b></summary>

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts — give it a name and a username
3. BotFather will reply with a **Bot Token** (looks like `123456:ABC-DEF...`) — copy it
4. Create a Telegram group, go to group settings, enable **Topics** (this turns it into a Forum group)
5. Add your bot to the group and make it an **admin** (so it can read and send messages in Topics)
6. Get your **Chat ID** — send a message in the group, then visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and look for `"chat":{"id":-100xxxxxxxxxx}`
7. Get your **User ID** — send a message to @userinfobot or check the `"from":{"id":...}` field in the same getUpdates response
8. Paste the Bot Token, Chat ID, and your User ID into ccem's ChatApp → Telegram settings

</details>

> Feishu (Lark) integration is in development.

## WeChat Remote Control

No Telegram? No problem. WeChat works too.

This one's been on the wishlist for a while. Telegram is great, but not everyone has it installed. WeChat, on the other hand — if you're in China, it's already on your phone.

Unlike Telegram's Forum Topic approach, WeChat uses direct private chats. Send a message to the bot, ccem spawns a headless Claude Code session locally, runs it, and sends the result back. Straightforward.

Here's how to set it up:

1. **QR Login** — In Desktop's ChatApp → WeChat panel, click "Scan Login QR" and scan with your WeChat
2. **Allowlist** — Enter the WeChat IDs that are allowed to control the bridge (leave empty for open access, but you probably shouldn't)
3. **Send messages as commands** — Text the bot from WeChat, ccem creates a session and executes
4. **Results stream back** — Claude's output is pushed back to your WeChat chat in real time

Permission approval works too — when Claude needs your go-ahead on something, you'll get a prompt in WeChat. Reply `/approve` or `/deny`.

Just like Telegram, Cron task results can also be pushed to WeChat. Wake up, check your WeChat, last night's PR review is already there.

## Session Management — Multiple Models, Simultaneously

<!-- TODO: screenshot of Sessions page -->
![Sessions](./screenshots/sessions.webp)

This is where ccem differs from tools like [ccswitch](https://github.com/yibie/ccswitch). ccswitch switches your global environment — one model at a time. ccem lets you run multiple sessions with different models at the same time.

Window A running Opus for architecture work. Window B running Gemini writing frontend. Window C running DeepSeek for quick scripts. All at once, each with its own environment and permission mode.

- Grid / list view toggle
- Each session shows project dir, environment, permission mode, PID, source (Desktop / CLI / Telegram / Cron)
- Per-session actions: focus, minimize, stop, close
- Multi-window tiling in tmux mode
- Orphan recovery: detect unmanaged Claude processes and take them over

## Environment Management

<!-- TODO: screenshot of Environments page -->
![Environments](./screenshots/environments.webp)

Shares config with CLI, visual interface:

- Card-based environment list with add / edit / delete
- One-click preset filling
- Remote config sync
- Permission mode switching and default mode setting

## Cron Tasks — Scheduled Automation with Push Notifications

<!-- TODO: screenshot of Cron Tasks page -->
![Cron Tasks](./screenshots/cron.webp)

Write a cron expression and a prompt, ccem runs Claude Code on schedule — and pushes the results straight to your Telegram.

This is the killer combo: Cron + ChatApp. Set up a nightly PR review, a daily test run, or a weekly security audit. When it finishes, the results land in your bound Telegram Topic automatically. You wake up, check your phone, done. No need to sit in front of your computer waiting.

Think of it as your own self-hosted [OpenClaw](https://openclaw.com) — scheduled AI coding tasks with real-time notifications, running entirely on your machine.

- **Templates** — PR Review, Test Runner, Doc Generation, Security Audit, Changelog — pick one and tweak
- **AI generation** — Describe what you want in natural language, get a cron expression and prompt generated automatically
- **Auto-push to ChatApp** — Results are sent to the bound Telegram Topic when the task completes (or fails)
- **Run history** — Status, duration, and logs for every execution
- **Next run preview** — See when the next few runs will fire
- **Retry on failure** — One click to re-run failed tasks

## Analytics — Claude Code & Codex in One View

<!-- TODO: screenshot of Analytics page with heatmap -->
![Analytics](./screenshots/analytics.webp)

GitHub-style usage statistics for both Claude Code and Codex, unified in a single dashboard.

Switch between Claude, Codex, or combined view with one click. Finally see your total AI coding spend across both tools without juggling separate dashboards.

- Daily activity heatmap
- Token usage / cost trends by model
- Consecutive active days streak
- Trend arrows (up or down vs. last week)
- Share poster: generate your AI Coding weekly report

## Conversation History — Claude Code & Codex Together

Browse all past Claude Code and Codex conversations in one place. No more digging through separate log directories.

- Filter by source: All / Claude / Codex
- Grouped by project directory
- `/compact` segmentation boundaries supported

## Proxy Debug

Built-in API request debugging panel:

- Live traffic list: timestamp, method, URL, status code, size
- Request/response detail viewer with JSON formatting + SSE stream detection
- Separate upstream URL configuration for Claude and Codex

## Skill Management

Same functionality as CLI, different experience:

- **Discover** — Streaming search, results appear as you type, one-click install
- **Installed** — Installed list with one-click uninstall

## Settings

- Theme: light / dark / system
- Language: Chinese / English
- Default permission mode / default working directory
- Terminal preference (iTerm2 / Terminal.app)
- AI-enhanced mode: use a selected environment to power AI features (e.g., natural language cron task generation)
- Dependency check: auto-detect whether ccem CLI / claude / codex / tmux are installed

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+1~9 | Switch pages |
| Cmd+Enter / Cmd+N | Launch Claude Code |
| Cmd+, | Settings |
| Cmd+Q | Quit |

---

# Data Storage

| Path | Contents |
|------|----------|
| `~/.ccem/config.json` | Environment config (API keys encrypted) |
| `~/.ccem/usage-cache.json` | Usage cache |
| `~/.ccem/model-prices.json` | Price cache |
| `.claude/settings.json` | Project permission config |
| `.claude/skills/` | Installed skills |

---

# Tech Stack

```
apps/cli/          # CLI — commander + inquirer + ink
apps/desktop/      # Desktop — Tauri 2.0 + React + Rust
packages/core/     # Shared logic — presets, types, encryption
server/            # Remote config server
```

pnpm workspaces monorepo.

**CLI**: Commander.js, Inquirer.js, Ink (React for CLI), Conf

**Desktop frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, shadcn/ui, Recharts

**Desktop backend**: Rust + Tauri 2.0, window-vibrancy (native macOS glassmorphism)

**i18n**: Chinese / English

---

## Contributing

Issues and PRs are welcome!

## License

MIT
