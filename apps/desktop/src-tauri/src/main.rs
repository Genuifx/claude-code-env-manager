// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod analytics;
mod channel;
mod config;
mod cron;
mod crypto;
mod event_bus;
mod event_dispatcher;
mod history;
mod interactive_runtime;
mod jsonl_watcher;
mod permission;
mod proxy_debug;
mod remote;
mod runtime;
mod session;
mod skills;
mod telegram;
mod terminal;
mod tmux;
mod tray;
mod unified_runtime;
mod unified_session;
mod weixin;

use analytics::{
    get_continuous_usage_days, get_usage_history, get_usage_model_breakdown, get_usage_stats,
};
use channel::ChannelKind;
use config::{
    create_env_with_encrypted_key, resolve_claude_env, AppConfig, DesktopSettings, EnvConfig,
    FavoriteProject, JetBrainsProject, RecentProject, VSCodeProject,
};
use cron::{start_cron_scheduler, CronScheduler};
use event_dispatcher::EventDispatcher;
use history::{get_conversation_history, get_conversation_messages, get_conversation_segments};
use interactive_runtime::{
    InteractiveReplayBatch, InteractiveRuntimeManager, InteractiveSessionOptions,
};
use proxy_debug::{
    ProxyDebugManager, ProxyDebugState, ProxyTrafficDetail, ProxyTrafficPage, RegisterRouteRequest,
};
use runtime::{
    cleanup_orphaned_runtime_processes, clear_runtime_recovery_candidates_by_claude_session_id,
    dismiss_runtime_recovery_candidate as dismiss_runtime_recovery_candidate_entry,
    list_runtime_recovery_candidates as list_runtime_recovery_candidates_entries,
    HeadlessRuntimeManager, HeadlessSessionOptions, HeadlessSessionSource, HeadlessSessionSummary,
    RuntimeRecoveryCandidate,
};
use session::{
    cleanup_exit_file, cleanup_stale_exit_files_except, start_session_monitor, Session,
    SessionManager,
};
use std::collections::HashMap;
use std::fs;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use telegram::{
    TelegramBridgeManager, TelegramBridgeStatus, TelegramForumTopic, TelegramSettings,
    TelegramTopicBinding,
};
use tmux::ClaudeTerminalState;
use unified_runtime::UnifiedSessionManager;
use unified_session::{RuntimeInput, UnifiedSessionDebugComparison, UnifiedSessionInfo};
use weixin::{WeixinBridgeManager, WeixinBridgeStatus, WeixinLoginSession, WeixinSettings};

/// Global flag: when true, CloseRequested should NOT be intercepted.
static FORCE_QUIT: AtomicBool = AtomicBool::new(false);
use tauri::{window::Color, Manager, RunEvent, State, WindowEvent};
use terminal::{
    ArrangeLayout, ArrangeSessionInfo, TerminalInfo, TerminalType, TmuxAttachTerminalInfo,
    TmuxAttachTerminalType,
};
use tray::create_tray;

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
struct LoadedEnv {
    name: String,
    original_name: String,
    renamed: bool,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
struct LoadResult {
    count: usize,
    environments: Vec<LoadedEnv>,
}

#[cfg(target_os = "macos")]
fn should_use_reduced_window_effects(settings: &DesktopSettings) -> bool {
    settings.performance_mode == "reduced"
        || matches!(
            std::env::var("VITE_PERF_MODE").ok().as_deref(),
            Some("reduced")
        )
}

#[cfg(target_os = "macos")]
fn reduced_window_background_color(settings: &DesktopSettings) -> Color {
    match settings.theme.as_str() {
        "light" => Color(242, 245, 249, 255),
        _ => Color(22, 24, 29, 255),
    }
}

#[cfg(target_os = "macos")]
fn sync_macos_window_appearance(
    main_window: &tauri::WebviewWindow,
    settings: &DesktopSettings,
) -> Result<(), String> {
    use tauri_plugin_decorum::WebviewWindowExt;
    use window_vibrancy::{apply_vibrancy, clear_vibrancy, NSVisualEffectMaterial};

    let _ = clear_vibrancy(main_window);

    if should_use_reduced_window_effects(settings) {
        let _ = main_window.set_background_color(Some(reduced_window_background_color(settings)));
        return Ok(());
    }

    let _ = main_window.set_background_color(None);
    main_window
        .make_transparent()
        .map_err(|error| format!("Failed to enable window transparency: {}", error))?;
    apply_vibrancy(main_window, NSVisualEffectMaterial::Sidebar, None, None)
        .map_err(|error| format!("Failed to apply vibrancy: {}", error))?;
    Ok(())
}

fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    format!("session-{}", timestamp)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to CCEM Desktop.", name)
}

#[tauri::command]
fn get_system_username() -> String {
    std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "developer".to_string())
}

#[tauri::command]
async fn get_environments() -> Result<HashMap<String, EnvConfig>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let start = std::time::Instant::now();
        let cfg = config::read_config()?;
        let decrypted: HashMap<String, EnvConfig> = cfg
            .registries
            .iter()
            .map(|(k, v)| (k.clone(), config::get_env_with_decrypted_key(v)))
            .collect();

        #[cfg(debug_assertions)]
        {
            let elapsed_ms = start.elapsed().as_millis();
            if elapsed_ms > 100 {
                eprintln!("CCEM perf: get_environments took {}ms", elapsed_ms);
            }
        }

        Ok(decrypted)
    })
    .await
    .map_err(|e| format!("Failed to join get_environments task: {}", e))?
}

#[tauri::command]
fn get_current_env() -> Result<String, String> {
    let cfg = config::read_config()?;
    Ok(cfg.current.unwrap_or_else(|| "official".to_string()))
}

#[tauri::command]
fn set_current_env(name: String) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    // 校验环境是否存在
    if !cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' does not exist", name));
    }

    cfg.current = Some(name);
    config::write_config(&cfg)
}

#[tauri::command]
fn add_environment(
    name: String,
    base_url: String,
    auth_token: Option<String>,
    default_opus_model: String,
    default_sonnet_model: Option<String>,
    default_haiku_model: Option<String>,
    runtime_model: Option<String>,
    subagent_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' already exists", name));
    }

    let env_config = create_env_with_encrypted_key(
        Some(base_url),
        auth_token,
        Some(default_opus_model),
        default_sonnet_model,
        default_haiku_model,
        runtime_model,
        subagent_model,
    );

    cfg.registries.insert(name, env_config);
    config::write_config(&cfg)
}

#[tauri::command]
fn update_environment(
    old_name: String,
    name: String,
    base_url: String,
    auth_token: Option<String>,
    default_opus_model: String,
    default_sonnet_model: Option<String>,
    default_haiku_model: Option<String>,
    runtime_model: Option<String>,
    subagent_model: Option<String>,
) -> Result<(), String> {
    let mut cfg = config::read_config()?;

    if !cfg.registries.contains_key(&old_name) {
        return Err(format!("Environment '{}' does not exist", old_name));
    }

    // If renaming, check that new name doesn't conflict
    if old_name != name && cfg.registries.contains_key(&name) {
        return Err(format!("Environment '{}' already exists", name));
    }

    let env_config = create_env_with_encrypted_key(
        Some(base_url),
        auth_token,
        Some(default_opus_model),
        default_sonnet_model,
        default_haiku_model,
        runtime_model,
        subagent_model,
    );

    // Remove old key if renamed
    if old_name != name {
        cfg.registries.remove(&old_name);
        // Update current env pointer if it was pointing to the old name
        if cfg.current.as_ref() == Some(&old_name) {
            cfg.current = Some(name.clone());
        }
    }

    cfg.registries.insert(name, env_config);
    config::write_config(&cfg)
}

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

    if cfg.current.as_ref() == Some(&name) {
        cfg.current = Some("official".to_string());
    }

    config::write_config(&cfg)
}

// ============================================
// App Config Commands (Favorites & Recent)
// ============================================

#[tauri::command]
fn get_app_config() -> Result<AppConfig, String> {
    config::read_app_config()
}

#[tauri::command]
fn add_favorite(path: String, name: String) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    // Don't add if already exists
    if cfg.favorites.iter().any(|f| f.path == path) {
        return Ok(());
    }
    cfg.favorites.push(FavoriteProject { path, name });
    config::write_app_config(&cfg)
}

#[tauri::command]
fn remove_favorite(path: String) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    cfg.favorites.retain(|f| f.path != path);
    config::write_app_config(&cfg)
}

#[tauri::command]
fn add_recent(path: String) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    // Remove if already exists (will re-add at front)
    cfg.recent.retain(|r| r.path != path);
    // Add to front
    cfg.recent.insert(
        0,
        RecentProject {
            path,
            last_used: chrono::Utc::now().to_rfc3339(),
        },
    );
    // Keep max 10
    cfg.recent.truncate(10);
    config::write_app_config(&cfg)
}

// ============================================
// Terminal Management Commands
// ============================================

