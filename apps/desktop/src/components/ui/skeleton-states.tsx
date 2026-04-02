// Skeleton loading states — "Skeleton screens, never spinners" (taste spec)
// Each skeleton matches the layout shape of the page it represents so users
// get spatial context while data loads.

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* ─── Reusable skeleton block ──────────────────────────────────────── */

function Bone({ className }: { className?: string }) {
  return <div className={cn('bg-muted rounded-xl', className)} />;
}

/* ─── Dashboard ────────────────────────────────────────────────────── */

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Status strip */}
      <div className="h-10 border-b border-white/[0.08] bg-background/60 animate-pulse">
        <div className="flex items-center gap-3 px-4 h-full">
          <Bone className="h-6 w-32 rounded-md" />
          <Bone className="h-6 w-24 rounded-md" />
          <Bone className="h-6 w-20 rounded-md" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 animate-pulse">
        {/* Left: Project tree */}
        <div className="w-[300px] border-r border-white/[0.08] bg-background/60 flex flex-col p-3 gap-2">
          <Bone className="h-8 w-full rounded-md" />
          <Bone className="h-8 w-full rounded-md" />
          <div className="flex-1 space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Bone className="h-6 w-32 rounded" />
                <Bone className="h-5 w-full rounded ml-4" />
                <Bone className="h-5 w-5/6 rounded ml-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detail area */}
        <div className="flex-1 bg-background/50 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <Bone className="w-48 h-32 rounded-xl" />
          </div>
          <div className="h-14 border-t border-white/[0.08] bg-background/60 px-4 flex items-center">
            <Bone className="h-8 flex-1 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sessions ─────────────────────────────────────────────────────── */

export function SessionsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Hero Card */}
      <div className="stat-card glass-noise p-5">
        <div className="flex items-center justify-between">
          <div>
            <Bone className="h-8 w-32 mb-1.5" />
            <Bone className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Bone className="h-8 w-20 rounded-lg" />
            <Bone className="h-9 w-28 rounded-lg" />
            <Bone className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Sessions Card */}
      <Card className="p-4">
        <Bone className="h-4 w-36 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Bone className="h-3 w-3 rounded-full" />
                <Bone className="h-5 w-32" />
              </div>
              <div className="flex gap-2 mb-3">
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-5 w-20 rounded-full" />
              </div>
              <Bone className="h-4 w-full mb-3" />
              <div className="flex gap-2">
                <Bone className="h-8 w-20" />
                <Bone className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Environments ─────────────────────────────────────────────────── */

export function EnvironmentsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-8 w-48 mb-2" />
          <Bone className="h-4 w-72" />
        </div>
        <Bone className="h-10 w-36" />
      </div>

      {/* Section label */}
      <Bone className="h-4 w-40" />

      {/* 3 stacked env cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4" style={{ minHeight: 120 }}>
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                {/* Name */}
                <Bone className="h-5 w-32" />
                {/* URL */}
                <Bone className="h-4 w-64" />
                {/* Key block */}
                <Bone className="h-4 w-40" />
              </div>
              <div className="flex gap-2">
                <Bone className="h-8 w-16" />
                <Bone className="h-8 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Analytics ────────────────────────────────────────────────────── */

export function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Granularity controls — right-aligned */}
      <div className="flex items-center justify-end gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-9 w-16 rounded-md" />
        ))}
      </div>

      {/* Hero Stats Card */}
      <div className="stat-card glass-noise p-6">
        <Bone className="h-10 w-56 mb-2" />
        <Bone className="h-4 w-24 mb-2" />
        <Bone className="h-4 w-40 mb-4" />
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Bone className="h-6 w-20" />
              <Bone className="h-3 w-16" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <Bone className="h-6 w-14" />
              <Bone className="h-3 w-12" />
            </div>
          </div>
          <Bone className="h-16 w-48" />
        </div>
      </div>

      {/* Chart — h-64 */}
      <Card className="p-4">
        <Bone className="h-5 w-40 mb-4" />
        <Bone className="h-64 w-full" />
      </Card>

      {/* Model Distribution + Daily Token Bar side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Bone className="h-5 w-36 mb-4" />
          <Bone className="h-40 w-full" />
        </Card>
        <Card className="p-4">
          <Bone className="h-5 w-32 mb-4" />
          <Bone className="h-40 w-full" />
        </Card>
      </div>

      {/* Next Milestone — thin progress bar */}
      <div className="flex items-center gap-3 py-2">
        <Bone className="h-4 w-4 rounded" />
        <Bone className="h-4 w-24" />
        <Bone className="h-4 w-20" />
        <Bone className="h-2 flex-1 rounded-full" />
        <Bone className="h-3 w-8" />
      </div>
    </div>
  );
}

