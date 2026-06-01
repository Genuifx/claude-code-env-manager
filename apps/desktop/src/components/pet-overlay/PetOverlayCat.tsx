import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import catHoverPuffed from '@/assets/pet/golden-cat-hover-puffed.png';
import catHoverRise from '@/assets/pet/golden-cat-hover-rise.png';
import catStateSprite from '@/assets/pet/golden-cat-imagegen-states.png';
import { cn } from '@/lib/utils';
import type { PetNotificationItem } from '@/types/pet';

type PetCatState = 'idle' | 'thinking' | 'new' | 'confirm' | 'done' | 'error';

interface CatFrame {
  canvas: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
  normalizeScale: number;
}

interface PetOverlayCatProps {
  className?: string;
  onDragStart: () => void;
  notification?: PetNotificationItem | null;
}

const CAT_CANVAS_CSS_SIZE = 256;
const CAT_CANVAS_MAX_PIXEL_RATIO = 3;
const CAT_SOURCE_FRAME_CSS_SIZE = 256;
const CAT_LEGACY_CANVAS_SIZE = 320;
const CAT_LEGACY_VISUAL_SCALE = CAT_CANVAS_CSS_SIZE / CAT_LEGACY_CANVAS_SIZE;
const CAT_FRAME_DRAW_SCALE = 0.66 * CAT_LEGACY_VISUAL_SCALE;
const CAT_BASELINE_INSET = 24 * CAT_LEGACY_VISUAL_SCALE;
const CAT_SPRITE_COLUMNS = 3;
const CAT_SPRITE_ROWS = 2;
const CAT_HOVER_POLL_INTERVAL_MS = 200;
const WINDOW_METRIC_CACHE_MS = 1000;
const THINKING_MESSAGE = '正在思考';
const FRAME_MAP = {
  idle: 0,
  blink: 1,
  thinking: 1,
  new: 3,
  confirm: 4,
  error: 5,
} satisfies Record<string, number>;

const SEQUENCES: Record<PetCatState, Array<{ frame: number; ms: number }>> = {
  idle: [
    { frame: FRAME_MAP.idle, ms: 900 },
    { frame: FRAME_MAP.blink, ms: 150 },
    { frame: FRAME_MAP.idle, ms: 1180 },
  ],
  thinking: [
    { frame: FRAME_MAP.idle, ms: 420 },
    { frame: FRAME_MAP.thinking, ms: 680 },
    { frame: FRAME_MAP.idle, ms: 760 },
  ],
  new: [
    { frame: FRAME_MAP.new, ms: 840 },
    { frame: FRAME_MAP.new, ms: 760 },
  ],
  confirm: [
    { frame: FRAME_MAP.idle, ms: 360 },
    { frame: FRAME_MAP.confirm, ms: 680 },
    { frame: FRAME_MAP.idle, ms: 780 },
  ],
  done: [
    { frame: FRAME_MAP.idle, ms: 460 },
    { frame: FRAME_MAP.blink, ms: 260 },
    { frame: FRAME_MAP.idle, ms: 980 },
  ],
  error: [
    { frame: FRAME_MAP.error, ms: 900 },
    { frame: FRAME_MAP.error, ms: 820 },
  ],
};

let catFrameCache: Promise<CatFrame[]> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function petCatStateForNotification(
  notification?: Pick<PetNotificationItem, 'message' | 'tone'> | null,
): PetCatState {
  if (!notification) return 'idle';
  if (notification.tone === 'failed') return 'error';
  if (notification.tone === 'attention') return 'confirm';
  if (notification.tone === 'done' || notification.tone === 'interrupted') return 'done';
  if (notification.message === THINKING_MESSAGE) return 'thinking';
  return 'new';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load desktop pet sprite'));
    image.src = src;
  });
}

function findAlphaBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      found = true;
    }
  }

  return found ? { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 } : null;
}

function findLargestAlphaComponent(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const directions = [1, 0, -1, 0, 0, 1, 0, -1];
  let best: ReturnType<typeof findAlphaBounds> & { count: number } | null = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (seen[start] || pixels[start * 4 + 3] <= 16) continue;

      seen[start] = 1;
      queue.length = 0;
      queue.push(start);

      let cursor = 0;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (cursor < queue.length) {
        const current = queue[cursor];
        cursor += 1;

        const currentX = current % width;
        const currentY = Math.floor(current / width);
        count += 1;
        minX = Math.min(minX, currentX);
        maxX = Math.max(maxX, currentX);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, currentY);

        for (let index = 0; index < directions.length; index += 2) {
          const nextX = currentX + directions[index];
          const nextY = currentY + directions[index + 1];
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;

          const next = nextY * width + nextX;
          if (seen[next] || pixels[next * 4 + 3] <= 16) continue;

          seen[next] = 1;
          queue.push(next);
        }
      }

      const component = {
        count,
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      };
      if (!best || component.count > best.count) {
        best = component;
      }
    }
  }

  return best;
}