#[tauri::command]
fn detect_terminals() -> Vec<TerminalInfo> {
    terminal::detect_terminals()
}

#[tauri::command]
fn list_tmux_attach_terminals() -> Vec<TmuxAttachTerminalInfo> {
    terminal::detect_tmux_attach_terminals()
}

#[tauri::command]
fn get_preferred_terminal() -> TerminalType {
    terminal::get_preferred_terminal()
}

#[tauri::command]
fn set_preferred_terminal(terminal_type: TerminalType) -> Result<(), String> {
    terminal::set_preferred_terminal(terminal_type)
}

// ============================================
// Interactive Runtime v0 Commands (external terminal-backed)
// ============================================

#[tauri::command]
async fn launch_claude_code(
    state: State<'_, Arc<SessionManager>>,
    proxy_state: State<'_, Arc<ProxyDebugManager>>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
    resume_session_id: Option<String>,
    client: Option<String>,
) -> Result<Session, String> {
    let client_name = client
        .unwrap_or_else(|| "claude".to_string())
        .to_lowercase();
    if client_name != "claude" && client_name != "codex" {
        return Err(format!("Unsupported client '{}'", client_name));
    }

    println!("=== launch_claude_code called ===");
    println!(
        "client: {}, env_name: {}, perm_mode: {:?}, working_dir: {:?}, resume_session_id: {:?}",
        client_name, env_name, perm_mode, working_dir, resume_session_id
    );

    if client_name == "codex" {
        if perm_mode
            .as_ref()
            .is_some_and(|mode| !mode.trim().is_empty())
        {
            println!("Codex launch ignores permission mode");
        }
    }

    // Generate session ID first (needed for launch tracking + proxy route binding)
    let session_id = generate_session_id();

    // Build environment variables map
    let mut env_vars: HashMap<String, String> = HashMap::new();
    let mut claude_upstream_base_url: Option<String> = None;
    if client_name == "claude" {
        let resolved = resolve_claude_env(&env_name)?;
        claude_upstream_base_url = resolved.upstream_base_url;
        env_vars = resolved.env_vars;
    }

    if proxy_state.is_enabled() {
        let upstream_base_url = if client_name == "claude" {
            claude_upstream_base_url
                .clone()
                .unwrap_or_else(|| "https://api.anthropic.com".to_string())
        } else {
            proxy_state.codex_upstream_base_url()
        };

        let proxy_route_base_url = proxy_state
            .register_route(RegisterRouteRequest {
                session_id: session_id.clone(),
                client: client_name.clone(),
                env_name: env_name.clone(),
                upstream_base_url,
            })
            .await?;

        if client_name == "claude" {
            env_vars.insert("ANTHROPIC_BASE_URL".to_string(), proxy_route_base_url);
        } else {
            env_vars.insert("OPENAI_BASE_URL".to_string(), proxy_route_base_url);
        }
    }

    let work_dir = working_dir.clone().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "~".to_string())
    });

    let perm = if client_name == "claude" {
        perm_mode.clone().unwrap_or_else(|| "dev".to_string())
    } else {
        "n/a".to_string()
    };

    println!("Session ID: {}", session_id);
    println!("Work dir: {}", work_dir);
    println!("Env vars count: {}", env_vars.len());

    // Get preferred terminal and launch
    let preferred_terminal = terminal::get_preferred_terminal();
    println!("Preferred terminal: {:?}", preferred_terminal);

    let launch_result = terminal::launch_in_terminal(
        preferred_terminal,
        env_vars,
        &work_dir,
        &session_id,
        &env_name,
        perm_mode.as_deref(),
        resume_session_id.as_deref(),
        &client_name,
    );

    let (window_id, iterm_session_id) = match &launch_result {
        Ok((wid, sid)) => {
            println!(
                "Terminal launch SUCCESS, window_id: {:?}, iterm_session_id: {:?}",
                wid, sid
            );
            (wid.clone(), sid.clone())
        }
        Err(e) => {
            println!("Terminal launch FAILED: {}", e);
            proxy_state.remove_session_routes(&session_id);
            return Err(e.clone());
        }
    };

    // Determine terminal type string for session metadata
    let terminal_type_str = match preferred_terminal {
        TerminalType::ITerm2 => "iterm2",
        TerminalType::TerminalApp => "terminalapp",
    };

    let session = Session {
        id: session_id,
        pid: None, // Terminal-launched sessions don't have direct PID access
        client: client_name,
        env_name,
        perm_mode: perm,
        working_dir: work_dir,
        start_time: chrono::Utc::now().to_rfc3339(),
        status: "running".to_string(),
        terminal_type: Some(terminal_type_str.to_string()),
        window_id,        // Store window ID for later operations
        iterm_session_id, // Store iTerm2 session unique ID for arrange
        tmux_target: None,
    };

    state.add_session(session.clone());
    Ok(session)
}

fn resolve_headless_working_dir(working_dir: Option<String>) -> String {
    working_dir
        .filter(|dir| !dir.trim().is_empty())
        .or_else(config::get_default_working_dir)
        .or_else(|| dirs::home_dir().map(|path| path.to_string_lossy().to_string()))
        .unwrap_or_else(|| ".".to_string())
}

// ============================================
// Headless Runtime Commands (`claude -p` / stream-json)
// ============================================

#[tauri::command]
async fn create_managed_session(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
    resume_session_id: Option<String>,
    initial_prompt: Option<String>,
) -> Result<HeadlessSessionSummary, String> {
    let resolved = resolve_claude_env(&env_name)?;
    let effective_working_dir = resolve_headless_working_dir(working_dir);
    let resume_target = resume_session_id.clone();

    let summary = runtime_state.create_session(
        app,
        HeadlessSessionOptions {
            env_name: resolved.env_name,
            perm_mode: perm_mode.unwrap_or_else(|| "dev".to_string()),
            working_dir: effective_working_dir,
            resume_session_id,
            initial_prompt,
            max_budget_usd: None,
            allowed_tools: Vec::new(),
            disallowed_tools: Vec::new(),
            env_vars: resolved.env_vars,
            source: HeadlessSessionSource::Desktop,
        },
    )?;

    if let Some(session_id) = resume_target.as_deref() {
        if let Err(error) = clear_runtime_recovery_candidates_by_claude_session_id(session_id) {
            eprintln!(
                "Failed to clear recovery candidate for resumed headless session {}: {}",
                session_id, error
            );
        }
    }

    Ok(summary)
}

#[tauri::command]
fn list_managed_sessions(
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
) -> Vec<HeadlessSessionSummary> {
    runtime_state.list_sessions()
}

#[tauri::command]
fn send_to_managed_session(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
    text: String,
) -> Result<(), String> {
    runtime_state.send_user_message(&app, &runtime_id, &text)
}

#[tauri::command]
fn get_managed_session_events(
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
    since_seq: Option<u64>,
) -> Result<event_bus::ReplayBatch, String> {
    runtime_state.replay_events(&runtime_id, since_seq)
}

#[tauri::command]
fn stop_managed_session(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
) -> Result<(), String> {
    runtime_state.stop_session(&app, &runtime_id)
}

#[tauri::command]
fn remove_managed_session(
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
) -> Result<(), String> {
    runtime_state.remove_session(&runtime_id)
}

#[tauri::command]
async fn create_headless_session(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
    resume_session_id: Option<String>,
    initial_prompt: Option<String>,
) -> Result<HeadlessSessionSummary, String> {
    create_managed_session(
        app,
        runtime_state,
        env_name,
        perm_mode,
        working_dir,
        resume_session_id,
        initial_prompt,
    )
    .await
}

#[tauri::command]
fn list_headless_sessions(
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
) -> Vec<HeadlessSessionSummary> {
    list_managed_sessions(runtime_state)
}

#[tauri::command]
fn send_to_headless_session(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
    text: String,
) -> Result<(), String> {
    send_to_managed_session(app, runtime_state, runtime_id, text)
}

#[tauri::command]
fn get_headless_session_events(
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
    since_seq: Option<u64>,
) -> Result<event_bus::ReplayBatch, String> {
    get_managed_session_events(runtime_state, runtime_id, since_seq)
}

#[tauri::command]
fn stop_headless_session(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
) -> Result<(), String> {
    stop_managed_session(app, runtime_state, runtime_id)
}

#[tauri::command]
fn remove_headless_session(
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    runtime_id: String,
) -> Result<(), String> {
    remove_managed_session(runtime_state, runtime_id)
}

#[tauri::command]
fn respond_headless_permission(
    app: tauri::AppHandle,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    request_id: String,
    approved: bool,
    responder: Option<String>,
) -> Result<(), String> {
    runtime_state.respond_to_permission(
        &app,
        &request_id,
        approved,
        responder.as_deref().unwrap_or("desktop"),
    )
}

#[tauri::command]
fn list_unified_sessions(
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
) -> Vec<UnifiedSessionInfo> {
    unified_state.list_sessions()
}

