// apps/desktop/src-tauri/src/analytics.rs
//
// Native JSONL scanner for Claude + Codex usage.

use crate::config;
use chrono::{Datelike, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

const SOURCE_CLAUDE: &str = "claude";
const SOURCE_CODEX: &str = "codex";

// ============================================================================
// Output types — sent to frontend (must use camelCase)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsageWithCost {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cost: f64,
}

impl TokenUsageWithCost {
    fn add(&mut self, other: &TokenUsageWithCost) {
        self.input_tokens += other.input_tokens;
        self.output_tokens += other.output_tokens;
        self.cache_read_tokens += other.cache_read_tokens;
        self.cache_creation_tokens += other.cache_creation_tokens;
        self.cost += other.cost;
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UsageStats {
    pub today: TokenUsageWithCost,
    pub week: TokenUsageWithCost,
    pub month: TokenUsageWithCost,
    pub total: TokenUsageWithCost,
    pub daily_history: HashMap<String, TokenUsageWithCost>,
    pub hourly_history: HashMap<String, TokenUsageWithCost>,
    pub model_daily_history: HashMap<String, HashMap<String, TokenUsageWithCost>>,
    pub model_hourly_history: HashMap<String, HashMap<String, TokenUsageWithCost>>,
    pub by_model: HashMap<String, TokenUsageWithCost>,
    pub by_environment: HashMap<String, TokenUsageWithCost>,
    pub last_updated: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageHistory {
    pub daily: HashMap<String, TokenUsageWithCost>,
    pub by_model: HashMap<String, TokenUsageWithCost>,
    pub by_environment: HashMap<String, TokenUsageWithCost>,
}

// ============================================================================
// Cache types — shared with ~/.ccem/usage-cache.json
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CacheFile {
    #[serde(default = "default_cache_version")]
    version: u32,
    #[serde(default)]
    files: HashMap<String, CacheFileEntry>,
    #[serde(default)]
    last_updated: Option<String>,
}

fn default_cache_version() -> u32 {
    1
}

impl Default for CacheFile {
    fn default() -> Self {
        Self {
            version: 1,
            files: HashMap::new(),
            last_updated: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CacheFileEntry {
    #[serde(default)]
    meta: CacheMeta,
    #[serde(default)]
    stats: CacheStats,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct CacheMeta {
    #[serde(default)]
    mtime: f64,
    #[serde(default)]
    size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct CacheStats {
    #[serde(default)]
    entries: Vec<CacheEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct CacheEntry {
    timestamp: String,
    model: String,
    usage: CacheUsage,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct CacheUsage {
    #[serde(default)]
    input_tokens: u64,
    #[serde(default)]
    output_tokens: u64,
    #[serde(default)]
    cache_read_tokens: u64,
    #[serde(default)]
    cache_creation_tokens: u64,
    #[serde(default)]
    cost: f64,
}

// ============================================================================
// Model pricing
// ============================================================================

#[derive(Debug, Deserialize, Clone)]
struct ModelPrice {
    input_cost_per_token: f64,
    output_cost_per_token: f64,
    cache_read_input_token_cost: Option<f64>,
    cache_creation_input_token_cost: Option<f64>,
}

/// Default prices matching CLI defaults for Claude models.
fn default_prices() -> HashMap<String, ModelPrice> {
    let mut m = HashMap::new();
    m.insert(
        "claude-opus-4-5".to_string(),
        ModelPrice {
            input_cost_per_token: 5e-6,
            output_cost_per_token: 25e-6,
            cache_read_input_token_cost: Some(0.5e-6),
            cache_creation_input_token_cost: Some(6.25e-6),
        },
    );
    m.insert(
        "claude-sonnet-4-5".to_string(),
        ModelPrice {
            input_cost_per_token: 3e-6,
            output_cost_per_token: 15e-6,
            cache_read_input_token_cost: Some(0.3e-6),
            cache_creation_input_token_cost: Some(3.75e-6),
        },
    );
    m.insert(
        "claude-haiku-4-5".to_string(),
        ModelPrice {
            input_cost_per_token: 1e-6,
            output_cost_per_token: 5e-6,
            cache_read_input_token_cost: Some(0.1e-6),
            cache_creation_input_token_cost: Some(1.25e-6),
        },
    );
    m
}

/// Load model prices from ~/.ccem/model-prices.json, falling back to defaults.
fn load_model_prices() -> HashMap<String, ModelPrice> {
    let prices_path = config::get_ccem_dir().join("model-prices.json");
    if let Ok(content) = fs::read_to_string(&prices_path) {
        if let Ok(prices) = serde_json::from_str::<HashMap<String, ModelPrice>>(&content) {
            if !prices.is_empty() {
                return prices;
            }
        }
    }
    default_prices()
}

// ============================================================================
// Model name normalization
// ============================================================================

/// Remove date suffixes, bedrock versions, provider prefixes.
fn normalize_model_name(model: &str) -> String {
    let mut s = model.to_string();

    // Remove date version suffix: -20250929, -20250929-v1:0
    if let Some(pos) = s.find("-20") {
        if s.len() > pos + 9 {
            let maybe_date = &s[pos + 1..pos + 9];
            if maybe_date.chars().all(|c| c.is_ascii_digit()) {
                s = s[..pos].to_string();
            }
        } else if s.len() == pos + 9 {
            let maybe_date = &s[pos + 1..];
            if maybe_date.chars().all(|c| c.is_ascii_digit()) {
                s = s[..pos].to_string();
            }
        }
    }

    // Remove bedrock version: -v1:0
    if let Some(pos) = s.find("-v") {
        let rest = &s[pos + 2..];
        if rest.contains(':') && rest.chars().next().is_some_and(|c| c.is_ascii_digit()) {
            s = s[..pos].to_string();
        }
    }

    // Remove provider prefixes.
    if let Some(stripped) = s.strip_prefix("anthropic.") {
        s = stripped.to_string();
    }
    if let Some(stripped) = s.strip_prefix("vertex_ai/") {
        s = stripped.to_string();
    }

    // Remove @ suffix.
    if let Some(pos) = s.find('@') {
        s = s[..pos].to_string();
    }

    s
}

/// Look up model price: direct -> normalized -> fuzzy -> keyword fallback (Claude only).
fn get_model_price<'a>(
    model: &str,
    prices: &'a HashMap<String, ModelPrice>,
) -> Option<&'a ModelPrice> {
    if let Some(p) = prices.get(model) {
        return Some(p);
    }

    let normalized = normalize_model_name(model);
    if let Some(p) = prices.get(&normalized) {
        return Some(p);
    }

    for (key, value) in prices {
        let norm_key = normalize_model_name(key);
        if key.contains(&normalized) || normalized.contains(&norm_key) {
            return Some(value);
        }
    }

    // Keep a conservative fallback only for explicit Claude model families.
    let model_lower = model.to_ascii_lowercase();
    if model_lower.contains("claude")
        || model_lower.contains("opus")
        || model_lower.contains("sonnet")
        || model_lower.contains("haiku")
    {
        if model_lower.contains("opus") {
            return prices.get("claude-opus-4-5");
        }
        if model_lower.contains("haiku") {
            return prices.get("claude-haiku-4-5");
        }
        return prices.get("claude-sonnet-4-5");
    }

    None
}

/// Calculate cost for a single usage entry.
fn calculate_cost(
    input_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
    cache_creation_tokens: u64,
    price: &ModelPrice,
) -> f64 {
    input_tokens as f64 * price.input_cost_per_token
        + output_tokens as f64 * price.output_cost_per_token
        + cache_read_tokens as f64 * price.cache_read_input_token_cost.unwrap_or(0.0)
        + cache_creation_tokens as f64 * price.cache_creation_input_token_cost.unwrap_or(0.0)
}

fn calculate_cost_or_zero(
    model: &str,
    input_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
    cache_creation_tokens: u64,
    prices: &HashMap<String, ModelPrice>,
) -> f64 {
    match get_model_price(model, prices) {
        Some(price) => calculate_cost(
            input_tokens,
            output_tokens,
            cache_read_tokens,
            cache_creation_tokens,
            price,
        ),
        None => 0.0,
    }
}

// ============================================================================
// JSONL file discovery
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum UsageSource {
    Claude,
    Codex,
}

#[derive(Debug, Clone)]
struct DiscoveredFile {
    path: PathBuf,
    source: UsageSource,
}

fn discover_jsonl_files() -> Vec<DiscoveredFile> {
    let mut files = Vec::new();
    files.extend(discover_claude_jsonl_files());
    files.extend(discover_codex_jsonl_files());
    files
}

/// Scan ~/.claude/projects/*/*.jsonl
fn discover_claude_jsonl_files() -> Vec<DiscoveredFile> {
    let mut files = Vec::new();
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return files,
    };

    let projects_dir = home.join(".claude").join("projects");
    if !projects_dir.exists() {
        return files;
    }

    let projects = match fs::read_dir(&projects_dir) {
        Ok(entries) => entries,
        Err(_) => return files,
    };

    for project_entry in projects.flatten() {
        let project_path = project_entry.path();
        if !project_path.is_dir() {
            continue;
        }
        if let Ok(dir_entries) = fs::read_dir(&project_path) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                    files.push(DiscoveredFile {
                        path,
                        source: UsageSource::Claude,
                    });
                }
            }
        }
    }

    files
}

/// Scan ~/.codex/sessions recursively for *.jsonl
fn discover_codex_jsonl_files() -> Vec<DiscoveredFile> {
    let mut files = Vec::new();
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return files,
    };

    let sessions_dir = home.join(".codex").join("sessions");
    if !sessions_dir.exists() {
        return files;
    }

    let mut stack = vec![sessions_dir];
    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }

            if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                files.push(DiscoveredFile {
                    path,
                    source: UsageSource::Codex,
                });
            }
        }
    }

    files
}

