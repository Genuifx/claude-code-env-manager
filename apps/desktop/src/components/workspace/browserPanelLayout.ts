export const BROWSER_PANEL_WIDTH_STORAGE_KEY = 'ccem-browser-panel-width-percent';
export const BROWSER_PANEL_DEFAULT_WIDTH_PERCENT = 50;
export const BROWSER_PANEL_MIN_WIDTH_PERCENT = 30;
export const BROWSER_PANEL_MAX_WIDTH_PERCENT = 60;
export const BROWSER_PANEL_MIN_WIDTH_PX = 360;

export function clampBrowserPanelWidthPercent(value: unknown): number {
  const width = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(width)) {
    return BROWSER_PANEL_DEFAULT_WIDTH_PERCENT;
  }
  return Math.min(
    BROWSER_PANEL_MAX_WIDTH_PERCENT,
    Math.max(BROWSER_PANEL_MIN_WIDTH_PERCENT, width),
  );
}

export function calculateBrowserPanelWidthPercent({
  layoutWidth,
  layoutRight,
  pointerClientX,
}: {
  layoutWidth: number;
  layoutRight: number;
  pointerClientX: number;
}): number {
  if (!Number.isFinite(layoutWidth) || layoutWidth <= 0) {
    return BROWSER_PANEL_DEFAULT_WIDTH_PERCENT;
  }
  const nextWidth = ((layoutRight - pointerClientX) / layoutWidth) * 100;
  return clampBrowserPanelWidthPercent(nextWidth);
}