#[tauri::command]
fn get_session_events(
    app: tauri::AppHandle,
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
    runtime_id: String,
    since_seq: Option<u64>,
) -> Result<event_bus::ReplayBatch, String> {
    unified_state.get_session_events(&app, &runtime_id, since_seq)
}

#[tauri::command]
fn send_session_input(
    app: tauri::AppHandle,
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
    runtime_id: String,
    input: RuntimeInput,
) -> Result<(), String> {
    unified_state.send_input(&app, &runtime_id, input)
}

#[tauri::command]
fn stop_unified_session(
    app: tauri::AppHandle,
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
    runtime_id: String,
) -> Result<(), String> {
    unified_state.stop_session(&app, &runtime_id)
}

#[tauri::command]
fn attach_channel(
    app: tauri::AppHandle,
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
    runtime_id: String,
    channel: ChannelKind,
) -> Result<(), String> {
    match channel {
        ChannelKind::DesktopUi => unified_state.attach_desktop_channel(&app, &runtime_id),
        channel if channel.is_managed_remote() => {
            let platform = channel
                .remote_peer_ref()
                .map(|remote| remote.platform.display_name())
                .unwrap_or("Remote");
            Err(format!(
                "{platform} channels are managed internally by the {platform} bridge"
            ))
        }
        other => Err(format!("Unsupported channel attachment for {:?}", other)),
    }
}

#[tauri::command]
fn detach_channel(
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
    runtime_id: String,
    channel: ChannelKind,
) -> Result<(), String> {
    unified_state.detach_channel(&runtime_id, &channel)
}

#[tauri::command]
fn debug_compare_sessions(
    unified_state: State<'_, Arc<UnifiedSessionManager>>,
) -> UnifiedSessionDebugComparison {
    unified_state.debug_compare_sessions()
}

#[tauri::command]
async fn create_interactive_session(
    app: tauri::AppHandle,
    state: State<'_, Arc<SessionManager>>,
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    proxy_state: State<'_, Arc<ProxyDebugManager>>,
    env_name: String,
    perm_mode: Option<String>,
    working_dir: Option<String>,
    resume_session_id: Option<String>,
    client: Option<String>,
) -> Result<Session, String> {
    let client_name = client
        .unwrap_or_else(|| "claude".to_string())
        .to_lowercase();
    if client_name != "claude" && client_name != "codex" {
        return Err(format!("Unsupported client '{}'", client_name));
    }

    if client_name == "codex"
        && !resume_session_id
            .as_ref()
            .is_some_and(|value| value.trim().is_empty())
        && resume_session_id.is_some()
    {
        let session_id = generate_session_id();
        let effective_working_dir = resolve_headless_working_dir(working_dir);
        let mut env_vars = HashMap::new();
        let resume_target = resume_session_id.clone();

        if proxy_state.is_enabled() {
            let proxy_route_base_url = proxy_state
                .register_route(RegisterRouteRequest {
                    session_id: session_id.clone(),
                    client: client_name.clone(),
                    env_name: env_name.clone(),
                    upstream_base_url: proxy_state.codex_upstream_base_url(),
                })
                .await?;
            env_vars.insert("OPENAI_BASE_URL".to_string(), proxy_route_base_url);
        }

        let session_manager = state.inner().clone();
        let create_result = interactive_state.create_session(
            app,
            session_manager,
            InteractiveSessionOptions {
                session_id: session_id.clone(),
                client: client_name.clone(),
                env_name,
                perm_mode: "n/a".to_string(),
                working_dir: effective_working_dir,
                resume_session_id,
                env_vars,
            },
        );

        if create_result.is_err() {
            proxy_state.remove_session_routes(&session_id);
        }

        let session = create_result?;
        if let Some(session_id) = resume_target.as_deref() {
            if let Err(error) = clear_runtime_recovery_candidates_by_claude_session_id(session_id) {
                eprintln!(
                    "Failed to clear recovery candidate for resumed interactive session {}: {}",
                    session_id, error
                );
            }
        }

        return Ok(session);
    }

    if client_name == "codex" {
        return launch_claude_code(
            state,
            proxy_state,
            env_name,
            perm_mode,
            working_dir,
            resume_session_id,
            Some(client_name),
        )
        .await;
    }

    let session_id = generate_session_id();
    let resolved = resolve_claude_env(&env_name)?;
    let effective_working_dir = resolve_headless_working_dir(working_dir);
    let effective_perm_mode = perm_mode.unwrap_or_else(|| "dev".to_string());
    let mut env_vars = resolved.env_vars;
    let resume_target = resume_session_id.clone();

    if proxy_state.is_enabled() {
        let upstream_base_url = resolved
            .upstream_base_url
            .clone()
            .unwrap_or_else(|| "https://api.anthropic.com".to_string());
        let proxy_route_base_url = proxy_state
            .register_route(RegisterRouteRequest {
                session_id: session_id.clone(),
                client: client_name.clone(),
                env_name: resolved.env_name.clone(),
                upstream_base_url,
            })
            .await?;
        env_vars.insert("ANTHROPIC_BASE_URL".to_string(), proxy_route_base_url);
    }

    let session_manager = state.inner().clone();
    let create_result = interactive_state.create_session(
        app,
        session_manager,
        InteractiveSessionOptions {
            session_id: session_id.clone(),
            client: client_name.clone(),
            env_name: resolved.env_name,
            perm_mode: effective_perm_mode,
            working_dir: effective_working_dir,
            resume_session_id,
            env_vars,
        },
    );

    if create_result.is_err() {
        proxy_state.remove_session_routes(&session_id);
    }

    let session = create_result?;
    if let Some(session_id) = resume_target.as_deref() {
        if let Err(error) = clear_runtime_recovery_candidates_by_claude_session_id(session_id) {
            eprintln!(
                "Failed to clear recovery candidate for resumed interactive session {}: {}",
                session_id, error
            );
        }
    }

    Ok(session)
}

#[tauri::command]
fn list_runtime_recovery_candidates() -> Result<Vec<RuntimeRecoveryCandidate>, String> {
    list_runtime_recovery_candidates_entries().map_err(|error| error.to_string())
}

#[tauri::command]
fn dismiss_runtime_recovery_candidate(runtime_id: String) -> Result<(), String> {
    dismiss_runtime_recovery_candidate_entry(&runtime_id).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_interactive_sessions(state: State<'_, Arc<SessionManager>>) -> Vec<Session> {
    list_sessions(state)
}

fn session_terminal_window_type(session: &Session) -> Option<TerminalType> {
    match session.terminal_type.as_deref() {
        Some("iterm2") => Some(TerminalType::ITerm2),
        Some("terminalapp") => Some(TerminalType::TerminalApp),
        _ => None,
    }
}

fn session_has_window_control(session: &Session) -> bool {
    session_terminal_window_type(session).is_some()
        && session
            .window_id
            .as_ref()
            .is_some_and(|value| !value.trim().is_empty())
}

#[tauri::command]
fn stop_interactive_session(
    state: State<'_, Arc<SessionManager>>,
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    proxy_state: State<'_, Arc<ProxyDebugManager>>,
    session_id: String,
) -> Result<(), String> {
    if state
        .get_session(&session_id)
        .is_some_and(|session| session.is_tmux_backed())
    {
        interactive_state.stop_session(&session_id)?;
        state.update_session_status(&session_id, "stopped");
        proxy_state.remove_session_routes(&session_id);
        return Ok(());
    }

    stop_session(state, proxy_state, session_id)
}

#[tauri::command]
fn focus_interactive_session(
    state: State<'_, Arc<SessionManager>>,
    session_id: String,
) -> Result<(), String> {
    if let Some(session) = state.get_session(&session_id) {
        if session.is_tmux_backed() {
            if session_has_window_control(&session) {
                return focus_session(state, session_id);
            }
            return Ok(());
        }
    }

    focus_session(state, session_id)
}

#[tauri::command]
fn open_interactive_session_in_terminal(
    state: State<'_, Arc<SessionManager>>,
    session_id: String,
    terminal_type: Option<TmuxAttachTerminalType>,
) -> Result<(), String> {
    let session = state
        .get_session(&session_id)
        .ok_or_else(|| format!("Session {} not found", session_id))?;

    if !session.is_tmux_backed() {
        return Err(
            "Only tmux-backed interactive sessions can be opened in a new terminal".to_string(),
        );
    }

    let target = session
        .resolved_tmux_target()
        .map(str::to_string)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| format!("Session {} does not have a tmux target", session_id))?;

    let attach_terminal =
        terminal_type.unwrap_or_else(|| match terminal::get_preferred_terminal() {
            TerminalType::TerminalApp => TmuxAttachTerminalType::TerminalApp,
            TerminalType::ITerm2 => TmuxAttachTerminalType::ITerm2,
        });

    let (window_id, iterm_session_id) =
        terminal::open_tmux_target_in_attach_terminal(attach_terminal, &target)?;

    match attach_terminal {
        TmuxAttachTerminalType::TerminalApp => {
            state.attach_tmux_terminal(&session_id, "terminalapp", window_id.as_deref(), None);
        }
        TmuxAttachTerminalType::ITerm2 => {
            state.attach_tmux_terminal(
                &session_id,
                "iterm2",
                window_id.as_deref(),
                iterm_session_id.as_deref(),
            );
        }
        TmuxAttachTerminalType::Ghostty => {}
    }

    Ok(())
}

