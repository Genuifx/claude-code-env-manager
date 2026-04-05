import { useEffect, useRef, useState } from 'react';
import type { Companion } from '@/store';
import { getFrames, IDLE_SEQ } from './pet-sprites';

/* ── Rarity palettes (2-tone pixel style) ── */
const RARITY_PALETTE: Record<string, { fg: string; bg: string; dim: string }> = {
  common:    { fg: '#c8d0d8', bg: '#4a5568', dim: '#2d3748' },
  uncommon:  { fg: '#68ffb0', bg: '#276749', dim: '#1a4731' },
  rare:      { fg: '#63b3ed', bg: '#2b6cb0', dim: '#1a365d' },
  epic:      { fg: '#d6bcfa', bg: '#6b46c1', dim: '#44337a' },
  legendary: { fg: '#fefcbf', bg: '#b7791f', dim: '#744210' },
};

const STAT_ORDER = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'] as const;
const STAT_ICON: Record<string, string> = {
  DEBUGGING: '♦', PATIENCE: '♠', CHAOS: '♣', WISDOM: '♥', SNARK: '◆',
};

/* ── Pixel stat row ── */
function StatRow({ name, value, fg, bg }: { name: string; value: number; fg: string; bg: string }) {
  const filled = Math.round((value / 100) * 8);
  return (
    <div className="pet-stat-row">
      <span className="pet-stat-icon" style={{ color: fg }}>{STAT_ICON[name]}</span>
      <span className="pet-stat-name">{name.slice(0, 3)}</span>
      <div className="pet-stat-blocks">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="pet-stat-block"
            style={{ background: i < filled ? fg : bg }}
          />
        ))}
      </div>
      <span className="pet-stat-val" style={{ color: fg }}>{value}</span>
    </div>
  );
}

interface Heart { id: number; x: number }

export function PetPanel({ companion }: { companion: Companion }) {
  const tickRef = useRef(0);
  const [frameIdx, setFrameIdx] = useState(0);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const heartId = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current = (tickRef.current + 1) % IDLE_SEQ.length;
      setFrameIdx(IDLE_SEQ[tickRef.current]!);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const spawnHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = heartId.current++;
    setHearts((h) => [...h, { id, x: Math.random() * 40 - 20 }]);
  };

  const frames = getFrames(companion.species);
  const frame = frames[frameIdx] ?? frames[0]!;
  const pal = RARITY_PALETTE[companion.rarity] ?? RARITY_PALETTE.common;
  const hp = Math.round(Object.values(companion.stats).reduce((a, b) => a + b, 0) / STAT_ORDER.length);

  return (
    <div
      className="pet-card select-none"
      style={{ '--pet-fg': pal.fg, '--pet-bg': pal.bg, '--pet-dim': pal.dim } as React.CSSProperties}
    >
      {/* ── RPG window frame ── */}
      <div className="pet-frame">
        <div className="pet-frame-inner">

          {/* Title bar */}
          <div className="pet-titlebar">
            <span className="pet-title">{companion.name.toUpperCase()}</span>
            <span className="pet-rarity">{companion.rarity.toUpperCase()}</span>
          </div>

          {/* Sprite viewport — dark "screen" area */}
          <div className="pet-screen" onClick={spawnHeart}>
            {/* Checkerboard grass floor */}
            <div className="pet-ground" />

            <pre className="pet-sprite" style={{ color: pal.fg }}>
              {frame.join('\n')}
            </pre>

            {/* Species label */}
            <div className="pet-species-tag" style={{ background: pal.dim, color: pal.fg }}>
              {companion.species}
              {companion.shiny && <span className="pet-shiny-star">★</span>}
            </div>

            {hearts.map((h) => (
              <span
                key={h.id}
                className="absolute text-[14px] pointer-events-none pet-heart"
                style={{ left: `calc(50% + ${h.x}px)`, top: '8px', color: pal.fg }}
                onAnimationEnd={() => setHearts((hh) => hh.filter((x) => x.id !== h.id))}
              >♥</span>
            ))}
          </div>

          {/* HP section */}
          <div className="pet-hp-section">
            <div className="pet-hp-row">
              <span className="pet-hp-text">HP</span>
              <div className="pet-hp-bar-outer">
                <div
                  className="pet-hp-bar-fill"
                  style={{
                    width: `${hp}%`,
                    background: hp > 50 ? '#68ffb0' : hp > 25 ? '#fefcbf' : '#fc8181',
                  }}
                />
              </div>
              <span className="pet-hp-num">{hp}/100</span>
            </div>
          </div>

          {/* Personality — RPG dialogue style */}
          <div className="pet-dialogue">
            <span className="pet-dialogue-arrow">▶</span>
            <p className="pet-dialogue-text">"{companion.personality}"</p>
          </div>

          {/* Stats grid — RPG menu style */}
          <div className="pet-stats-section">
            <div className="pet-stats-header">─ STATS ─</div>
            {STAT_ORDER.map((name) => (
              <StatRow key={name} name={name} value={companion.stats[name] ?? 0} fg={pal.fg} bg={pal.dim} />
            ))}
          </div>

          {/* Footer — pixel ID */}
          <div className="pet-footer">
            No.{String(companion.hatchedAt % 9999).padStart(4, '0')}
          </div>

        </div>
      </div>
    </div>
  );
}