// ============================================================================
// File metadata
// ============================================================================

/// Get mtime in milliseconds (matching Node.js stat.mtimeMs) and size in bytes.
fn get_file_meta(path: &PathBuf) -> Option<CacheMeta> {
    let metadata = fs::metadata(path).ok()?;
    let mtime = metadata.modified().ok()?;
    let duration = mtime.duration_since(std::time::UNIX_EPOCH).ok()?;
    Some(CacheMeta {
        mtime: duration.as_millis() as f64,
        size: metadata.len(),
    })
}

// ============================================================================
// Claude JSONL parsing
// ============================================================================

#[derive(Debug, Deserialize)]
struct ClaudeJsonlLine {
    #[serde(rename = "type")]
    entry_type: Option<String>,
    timestamp: Option<String>,
    message: Option<ClaudeJsonlMessage>,
}

#[derive(Debug, Deserialize)]
struct ClaudeJsonlMessage {
    model: Option<String>,
    usage: Option<ClaudeJsonlUsage>,
}

#[derive(Debug, Deserialize)]
struct ClaudeJsonlUsage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    cache_read_input_tokens: Option<u64>,
    cache_creation_input_tokens: Option<u64>,
}

fn parse_claude_jsonl_file(path: &PathBuf, prices: &HashMap<String, ModelPrice>) -> CacheStats {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return CacheStats::default(),
    };

    let reader = BufReader::new(file);
    parse_claude_jsonl_reader(reader, prices)
}