#[tauri::command]
fn close_interactive_session(
    state: State<'_, Arc<SessionManager>>,
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    proxy_state: State<'_, Arc<ProxyDebugManager>>,
    session_id: String,
) -> Result<(), String> {
    if let Some(session) = state.get_session(&session_id) {
        if session.is_tmux_backed() {
            if session_has_window_control(&session) {
                if let (Some(term_type), Some(window_id)) = (
                    session_terminal_window_type(&session),
                    session.window_id.as_deref(),
                ) {
                    let _ = terminal::close_terminal_session(term_type, window_id);
                }
            }

            let _ = interactive_state.stop_session(&session_id);
            interactive_state.remove_session(&session_id);
            cleanup_exit_file(&session_id);
            state.remove_session(&session_id);
            proxy_state.remove_session_routes(&session_id);
            return Ok(());
        }
    }

    close_session(state, proxy_state, session_id)
}

#[tauri::command]
fn minimize_interactive_session(
    state: State<'_, Arc<SessionManager>>,
    session_id: String,
) -> Result<(), String> {
    if let Some(session) = state.get_session(&session_id) {
        if session.is_tmux_backed() {
            if session_has_window_control(&session) {
                return minimize_session(state, session_id);
            }
            return Ok(());
        }
    }

    minimize_session(state, session_id)
}

#[tauri::command]
fn write_interactive_input(
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    interactive_state.write_input(&session_id, &data)
}

#[tauri::command]
fn send_interactive_input(
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    session_id: String,
    text: String,
) -> Result<(), String> {
    interactive_state.send_message(&session_id, &text)
}

#[tauri::command]
fn send_interactive_approval(
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    session_id: String,
    approved: bool,
) -> Result<(), String> {
    interactive_state.send_approval(&session_id, approved)
}

#[tauri::command]
fn get_interactive_session_output(
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    session_id: String,
    since_seq: Option<u64>,
) -> Result<InteractiveReplayBatch, String> {
    interactive_state.replay_output(&session_id, since_seq)
}

#[tauri::command]
fn get_interactive_session_events(
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    session_id: String,
    since_seq: Option<u64>,
) -> Result<event_bus::ReplayBatch, String> {
    interactive_state.replay_events(&session_id, since_seq)
}

#[tauri::command]
fn get_interactive_state(
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
    session_id: String,
) -> Result<ClaudeTerminalState, String> {
    interactive_state.get_state(&session_id)
}

#[tauri::command]
fn resize_interactive_session(
    state: State<'_, Arc<SessionManager>>,
    session_id: String,
    _cols: u16,
    _rows: u16,
) -> Result<(), String> {
    let _ = state
        .get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;
    Ok(())
}

#[tauri::command]
fn list_sessions(state: State<Arc<SessionManager>>) -> Vec<Session> {
    state.list_sessions()
}

#[tauri::command]
fn stop_session(
    state: State<Arc<SessionManager>>,
    proxy_state: State<Arc<ProxyDebugManager>>,
    session_id: String,
) -> Result<(), String> {
    let session = state
        .get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    if let Some(pid) = session.pid {
        #[cfg(unix)]
        {
            Command::new("kill")
                .arg("-15")
                .arg(pid.to_string())
                .output()
                .map_err(|e| format!("Failed to stop process: {}", e))?;
        }

        #[cfg(windows)]
        {
            Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output()
                .map_err(|e| format!("Failed to stop process: {}", e))?;
        }
    }

    state.update_session_status(&session_id, "stopped");
    proxy_state.remove_session_routes(&session_id);
    Ok(())
}

#[tauri::command]
fn remove_session(
    state: State<Arc<SessionManager>>,
    interactive_state: State<Arc<InteractiveRuntimeManager>>,
    proxy_state: State<Arc<ProxyDebugManager>>,
    session_id: String,
) {
    if state
        .get_session(&session_id)
        .is_some_and(|session| session.is_tmux_backed())
    {
        interactive_state.remove_session(&session_id);
    }

    // Clean up exit file when removing session
    cleanup_exit_file(&session_id);
    state.remove_session(&session_id);
    proxy_state.remove_session_routes(&session_id);
}

#[tauri::command]
fn focus_session(state: State<Arc<SessionManager>>, session_id: String) -> Result<(), String> {
    let session = state
        .get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    let terminal_type = session
        .terminal_type
        .as_ref()
        .ok_or("Session has no terminal type")?;
    let window_id = session
        .window_id
        .as_ref()
        .ok_or("Session has no window ID")?;

    let term_type = match terminal_type.as_str() {
        "iterm2" => TerminalType::ITerm2,
        "terminalapp" => TerminalType::TerminalApp,
        _ => return Err(format!("Unknown terminal type: {}", terminal_type)),
    };

    terminal::focus_terminal_window(term_type, window_id)
}

#[tauri::command]
fn close_session(
    state: State<Arc<SessionManager>>,
    proxy_state: State<Arc<ProxyDebugManager>>,
    session_id: String,
) -> Result<(), String> {
    let session = state
        .get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    let terminal_type = session
        .terminal_type
        .as_ref()
        .ok_or("Session has no terminal type")?;
    let window_id = session
        .window_id
        .as_ref()
        .ok_or("Session has no window ID")?;

    let term_type = match terminal_type.as_str() {
        "iterm2" => TerminalType::ITerm2,
        "terminalapp" => TerminalType::TerminalApp,
        _ => return Err(format!("Unknown terminal type: {}", terminal_type)),
    };

    terminal::close_terminal_session(term_type, window_id)?;

    // Clean up and remove session after closing
    cleanup_exit_file(&session_id);
    state.remove_session(&session_id);
    proxy_state.remove_session_routes(&session_id);
    Ok(())
}

#[tauri::command]
fn minimize_session(state: State<Arc<SessionManager>>, session_id: String) -> Result<(), String> {
    let session = state
        .get_session(&session_id)
        .ok_or_else(|| format!("Session not found: {}", session_id))?;

    let terminal_type = session
        .terminal_type
        .as_ref()
        .ok_or("Session has no terminal type")?;
    let window_id = session
        .window_id
        .as_ref()
        .ok_or("Session has no window ID")?;

    let term_type = match terminal_type.as_str() {
        "iterm2" => TerminalType::ITerm2,
        "terminalapp" => TerminalType::TerminalApp,
        _ => return Err(format!("Unknown terminal type: {}", terminal_type)),
    };

    terminal::minimize_terminal_window(term_type, window_id)
}

// ============================================
// Arrange Windows Commands
// ============================================

#[derive(Debug, serde::Deserialize)]
struct ArrangeRequest {
    session_ids: Vec<String>,
    layout: ArrangeLayout,
}

#[tauri::command]
fn arrange_sessions(
    state: State<Arc<SessionManager>>,
    request: ArrangeRequest,
) -> Result<String, String> {
    let sessions = state.list_sessions();

    // Collect the requested sessions, verify they're running
    let mut arrange_infos: Vec<ArrangeSessionInfo> = Vec::new();
    let mut terminal_type: Option<TerminalType> = None;

    for sid in &request.session_ids {
        let session = sessions
            .iter()
            .find(|s| &s.id == sid)
            .ok_or_else(|| format!("Session not found: {}", sid))?;

        if session.status != "running" {
            return Err(format!("Session {} is not running", sid));
        }

        let term_type_str = session
            .terminal_type
            .as_ref()
            .ok_or_else(|| format!("Session {} has no terminal type", sid))?;
        let term_type = match term_type_str.as_str() {
            "iterm2" => TerminalType::ITerm2,
            "terminalapp" => TerminalType::TerminalApp,
            _ => return Err(format!("Unknown terminal type: {}", term_type_str)),
        };

        // All sessions must be the same terminal type
        if let Some(ref expected) = terminal_type {
            if *expected != term_type {
                return Err("Cannot arrange sessions from different terminal types".to_string());
            }
        } else {
            terminal_type = Some(term_type);
        }

        let window_id = session
            .window_id
            .clone()
            .ok_or_else(|| format!("Session {} has no window ID", sid))?;

        // For iTerm2, try to get session ID (backfill if missing)
        let iterm_session_id = if term_type == TerminalType::ITerm2 {
            match &session.iterm_session_id {
                Some(id) => Some(id.clone()),
                None => {
                    // Try to backfill from iTerm2
                    match terminal::get_iterm_session_id(&window_id) {
                        Ok(id) => {
                            // Update the session manager with the backfilled ID
                            state.update_session_iterm_id(sid, &id);
                            Some(id)
                        }
                        Err(e) => {
                            eprintln!(
                                "Warning: could not backfill iTerm2 session ID for {}: {}",
                                sid, e
                            );
                            None
                        }
                    }
                }
            }
        } else {
            None
        };

        arrange_infos.push(ArrangeSessionInfo {
            window_id,
            iterm_session_id,
        });
    }

    let term = terminal_type.ok_or("No sessions to arrange")?;

    // Perform the arrangement
    let result = terminal::arrange_sessions(term, &arrange_infos, &request.layout)?;

    // For iTerm2, update all sessions with the new shared window ID
    if term == TerminalType::ITerm2 && result != "arranged" {
        for sid in &request.session_ids {
            state.update_session_window_id(sid, &result);
        }
    }

    Ok(result)
}

