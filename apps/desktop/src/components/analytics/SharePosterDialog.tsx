import { useEffect, useId, useRef, useState } from 'react';
import { domToPng } from 'modern-screenshot';
import { QRCodeSVG } from 'qrcode.react';
import { invoke } from '@tauri-apps/api/core';
import { Copy, Download, Loader2, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/locales';
import { formatTokens } from '@/lib/utils';
import type { DailyActivity, TokenUsage, UsageStats } from '@/types/analytics';

/* ── Types ── */

interface SharePosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usageStats: UsageStats;
  dailyActivities: DailyActivity[];
  streakDays: number;
}

type PosterTheme = 'dark' | 'light';

interface ThemeColors {
  bg: string;
  glowA: string;
  glowB: string;
  text: string;
  textSub: string;
  textMuted: string;
  labelColor: string;
  divider: string;
  cardBg: string;
  cardBorder: string;
  footerBorder: string;
  heroGlow: string;
  qrBg: string;
  qrFg: string;
  avatarTextColor: string;
  accentBrand: string;
  sparkStroke: string;
  sparkFillFrom: string;
  waveBase: [number, number, number]; // rgb
  waveHighGradTop: string;
}

interface PosterCardProps {
  chartIdPrefix: string;
  dailyActivities: DailyActivity[];
  dateRange: string;
  osInfo: string;
  streakDays: number;
  totalTokens: number;
  theme: PosterTheme;
  usageStats: UsageStats;
  username: string;
  weeklyTokens: number;
}

/* ── Constants ── */

const GITHUB_URL = 'https://github.com/Genuifx/claude-code-env-manager';
const POSTER_W = 440;
const POSTER_H = 720;
const PREVIEW_SCALE_CAP = 0.78;

const THEMES: Record<PosterTheme, ThemeColors> = {
  dark: {
    bg: '#070c18',
    glowA: 'rgba(56,189,248,0.10)',
    glowB: 'rgba(167,139,250,0.08)',
    text: '#f8fafc',
    textSub: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.55)',
    labelColor: 'rgba(148,163,184,0.55)',
    divider: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.25) 20%, rgba(167,139,250,0.25) 80%, transparent)',
    cardBg: 'rgba(15,23,42,0.55)',
    cardBorder: 'rgba(255,255,255,0.05)',
    footerBorder: 'rgba(255,255,255,0.05)',
    heroGlow: 'rgba(56,189,248,0.12)',
    qrBg: 'rgba(255,255,255,0.94)',
    qrFg: '#0f172a',
    avatarTextColor: '#070c18',
    accentBrand: '#38bdf8',
    sparkStroke: '#38bdf8',
    sparkFillFrom: '#38bdf8',
    waveBase: [56, 189, 248],
    waveHighGradTop: '#7dd3fc',
  },
  light: {
    bg: '#f8fafc',
    glowA: 'rgba(56,189,248,0.12)',
    glowB: 'rgba(167,139,250,0.10)',
    text: '#0f172a',
    textSub: '#1e293b',
    textMuted: 'rgba(71,85,105,0.65)',
    labelColor: 'rgba(71,85,105,0.6)',
    divider: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.2) 20%, rgba(167,139,250,0.2) 80%, transparent)',
    cardBg: 'rgba(241,245,249,0.7)',
    cardBorder: 'rgba(0,0,0,0.06)',
    footerBorder: 'rgba(0,0,0,0.06)',
    heroGlow: 'rgba(56,189,248,0.08)',
    qrBg: '#ffffff',
    qrFg: '#0f172a',
    avatarTextColor: '#ffffff',
    accentBrand: '#0284c7',
    sparkStroke: '#0284c7',
    sparkFillFrom: '#0ea5e9',
    waveBase: [14, 165, 233],
    waveHighGradTop: '#38bdf8',
  },
};

const ACCENT_COLORS = {
  dark: ['#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f472b6'],
  light: ['#0284c7', '#7c3aed', '#059669', '#ea580c', '#db2777'],
};

const MODEL_LEGEND_COLORS = {
  dark: 'rgba(148,163,184,0.75)',
  light: 'rgba(71,85,105,0.7)',
};

/* ── Helpers ── */

function sumTokens(usage: TokenUsage): number {
  return usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
}

function buildPosterFileName() {
  return `ccem-weekly-${new Date().toISOString().slice(0, 10)}.png`;
}

