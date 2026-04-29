# File Size Exemptions

The file-size CI gate blocks new source files over 1000 lines unless they are documented here. Each exemption is existing technical debt that should be split incrementally rather than in a rushed CI fix.

- `apps/cli/src/index.ts`: Main CLI entrypoint still owns command registration and interactive flows.
- `apps/desktop/src-tauri/src/analytics.rs`: Analytics aggregation and reporting logic has not been split yet.
- `apps/desktop/src-tauri/src/config.rs`: Configuration migration, recovery, and runtime resolution still share one module.
- `apps/desktop/src-tauri/src/cron.rs`: Cron scheduling and execution orchestration is still a large legacy module.
- `apps/desktop/src-tauri/src/history.rs`: History parsing and projection code is still coupled in one file.
- `apps/desktop/src-tauri/src/main.rs`: Tauri command wiring and app bootstrap remain centralized in the entrypoint.
- `apps/desktop/src-tauri/src/native_runtime.rs`: Native SDK runtime lifecycle, event replay, and helper orchestration are still centralized.
- `apps/desktop/src-tauri/src/proxy_debug.rs`: Proxy debug parsing and reduction logic still lives in one module.
- `apps/desktop/src-tauri/src/runtime.rs`: Runtime management remains a large central orchestrator.
- `apps/desktop/src-tauri/src/telegram/mod.rs`: Telegram bot integration is currently a large monolith and needs phased extraction.
- `apps/desktop/src-tauri/src/terminal.rs`: Terminal management and adapter logic is still bundled together.
- `apps/desktop/src-tauri/src/tmux.rs`: tmux launch, status parsing, and recovery helpers are still bundled together.
- `apps/desktop/src-tauri/src/weixin/mod.rs`: Weixin bridge integration remains a large monolith and needs phased extraction.
- `apps/desktop/src/components/analytics/SharePosterDialog.tsx`: Share poster generation UI is still implemented in one large component.
- `apps/desktop/src/components/workspace/WorkspaceNativeSessionView.tsx`: Native workspace transcript, attention handling, and composer orchestration remain concentrated during the workspace redesign.
- `apps/desktop/src/pages/Workspace.tsx`: Workspace navigation, history, compose, and live-session coordination remain centralized during the workspace redesign.
- `apps/desktop/src/hooks/useTauriCommands.ts`: Tauri IPC wrappers are still exposed from one large hook.
- `packages/native-runtime-helper/src/index.ts`: Bundled helper protocol, Claude SDK bridge, and Codex SDK bridge are still packaged as one sidecar entrypoint.