/* ─── Skills ───────────────────────────────────────────────────────── */

export function SkillsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div>
        <Bone className="h-8 w-20 mb-2" />
        <Bone className="h-4 w-56" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        <Bone className="h-10 w-24 rounded-md" />
        <Bone className="h-10 w-24 rounded-md" />
      </div>

      {/* Search bar */}
      <Bone className="h-10 w-full rounded-lg" />

      {/* Category header */}
      <div className="flex items-center gap-2">
        <Bone className="w-4 h-4 rounded" />
        <Bone className="h-4 w-24" />
      </div>

      {/* Curated grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Bone className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-5 w-28" />
                <Bone className="h-4 w-full" />
              </div>
              <Bone className="h-8 w-16 shrink-0" />
            </div>
          </Card>
        ))}
      </div>

      {/* Second category */}
      <div className="flex items-center gap-2">
        <Bone className="w-4 h-4 rounded" />
        <Bone className="h-4 w-28" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Bone className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-5 w-32" />
                <Bone className="h-4 w-full" />
              </div>
              <Bone className="h-8 w-16 shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── ChatApp ─────────────────────────────────────────────────────── */

export function ChatAppSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2">
        <Bone className="h-9 w-24 rounded-md" />
        <Bone className="h-9 w-24 rounded-md" />
      </div>

      {/* Main card */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Bone className="h-5 w-40" />
            <Bone className="h-3 w-64" />
          </div>
          <Bone className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bone className="h-4 w-4 rounded" />
              <div>
                <Bone className="h-4 w-36 mb-1" />
                <Bone className="h-3 w-52" />
              </div>
            </div>
            <Bone className="h-10 w-full rounded-xl" />
            <Bone className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t glass-divider flex items-center justify-between">
          <Bone className="h-3 w-40" />
          <div className="flex gap-2">
            <Bone className="h-9 w-28 rounded-lg" />
            <Bone className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Settings (delayed skeleton — only shows if load takes >200ms) ─ */

/**
 * useDelayedShow: returns true only after `delayMs` has elapsed.
 * Prevents skeleton flash for fast loads.
 */
function useDelayedShow(delayMs = 200): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return show;
}

export function SettingsSkeleton() {
  const show = useDelayedShow(200);

  if (!show) return null;

  return (
    <div className="animate-pulse space-y-6">
      <div className="max-w-lg space-y-6">
        {/* Header */}
        <div>
          <Bone className="h-8 w-24 mb-2" />
          <Bone className="h-4 w-56" />
        </div>

        {/* Appearance card */}
        <Card className="p-6">
          <Bone className="h-6 w-28 mb-4" />
          <div className="space-y-4">
            <div>
              <Bone className="h-4 w-16 mb-2" />
              <div className="flex gap-2">
                <Bone className="h-10 w-24" />
                <Bone className="h-10 w-24" />
                <Bone className="h-10 w-24" />
              </div>
            </div>
            <div>
              <Bone className="h-4 w-32 mb-2" />
              <div className="flex gap-4">
                <Bone className="h-5 w-16" />
                <Bone className="h-5 w-16" />
              </div>
            </div>
          </div>
        </Card>

        {/* Application card */}
        <Card className="p-6">
          <Bone className="h-6 w-28 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-4 w-4 rounded" />
                <div>
                  <Bone className="h-4 w-36 mb-1" />
                  <Bone className="h-3 w-52" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Permission card */}
        <Card className="p-6">
          <Bone className="h-6 w-40 mb-4" />
          <Bone className="h-10 w-full mb-2" />
          <Bone className="h-3 w-64" />
        </Card>
      </div>
    </div>
  );
}