fn parse_claude_jsonl_reader<R: BufRead>(
    reader: R,
    prices: &HashMap<String, ModelPrice>,
) -> CacheStats {
    let mut entries = Vec::new();

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(line) => line,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: ClaudeJsonlLine = match serde_json::from_str(&line) {
            Ok(value) => value,
            Err(_) => continue,
        };

        if parsed.entry_type.as_deref() != Some("assistant") {
            continue;
        }

        let message = match parsed.message {
            Some(message) => message,
            None => continue,
        };

        let usage = match message.usage {
            Some(usage) => usage,
            None => continue,
        };

        let model = message.model.unwrap_or_else(|| "unknown".to_string());
        let input_tokens = usage.input_tokens.unwrap_or(0);
        let output_tokens = usage.output_tokens.unwrap_or(0);
        let cache_read_tokens = usage.cache_read_input_tokens.unwrap_or(0);
        let cache_creation_tokens = usage.cache_creation_input_tokens.unwrap_or(0);

        let cost = calculate_cost_or_zero(
            &model,
            input_tokens,
            output_tokens,
            cache_read_tokens,
            cache_creation_tokens,
            prices,
        );

        let timestamp = parsed
            .timestamp
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

        entries.push(CacheEntry {
            timestamp,
            model,
            usage: CacheUsage {
                input_tokens,
                output_tokens,
                cache_read_tokens,
                cache_creation_tokens,
                cost,
            },
        });
    }

    CacheStats { entries }
}

