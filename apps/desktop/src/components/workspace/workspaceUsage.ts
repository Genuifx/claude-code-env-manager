import type { SessionEventRecord } from '@/lib/tauri-ipc';

export interface SessionContextSnapshot {
  provider: string;
  usedTokens: number;
  maxTokens: number;
  rawMaxTokens: number | null;
  percentage: number;
  autoCompactThreshold: number | null;
  isAutoCompactEnabled: boolean;
  model: string;
  categories: Array<{ name: string; tokens: number }>;
}

export interface SessionUsageState {
  /** Cumulative token consumption across all turns */
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  /** Client-side cost estimate (Claude only) */
  estimatedCostUsd: number | null;
  /** Number of token_usage events seen */
  turnCount: number;
  /** Latest context window snapshot (Claude only, from context_usage events) */
  context: SessionContextSnapshot | null;
}

const EMPTY_USAGE: SessionUsageState = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheReadTokens: 0,
  totalCacheCreationTokens: 0,
  estimatedCostUsd: null,
  turnCount: 0,
  context: null,
};

/**
 * Compute cumulative token usage and latest context window snapshot from session events.
 *
 * - Accumulates all `token_usage` events for total consumption.
 * - Takes the latest `context_usage` event as the current context window state.
 * - Does NOT derive context occupancy from cumulative tokens (they are different metrics).
 */
export function computeSessionUsage(events: SessionEventRecord[]): SessionUsageState {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let estimatedCostUsd: number | null = null;
  let turnCount = 0;
  let context: SessionContextSnapshot | null = null;

  for (const event of events) {
    const { payload } = event;

    if (payload.type === 'token_usage') {
      // Only count turn_total scope to avoid double-counting per-step + turn_total
      if (payload.scope === 'turn_total') {
        totalInputTokens += payload.input_tokens;
        totalOutputTokens += payload.output_tokens;
        totalCacheReadTokens += payload.cache_read_tokens;
        totalCacheCreationTokens += payload.cache_creation_tokens;
        turnCount++;
        if (typeof payload.total_cost_usd === 'number') {
          estimatedCostUsd = (estimatedCostUsd ?? 0) + payload.total_cost_usd;
        }
      } else if (!payload.scope && payload.provider !== 'claude') {
        // Codex events have no scope — always count them
        totalInputTokens += payload.input_tokens;
        totalOutputTokens += payload.output_tokens;
        totalCacheReadTokens += payload.cache_read_tokens;
        totalCacheCreationTokens += payload.cache_creation_tokens;
        turnCount++;
      }
      // Claude per-step events (no scope) are skipped to avoid double-counting with turn_total
    }

    if (payload.type === 'context_usage') {
      context = {
        provider: payload.provider,
        usedTokens: payload.used_tokens,
        maxTokens: payload.max_tokens,
        rawMaxTokens: payload.raw_max_tokens ?? null,
        percentage: Number.isFinite(payload.percentage)
          ? payload.percentage
          : payload.max_tokens > 0
            ? (payload.used_tokens / payload.max_tokens) * 100
            : 0,
        autoCompactThreshold: payload.auto_compact_threshold ?? null,
        isAutoCompactEnabled: payload.is_auto_compact_enabled,
        model: payload.model,
        categories: payload.categories,
      };
    }
  }

  if (turnCount === 0 && !context) {
    return EMPTY_USAGE;
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheCreationTokens,
    estimatedCostUsd,
    turnCount,
    context,
  };
}

/** Format token count for compact display (e.g. 84000 → "84K") */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`;
  }
  return String(tokens);
}