#[tauri::command]
fn check_arrange_support() -> Result<bool, String> {
    terminal::check_arrange_support()
}

// ============================================
// Directory & VS Code Sync Commands
// ======================================================

#[tauri::command]
async fn open_directory_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog().file().pick_folder(move |folder_path| {
        let _ = tx.send(folder_path.map(|p| p.to_string()));
    });

    rx.recv().map_err(|e| format!("Dialog error: {}", e))
}

#[tauri::command]
fn sync_vscode_projects() -> Result<Vec<VSCodeProject>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let storage_path =
        home.join("Library/Application Support/Code/User/globalStorage/storage.json");

    if !storage_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read VS Code storage: {}", e))?;

    // Parse the JSON
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse VS Code storage: {}", e))?;

    let mut projects = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Helper function to recursively extract openRecentFolder items
    fn extract_recent_folders(
        value: &serde_json::Value,
        projects: &mut Vec<VSCodeProject>,
        seen_paths: &mut std::collections::HashSet<String>,
        now: &str,
    ) {
        match value {
            serde_json::Value::Object(map) => {
                // Check if this is an openRecentFolder entry with uri.path
                if let Some(id) = map.get("id").and_then(|v| v.as_str()) {
                    if id == "openRecentFolder" {
                        if let Some(path) = map
                            .get("uri")
                            .and_then(|u| u.get("path"))
                            .and_then(|p| p.as_str())
                        {
                            if !seen_paths.contains(path) {
                                seen_paths.insert(path.to_string());
                                projects.push(VSCodeProject {
                                    path: path.to_string(),
                                    synced_at: now.to_string(),
                                });
                            }
                        }
                    }
                }
                // Recurse into all values
                for v in map.values() {
                    extract_recent_folders(v, projects, seen_paths, now);
                }
            }
            serde_json::Value::Array(arr) => {
                for item in arr {
                    extract_recent_folders(item, projects, seen_paths, now);
                }
            }
            _ => {}
        }
    }

    extract_recent_folders(&json, &mut projects, &mut seen_paths, &now);

    // Update app config with synced projects
    let mut cfg = config::read_app_config()?;
    cfg.vscode_projects = projects.clone();
    config::write_app_config(&cfg)?;

    Ok(projects)
}

#[tauri::command]
fn sync_jetbrains_projects() -> Result<Vec<JetBrainsProject>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let jetbrains_dir = home.join("Library/Application Support/JetBrains");

    if !jetbrains_dir.exists() {
        return Ok(vec![]);
    }

    let mut projects = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    let now = chrono::Utc::now().to_rfc3339();

    // Map directory prefixes to IDE names
    let ide_prefixes = [
        ("WebStorm", "WebStorm"),
        ("IntelliJIdea", "IntelliJ IDEA"),
        ("PyCharm", "PyCharm"),
        ("GoLand", "GoLand"),
        ("RustRover", "RustRover"),
        ("CLion", "CLion"),
        ("PhpStorm", "PhpStorm"),
        ("Rider", "Rider"),
        ("DataGrip", "DataGrip"),
        ("RubyMine", "RubyMine"),
        ("AppCode", "AppCode"),
        ("AndroidStudio", "Android Studio"),
    ];

    // Iterate through JetBrains directories
    if let Ok(entries) = std::fs::read_dir(&jetbrains_dir) {
        for entry in entries.flatten() {
            let dir_name = entry.file_name().to_string_lossy().to_string();

            // Find matching IDE
            let ide_name = ide_prefixes
                .iter()
                .find(|(prefix, _)| dir_name.starts_with(prefix))
                .map(|(_, name)| *name);

            if let Some(ide) = ide_name {
                let recent_path = entry.path().join("options/recentProjects.xml");

                if recent_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&recent_path) {
                        // Parse XML to extract project paths
                        extract_jetbrains_projects(
                            &content,
                            ide,
                            &mut projects,
                            &mut seen_paths,
                            &now,
                        );
                    }
                }
            }
        }
    }

    // Update app config with synced projects
    let mut cfg = config::read_app_config()?;
    cfg.jetbrains_projects = projects.clone();
    config::write_app_config(&cfg)?;

    Ok(projects)
}

/// Extract project paths from JetBrains recentProjects.xml
fn extract_jetbrains_projects(
    xml_content: &str,
    ide: &str,
    projects: &mut Vec<JetBrainsProject>,
    seen_paths: &mut std::collections::HashSet<String>,
    now: &str,
) {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml_content);

    let mut buf = Vec::new();
    let mut in_recent_project_manager = false;
    let mut in_additional_info = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let name = e.name();
                let name_str = std::str::from_utf8(name.as_ref()).unwrap_or("");

                if name_str == "component" {
                    // Check if this is RecentProjectsManager
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"name" {
                            let value = String::from_utf8_lossy(&attr.value);
                            if value == "RecentProjectsManager" {
                                in_recent_project_manager = true;
                            }
                        }
                    }
                } else if name_str == "map" && in_recent_project_manager {
                    // We're in the additionalInfo map
                    in_additional_info = true;
                } else if name_str == "entry" && in_additional_info {
                    // Extract project path from key attribute
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"key" {
                            let value = String::from_utf8_lossy(&attr.value);
                            // Path format: $USER_HOME$/path/to/project
                            let path = value.replace(
                                "$USER_HOME$",
                                &dirs::home_dir()
                                    .map(|p| p.to_string_lossy().to_string())
                                    .unwrap_or_else(|| "~".to_string()),
                            );

                            if !seen_paths.contains(&path) && std::path::Path::new(&path).exists() {
                                seen_paths.insert(path.clone());
                                projects.push(JetBrainsProject {
                                    path,
                                    ide: ide.to_string(),
                                    synced_at: now.to_string(),
                                });
                            }
                        }
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let name_bytes = e.name();
                let name = std::str::from_utf8(name_bytes.as_ref()).unwrap_or("");
                if name == "component" {
                    in_recent_project_manager = false;
                    in_additional_info = false;
                } else if name == "map" {
                    in_additional_info = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }
}

// ============================================
// Remote Environment Loading Commands
// ============================================

#[tauri::command]
fn check_ccem_installed() -> bool {
    terminal::is_ccem_installed()
}

#[tauri::command]
fn check_claude_installed() -> bool {
    terminal::is_claude_installed()
}

#[tauri::command]
fn check_codex_installed() -> bool {
    terminal::is_codex_installed()
}

#[tauri::command]
fn check_tmux_installed() -> bool {
    tmux::TmuxManager::check_tmux_installed().is_ok()
}

#[derive(Debug, serde::Deserialize)]
struct RemoteResponse {
    encrypted: String,
}

