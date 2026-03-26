import { useState, useEffect, useRef } from 'react';
import { getPerformanceMode } from '@/lib/performance';

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(() => (
    getPerformanceMode() === 'reduced' ? target : 0
  ));
  const startRef = useRef(getPerformanceMode() === 'reduced' ? target : 0);
  const currentRef = useRef(getPerformanceMode() === 'reduced' ? target : 0);

  useEffect(() => {
    if (getPerformanceMode() === 'reduced') {
      startRef.current = target;
      currentRef.current = target;
      setValue(target);
      return;
    }

    const start = startRef.current;
    const delta = target - start;
    if (delta === 0) return;
    const startTime = performance.now();
    let rafId: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + delta * eased);
      currentRef.current = current;
      setValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        startRef.current = target;
      }
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      startRef.current = currentRef.current; // preserve visual position on interruption
    };
  }, [target, duration]);

  return value;
}