// ============================================================================
// Codex JSONL parsing
// ============================================================================

#[derive(Debug, Clone, Default)]
struct CodexTotals {
    input_tokens: u64,
    cached_input_tokens: u64,
    output_tokens: u64,
    reasoning_output_tokens: u64,
}

impl CodexTotals {
    fn from_value(value: &serde_json::Value) -> Option<Self> {
        Some(Self {
            input_tokens: value.get("input_tokens")?.as_u64()?,
            cached_input_tokens: value
                .get("cached_input_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
            output_tokens: value.get("output_tokens")?.as_u64()?,
            reasoning_output_tokens: value
                .get("reasoning_output_tokens")
                .and_then(|v| v.as_u64())
                .unwrap_or(0),
        })
    }

    fn diff_from(&self, last: &Self) -> Self {
        // If totals go backwards, treat this as a reset and restart from current totals.
        if self.input_tokens < last.input_tokens
            || self.cached_input_tokens < last.cached_input_tokens
            || self.output_tokens < last.output_tokens
            || self.reasoning_output_tokens < last.reasoning_output_tokens
        {
            return self.clone();
        }

        Self {
            input_tokens: self.input_tokens.saturating_sub(last.input_tokens),
            cached_input_tokens: self
                .cached_input_tokens
                .saturating_sub(last.cached_input_tokens),
            output_tokens: self.output_tokens.saturating_sub(last.output_tokens),
            reasoning_output_tokens: self
                .reasoning_output_tokens
                .saturating_sub(last.reasoning_output_tokens),
        }
    }

    fn non_cache_input_tokens(&self) -> u64 {
        self.input_tokens.saturating_sub(self.cached_input_tokens)
    }

    fn total_output_tokens(&self) -> u64 {
        self.output_tokens
            .saturating_add(self.reasoning_output_tokens)
    }

    fn is_zero(&self) -> bool {
        self.input_tokens == 0
            && self.cached_input_tokens == 0
            && self.output_tokens == 0
            && self.reasoning_output_tokens == 0
    }
}

fn parse_codex_jsonl_file(path: &PathBuf, prices: &HashMap<String, ModelPrice>) -> CacheStats {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return CacheStats::default(),
    };

    let reader = BufReader::new(file);
    parse_codex_jsonl_reader(reader, prices)
}

fn parse_codex_jsonl_reader<R: BufRead>(
    reader: R,
    prices: &HashMap<String, ModelPrice>,
) -> CacheStats {
    let mut entries = Vec::new();

    let mut current_model: Option<String> = None;
    let mut last_total: Option<CodexTotals> = None;

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(line) => line,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: serde_json::Value = match serde_json::from_str(&line) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let line_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let payload = parsed.get("payload").unwrap_or(&serde_json::Value::Null);

        match line_type {
            "session_meta" => {
                if let Some(model) = payload.get("model").and_then(|v| v.as_str()) {
                    current_model = Some(model.to_string());
                }
            }
            "turn_context" => {
                if let Some(model) = payload.get("model").and_then(|v| v.as_str()) {
                    current_model = Some(model.to_string());
                }
            }
            "event_msg" => {
                if payload.get("type").and_then(|v| v.as_str()) != Some("token_count") {
                    continue;
                }

                let total_usage = match payload
                    .get("info")
                    .and_then(|v| v.get("total_token_usage"))
                    .and_then(CodexTotals::from_value)
                {
                    Some(total) => total,
                    None => continue,
                };

                let delta = match &last_total {
                    Some(last) => total_usage.diff_from(last),
                    None => total_usage.clone(),
                };
                last_total = Some(total_usage);

                if delta.is_zero() {
                    continue;
                }

                let model = current_model
                    .clone()
                    .unwrap_or_else(|| "unknown".to_string());
                let input_tokens = delta.non_cache_input_tokens();
                let cache_read_tokens = delta.cached_input_tokens;
                let output_tokens = delta.total_output_tokens();
                let cache_creation_tokens = 0;

                let cost = calculate_cost_or_zero(
                    &model,
                    input_tokens,
                    output_tokens,
                    cache_read_tokens,
                    cache_creation_tokens,
                    prices,
                );

                let timestamp = parsed
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                entries.push(CacheEntry {
                    timestamp,
                    model,
                    usage: CacheUsage {
                        input_tokens,
                        output_tokens,
                        cache_read_tokens,
                        cache_creation_tokens,
                        cost,
                    },
                });
            }
            _ => {}
        }
    }

    CacheStats { entries }
}