#[derive(Debug, serde::Deserialize)]
struct RemoteEnvConfig {
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    base_url: Option<String>,
    #[serde(rename = "ANTHROPIC_AUTH_TOKEN")]
    auth_token: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_DEFAULT_OPUS_MODEL")]
    default_opus_model: Option<String>,
    #[serde(rename = "ANTHROPIC_DEFAULT_SONNET_MODEL")]
    default_sonnet_model: Option<String>,
    #[serde(rename = "ANTHROPIC_DEFAULT_HAIKU_MODEL")]
    default_haiku_model: Option<String>,
    #[serde(rename = "ANTHROPIC_MODEL")]
    model: Option<String>,
    #[serde(rename = "ANTHROPIC_SMALL_FAST_MODEL")]
    small_fast_model: Option<String>,
    #[serde(rename = "CLAUDE_CODE_SUBAGENT_MODEL")]
    subagent_model: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
struct RemoteEnvironments {
    environments: HashMap<String, RemoteEnvConfig>,
}

#[tauri::command]
fn load_from_remote(url: String, secret: String) -> Result<LoadResult, String> {
    // Path A: try CLI if installed
    if let Some(ccem_path) = terminal::resolve_ccem_path() {
        let output = Command::new(&ccem_path)
            .args(["load", &url, "--secret", &secret, "--json"])
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                // CLI succeeded — parse JSON output to get imported environments
                let stdout = String::from_utf8_lossy(&out.stdout);

                // 查找 JSON 输出（跳过前面的日志行）
                if let Some(json_line) = stdout.lines().find(|line| line.trim().starts_with('{')) {
                    if let Ok(result) = serde_json::from_str::<LoadResult>(json_line) {
                        return Ok(result);
                    }
                }

                // 如果无法解析 JSON，返回错误
                return Err("Failed to parse CLI output".to_string());
            }
            // CLI failed — fall through to native path
        }
    }

    // Path B: native Rust implementation
    let client = reqwest::blocking::Client::new();
    let response = client
        .get(&url)
        .header("X-CCEM-Key", &secret)
        .send()
        .map_err(|e| format!("Network error: {}", e))?;

    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("Unauthorized: invalid credentials".to_string());
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("Rate limited: please try again later".to_string());
    }
    if !status.is_success() {
        return Err(format!("Server returned HTTP {}", status.as_u16()));
    }

    let remote_resp: RemoteResponse = response
        .json()
        .map_err(|e| format!("Invalid server response: {}", e))?;

    let decrypted = crypto::decrypt_remote(&remote_resp.encrypted, &secret)?;

    let remote_envs: RemoteEnvironments =
        serde_json::from_str(&decrypted).map_err(|e| format!("Invalid environment data: {}", e))?;

    let mut cfg = config::read_config()?;
    let mut loaded: Vec<LoadedEnv> = Vec::new();

    for (orig_name, env) in remote_envs.environments {
        // Generate unique name if duplicate
        let mut final_name = orig_name.clone();
        if cfg.registries.contains_key(&final_name) {
            final_name = format!("{}-remote", orig_name);
            let mut counter = 2;
            while cfg.registries.contains_key(&final_name) {
                final_name = format!("{}-remote-{}", orig_name, counter);
                counter += 1;
            }
        }

        let renamed = final_name != orig_name;

        let has_tier_defaults = env.default_opus_model.is_some()
            || env.default_sonnet_model.is_some()
            || env.default_haiku_model.is_some();
        let default_opus_model = env.default_opus_model.or_else(|| {
            if has_tier_defaults {
                None
            } else {
                env.model.clone()
            }
        });
        let default_sonnet_model = env
            .default_sonnet_model
            .or_else(|| default_opus_model.clone())
            .or_else(|| {
                if has_tier_defaults {
                    None
                } else {
                    env.model.clone()
                }
            });
        let default_haiku_model = env.default_haiku_model.or(env.small_fast_model);
        let runtime_model = Some(if has_tier_defaults {
            env.model.unwrap_or_else(|| "opus".to_string())
        } else {
            "opus".to_string()
        });

        let env_config = create_env_with_encrypted_key(
            env.base_url,
            env.auth_token.or(env.api_key),
            default_opus_model,
            default_sonnet_model,
            default_haiku_model,
            runtime_model,
            env.subagent_model,
        );

        cfg.registries.insert(final_name.clone(), env_config);
        loaded.push(LoadedEnv {
            name: final_name,
            original_name: orig_name,
            renamed,
        });
    }

    config::write_config(&cfg)?;

    Ok(LoadResult {
        count: loaded.len(),
        environments: loaded,
    })
}

#[tauri::command]
fn get_default_working_dir() -> Result<Option<String>, String> {
    let cfg = config::read_app_config()?;
    Ok(cfg.default_working_dir)
}

#[tauri::command]
fn set_default_working_dir(path: Option<String>) -> Result<(), String> {
    let mut cfg = config::read_app_config()?;
    cfg.default_working_dir = path;
    config::write_app_config(&cfg)
}

// ============================================
// Settings Commands
// ============================================

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<DesktopSettings, String> {
    let mut settings = config::read_settings()?;
    // Merge defaultMode from config.json (source of truth for permission mode)
    let cfg = config::read_config()?;
    settings.default_mode = cfg.default_mode;
    // Reflect actual system autostart state
    {
        use tauri_plugin_autostart::ManagerExt;
        let autostart = app.autolaunch();
        if let Ok(enabled) = autostart.is_enabled() {
            settings.auto_start = enabled;
        }
    }
    Ok(settings)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: DesktopSettings) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();

    // Save defaultMode to config.json (shared with CLI)
    match config::read_config() {
        Ok(mut cfg) => {
            cfg.default_mode = settings.default_mode.clone();
            if let Err(e) = config::write_config(&cfg) {
                errors.push(format!("config.json: {}", e));
            }
        }
        Err(e) => errors.push(format!("read config: {}", e)),
    }

    // Sync autostart with system
    {
        use tauri_plugin_autostart::ManagerExt;
        let autostart = app.autolaunch();
        let result = if settings.auto_start {
            autostart.enable()
        } else {
            autostart.disable()
        };
        if let Err(e) = result {
            errors.push(format!("autostart: {}", e));
        }
    }

    // Save desktop-specific settings to settings.json.
    // Merge fields that are not part of the Settings page payload to avoid resetting
    // proxy-debug config when users change unrelated options.
    let mut merged_settings = config::read_settings().unwrap_or_default();
    merged_settings.theme = settings.theme;
    merged_settings.auto_start = settings.auto_start;
    merged_settings.start_minimized = settings.start_minimized;
    merged_settings.close_to_tray = settings.close_to_tray;
    merged_settings.default_mode = settings.default_mode;
    merged_settings.performance_mode = settings.performance_mode;
    merged_settings.ai_enhanced = settings.ai_enhanced;
    merged_settings.ai_env_name = settings.ai_env_name;
    config::write_settings(&merged_settings)?;

    #[cfg(target_os = "macos")]
    {
        if let Some(main_window) = app.get_webview_window("main") {
            if let Err(error) = sync_macos_window_appearance(&main_window, &merged_settings) {
                errors.push(format!("window appearance: {}", error));
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!("Partial save failures: {}", errors.join("; ")))
    }
}

#[tauri::command]
fn get_telegram_settings() -> Result<TelegramSettings, String> {
    telegram::read_telegram_settings()
}

#[tauri::command]
fn get_weixin_settings() -> Result<WeixinSettings, String> {
    weixin::read_weixin_settings()
}

#[tauri::command]
async fn save_telegram_settings(
    telegram_state: State<'_, Arc<TelegramBridgeManager>>,
    settings: TelegramSettings,
) -> Result<(), String> {
    let manager = telegram_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let was_running = manager.status().running;
        let previous_settings = telegram::read_telegram_settings().ok();
        telegram::write_telegram_settings(&settings)?;
        manager.sync_settings(&settings);
        if was_running {
            telegram::reconcile_registered_commands(previous_settings.as_ref(), &settings)?;
        }
        Ok(())
    })
    .await
    .map_err(|error| format!("Failed to join save_telegram_settings task: {}", error))?
}

#[tauri::command]
async fn save_weixin_settings(
    weixin_state: State<'_, Arc<WeixinBridgeManager>>,
    settings: WeixinSettings,
) -> Result<(), String> {
    let manager = weixin_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        weixin::write_weixin_settings(&settings)?;
        manager.sync_settings(&settings);
        Ok(())
    })
    .await
    .map_err(|error| format!("Failed to join save_weixin_settings task: {}", error))?
}

#[tauri::command]
fn get_telegram_bridge_status(
    telegram_state: State<'_, Arc<TelegramBridgeManager>>,
) -> TelegramBridgeStatus {
    telegram_state.status()
}

#[tauri::command]
fn get_weixin_bridge_status(
    weixin_state: State<'_, Arc<WeixinBridgeManager>>,
) -> WeixinBridgeStatus {
    weixin_state.status()
}

#[tauri::command]
async fn start_telegram_bridge(
    app: tauri::AppHandle,
    telegram_state: State<'_, Arc<TelegramBridgeManager>>,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
    interactive_state: State<'_, Arc<InteractiveRuntimeManager>>,
) -> Result<TelegramBridgeStatus, String> {
    let manager = telegram_state.inner().clone();
    let runtime_manager = runtime_state.inner().clone();
    let interactive_manager = interactive_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        manager.start(app, runtime_manager, interactive_manager)
    })
    .await
    .map_err(|error| format!("Failed to join start_telegram_bridge task: {}", error))?
}

#[tauri::command]
async fn start_weixin_bridge(
    app: tauri::AppHandle,
    weixin_state: State<'_, Arc<WeixinBridgeManager>>,
    runtime_state: State<'_, Arc<HeadlessRuntimeManager>>,
) -> Result<WeixinBridgeStatus, String> {
    let manager = weixin_state.inner().clone();
    let runtime_manager = runtime_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.start(app, runtime_manager))
        .await
        .map_err(|error| format!("Failed to join start_weixin_bridge task: {}", error))?
}

#[tauri::command]
async fn stop_telegram_bridge(
    telegram_state: State<'_, Arc<TelegramBridgeManager>>,
) -> Result<TelegramBridgeStatus, String> {
    let manager = telegram_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.stop())
        .await
        .map_err(|error| format!("Failed to join stop_telegram_bridge task: {}", error))
}

