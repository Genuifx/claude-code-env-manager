// apps/desktop/src-tauri/src/analytics.rs
//
// Native JSONL scanner: incrementally parses ~/.claude/projects/*/*.jsonl,
// maintains ~/.ccem/usage-cache.json (shared with CLI), and returns
// aggregated token/cost data for the frontend.

use crate::config;
use chrono::{NaiveDate, Local, Datelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

// ============================================================================
// Output types — sent to frontend (must use camelCase to match TypeScript)
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
// Cache types — match ~/.ccem/usage-cache.json format (camelCase, shared w/ CLI)
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

fn default_cache_version() -> u32 { 1 }

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

/// Hardcoded default prices matching CLI usage.ts:52-71
fn default_prices() -> HashMap<String, ModelPrice> {
    let mut m = HashMap::new();
    m.insert("claude-opus-4-5".to_string(), ModelPrice {
        input_cost_per_token: 5e-6,
        output_cost_per_token: 25e-6,
        cache_read_input_token_cost: Some(0.5e-6),
        cache_creation_input_token_cost: Some(6.25e-6),
    });
    m.insert("claude-sonnet-4-5".to_string(), ModelPrice {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 15e-6,
        cache_read_input_token_cost: Some(0.3e-6),
        cache_creation_input_token_cost: Some(3.75e-6),
    });
    m.insert("claude-haiku-4-5".to_string(), ModelPrice {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 5e-6,
        cache_read_input_token_cost: Some(0.1e-6),
        cache_creation_input_token_cost: Some(1.25e-6),
    });
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
// Model name normalization (ported from usage.ts:74-83)
// ============================================================================

/// Remove date suffixes, bedrock versions, provider prefixes.
fn normalize_model_name(model: &str) -> String {
    let mut s = model.to_string();
    // Remove date version suffix: -20250929, -20250929-v1:0
    if let Some(pos) = s.find("-20") {
        // Verify it looks like a date: -20YYMMDD
        if s.len() > pos + 9 {
            let maybe_date = &s[pos+1..pos+9];
            if maybe_date.chars().all(|c| c.is_ascii_digit()) {
                s = s[..pos].to_string();
            }
        } else if s.len() == pos + 9 {
            let maybe_date = &s[pos+1..];
            if maybe_date.chars().all(|c| c.is_ascii_digit()) {
                s = s[..pos].to_string();
            }
        }
    }
    // Remove bedrock version: -v1:0
    if let Some(pos) = s.find("-v") {
        let rest = &s[pos+2..];
        if rest.contains(':') && rest.chars().next().map_or(false, |c| c.is_ascii_digit()) {
            s = s[..pos].to_string();
        }
    }
    // Remove provider prefixes
    if let Some(stripped) = s.strip_prefix("anthropic.") {
        s = stripped.to_string();
    }
    if let Some(stripped) = s.strip_prefix("vertex_ai/") {
        s = stripped.to_string();
    }
    // Remove @ suffix
    if let Some(pos) = s.find('@') {
        s = s[..pos].to_string();
    }
    s
}

/// Look up model price: direct → normalized → fuzzy → keyword fallback.
fn get_model_price<'a>(model: &str, prices: &'a HashMap<String, ModelPrice>) -> &'a ModelPrice {
    // Direct match
    if let Some(p) = prices.get(model) {
        return p;
    }
    // Normalized match
    let normalized = normalize_model_name(model);
    if let Some(p) = prices.get(&normalized) {
        return p;
    }
    // Fuzzy match
    for (key, value) in prices {
        let norm_key = normalize_model_name(key);
        if key.contains(&normalized) || normalized.contains(&norm_key) {
            return value;
        }
    }
    // Keyword fallback
    let model_lower = model.to_lowercase();
    if model_lower.contains("opus") {
        // Return from defaults — we need to leak into a static or use a trick.
        // Since this is a fallback, we clone into a Box::leak for lifetime safety.
        // But better: just return the sonnet default from the prices map if available.
        if let Some(p) = prices.get("claude-opus-4-5") { return p; }
    }
    if model_lower.contains("haiku") {
        if let Some(p) = prices.get("claude-haiku-4-5") { return p; }
    }
    // Default: sonnet
    if let Some(p) = prices.get("claude-sonnet-4-5") {
        return p;
    }
    // Last resort: return any price from the map, or panic-safe via first entry
    prices.values().next().unwrap_or_else(|| {
        // This shouldn't happen since we always have defaults, but be safe
        Box::leak(Box::new(ModelPrice {
            input_cost_per_token: 3e-6,
            output_cost_per_token: 15e-6,
            cache_read_input_token_cost: Some(0.3e-6),
            cache_creation_input_token_cost: Some(3.75e-6),
        }))
    })
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

// ============================================================================
// JSONL file discovery (ported from usage.ts:397-429)
// ============================================================================

/// Scan ~/.claude/projects/*/*.jsonl
fn discover_jsonl_files() -> Vec<PathBuf> {
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
                    files.push(path);
                }
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
// JSONL parsing (ported from usage.ts:312-394)
// ============================================================================

#[derive(Debug, Deserialize)]
struct JsonlLine {
    #[serde(rename = "type")]
    entry_type: Option<String>,
    timestamp: Option<String>,
    message: Option<JsonlMessage>,
}

#[derive(Debug, Deserialize)]
struct JsonlMessage {
    model: Option<String>,
    usage: Option<JsonlUsage>,
}

#[derive(Debug, Deserialize)]
struct JsonlUsage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    cache_read_input_tokens: Option<u64>,
    cache_creation_input_tokens: Option<u64>,
}