function buildCatFrames(image: HTMLImageElement): CatFrame[] {
  const cellWidth = Math.floor(image.naturalWidth / CAT_SPRITE_COLUMNS);
  const cellHeight = Math.floor(image.naturalHeight / CAT_SPRITE_ROWS);
  const frames = Array.from({ length: CAT_SPRITE_COLUMNS * CAT_SPRITE_ROWS }, (_, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = cellWidth;
    canvas.height = cellHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Desktop pet canvas is unavailable');
    }

    context.drawImage(
      image,
      (index % CAT_SPRITE_COLUMNS) * cellWidth,
      Math.floor(index / CAT_SPRITE_COLUMNS) * cellHeight,
      cellWidth,
      cellHeight,
      0,
      0,
      cellWidth,
      cellHeight,
    );

    const pixels = context.getImageData(0, 0, cellWidth, cellHeight).data;
    const alphaBounds = findAlphaBounds(pixels, cellWidth, cellHeight);
    const bodyBounds = findLargestAlphaComponent(pixels, cellWidth, cellHeight) || alphaBounds;

    if (!bodyBounds) {
      return {
        canvas,
        anchorX: cellWidth / 2,
        anchorY: cellHeight,
        bodyWidth: 1,
        bodyHeight: 1,
      };
    }

    let footMinX = bodyBounds.maxX;
    let footMaxX = bodyBounds.minX;
    const footBandTop = Math.max(bodyBounds.minY, bodyBounds.maxY - Math.round(bodyBounds.height * 0.12));
    for (let y = footBandTop; y <= bodyBounds.maxY; y += 1) {
      for (let x = bodyBounds.minX; x <= bodyBounds.maxX; x += 1) {
        if (pixels[(y * cellWidth + x) * 4 + 3] <= 16) continue;
        footMinX = Math.min(footMinX, x);
        footMaxX = Math.max(footMaxX, x);
      }
    }

    return {
      canvas,
      anchorX: footMinX <= footMaxX ? (footMinX + footMaxX) / 2 : (bodyBounds.minX + bodyBounds.maxX) / 2,
      anchorY: bodyBounds.maxY,
      bodyWidth: bodyBounds.width,
      bodyHeight: bodyBounds.height,
    };
  });

  const reference = frames[FRAME_MAP.idle] || { bodyWidth: 1, bodyHeight: 1 };
  return frames.map((frame) => ({
    canvas: frame.canvas,
    anchorX: frame.anchorX,
    anchorY: frame.anchorY,
    normalizeScale: clamp(
      ((reference.bodyWidth / Math.max(1, frame.bodyWidth)) + (reference.bodyHeight / Math.max(1, frame.bodyHeight))) / 2,
      0.985,
      1.015,
    ),
  }));
}

function getCatFrames(): Promise<CatFrame[]> {
  catFrameCache ??= loadImage(catStateSprite).then(buildCatFrames);
  return catFrameCache;
}

function catCanvasPixelRatio(): number {
  return clamp(window.devicePixelRatio || 1, 1, CAT_CANVAS_MAX_PIXEL_RATIO);
}

function resizeCatCanvasForPixelRatio(canvas: HTMLCanvasElement): number {
  const pixelRatio = catCanvasPixelRatio();
  const width = Math.round(CAT_CANVAS_CSS_SIZE * pixelRatio);
  const height = Math.round(CAT_CANVAS_CSS_SIZE * pixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return pixelRatio;
}

function drawCatFrame(canvas: HTMLCanvasElement, frame: CatFrame) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const pixelRatio = resizeCatCanvasForPixelRatio(canvas);
  const logicalWidth = canvas.width / pixelRatio;
  const logicalHeight = canvas.height / pixelRatio;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(pixelRatio, pixelRatio);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const sourcePixelRatio = frame.canvas.width / CAT_SOURCE_FRAME_CSS_SIZE;
  const scale = (CAT_FRAME_DRAW_SCALE / sourcePixelRatio) * frame.normalizeScale;
  const width = frame.canvas.width * scale;
  const height = frame.canvas.height * scale;
  const x = logicalWidth * 0.5 - frame.anchorX * scale;
  const y = logicalHeight - CAT_BASELINE_INSET - frame.anchorY * scale;
  context.drawImage(frame.canvas, x, y, width, height);
  context.restore();
}

