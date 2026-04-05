import { useEffect, useRef, useState } from 'react';
import type { Companion } from '@/store';
import { getFrames, IDLE_SEQ } from './pet-sprites';

const RARITY_STARS: Record<string, string> = {
  common: '★', uncommon: '★★', rare: '★★★', epic: '★★★★', legendary: '★★★★★',
};

const STAT_NAMES = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];

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

  return (
    <div className="select-none">
      {/* Sprite */}
      <div className="relative flex justify-center mb-2 cursor-pointer" onClick={spawnHeart}>
        <pre className="font-mono text-[11px] leading-[1.4] text-foreground/80 text-center">
          {frame.join('\n')}
        </pre>
        {hearts.map((h) => (
          <span
            key={h.id}
            className="absolute top-0 text-[12px] pointer-events-none pet-heart"
            style={{ left: `calc(50% + ${h.x}px)` }}
            onAnimationEnd={() => setHearts((hh) => hh.filter((x) => x.id !== h.id))}
          >♥</span>
        ))}
      </div>

      {/* Name + rarity */}
      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-[13px] font-semibold text-foreground">{companion.name}</span>
        <span className="text-[10px] text-muted-foreground">{companion.species}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mb-1">
        {RARITY_STARS[companion.rarity] ?? '★'} {companion.rarity}
        {companion.shiny && <span className="ml-1 text-yellow-400/80">✦</span>}
      </div>
      <p className="text-[11px] text-muted-foreground/70 italic mb-2 leading-tight line-clamp-2">
        "{companion.personality}"
      </p>

      {/* Stats */}
      <div className="flex flex-col gap-1">
        {STAT_NAMES.map((name) => {
          const val = companion.stats[name] ?? 0;
          return (
            <div key={name} className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-muted-foreground/60 w-[62px] shrink-0">{name}</span>
              <div className="flex-1 h-[3px] rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white/30" style={{ width: `${val}%` }} />
              </div>
              <span className="text-[9px] font-mono text-muted-foreground/60 w-[18px] text-right">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