// ============================================================================
// Cache read / write
// ============================================================================

fn read_usage_cache() -> CacheFile {
    let cache_path = config::get_ccem_dir().join("usage-cache.json");
    if !cache_path.exists() {
        return CacheFile::default();
    }
    let content = match fs::read_to_string(&cache_path) {
        Ok(c) => c,
        Err(_) => return CacheFile::default(),
    };
    serde_json::from_str(&content).unwrap_or_default()
}

fn write_usage_cache(cache: &CacheFile) {
    if config::ensure_ccem_dir().is_err() {
        return;
    }
    let cache_path = config::get_ccem_dir().join("usage-cache.json");
    if let Ok(content) = serde_json::to_string_pretty(cache) {
        let _ = fs::write(cache_path, content);
    }
}

// ============================================================================
// Orchestration: incremental refresh
// ============================================================================

/// Refresh usage cache by scanning known usage files incrementally.
fn refresh_usage_cache() -> CacheFile {
    let prices = load_model_prices();
    let jsonl_files = discover_jsonl_files();
    let existing_cache = read_usage_cache();

    let mut new_cache = CacheFile {
        version: 1,
        files: HashMap::new(),
        last_updated: Some(Local::now().to_rfc3339()),
    };

    for discovered in jsonl_files {
        let path_str = discovered.path.to_string_lossy().to_string();

        let meta = match get_file_meta(&discovered.path) {
            Some(m) => m,
            None => continue,
        };

        let cache_valid = existing_cache.files.get(&path_str).is_some_and(|cached| {
            (cached.meta.mtime - meta.mtime).abs() < 1.0 && cached.meta.size == meta.size
        });

        let stats = if cache_valid {
            existing_cache.files[&path_str].stats.clone()
        } else {
            match discovered.source {
                UsageSource::Claude => parse_claude_jsonl_file(&discovered.path, &prices),
                UsageSource::Codex => parse_codex_jsonl_file(&discovered.path, &prices),
            }
        };

        new_cache
            .files
            .insert(path_str, CacheFileEntry { meta, stats });
    }

    write_usage_cache(&new_cache);
    new_cache
}

// ============================================================================
// Timestamp helpers
// ============================================================================

fn parse_to_local(timestamp: &str) -> Option<chrono::DateTime<Local>> {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(timestamp) {
        return Some(dt.into());
    }

    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(
        timestamp.trim_end_matches('Z'),
        "%Y-%m-%dT%H:%M:%S%.f",
    ) {
        let utc_dt = dt.and_utc();
        return Some(utc_dt.into());
    }

    None
}

fn extract_date(timestamp: &str) -> Option<String> {
    if let Some(local_dt) = parse_to_local(timestamp) {
        return Some(local_dt.format("%Y-%m-%d").to_string());
    }

    if timestamp.len() >= 10 {
        Some(timestamp[..10].to_string())
    } else {
        None
    }
}

fn extract_hour(timestamp: &str) -> Option<String> {
    parse_to_local(timestamp).map(|dt| dt.format("%Y-%m-%dT%H").to_string())
}

// ============================================================================
// Aggregation
// ============================================================================

fn detect_source_from_path(path: &str) -> Option<&'static str> {
    if path.contains("/.claude/projects/") || path.contains("\\.claude\\projects\\") {
        return Some(SOURCE_CLAUDE);
    }
    if path.contains("/.codex/sessions/") || path.contains("\\.codex\\sessions\\") {
        return Some(SOURCE_CODEX);
    }
    None
}

