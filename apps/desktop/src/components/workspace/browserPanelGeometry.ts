export interface BrowserFrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface NativeBrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_BROWSER_BOUNDS_ZOOM = 0.5;
const MAX_BROWSER_BOUNDS_ZOOM = 1.3;
const DEFAULT_BROWSER_BOUNDS_ZOOM = 1;

export function normalizeBrowserBoundsZoom(value: unknown): number {
  const zoom = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(zoom)) {
    return DEFAULT_BROWSER_BOUNDS_ZOOM;
  }
  return Math.min(MAX_BROWSER_BOUNDS_ZOOM, Math.max(MIN_BROWSER_BOUNDS_ZOOM, zoom));
}

export function buildNativeBrowserBounds(
  rect: BrowserFrameRect,
  zoom: unknown = 1,
): NativeBrowserBounds {
  const scale = normalizeBrowserBoundsZoom(zoom);
  return {
    x: rect.left / scale,
    y: rect.top / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}
