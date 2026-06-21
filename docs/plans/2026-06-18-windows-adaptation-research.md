# Windows Adaptation Research

Date: 2026-06-18

This note turns the recent Windows startup/icon failures into a reusable adaptation checklist for CCEM Desktop. It focuses on problems that repeat across modules: packaging, sidecars, PATH and path semantics, WebView2, terminal boundaries, filesystem locations, logs, and CI proof when no local Windows machine is available.

## Source Map

- Tauri sidecars: external binaries are declared with `bundle.externalBin`, and sidecar binaries must be prepared with the target triple and Windows `.exe` extension where applicable. Source: [Tauri External Binaries](https://v2.tauri.app/develop/sidecar/).
- Tauri Windows installer: NSIS/WiX builds can configure WebView2 install mode. Default is `downloadBootstrapper`; alternatives include embedded bootstrapper, offline installer, fixed runtime, and skip. Source: [Tauri Windows Installer](https://v2.tauri.app/distribute/windows-installer/).
- Tauri icons: `icon.ico` is the Windows icon file, and `tauri icon` generates the platform icon set from one input image. Source: [Tauri App Icons](https://v2.tauri.app/develop/icons/).
- WebView2 distribution: Windows WebView2 apps depend on the WebView2 Runtime. Microsoft recommends Evergreen for most apps but says apps should handle edge cases where the runtime is missing. Source: [Microsoft WebView2 Evergreen vs Fixed](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version) and [Microsoft WebView2 Distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).
- PATH semantics: Rust `std::env::split_paths` uses platform conventions, with `:` on most Unix platforms and `;` on Windows. Source: [Rust split_paths](https://doc.rust-lang.org/std/env/fn.split_paths.html). `join_paths` is the paired recomposition API. Source: [Rust join_paths](https://doc.rust-lang.org/std/env/fn.join_paths.html).
- Windows environment inheritance: child processes inherit the parent process environment by default unless a new environment block is supplied. Source: [Microsoft Environment Variables](https://learn.microsoft.com/en-us/windows/win32/procthread/environment-variables).
- Windows Terminal: `wt.exe` supports opening new windows/tabs and targeting a directory with `-d`; PowerShell requires escaping `;` when passing multi-command `wt` arguments. Source: [Windows Terminal command line arguments](https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments).
- JetBrains IDE directories: Windows configuration is under `%APPDATA%\JetBrains\<product><version>`, system/log directories under `%LOCALAPPDATA%\JetBrains\<product><version>`. Source: [JetBrains IDE directories](https://www.jetbrains.com/help/idea/directories-used-by-the-ide-to-store-settings-caches-plugins-and-logs.html).
- Tauri logging: the official log plugin can write logs and rotate files. Source: [Tauri Logging Plugin](https://v2.tauri.app/plugin/logging/).

## Current Repo Evidence

- `apps/desktop/src-tauri/tauri.conf.json` currently declares `externalBin: ["binaries/ccem-node"]`, includes `resources/native-runtime-helper.mjs`, and includes `icons/icon.ico`.
- `apps/desktop/src-tauri/tauri.windows.conf.json` currently only overrides `bundle.targets` to `["nsis"]`.
- `apps/desktop/src-tauri/tauri.windows.ci.conf.json` disables updater artifacts and uses NSIS for smoke builds.
- `.github/workflows/ci.yml` runs macOS and Windows tests, then runs a Windows NSIS installer smoke job that uploads the generated `.exe`.
- `.github/workflows/release-desktop.yml` builds `x86_64-pc-windows-msvc` with `src-tauri/tauri.windows.conf.json` and `--bundles nsis,updater`.
- `apps/desktop/scripts/prepare-native-runtime-sidecar.mjs` builds `@ccem/native-runtime-helper`, copies the helper resource, copies the current Node executable into `src-tauri/binaries/ccem-node-<target-triple>[.exe]`, and uses `rustc --print host-tuple` with an older `rustc -vV` fallback.
- Current `main` still has `apps/desktop/src-tauri/src/native_runtime.rs` merging helper PATH values by splitting on `:`, which is wrong on Windows drive-letter paths such as `D:\...`.
- Current `main` still has a one-layer `apps/desktop/src-tauri/icons/icon.ico` containing only `16x16`; Windows shell shortcuts will scale it and appear blurry.
- Branch `codex/windows-sidecar-icon-fix` already contains the validated fixes for the two previous bullets. CI run `27706278368` passed, including `Test & Build (windows-latest)` and `Windows Installer Smoke`.

## Adaptation Principles

1. Treat Windows as a first-class platform, not a macOS clone.
2. Keep headless/native sidecar sessions as the Windows primary path.
3. Keep tmux attach/external terminal features capability-gated because tmux is not a Windows primitive in this app.
4. Use platform path APIs (`std::env::split_paths`, `std::env::join_paths`, `PathBuf`, Node `path`) instead of string-splitting paths.
5. Make Windows installer behavior explicit: WebView2 policy, NSIS target, updater artifact behavior, icon layers, and sidecar target triple.
6. Collect logs in one predictable bundle because Windows user reports are the real runtime feedback loop.
7. CI must cover the Windows build surface. Local macOS tests are not enough for sidecars, NSIS, and path behavior.

## Module Matrix

| Area | Current state | Windows adaptation needed | Proof |
| --- | --- | --- | --- |
| Tauri bundle | Base config includes macOS targets by default; Windows config changes target to NSIS. | Keep `tauri.windows.conf.json` explicit for `targets`, WebView2 install mode, updater behavior, and any Windows-only bundle metadata. | `pnpm tauri build --ci --config src-tauri/tauri.windows.ci.conf.json --bundles nsis` on `windows-latest`. |
| WebView2 | No explicit `webviewInstallMode`; Tauri default downloads bootstrapper if runtime missing. | Decide product policy: small online installer by default, and optionally a separate offline installer if users are in offline/corporate networks. Do not use `skip`. | Windows installer smoke plus a manual install test on a clean VM or user machine. |
| Sidecar Node runtime | `prepare-native-runtime-sidecar.mjs` copies current Node as `ccem-node-<target-triple>[.exe]`. | Keep target triple generation tested. Confirm release build uses the intended Node version and produces `ccem-node-x86_64-pc-windows-msvc.exe`. Avoid shell-string launching. | CI artifact contents and sidecar startup smoke. |
| Shell permissions | `capabilities/default.json` grants spawn/stdin-write for sidecar `binaries/ccem-node`. | Keep permission scope narrowly sidecar-only. Do not broaden to arbitrary shell execution while fixing Windows. | Tauri build succeeds and capability schema validates. |
| PATH/env | `main` still splits helper PATH with `:`. | Merge `codex/windows-sidecar-icon-fix` or equivalent: use platform separators or Rust `split_paths`/`join_paths`. Include `PATHEXT` and common Windows CLI locations. | Windows Rust unit for `D:\...;C:\...`, plus `windows-latest` test job. |
| CLI discovery | `terminal.rs` already has Windows candidates for npm, pnpm, cargo, scoop and `PATHEXT`. | Keep all CLI detection going through shared resolver functions; avoid direct `Command::new("codex")` without resolved PATH. | Unit tests for Windows candidate generation and CI. |
| tmux/session attach | `tmux_supported_on_current_platform()` returns macOS/Linux only. | UI and backend must keep tmux-only actions disabled on Windows. Windows session interaction should use native helper streams. | `get_platform_capabilities` assertions, frontend tests for hidden/disabled terminal attach actions. |
| External terminal | `external_terminal_launch_supported()` is macOS only. | Future Windows support should be a separate feature using `wt.exe`, not a dependency for the native runtime. Be careful with PowerShell `;` escaping. | Separate Windows Terminal tests and manual `wt -d <dir>` smoke. |
| IDE project sync | `sync_vscode_projects` and `sync_jetbrains_projects` currently hardcode macOS app support paths. | Add Windows paths: VS Code under `%APPDATA%\Code\User\...`; JetBrains config under `%APPDATA%\JetBrains`, logs/system under `%LOCALAPPDATA%\JetBrains`. Keep macOS/Linux separate. | Unit tests using temp `APPDATA`/`LOCALAPPDATA` and parser fixtures. |
| Icons | `main` has one 16x16 `icon.ico`. | Use multi-layer `icon.ico` generated by `tauri icon`; keep an icon regression test that requires common Windows sizes. | Node ICO parser test plus visual shortcut check. |
| Vite/WebView target | `vite.config.ts` uses `chrome105` for Windows and `safari13` otherwise. | Keep explicit Windows build target aligned with WebView2 baseline. If using newer APIs, pair with `minimumWebview2Version`. | Desktop build and WebView smoke. |
| Logs | Runtime stderr/stdout events exist in app state, but there is no one-click Windows support bundle. | Add a `Collect Diagnostics` action that zips app config redacted metadata, native runtime state, recent helper stderr/stdout events, app version, platform capabilities, WebView2 version if available, and installer/update channel. Consider Tauri log plugin for rotating file logs. | Unit test redaction and manual support bundle check on Windows. |
| Update/release | Release workflow builds Windows updater artifacts. | Keep Windows release proof based on remote Actions, artifact names, and latest updater manifest. Check Windows signature URLs in `latest.json`. | Release workflow green plus `latest.json` contains `windows-x86_64`. |

## Recommended Work Order

1. Merge the already validated `codex/windows-sidecar-icon-fix` branch.
   - Fixes Windows sidecar PATH corruption.
   - Fixes blurry Windows shortcut icon.
   - Adds icon regression coverage.
   - Keeps CI proof attached to the fix.

2. Make Windows bundle policy explicit.
   - Add `bundle.windows.webviewInstallMode.type`.
   - Default recommendation: `downloadBootstrapper` for normal release size.
   - Add a documented optional offline build profile only if users need offline/corporate install support.
   - Do not set `skip`.

3. Add a diagnostics bundle before chasing scattered user screenshots.
   - The bundle should be generated from the desktop app without asking the user to manually find logs.
   - Redact API keys, auth tokens, local secret values, and config fields that can contain credentials.
   - Include recent native helper events so errors like `EISDIR ... path 'D:'` come back with context.

4. Split Windows-capability UI from tmux-capability UI.
   - Use `get_platform_capabilities` as the source of truth.
   - Hide or disable tmux attach features on Windows.
   - Keep native runtime sessions visible and operable.

5. Port IDE/project discovery paths.
   - Replace macOS-only VS Code and JetBrains hardcoded paths with platform path builders.
   - Test with synthetic `%APPDATA%`, `%LOCALAPPDATA%`, and home directories.

6. Add a Windows release verification checklist.
   - CI `Test & Build (windows-latest)` passed.
   - CI `Windows Installer Smoke` passed.
   - Artifact contains `.exe`.
   - Installer icon is multi-resolution.
   - Sidecar binary exists with Windows target triple and `.exe`.
   - Manual reporter can open the app, start one native session, and export diagnostics.

## Support Log Return Path

The clean user-facing path should be:

1. User opens CCEM Desktop.
2. User goes to Settings or Help.
3. User clicks `Collect Diagnostics`.
4. App writes a zip to a chosen path or desktop.
5. User sends that zip back.

Minimum contents:

- `platform.json`: app version, OS, arch, `get_platform_capabilities`, Node sidecar target, WebView2/runtime signal if available.
- `native-runtime-state.redacted.json`: session IDs, providers, statuses, timestamps, last error, project dir hash or basename only.
- `recent-native-events.redacted.jsonl`: recent stderr/stdout/helper lifecycle events.
- `app-config.redacted.json`: environment names and model fields, with API keys/tokens removed.
- `installer.json`: updater endpoint, current version, release channel, and whether running from installed bundle or dev.

This should not require the user to know where Windows stores app logs.

## CI Without Local Windows Hardware

The Windows adaptation proof chain should be:

1. Unit tests for path/env behavior, icon structure, platform capabilities, and Windows path builders.
2. `pnpm -r test:run` on `windows-latest`.
3. `pnpm -r build` on `windows-latest`.
4. Rust clippy and Rust tests on `windows-latest`.
5. NSIS installer smoke on `windows-latest`.
6. Artifact inspection for expected `.exe`, sidecar `.exe`, and multi-resolution `.ico`.
7. One manual smoke on a real Windows user machine only after CI is green.

This lets the project keep moving even without a local Windows machine, while still preserving a real user-machine feedback loop for WebView2/runtime edge cases.