fn normalize_usage_source(source: Option<&str>) -> Result<Option<&'static str>, String> {
    let raw = match source {
        Some(value) => value.trim(),
        None => return Ok(None),
    };

    if raw.is_empty() || raw.eq_ignore_ascii_case("all") {
        return Ok(None);
    }

    let lowered = raw.to_ascii_lowercase();
    match lowered.as_str() {
        SOURCE_CLAUDE => Ok(Some(SOURCE_CLAUDE)),
        SOURCE_CODEX => Ok(Some(SOURCE_CODEX)),
        _ => Err(format!(
            "Unsupported source '{}'. Use claude, codex, or all.",
            raw
        )),
    }
}

fn aggregate_cache(cache: &CacheFile, source_filter: Option<&'static str>) -> UsageStats {
    let now = Local::now();
    let today_str = now.format("%Y-%m-%d").to_string();

    let today_date = now.date_naive();
    let days_since_sunday = today_date.weekday().num_days_from_sunday();
    let week_start = today_date - chrono::Duration::days(days_since_sunday as i64);
    let month_start =
        NaiveDate::from_ymd_opt(today_date.year(), today_date.month(), 1).unwrap_or(today_date);

    let mut stats = UsageStats {
        last_updated: cache
            .last_updated
            .clone()
            .unwrap_or_else(|| now.to_rfc3339()),
        ..Default::default()
    };

    for (file_path, file_entry) in &cache.files {
        if let Some(filter) = source_filter {
            if detect_source_from_path(file_path) != Some(filter) {
                continue;
            }
        }

        for entry in &file_entry.stats.entries {
            let token_usage = TokenUsageWithCost {
                input_tokens: entry.usage.input_tokens,
                output_tokens: entry.usage.output_tokens,
                cache_read_tokens: entry.usage.cache_read_tokens,
                cache_creation_tokens: entry.usage.cache_creation_tokens,
                cost: entry.usage.cost,
            };

            stats.total.add(&token_usage);
            stats
                .by_model
                .entry(entry.model.clone())
                .or_default()
                .add(&token_usage);

            if let Some(date_str) = extract_date(&entry.timestamp) {
                stats
                    .daily_history
                    .entry(date_str.clone())
                    .or_default()
                    .add(&token_usage);

                stats
                    .model_daily_history
                    .entry(date_str.clone())
                    .or_default()
                    .entry(entry.model.clone())
                    .or_default()
                    .add(&token_usage);

                if date_str == today_str {
                    stats.today.add(&token_usage);
                }

                if let Ok(entry_date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                    if entry_date >= week_start && entry_date <= today_date {
                        stats.week.add(&token_usage);
                    }
                    if entry_date >= month_start && entry_date <= today_date {
                        stats.month.add(&token_usage);
                    }
                }
            }

            if let Some(hour_key) = extract_hour(&entry.timestamp) {
                stats
                    .hourly_history
                    .entry(hour_key.clone())
                    .or_default()
                    .add(&token_usage);

                stats
                    .model_hourly_history
                    .entry(hour_key)
                    .or_default()
                    .entry(entry.model.clone())
                    .or_default()
                    .add(&token_usage);
            }
        }
    }

    stats
}

fn calculate_streak(daily_history: &HashMap<String, TokenUsageWithCost>) -> u32 {
    let today = Local::now().date_naive();
    let mut streak: u32 = 0;
    let mut check_date = today;

    loop {
        let date_str = check_date.format("%Y-%m-%d").to_string();
        if daily_history.contains_key(&date_str) {
            streak += 1;
            check_date -= chrono::Duration::days(1);
        } else {
            break;
        }
    }

    streak
}

// ============================================================================
// Tauri commands
// ============================================================================

/// Get usage statistics (optionally filtered by source).
#[tauri::command]
pub fn get_usage_stats(source: Option<String>) -> Result<UsageStats, String> {
    let source_filter = normalize_usage_source(source.as_deref())?;
    let cache = refresh_usage_cache();
    Ok(aggregate_cache(&cache, source_filter))
}

