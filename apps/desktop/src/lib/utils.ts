import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProjectName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function truncatePath(path: string): string {
  const home = '/Users/';
  if (path.startsWith(home)) {
    const afterHome = path.substring(home.length);
    const firstSlash = afterHome.indexOf('/');
    if (firstSlash > 0) {
      return '~/' + afterHome.substring(firstSlash + 1);
    }
  }
  return path.length > 40 ? '...' + path.slice(-37) : path;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface CompactTokenFormatOptions {
  thousandDecimals?: number;
}

function formatCompactTokens(n: number, options: CompactTokenFormatOptions = {}): string {
  if (!Number.isFinite(n)) return '0';

  const { thousandDecimals = 1 } = options;
  const sign = n < 0 ? '-' : '';
  const value = Math.abs(n);

  if (value >= 999_950_000_000) return `${sign}${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 999_950_000) return `${sign}${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 999_950) return `${sign}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${sign}${(value / 1_000).toFixed(thousandDecimals)}K`;
  return `${n}`;
}

export function formatTokens(n: number): string {
  return formatCompactTokens(n);
}

export function formatTokenAxisValue(n: number): string {
  return formatCompactTokens(n, { thousandDecimals: 0 });
}

export function getEnvColorVar(envName: string): string {
  const lower = envName.toLowerCase();
  if (lower === 'official') return 'var(--chart-1)';
  if (lower.includes('glm')) return 'var(--chart-2)';
  if (lower.includes('deepseek')) return 'var(--chart-3)';
  if (lower.includes('kimi')) return 'var(--chart-4)';
  if (lower.includes('minimax')) return 'var(--chart-5)';
  return 'var(--primary)';
}

export function getYAxisWidth(values: number[], formatter: (value: number) => string, minWidth = 56): number {
  const maxLabelLength = values.reduce(
    (widest, value) => Math.max(widest, formatter(value).length),
    formatter(0).length,
  );

  return Math.max(minWidth, maxLabelLength * 8 + 16);
}
