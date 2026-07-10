export const WORKSPACE_SIDEBAR_WIDTH_STORAGE_KEY = 'ccem-workspace-sidebar-width';
export const WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX = 280;
export const WORKSPACE_SIDEBAR_MIN_WIDTH_PX = 220;
export const WORKSPACE_SIDEBAR_MAX_WIDTH_PX = 420;

export function clampWorkspaceSidebarWidth(value: unknown): number {
  const width = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(width)) {
    return WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX;
  }
  return Math.min(
    WORKSPACE_SIDEBAR_MAX_WIDTH_PX,
    Math.max(WORKSPACE_SIDEBAR_MIN_WIDTH_PX, width),
  );
}

export function calculateWorkspaceSidebarWidth({
  layoutLeft,
  pointerClientX,
}: {
  layoutLeft: number;
  pointerClientX: number;
}): number {
  return clampWorkspaceSidebarWidth(pointerClientX - layoutLeft);
}