function formatPosterRange(dailyActivities: DailyActivity[]): string {
  const last7 = dailyActivities.slice(-7);
  const formatDate = (value: string) => {
    const date = new Date(value);
    return `${date.getMonth() + 1}.${date.getDate()}`;
  };
  if (last7.length > 0) {
    return `${formatDate(last7[0].date)} – ${formatDate(last7[last7.length - 1].date)}`;
  }
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return `${start.getMonth() + 1}.${start.getDate()} – ${end.getMonth() + 1}.${end.getDate()}`;
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function formatLargeNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shortenModel(name: string) {
  return name
    .replace('claude-', '')
    .replace('anthropic/', '')
    .replace('-latest', '')
    .replace('-20250', '');
}

/* ── Activity Waveform (Canvas) ── */

function PosterWaveform({ activities, theme }: { activities: DailyActivity[]; theme: PosterTheme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last30 = activities.slice(-30);
  const bars = last30.length > 0 ? last30 : Array.from({ length: 30 }, () => ({ level: 0 as const }));

  const barW = 10;
  const gap = 2;
  const totalW = bars.length * barW + (bars.length - 1) * gap + 8;
  const totalH = 54;
  const dpr = 3;
  const heights = [5, 14, 24, 38, 50];
  const tc = THEMES[theme];
  const [r, g, b] = tc.waveBase;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalW, totalH);

    const alphas = [0.15, 0.35, 0.58, 0.80, 1.0];

    bars.forEach((activity, i) => {
      const level = 'level' in activity ? activity.level : 0;
      const h = heights[level];
      const x = 4 + i * (barW + gap);
      const y = totalH - h;
      const rad = Math.min(3, h / 2);
      const isHigh = level >= 3;

      if (isHigh) {
        ctx.save();
        ctx.shadowColor = `rgba(${r},${g},${b},0.45)`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
        roundRect(ctx, x, y, barW, h, rad);
        ctx.fill();
        ctx.restore();
      }

      if (isHigh) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, tc.waveHighGradTop);
        grad.addColorStop(1, `rgba(${r},${g},${b},${alphas[level]})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = `rgba(${r},${g},${b},${alphas[level]})`;
      }

      roundRect(ctx, x, y, barW, h, rad);
      ctx.fill();
    });
  }, [bars, theme]);

  return <canvas ref={canvasRef} style={{ width: totalW, height: totalH, display: 'block' }} />;
}

/* ── Sparkline ── */

function PosterSparkline({ activities, idPrefix, theme }: { activities: DailyActivity[]; idPrefix: string; theme: PosterTheme }) {
  const last7 = activities.slice(-7);
  if (last7.length === 0) return null;

  const tc = THEMES[theme];
  const maxTokens = Math.max(...last7.map((a) => a.tokens), 1);
  const w = 384;
  const h = 76;
  const padY = 4;
  const chartH = h - padY * 2;
  const gradId = `${idPrefix}-spark-grad`;
  const glowId = `${idPrefix}-spark-glow`;

  const points = last7.map((a, i) => ({
    x: (i / Math.max(last7.length - 1, 1)) * w,
    y: padY + chartH - (a.tokens / maxTokens) * chartH,
  }));

  const bezier = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) * 0.4;
    const cpx2 = pt.x - (pt.x - prev.x) * 0.4;
    return `${acc} C${cpx1},${prev.y} ${cpx2},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const area = `${bezier} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tc.sparkFillFrom} stopOpacity={0.28} />
          <stop offset="100%" stopColor={tc.sparkFillFrom} stopOpacity={0.02} />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={bezier} fill="none" stroke={tc.sparkStroke} strokeWidth={2} filter={`url(#${glowId})`} />
    </svg>
  );
}

/* ── Segmented Model Bar ── */

function PosterModelBar({ byModel, theme }: { byModel: UsageStats['byModel']; theme: PosterTheme }) {
  const { t } = useLocale();
  const models = Object.entries(byModel)
    .map(([name, usage]) => ({ name, tokens: sumTokens(usage) }))
    .sort((a, b) => b.tokens - a.tokens);

  if (models.length === 0) {
    return (
      <div style={{ fontSize: 11, color: THEMES[theme].textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
        {t('analytics.shareNoModelData')}
      </div>
    );
  }

  const total = models.reduce((sum, m) => sum + m.tokens, 0);
  const colors = ACCENT_COLORS[theme];
  const topModels = models.slice(0, 4);
  const otherTokens = models.slice(4).reduce((sum, m) => sum + m.tokens, 0);
  const segments = otherTokens > 0 ? [...topModels, { name: `+${models.length - 4}`, tokens: otherTokens }] : topModels;

  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
        {segments.map((seg, i) => {
          const pct = (seg.tokens / total) * 100;
          const color = colors[i % colors.length];
          return (
            <div
              key={seg.name}
              style={{
                width: `${Math.max(pct, 2)}%`,
                height: '100%',
                background: color,
                filter: `drop-shadow(0 0 6px ${color}44)`,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 12, marginTop: 8, overflow: 'hidden' }}>
        {segments.map((seg, i) => {
          const color = colors[i % colors.length];
          const pct = Math.round((seg.tokens / total) * 100);
          return (
            <div key={seg.name} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: MODEL_LEGEND_COLORS[theme],
                  whiteSpace: 'nowrap',
                }}
              >
                {shortenModel(seg.name)} <span style={{ color }}>{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Poster Card ── */

function PosterCard({
  chartIdPrefix,
  dailyActivities,
  dateRange,
  osInfo,
  streakDays,
  totalTokens,
  theme,
  usageStats,
  username,
  weeklyTokens,
}: PosterCardProps) {
  const { t } = useLocale();
  const tc = THEMES[theme];
  const accents = ACCENT_COLORS[theme];

  const sectionLabel = {
    fontSize: 10,
    fontWeight: 600 as const,
    color: tc.labelColor,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 10,
  };

  const heroGradient = theme === 'dark'
    ? 'linear-gradient(135deg, #f8fafc 10%, #38bdf8 55%, #a78bfa 100%)'
    : 'linear-gradient(135deg, #0f172a 10%, #0284c7 55%, #7c3aed 100%)';

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        position: 'relative',
        overflow: 'hidden',
        background: tc.bg,
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        color: tc.textSub,
      }}
    >
      {/* Background glows */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(500px circle at 15% 18%, ${tc.glowA}, transparent 70%), radial-gradient(400px circle at 85% 82%, ${tc.glowB}, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '24px 28px 20px',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: tc.avatarTextColor,
              }}
            >
              {(username || 'D')[0].toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: tc.text,
                  letterSpacing: '0.02em',
                }}
              >
                {username || 'developer'}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: tc.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: 'nowrap',
                }}
              >
                {osInfo} · {dateRange}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: tc.accentBrand,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            CCEM
          </div>
        </div>

        {/* Gradient divider */}
        <div style={{ height: 1, margin: '14px 0 20px', background: tc.divider }} />

        {/* ── Hero Number ── */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 280,
              height: 80,
              background: `radial-gradient(circle, ${tc.heroGlow}, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              fontSize: 36,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '-0.02em',
              background: heroGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1,
            }}
          >
            {formatLargeNumber(weeklyTokens)}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: tc.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
            }}
          >
            tokens this week
          </div>
        </div>

        {/* ── Activity Waveform ── */}
        <div style={{ marginBottom: 22 }}>
          <div style={sectionLabel}>{t('analytics.share30dActivity')}</div>
          <PosterWaveform activities={dailyActivities} theme={theme} />
        </div>

        {/* ── Three Stat Cards ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {[
            { color: accents[0], value: `$${usageStats.total.cost.toFixed(2)}`, label: t('analytics.shareTotalCost') },
            { color: accents[1], value: `${streakDays}`, label: t('analytics.shareStreak') },
            { color: accents[2], value: formatTokens(totalTokens), label: t('analytics.shareTotalTokens') },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                padding: '12px 10px 10px',
                borderRadius: 12,
                background: tc.cardBg,
                border: `1px solid ${tc.cardBorder}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '15%',
                  right: '15%',
                  height: 2,
                  borderRadius: '0 0 2px 2px',
                  background: stat.color,
                  filter: `drop-shadow(0 0 8px ${stat.color}55)`,
                }}
              />
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: stat.color,
                  letterSpacing: '-0.01em',
                }}
              >
                {stat.value}
              </div>
              <div style={{ marginTop: 3, fontSize: 9, color: tc.textMuted, letterSpacing: '0.03em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Sparkline ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={sectionLabel}>{t('analytics.share7dTokens')}</div>
          <PosterSparkline activities={dailyActivities} idPrefix={chartIdPrefix} theme={theme} />
        </div>

        {/* ── Model Bar ── */}
        <div style={{ marginBottom: 'auto' }}>
          <div style={sectionLabel}>{t('analytics.shareTopModels')}</div>
          <PosterModelBar byModel={usageStats.byModel} theme={theme} />
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingTop: 14,
            borderTop: `1px solid ${tc.footerBorder}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme === 'dark' ? 'rgba(56,189,248,0.75)' : tc.accentBrand,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.06em',
              }}
            >
              {t('analytics.sharePoweredBy')}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 9,
                color: tc.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              github.com/Genuifx/claude-code-env-manager
            </div>
          </div>
          <div style={{ padding: 4, borderRadius: 8, background: tc.qrBg }}>
            <QRCodeSVG value={GITHUB_URL} size={48} level="M" bgColor="transparent" fgColor={tc.qrFg} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dialog ── */

export function SharePosterDialog({
  open,
  onOpenChange,
  usageStats,
  dailyActivities,
  streakDays,
}: SharePosterDialogProps) {
  const { t } = useLocale();
  const exportPosterRef = useRef<HTMLDivElement>(null);
  const previewShellRef = useRef<HTMLDivElement>(null);
  const [pendingAction, setPendingAction] = useState<'copy' | 'save' | null>(null);
  const [previewScale, setPreviewScale] = useState(PREVIEW_SCALE_CAP);
  const [username, setUsername] = useState('');
  const [osInfo, setOsInfo] = useState('');
  const [posterTheme, setPosterTheme] = useState<PosterTheme>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );
  const previewId = useId().replace(/:/g, '');
  const exportId = useId().replace(/:/g, '');

  const totalTokens = sumTokens(usageStats.total);
  const weeklyTokens = sumTokens(usageStats.week);
  const dateRange = formatPosterRange(dailyActivities);

  useEffect(() => {
    if (!open) return;
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) setOsInfo('macOS');
    else if (ua.includes('Windows')) setOsInfo('Windows');
    else if (ua.includes('Linux')) setOsInfo('Linux');
    else setOsInfo('Unknown OS');

    invoke<string>('get_system_username')
      .then(setUsername)
      .catch(() => setUsername('developer'));

    setPosterTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  }, [open]);

  useEffect(() => {
    if (!open || !previewShellRef.current) return;
    const updateScale = () => {
      const containerWidth = previewShellRef.current?.clientWidth ?? POSTER_W;
      if (containerWidth <= 0) return;
      setPreviewScale(Math.min(PREVIEW_SCALE_CAP, containerWidth / POSTER_W));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(previewShellRef.current);
    return () => observer.disconnect();
  }, [open]);

  const buildPosterDataUrl = async () => {
    if (!exportPosterRef.current) throw new Error(t('analytics.shareGenerateFailed'));
    if (document.fonts?.ready) await document.fonts.ready;
    return domToPng(exportPosterRef.current, {
      backgroundColor: THEMES[posterTheme].bg,
      scale: 3,
    });
  };

  const handleSave = async () => {
    setPendingAction('save');
    try {
      const dataUrl = await buildPosterDataUrl();
      const saved = await invoke<boolean>('save_image_dialog', {
        base64Png: dataUrl.split(',')[1],
        defaultName: buildPosterFileName(),
      });
      if (saved) toast.success(t('analytics.shareSaved'));
    } catch (error) {
      toast.error(t('analytics.shareSaveFailed').replace('{error}', String(error)));
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopy = async () => {
    setPendingAction('copy');
    try {
      const dataUrl = await buildPosterDataUrl();
      const base64Png = dataUrl.split(',')[1];
      try {
        await invoke('copy_image_to_clipboard', { base64Png });
      } catch (nativeError) {
        if (!navigator.clipboard?.write || !window.ClipboardItem) throw nativeError;
        const blob = await dataUrlToBlob(dataUrl);
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      }
      toast.success(t('analytics.shareCopied'));
    } catch (error) {
      toast.error(t('analytics.shareCopyFailed').replace('{error}', String(error)));
    } finally {
      setPendingAction(null);
    }
  };

  const isBusy = pendingAction !== null;

  const posterProps = {
    dailyActivities,
    dateRange,
    osInfo,
    streakDays,
    totalTokens,
    theme: posterTheme,
    usageStats,
    username,
    weeklyTokens,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-auto max-w-[500px] flex-col gap-0 overflow-hidden border-none bg-transparent p-0 shadow-none sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('analytics.sharePoster')}</DialogTitle>
          <DialogDescription>{t('analytics.shareDialogHint')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div ref={previewShellRef} className="flex justify-center">
            <div
              className="overflow-hidden rounded-2xl"
              style={{ height: POSTER_H * previewScale, width: POSTER_W * previewScale }}
            >
              <div
                style={{
                  height: POSTER_H,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  width: POSTER_W,
                }}
              >
                <PosterCard chartIdPrefix={`preview-${previewId}`} {...posterProps} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-white/10 bg-white/5 text-white/80 backdrop-blur-sm hover:bg-white/10"
            onClick={() => setPosterTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          >
            {posterTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full border-white/10 bg-white/5 text-white/80 backdrop-blur-sm hover:bg-white/10"
            disabled={isBusy}
            onClick={() => void handleCopy()}
          >
            {pendingAction === 'copy' ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('analytics.shareCopying')}</>
            ) : (
              <><Copy className="h-4 w-4" />{t('analytics.shareCopyImage')}</>
            )}
          </Button>

          <Button
            type="button"
            className="gap-2 rounded-full"
            disabled={isBusy}
            onClick={() => void handleSave()}
          >
            {pendingAction === 'save' ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('analytics.shareSaving')}</>
            ) : (
              <><Download className="h-4 w-4" />{t('analytics.shareSaveImage')}</>
            )}
          </Button>
        </div>

        <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0">
          <div ref={exportPosterRef}>
            <PosterCard chartIdPrefix={`export-${exportId}`} {...posterProps} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