#[tauri::command]
async fn stop_weixin_bridge(
    weixin_state: State<'_, Arc<WeixinBridgeManager>>,
) -> Result<WeixinBridgeStatus, String> {
    let manager = weixin_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.stop())
        .await
        .map_err(|error| format!("Failed to join stop_weixin_bridge task: {}", error))
}

#[tauri::command]
async fn start_weixin_login(
    weixin_state: State<'_, Arc<WeixinBridgeManager>>,
) -> Result<WeixinLoginSession, String> {
    let manager = weixin_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.start_login())
        .await
        .map_err(|error| format!("Failed to join start_weixin_login task: {}", error))?
}

#[tauri::command]
async fn poll_weixin_login(
    weixin_state: State<'_, Arc<WeixinBridgeManager>>,
    session_key: String,
) -> Result<WeixinLoginSession, String> {
    let manager = weixin_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.poll_login(&session_key))
        .await
        .map_err(|error| format!("Failed to join poll_weixin_login task: {}", error))?
}

#[tauri::command]
fn get_telegram_forum_topics(
    telegram_state: State<'_, Arc<TelegramBridgeManager>>,
) -> Result<Vec<TelegramForumTopic>, String> {
    telegram::get_known_forum_topics(telegram_state.inner())
}

#[tauri::command]
async fn bind_telegram_topic(
    telegram_state: State<'_, Arc<TelegramBridgeManager>>,
    project_dir: String,
    env_name: Option<String>,
    perm_mode: Option<String>,
    thread_id: Option<i64>,
    create_new_topic: bool,
) -> Result<TelegramTopicBinding, String> {
    let manager = telegram_state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        telegram::bind_topic_from_desktop(
            &manager,
            project_dir,
            env_name,
            perm_mode,
            thread_id,
            create_new_topic,
        )
    })
    .await
    .map_err(|error| format!("Failed to join bind_telegram_topic task: {}", error))?
}

#[tauri::command]
fn get_proxy_debug_state(state: State<Arc<ProxyDebugManager>>) -> ProxyDebugState {
    state.get_state()
}

#[tauri::command]
async fn set_proxy_debug_enabled(
    state: State<'_, Arc<ProxyDebugManager>>,
    enabled: bool,
) -> Result<ProxyDebugState, String> {
    state.set_enabled(enabled).await
}

#[tauri::command]
async fn update_proxy_debug_config(
    state: State<'_, Arc<ProxyDebugManager>>,
    codex_upstream_base_url: String,
    record_mode: Option<String>,
) -> Result<ProxyDebugState, String> {
    state
        .update_config(codex_upstream_base_url, record_mode)
        .await
}

#[tauri::command]
fn list_proxy_traffic(
    state: State<Arc<ProxyDebugManager>>,
    limit: u32,
    cursor: Option<String>,
) -> Result<ProxyTrafficPage, String> {
    state.list_traffic(limit, cursor)
}

#[tauri::command]
fn get_proxy_traffic_detail(
    state: State<Arc<ProxyDebugManager>>,
    id: String,
) -> Result<ProxyTrafficDetail, String> {
    state.get_traffic_detail(id)
}

#[tauri::command]
fn clear_proxy_traffic(state: State<Arc<ProxyDebugManager>>) -> Result<(), String> {
    state.clear_traffic()
}

#[tauri::command]
fn open_text_in_vscode(content: String, suggested_name: Option<String>) -> Result<String, String> {
    let sanitized = sanitize_filename(suggested_name.as_deref().unwrap_or("proxy-debug"));
    let extension = if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
        "json"
    } else {
        "txt"
    };

    let timestamp = chrono::Utc::now().timestamp_millis();
    let random_suffix = rand::random::<u32>();
    let filename = format!(
        "ccem-{}-{}-{:08x}.{}",
        sanitized, timestamp, random_suffix, extension
    );
    let temp_path = std::env::temp_dir().join(filename);

    fs::write(&temp_path, content)
        .map_err(|e| format!("Failed to write temp file for VS Code: {}", e))?;

    let code_result = Command::new("code").arg("-r").arg(&temp_path).spawn();

    if code_result.is_ok() {
        return Ok(temp_path.to_string_lossy().to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let open_result = Command::new("open")
            .arg("-a")
            .arg("Visual Studio Code")
            .arg(&temp_path)
            .spawn();
        if open_result.is_ok() {
            return Ok(temp_path.to_string_lossy().to_string());
        }
    }

    Err("Failed to open VS Code. Ensure 'code' CLI is installed and available in PATH.".to_string())
}

fn sanitize_filename(raw: &str) -> String {
    let trimmed = raw.trim();
    let fallback = "proxy-debug".to_string();
    if trimmed.is_empty() {
        return fallback;
    }

    let sanitized: String = trimmed
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .take(40)
        .collect();

    if sanitized.is_empty() {
        fallback
    } else {
        sanitized
    }
}

/// Save content to a file via native save dialog.
#[tauri::command]
async fn save_file_dialog(
    app: tauri::AppHandle,
    content: String,
    default_name: String,
) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("JSON", &["json"])
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    match rx.recv().map_err(|e| format!("Dialog error: {}", e))? {
        Some(path) => {
            fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;
            Ok(true)
        }
        None => Ok(false), // user cancelled
    }
}

#[tauri::command]
async fn save_image_dialog(
    app: tauri::AppHandle,
    base64_png: String,
    default_name: String,
) -> Result<bool, String> {
    use base64::Engine as _;
    use std::path::PathBuf;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter("PNG Image", &["png"])
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    match rx.recv().map_err(|e| format!("Dialog error: {}", e))? {
        Some(path) => {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(base64_png)
                .map_err(|e| format!("Failed to decode image data: {}", e))?;
            let path_buf = PathBuf::from(path);
            let target_path = if path_buf.extension().is_some() {
                path_buf
            } else {
                path_buf.with_extension("png")
            };

            fs::write(&target_path, bytes)
                .map_err(|e| format!("Failed to write image file: {}", e))?;
            Ok(true)
        }
        None => Ok(false),
    }
}

#[cfg(target_os = "macos")]
fn copy_png_to_clipboard_native(app: &tauri::AppHandle, png_bytes: Vec<u8>) -> Result<(), String> {
    use objc2::runtime::ProtocolObject;
    use objc2::ClassType;
    use objc2_app_kit::{NSImage, NSPasteboard};
    use objc2_foundation::{NSArray, NSData};

    let (tx, rx) = std::sync::mpsc::channel();

    app.run_on_main_thread(move || {
        let result = (|| -> Result<(), String> {
            let data = NSData::with_bytes(&png_bytes);
            let image = NSImage::initWithData(NSImage::alloc(), &data)
                .ok_or_else(|| "Failed to decode PNG image".to_string())?;
            let pasteboard = unsafe { NSPasteboard::generalPasteboard() };
            let writer = ProtocolObject::from_retained(image);
            let writers = NSArray::from_vec(vec![writer]);

            unsafe {
                pasteboard.clearContents();
            }

            let wrote = unsafe { pasteboard.writeObjects(&writers) };
            if !wrote {
                return Err("Failed to write image to clipboard".to_string());
            }

            Ok(())
        })();

        let _ = tx.send(result);
    })
    .map_err(|e| format!("Failed to schedule clipboard copy: {}", e))?;

    rx.recv()
        .map_err(|e| format!("Clipboard copy channel error: {}", e))?
}

#[cfg(not(target_os = "macos"))]
fn copy_png_to_clipboard_native(
    _app: &tauri::AppHandle,
    _png_bytes: Vec<u8>,
) -> Result<(), String> {
    Err("Native image clipboard copy is not implemented on this platform".to_string())
}

#[tauri::command]
async fn copy_image_to_clipboard(app: tauri::AppHandle, base64_png: String) -> Result<(), String> {
    use base64::Engine as _;

    let png_bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_png)
        .map_err(|e| format!("Failed to decode image data: {}", e))?;

    copy_png_to_clipboard_native(&app, png_bytes)
}

/// Force-quit the app, bypassing closeToTray.
/// Called from frontend Cmd+Q handler.
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    FORCE_QUIT.store(true, Ordering::SeqCst);
    app.exit(0);
}

