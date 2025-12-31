# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Environment Manager (ccem) is a CLI tool for managing multiple API configurations for Claude Code. It allows switching between different model providers (official Anthropic, GLM, Kimi, MiniMax, DeepSeek) with encrypted API key storage. It also provides permission mode shortcuts for quickly configuring Claude Code's permissions.

## Commands

```bash
# Build
npm run build      # Build with tsup (outputs to dist/)
npm run dev        # Watch mode for development

# Run locally
npm run start      # Run built CLI
node dist/index.js # Direct execution
```

## Architecture

Modular CLI application using:
- **commander** - CLI command parsing
- **conf** - Persistent JSON config storage (stored in OS config directory)
- **inquirer** - Interactive prompts
- **chalk/cli-table3** - Terminal formatting

### Source Files

```
src/
├── index.ts       # Main entry, CLI commands
├── types.ts       # TypeScript type definitions
├── utils.ts       # Utility functions (encryption, project root detection)
├── presets.ts     # Environment presets and permission presets
├── permissions.ts # Permission management core logic
├── ui.ts          # UI components (menus, panels, formatting)
└── usage.ts       # Usage statistics tracking and cost calculation
```

### Key Components

- **Config storage**: Uses `conf` package with project name `claude-code-env-manager`. Stores registries (environments) and current selection.
- **Encryption**: API keys encrypted with AES-256-CBC before storage (obfuscation, not secure storage - key is derived from hardcoded secret).
- **Environment Presets**: Built-in configurations for GLM, KIMI, MiniMax, DeepSeek defined in `ENV_PRESETS`.
- **Permission Presets**: Built-in permission modes (yolo, dev, readonly, safe, ci, audit) defined in `PERMISSION_PRESETS`.
- **Usage Statistics**: Parses Claude's JSONL logs from `~/.claude/projects/` to track token usage and costs. Uses incremental caching in `~/.ccem/usage-cache.json`. Prices fetched from LiteLLM with local fallback.
- **Environment variables managed**: `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`

### CLI Commands

#### Environment Management
- `ccem` (no args) - Interactive menu loop
- `ccem ls` - List environments
- `ccem use <name>` - Switch environment
- `ccem add <name>` - Add new environment (with preset selection)
- `ccem del <name>` - Delete environment (cannot delete 'official')
- `ccem current` - Show current environment name
- `ccem env [--json]` - Output export commands for shell eval
- `ccem run <command...>` - Run command with environment variables injected

#### Permission Management (Temporary Mode)
- `ccem yolo` - Apply YOLO mode temporarily, auto-restore on exit
- `ccem dev` - Apply dev mode temporarily
- `ccem readonly` - Apply readonly mode temporarily
- `ccem safe` - Apply safe mode temporarily
- `ccem ci` - Apply CI/CD mode temporarily
- `ccem audit` - Apply audit mode temporarily
- `ccem --mode` - Show current permission mode
- `ccem --list-modes` - List all available permission modes

#### Permission Management (Permanent Mode)
- `ccem setup perms --yolo` - Permanently apply YOLO mode
- `ccem setup perms --dev` - Permanently apply dev mode
- `ccem setup perms --readonly` - Permanently apply readonly mode
- `ccem setup perms --safe` - Permanently apply safe mode
- `ccem setup perms --ci` - Permanently apply CI/CD mode
- `ccem setup perms --audit` - Permanently apply audit mode
- `ccem setup perms --reset` - Reset permission configuration

#### Default Mode Settings
- `ccem setup default-mode --dev` - Set default permission mode for interactive menu
- `ccem setup default-mode --reset` - Clear default mode setting
- `ccem setup default-mode` - Show current default mode

### Permission Modes

| Mode | Description |
|------|-------------|
| yolo | Allow all operations without restrictions |
| dev | Standard development permissions, protect sensitive files |
| readonly | Read-only access, no modifications allowed |
| safe | Conservative permissions for unfamiliar codebases |
| ci | Permissions suitable for CI/CD pipelines |
| audit | Read and search only for security analysis |

### Output Modes

The CLI detects TTY vs piped output (`process.stdout.isTTY`) to adjust behavior:
- TTY: Shows tables and colored output
- Piped: Outputs raw export commands for `eval $(ccem env)`