/// Get usage history with time granularity (optionally filtered by source).
#[tauri::command]
pub fn get_usage_history(
    _granularity: String,
    _start_date: Option<String>,
    _end_date: Option<String>,
    source: Option<String>,
) -> Result<UsageHistory, String> {
    let source_filter = normalize_usage_source(source.as_deref())?;
    let cache = refresh_usage_cache();
    let stats = aggregate_cache(&cache, source_filter);

    Ok(UsageHistory {
        daily: stats.daily_history,
        by_model: stats.by_model,
        by_environment: stats.by_environment,
    })
}

/// Calculate continuous usage days (streak), optionally filtered by source.
#[tauri::command]
pub fn get_continuous_usage_days(source: Option<String>) -> Result<u32, String> {
    let source_filter = normalize_usage_source(source.as_deref())?;
    let cache = refresh_usage_cache();
    let stats = aggregate_cache(&cache, source_filter);
    Ok(calculate_streak(&stats.daily_history))
}

#[cfg(test)]
mod tests {
    use super::{default_prices, normalize_usage_source, parse_codex_jsonl_reader, ModelPrice};
    use std::collections::HashMap;
    use std::io::BufReader;

    #[test]
    fn test_codex_token_count_differential() {
        let mut prices = HashMap::new();
        prices.insert(
            "gpt-5.3-codex".to_string(),
            ModelPrice {
                input_cost_per_token: 1.0,
                output_cost_per_token: 1.0,
                cache_read_input_token_cost: Some(1.0),
                cache_creation_input_token_cost: Some(0.0),
            },
        );

        let input = [
            r#"{"type":"turn_context","payload":{"model":"gpt-5.3-codex"}}"#,
            r#"{"timestamp":"2026-03-01T00:00:01.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"cached_input_tokens":20,"output_tokens":10,"reasoning_output_tokens":5}}}}"#,
            r#"{"timestamp":"2026-03-01T00:00:02.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":100,"cached_input_tokens":20,"output_tokens":10,"reasoning_output_tokens":5}}}}"#,
            r#"{"timestamp":"2026-03-01T00:00:03.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":150,"cached_input_tokens":50,"output_tokens":25,"reasoning_output_tokens":8}}}}"#,
        ]
        .join("\n");

        let reader = BufReader::new(input.as_bytes());
        let stats = parse_codex_jsonl_reader(reader, &prices);

        assert_eq!(stats.entries.len(), 2);

        let first = &stats.entries[0];
        assert_eq!(first.usage.input_tokens, 80);
        assert_eq!(first.usage.cache_read_tokens, 20);
        assert_eq!(first.usage.output_tokens, 15);

        let second = &stats.entries[1];
        assert_eq!(second.usage.input_tokens, 20);
        assert_eq!(second.usage.cache_read_tokens, 30);
        assert_eq!(second.usage.output_tokens, 18);
    }

    #[test]
    fn test_model_price_fallback_for_unknown_codex_models() {
        let prices = default_prices();
        let input = [
            r#"{"type":"turn_context","payload":{"model":"gpt-unknown-codex"}}"#,
            r#"{"timestamp":"2026-03-01T00:00:01.000Z","type":"event_msg","payload":{"type":"token_count","info":{"total_token_usage":{"input_tokens":10,"cached_input_tokens":2,"output_tokens":3,"reasoning_output_tokens":1}}}}"#,
        ]
        .join("\n");

        let reader = BufReader::new(input.as_bytes());
        let stats = parse_codex_jsonl_reader(reader, &prices);

        assert_eq!(stats.entries.len(), 1);
        assert_eq!(stats.entries[0].usage.cost, 0.0);
    }

    #[test]
    fn test_usage_source_filtering() {
        assert_eq!(normalize_usage_source(None).unwrap(), None);
        assert_eq!(normalize_usage_source(Some("all")).unwrap(), None);
        assert_eq!(
            normalize_usage_source(Some("claude")).unwrap(),
            Some("claude")
        );
        assert_eq!(
            normalize_usage_source(Some("CODEX")).unwrap(),
            Some("codex")
        );
        assert!(normalize_usage_source(Some("other")).is_err());
    }
}