fn main() {
    // Create SessionManager from persisted sessions (or empty if first run)
    let session_manager = Arc::new(SessionManager::load_from_disk());
    let interactive_runtime_manager = Arc::new(InteractiveRuntimeManager::default());
    let headless_runtime_manager = Arc::new(HeadlessRuntimeManager::default());
    let event_dispatcher = Arc::new(EventDispatcher::default());
    let unified_session_manager = Arc::new(UnifiedSessionManager::new(
        headless_runtime_manager.clone(),
        interactive_runtime_manager.clone(),
        event_dispatcher.clone(),
    ));
    let proxy_debug_manager = ProxyDebugManager::new(session_manager.clone())
        .expect("failed to initialize proxy debug manager");
    let telegram_bridge_manager = Arc::new(TelegramBridgeManager::default());
    let weixin_bridge_manager = Arc::new(WeixinBridgeManager::default());
    let session_manager_for_setup = session_manager.clone();
    let proxy_manager_for_setup = proxy_debug_manager.clone();
    let proxy_manager_for_run = proxy_debug_manager.clone();
    let interactive_manager_for_setup = interactive_runtime_manager.clone();
    let interactive_manager_for_run = interactive_runtime_manager.clone();
    let headless_manager_for_run = headless_runtime_manager.clone();
    let telegram_manager_for_setup = telegram_bridge_manager.clone();
    let telegram_manager_for_run = telegram_bridge_manager.clone();
    let weixin_manager_for_setup = weixin_bridge_manager.clone();
    let weixin_manager_for_run = weixin_bridge_manager.clone();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .manage(session_manager.clone())
        .manage(interactive_runtime_manager.clone())
        .manage(headless_runtime_manager.clone())
        .manage(event_dispatcher.clone())
        .manage(unified_session_manager.clone())
        .manage(telegram_bridge_manager.clone())
        .manage(weixin_bridge_manager.clone())
        .manage(proxy_debug_manager.clone())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_username,
            get_environments,
            get_current_env,
            set_current_env,
            add_environment,
            update_environment,
            delete_environment,
            get_app_config,
            add_favorite,
            remove_favorite,
            add_recent,
            detect_terminals,
            list_tmux_attach_terminals,
            get_preferred_terminal,
            set_preferred_terminal,
            launch_claude_code,
            create_interactive_session,
            list_runtime_recovery_candidates,
            dismiss_runtime_recovery_candidate,
            list_interactive_sessions,
            stop_interactive_session,
            focus_interactive_session,
            open_interactive_session_in_terminal,
            close_interactive_session,
            minimize_interactive_session,
            write_interactive_input,
            send_interactive_input,
            send_interactive_approval,
            get_interactive_session_output,
            get_interactive_session_events,
            get_interactive_state,
            resize_interactive_session,
            create_managed_session,
            list_managed_sessions,
            send_to_managed_session,
            get_managed_session_events,
            stop_managed_session,
            remove_managed_session,
            create_headless_session,
            list_headless_sessions,
            send_to_headless_session,
            get_headless_session_events,
            stop_headless_session,
            remove_headless_session,
            respond_headless_permission,
            list_unified_sessions,
            get_session_events,
            send_session_input,
            stop_unified_session,
            attach_channel,
            detach_channel,
            debug_compare_sessions,
            list_sessions,
            stop_session,
            remove_session,
            focus_session,
            close_session,
            minimize_session,
            open_directory_dialog,
            sync_vscode_projects,
            sync_jetbrains_projects,
            get_usage_stats,
            get_usage_history,
            get_usage_model_breakdown,
            get_continuous_usage_days,
            check_ccem_installed,
            check_claude_installed,
            check_codex_installed,
            check_tmux_installed,
            load_from_remote,
            arrange_sessions,
            check_arrange_support,
            get_conversation_history,
            get_conversation_messages,
            get_conversation_segments,
            skills::search_skills_stream,
            skills::list_installed_skills,
            skills::get_curated_skills,
            skills::install_skill,
            skills::uninstall_skill,
            cron::list_cron_tasks,
            cron::add_cron_task,
            cron::update_cron_task,
            cron::delete_cron_task,
            cron::toggle_cron_task,
            cron::get_cron_task_runs,
            cron::retry_cron_task,
            cron::get_cron_run_detail,
            cron::list_cron_templates,
            cron::get_cron_next_runs,
            cron::generate_cron_task_stream,
            get_default_working_dir,
            set_default_working_dir,
            get_settings,
            save_settings,
            get_telegram_settings,
            get_weixin_settings,
            save_telegram_settings,
            save_weixin_settings,
            get_telegram_bridge_status,
            get_weixin_bridge_status,
            start_telegram_bridge,
            start_weixin_bridge,
            stop_telegram_bridge,
            stop_weixin_bridge,
            start_weixin_login,
            poll_weixin_login,
            get_telegram_forum_topics,
            bind_telegram_topic,
            get_proxy_debug_state,
            set_proxy_debug_enabled,
            update_proxy_debug_config,
            list_proxy_traffic,
            get_proxy_traffic_detail,
            clear_proxy_traffic,
            open_text_in_vscode,
            save_file_dialog,
            save_image_dialog,
            copy_image_to_clipboard,
            quit_app
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Only intercept the main window, and never when force-quit is requested
                if window.label() == "main" && !FORCE_QUIT.load(Ordering::SeqCst) {
                    let close_to_tray = config::read_settings()
                        .map(|s| s.close_to_tray)
                        .unwrap_or(true);
                    if close_to_tray {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            }
        })
        .setup(move |app| {
            if let Err(error) = cleanup_orphaned_runtime_processes() {
                eprintln!("Runtime orphan cleanup warning: {}", error);
            }

            // Clean up stale exit files not belonging to any persisted session
            cleanup_stale_exit_files_except(&session_manager_for_setup);

            // Validate persisted sessions against actual terminal state
            session_manager_for_setup.validate_and_reconcile();
            if let Err(error) = interactive_manager_for_setup
                .rehydrate_existing(app.handle().clone(), session_manager_for_setup.clone())
            {
                eprintln!("Interactive tmux rehydrate warning: {}", error);
            }

            proxy_manager_for_setup.set_app_handle(app.handle().clone());

            // Auto-migrate configuration if needed
            if let Err(e) = config::migrate_if_needed() {
                eprintln!("Config migration warning: {}", e);
            }

            // Load desktop settings once for startup logic
            let startup_settings = config::read_settings().unwrap_or_default();

            // Sync autostart state from settings
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart = app.autolaunch();
                if startup_settings.auto_start {
                    let _ = autostart.enable();
                } else {
                    let _ = autostart.disable();
                }
            }

            // Configure macOS overlay titlebar with inset traffic lights + vibrancy
            #[cfg(target_os = "macos")]
            {
                use tauri_plugin_decorum::WebviewWindowExt;
                let main_window = app.get_webview_window("main").unwrap();
                main_window.create_overlay_titlebar().unwrap();
                // Position traffic lights — offset to align inside the inset sidebar panel
                main_window.set_traffic_lights_inset(24.0, 28.0).unwrap();
                if let Err(error) = sync_macos_window_appearance(&main_window, &startup_settings) {
                    eprintln!("Window appearance warning: {}", error);
                }
            }

            // startMinimized: hide window immediately after setup (platform-independent)
            if startup_settings.start_minimized {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            let _ = create_tray(app.handle())?;

            // Start session monitor background task
            start_session_monitor(app.handle().clone(), session_manager_for_setup.clone());

            // Start proxy debug server if enabled in settings.
            let proxy_for_boot = proxy_manager_for_setup.clone();
            tauri::async_runtime::spawn(async move {
                proxy_for_boot.maybe_start_on_boot().await;
            });

            // Start cron scheduler background task
            let cron_scheduler = Arc::new(CronScheduler::default());
            app.manage(cron_scheduler.clone());
            let cron_app = app.handle().clone();
            start_cron_scheduler(cron_app, cron_scheduler, unified_session_manager.clone());

            if let Ok(settings) = telegram::read_telegram_settings() {
                telegram_manager_for_setup.sync_settings(&settings);
                if settings.enabled
                    && settings
                        .bot_token
                        .as_ref()
                        .is_some_and(|value| !value.trim().is_empty())
                {
                    if let Err(error) = telegram_manager_for_setup.clone().start(
                        app.handle().clone(),
                        headless_runtime_manager.clone(),
                        interactive_runtime_manager.clone(),
                    ) {
                        eprintln!("Telegram bridge auto-start warning: {}", error);
                    }
                }
            }

            if let Ok(settings) = weixin::read_weixin_settings() {
                weixin_manager_for_setup.sync_settings(&settings);
                if settings.enabled
                    && settings
                        .bot_token
                        .as_ref()
                        .is_some_and(|value| !value.trim().is_empty())
                {
                    if let Err(error) = weixin_manager_for_setup
                        .clone()
                        .start(app.handle().clone(), headless_runtime_manager.clone())
                    {
                        eprintln!("Weixin bridge auto-start warning: {}", error);
                    }
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app_handle, event| {
            // macOS Dock icon click should reopen/show the main window.
            if let RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            } else if let RunEvent::Exit = event {
                telegram_manager_for_run.stop();
                weixin_manager_for_run.stop();
                interactive_manager_for_run.shutdown_all();
                headless_manager_for_run.shutdown_all();
                let proxy_for_shutdown = proxy_manager_for_run.clone();
                tauri::async_runtime::block_on(async move {
                    proxy_for_shutdown.shutdown().await;
                });
            }
        });
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_set_current_env_validates_existence() {
        // 这个测试需要临时配置文件，暂时跳过
        // 实际测试应该在集成测试中进行
    }

    #[test]
    fn test_launch_claude_code_validates_env() {
        // 这个测试需要完整的 Tauri 上下文，暂时跳过
        // 实际测试应该在集成测试中进行
    }
}
