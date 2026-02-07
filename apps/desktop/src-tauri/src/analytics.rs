// apps/desktop/src-tauri/src/analytics.rs
//
// Reads the CLI's usage cache at ~/.ccem/usage-cache.json (written by src/usage.ts)
// and aggregates real token/cost data for the frontend.

use crate::config;
use chrono::{NaiveDate, Utc, Datelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

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
// Cache input types — match ~/.ccem/usage-cache.json format (camelCase from JS)
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CacheFile {
    #[serde(default)]
    version: u32,
    #[serde(default)]
    files: HashMap<String, CacheFileEntry>,
    #[serde(default)]
    last_updated: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CacheFileEntry {
    #[serde(default)]
    meta: Option<CacheMeta>,
    #[serde(default)]
    stats: Option<CacheStats>,
}

#[derive(Debug, Deserialize)]
struct CacheMeta {
    #[allow(dead_code)]
    mtime: Option<f64>,
    #[allow(dead_code)]
    size: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct CacheStats {
    #[serde(default)]
    entries: Vec<CacheEntry>,
}

#[derive(Debug, Deserialize)]
struct CacheEntry {
    timestamp: Option<String>,
    model: Option<String>,
    usage: Option<CacheUsage>,
}

#[derive(Debug, Deserialize)]
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
// Read and parse the CLI's usage cache
// ============================================================================

fn read_usage_cache() -> Result<CacheFile, String> {
    let cache_path = config::get_ccem_dir().join("usage-cache.json");

    if !cache_path.exists() {
        return Err("Usage cache not found. Run `ccem usage` in CLI first to generate usage data.".to_string());
    }

    let content = fs::read_to_string(&cache_path)
        .map_err(|e| format!("Failed to read usage cache: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse usage cache: {}", e))
}

/// Extract date string (YYYY-MM-DD) from ISO-8601 timestamp
fn extract_date(timestamp: &str) -> Option<String> {
    // Handle "2026-02-07T01:06:29.622Z" → "2026-02-07"
    if timestamp.len() >= 10 {
        Some(timestamp[..10].to_string())
    } else {
        None
    }
}

/// Aggregate all cache entries into UsageStats
fn aggregate_cache(cache: &CacheFile) -> UsageStats {
    let now = Utc::now();
    let today_str = now.format("%Y-%m-%d").to_string();

    // Calculate date boundaries
    let today_date = now.date_naive();
    let week_start = today_date - chrono::Duration::days(6); // last 7 days including today
    let month_start = NaiveDate::from_ymd_opt(today_date.year(), today_date.month(), 1)
        .unwrap_or(today_date);

    let mut stats = UsageStats {
        last_updated: cache.last_updated.clone().unwrap_or_else(|| now.to_rfc3339()),
        ..Default::default()
    };

    // Iterate all files and all entries
    for (_file_path, file_entry) in &cache.files {
        let entries = match &file_entry.stats {
            Some(s) => &s.entries,
            None => continue,
        };

        for entry in entries {
            let usage_data = match &entry.usage {
                Some(u) => u,
                None => continue,
            };

            let token_usage = TokenUsageWithCost {
                input_tokens: usage_data.input_tokens,
                output_tokens: usage_data.output_tokens,
                cache_read_tokens: usage_data.cache_read_tokens,
                cache_creation_tokens: usage_data.cache_creation_tokens,
                cost: usage_data.cost,
            };

            // Always add to total
            stats.total.add(&token_usage);

            // Add to by_model
            if let Some(model) = &entry.model {
                stats.by_model
                    .entry(model.clone())
                    .or_insert_with(TokenUsageWithCost::default)
                    .add(&token_usage);
            }

            // Time-based aggregation
            if let Some(ts) = &entry.timestamp {
                if let Some(date_str) = extract_date(ts) {
                    // Add to daily history
                    stats.daily_history
                        .entry(date_str.clone())
                        .or_insert_with(TokenUsageWithCost::default)
                        .add(&token_usage);

                    // Check if today
                    if date_str == today_str {
                        stats.today.add(&token_usage);
                    }

                    // Check if within last 7 days
                    if let Ok(entry_date) = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d") {
                        if entry_date >= week_start && entry_date <= today_date {
                            stats.week.add(&token_usage);
                        }
                        if entry_date >= month_start && entry_date <= today_date {
                            stats.month.add(&token_usage);
                        }
                    }
                }
            }
        }
    }

    stats
}

/// Calculate streak of consecutive usage days ending at today
fn calculate_streak(daily_history: &HashMap<String, TokenUsageWithCost>) -> u32 {
    let today = Utc::now().date_naive();
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

/// Get usage statistics (aggregated from CLI cache)
#[tauri::command]
pub fn get_usage_stats() -> Result<UsageStats, String> {
    let cache = read_usage_cache()?;
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
    let cache = read_usage_cache()?;
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
    let cache = read_usage_cache()?;
    let stats = aggregate_cache(&cache);
    Ok(calculate_streak(&stats.daily_history))
}