export function PetOverlayCat({ className, notification, onDragStart }: PetOverlayCatProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitAreaRef = useRef<HTMLDivElement | null>(null);
  const [isFurRaised, setIsFurRaised] = useState(false);
  const catState = useMemo(() => petCatStateForNotification(notification), [notification]);

  useEffect(() => {
    let cancelled = false;
    let animationFrame = 0;
    let stepIndex = 0;
    let lastTick = 0;

    const animate = (frames: CatFrame[], now: number) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const sequence = SEQUENCES[catState];
      const item = sequence[stepIndex];

      if (!lastTick) {
        lastTick = now;
      }
      if (now - lastTick >= item.ms) {
        stepIndex = (stepIndex + 1) % sequence.length;
        lastTick = now;
      }

      if (canvas) {
        drawCatFrame(canvas, frames[sequence[stepIndex].frame] || frames[FRAME_MAP.idle]);
      }
      animationFrame = window.requestAnimationFrame((nextNow) => animate(frames, nextNow));
    };

    void getCatFrames()
      .then((frames) => {
        if (cancelled) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const canvas = canvasRef.current;
          if (canvas) {
            drawCatFrame(canvas, frames[SEQUENCES[catState][0].frame] || frames[FRAME_MAP.idle]);
          }
          return;
        }
        animationFrame = window.requestAnimationFrame((now) => animate(frames, now));
      })
      .catch((error) => {
        console.debug('Desktop pet sprite animation skipped:', error);
      });

    return () => {
      cancelled = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [catState]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let cancelled = false;
    let disabled = false;
    let polling = false;
    let cachedWindowMetrics: {
      x: number;
      y: number;
      scaleFactor: number;
      sampledAt: number;
    } | null = null;

    const readWindowMetrics = async () => {
      const now = Date.now();
      if (cachedWindowMetrics && now - cachedWindowMetrics.sampledAt <= WINDOW_METRIC_CACHE_MS) {
        return cachedWindowMetrics;
      }

      const [windowPosition, scaleFactor] = await Promise.all([
        appWindow.innerPosition(),
        appWindow.scaleFactor(),
      ]);
      cachedWindowMetrics = {
        x: windowPosition.x,
        y: windowPosition.y,
        scaleFactor,
        sampledAt: now,
      };
      return cachedWindowMetrics;
    };

    const pollGlobalHover = async () => {
      if (cancelled || disabled || polling) {
        return;
      }

      const hitArea = hitAreaRef.current;
      if (!hitArea) {
        return;
      }

      polling = true;
      try {
        const [cursor, windowMetrics] = await Promise.all([
          cursorPosition(),
          readWindowMetrics(),
        ]);
        if (cancelled) {
          return;
        }

        const rect = hitArea.getBoundingClientRect();
        const localX = (cursor.x - windowMetrics.x) / windowMetrics.scaleFactor;
        const localY = (cursor.y - windowMetrics.y) / windowMetrics.scaleFactor;
        const nextIsFurRaised = (
          localX >= rect.left
          && localX <= rect.right
          && localY >= rect.top
          && localY <= rect.bottom
        );

        setIsFurRaised((current) => (
          current === nextIsFurRaised ? current : nextIsFurRaised
        ));
      } catch (error) {
        disabled = true;
        console.debug('Desktop pet global hover skipped:', error);
      } finally {
        polling = false;
      }
    };

    void pollGlobalHover();
    const interval = window.setInterval(() => {
      void pollGlobalHover();
    }, CAT_HOVER_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    onDragStart();
    void getCurrentWindow().startDragging().catch((error) => {
      console.debug('Desktop pet drag skipped:', error);
    });
  };

  return (
    <div
      className={cn(
        'pet-overlay-cat pointer-events-none h-[256px] w-[256px]',
        className ?? '-ml-[72px]',
      )}
      data-fur-raised={isFurRaised ? 'true' : 'false'}
      data-cat-state={catState}
      role="img"
      aria-label="桌面猫"
    >
      <div className="pet-overlay-cat__base">
        <canvas
          ref={canvasRef}
          width={CAT_CANVAS_CSS_SIZE}
          height={CAT_CANVAS_CSS_SIZE}
          className="h-full w-full select-none"
          aria-hidden="true"
        />
      </div>
      <div className="pet-overlay-cat__hover-fur" aria-hidden="true">
        <img
          alt=""
          className="pet-overlay-cat__hover-frame pet-overlay-cat__hover-frame-rise"
          draggable={false}
          src={catHoverRise}
        />
        <img
          alt=""
          className="pet-overlay-cat__hover-frame pet-overlay-cat__hover-frame-puffed"
          draggable={false}
          src={catHoverPuffed}
        />
      </div>
      <div
        ref={hitAreaRef}
        className="pet-overlay-cat__hit-area"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerEnter={() => setIsFurRaised(true)}
        onPointerLeave={() => setIsFurRaised(false)}
      />
    </div>
  );
}