/// Parse a single JSONL file, returning cache entries with costs calculated.
fn parse_jsonl_file(path: &PathBuf, prices: &HashMap<String, ModelPrice>) -> CacheStats {
    let mut entries = Vec::new();

    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return CacheStats { entries },
    };

    let reader = BufReader::new(file);
    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => continue,
        };
        if line.trim().is_empty() {
            continue;
        }

        let parsed: JsonlLine = match serde_json::from_str(&line) {
            Ok(p) => p,
            Err(_) => continue,
        };

        // Only process assistant messages with usage data
        let entry_type = match &parsed.entry_type {
            Some(t) => t.as_str(),
            None => continue,
        };
        if entry_type != "assistant" {
            continue;
        }

        let message = match &parsed.message {
            Some(m) => m,
            None => continue,
        };
        let raw_usage = match &message.usage {
            Some(u) => u,
            None => continue,
        };

        let model = message.model.as_deref().unwrap_or("unknown").to_string();
        let input_tokens = raw_usage.input_tokens.unwrap_or(0);
        let output_tokens = raw_usage.output_tokens.unwrap_or(0);
        let cache_read_tokens = raw_usage.cache_read_input_tokens.unwrap_or(0);
        let cache_creation_tokens = raw_usage.cache_creation_input_tokens.unwrap_or(0);

        let price = get_model_price(&model, prices);
        let cost = calculate_cost(input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, price);

        let timestamp = parsed.timestamp
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
    if let Err(_) = config::ensure_ccem_dir() {
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

/// Refresh the usage cache by scanning JSONL files incrementally.
/// Reuses cached entries when file mtime/size haven't changed.
fn refresh_usage_cache() -> CacheFile {
    let prices = load_model_prices();
    let jsonl_files = discover_jsonl_files();
    let existing_cache = read_usage_cache();

    let mut new_cache = CacheFile {
        version: 1,
        files: HashMap::new(),
        last_updated: Some(Local::now().to_rfc3339()),
    };

    for file_path in &jsonl_files {
        let path_str = file_path.to_string_lossy().to_string();

        let meta = match get_file_meta(file_path) {
            Some(m) => m,
            None => continue,
        };

        // Check if cached entry is still valid (same mtime + size)
        let cache_valid = existing_cache.files.get(&path_str).map_or(false, |cached| {
            (cached.meta.mtime - meta.mtime).abs() < 1.0 && cached.meta.size == meta.size
        });

        let stats = if cache_valid {
            existing_cache.files[&path_str].stats.clone()
        } else {
            parse_jsonl_file(file_path, &prices)
        };

        new_cache.files.insert(path_str, CacheFileEntry { meta, stats });
    }

    // Write cache back (best-effort)
    write_usage_cache(&new_cache);

    new_cache
}

// ============================================================================
// Timestamp helpers
// ============================================================================

/// Parse an ISO-8601 timestamp into a local DateTime.
fn parse_to_local(timestamp: &str) -> Option<chrono::DateTime<Local>> {
    // Try to parse as full ISO-8601 with timezone → convert to local
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(timestamp) {
        return Some(dt.into());
    }
    // Fallback: try "2026-02-07T01:06:29.622Z" format (Z suffix)
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(
        timestamp.trim_end_matches('Z'),
        "%Y-%m-%dT%H:%M:%S%.f",
    ) {
        let utc_dt = dt.and_utc();
        return Some(utc_dt.into());
    }
    None
}

/// Extract LOCAL date string (YYYY-MM-DD) from ISO-8601 timestamp.
fn extract_date(timestamp: &str) -> Option<String> {
    if let Some(local_dt) = parse_to_local(timestamp) {
        return Some(local_dt.format("%Y-%m-%d").to_string());
    }
    // Last resort: just take first 10 chars
    if timestamp.len() >= 10 {
        Some(timestamp[..10].to_string())
    } else {
        None
    }
}

/// Extract LOCAL hour key (YYYY-MM-DDTHH) from ISO-8601 timestamp.
fn extract_hour(timestamp: &str) -> Option<String> {
    parse_to_local(timestamp).map(|dt| dt.format("%Y-%m-%dT%H").to_string())
}

// ============================================================================
// Aggregation
// ============================================================================

/// Aggregate all cache entries into UsageStats
fn aggregate_cache(cache: &CacheFile) -> UsageStats {
    let now = Local::now();
    let today_str = now.format("%Y-%m-%d").to_string();

    let today_date = now.date_naive();
    let days_since_sunday = today_date.weekday().num_days_from_sunday();
    let week_start = today_date - chrono::Duration::days(days_since_sunday as i64);
    let month_start = NaiveDate::from_ymd_opt(today_date.year(), today_date.month(), 1)
        .unwrap_or(today_date);

    let mut stats = UsageStats {
        last_updated: cache.last_updated.clone().unwrap_or_else(|| now.to_rfc3339()),
        ..Default::default()
    };

    for (_file_path, file_entry) in &cache.files {
        for entry in &file_entry.stats.entries {
            let token_usage = TokenUsageWithCost {
                input_tokens: entry.usage.input_tokens,
                output_tokens: entry.usage.output_tokens,
                cache_read_tokens: entry.usage.cache_read_tokens,
                cache_creation_tokens: entry.usage.cache_creation_tokens,
                cost: entry.usage.cost,
            };

            // Always add to total
            stats.total.add(&token_usage);

            // Add to by_model
            stats.by_model
                .entry(entry.model.clone())
                .or_insert_with(TokenUsageWithCost::default)
                .add(&token_usage);

            // Time-based aggregation
            if let Some(date_str) = extract_date(&entry.timestamp) {
                stats.daily_history
                    .entry(date_str.clone())
                    .or_insert_with(TokenUsageWithCost::default)
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
                stats.hourly_history
                    .entry(hour_key)
                    .or_insert_with(TokenUsageWithCost::default)
                    .add(&token_usage);
            }
        }
    }

    stats
}

/// Calculate streak of consecutive usage days ending at today
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

/// Get usage statistics — refreshes JSONL cache then aggregates.
#[tauri::command]
pub fn get_usage_stats() -> Result<UsageStats, String> {
    let cache = refresh_usage_cache();
    let stats = aggregate_cache(&cache);
    Ok(stats)
}

/// Get usage history with time granularity
#[tauri::command]
pub fn get_usage_history(
    _granularity: String,
    _start_date: Option<String>,
    _end_date: Option<String>,
) -> Result<UsageHistory, String> {
    let cache = refresh_usage_cache();
    let stats = aggregate_cache(&cache);

    Ok(UsageHistory {
        daily: stats.daily_history,
        by_model: stats.by_model,
        by_environment: stats.by_environment,
    })
}

/// Calculate continuous usage days (streak)
#[tauri::command]
pub fn get_continuous_usage_days() -> Result<u32, String> {
    let cache = refresh_usage_cache();
    let stats = aggregate_cache(&cache);
    Ok(calculate_streak(&stats.daily_history))
}
