# Usage Calendar Heatmap Design

**Date:** 2026-01-18
**Status:** Approved

## Context
The goal is to add a GitHub-style contribution graph (heatmap) to the `ccem usage` command. This will visualize the intensity of token usage (Total Tokens) over time, providing a better "at-a-glance" view of activity than the current tabular data.

## 1. Data Architecture

### Type Definitions (`src/types.ts`)
Update the `UsageStats` interface to include a full history of daily usage.

```typescript
export interface UsageStats {
  // ... existing fields
  dailyHistory: Record<string, TokenUsageWithCost>; // Key format: "YYYY-MM-DD"
}
```

### Data Aggregation (`src/usage.ts`)
Modify `getUsageStatsFromCache` and `getUsageStats` to populate `dailyHistory`.

- **Storage:** Persist *all* available daily history in the `UsageStats` object.
- **Aggregation:**
  - Iterate through all cache/file entries.
  - Convert timestamp to `YYYY-MM-DD`.
  - Accumulate `TokenUsageWithCost` for that day in `dailyHistory`.
  - Maintain existing logic for `today`, `week`, and `total` stats.

## 2. UI Implementation

### Heatmap Component (`src/ui.ts`)
Create a new function `renderCalendarHeatmap` to generate the visualization.

**Signature:**
```typescript
function renderCalendarHeatmap(stats: UsageStats, months: number = 6): string
```

**Visual Style:**
- **Layout:** Standard calendar grid.
  - **Rows:** 7 (Days of week).
  - **Columns:** ~26 (Weeks for 6 months).
- **Labels:**
  - Left: "Mon", "Wed", "Fri"
  - Top: Month names (e.g., "Jan", "Feb") aligned to their start weeks.
- **Cells:** Use block characters to represent intensity (Total Tokens).
  - Level 0 (0): ` ` (space) or `·` (dim dot)
  - Level 1 (Low): `░`
  - Level 2 (Medium): `▒`
  - Level 3 (High): `▓`
  - Level 4 (Max): `█`
- **Color:** Use `theme.primary` (Blue) for consistency.

**Scaling Logic:**
1. Filter `dailyHistory` to the requested date range (Last 6 months).
2. Find `maxTokens` in this range.
3. If `maxTokens == 0`, show empty grid.
4. Else, map daily tokens to levels 0-4: `Math.ceil((tokens / maxTokens) * 4)`.

### Integration (`src/ui.ts`)
Update `renderUsageDetail` to include the heatmap.

- **Placement:** Insert the heatmap output immediately after the "Token Usage Statistics" header and before the "Period Statistics" table.

## 3. Implementation Steps
1.  **Types:** Update `UsageStats` in `src/types.ts`.
2.  **Logic:** Implement history aggregation in `src/usage.ts`.
3.  **UI:** Implement `renderCalendarHeatmap` in `src/ui.ts`.
4.  **UI:** Integrate into `renderUsageDetail`.
