import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  duration?: number;
  onLongPress: () => void;
  onProgress?: (p: number) => void;
  onCancel?: () => void;
}

export function useLongPress({
  duration = 600,
  onLongPress,
  onProgress,
  onCancel,
}: UseLongPressOptions) {
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    startRef.current = 0;
    onProgress?.(0);
    onCancel?.();
  }, [onProgress, onCancel]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      firedRef.current = false;
      startRef.current = performance.now();

      function tick(now: number) {
        const elapsed = now - startRef.current;
        const p = Math.min(elapsed / duration, 1);
        onProgress?.(p);
        if (p >= 1) {
          firedRef.current = true;
          rafRef.current = 0;
          onLongPress();
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [duration, onLongPress, onProgress],
  );

  const onPointerUp = useCallback(() => cancel(), [cancel]);
  const onPointerLeave = useCallback(() => cancel(), [cancel]);
  const onPointerCancel = useCallback(() => cancel(), [cancel]);

  return {
    handlers: { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel },
    firedRef,
  };
}
