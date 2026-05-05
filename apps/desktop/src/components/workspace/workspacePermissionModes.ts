import type { PermissionModeName } from '@ccem/core/browser';

export type WorkspacePermissionModeName = PermissionModeName;

const CCEM_PERMISSION_MODE_NAMES = new Set<string>([
  'yolo',
  'dev',
  'readonly',
  'safe',
  'ci',
  'audit',
]);

const WORKSPACE_PERMISSION_MODE_ALIASES: Record<string, WorkspacePermissionModeName> = {
  bypassPermissions: 'yolo',
  acceptEdits: 'dev',
  default: 'dev',
  auto: 'dev',
  dontAsk: 'safe',
  'danger-full-access': 'yolo',
  'workspace-write': 'dev',
  'read-only': 'readonly',
};

export const WORKSPACE_PERMISSION_MODE_DISPLAY_NAMES: Record<WorkspacePermissionModeName, string> = {
  yolo: 'YOLO',
  dev: 'Developer',
  readonly: 'Read Only',
  safe: 'Safe',
  ci: 'CI / CD',
  audit: 'Audit',
};

export function normalizeWorkspacePermissionModeName(
  mode: string | null | undefined,
  fallback: string | null | undefined = 'dev',
): WorkspacePermissionModeName {
  const normalizedFallback = resolveKnownWorkspacePermissionModeName(fallback) ?? 'dev';
  if (!mode) {
    return normalizedFallback;
  }

  return resolveKnownWorkspacePermissionModeName(mode) ?? normalizedFallback;
}

function resolveKnownWorkspacePermissionModeName(
  mode: string | null | undefined,
): WorkspacePermissionModeName | null {
  if (!mode) {
    return null;
  }

  if (CCEM_PERMISSION_MODE_NAMES.has(mode)) {
    return mode as PermissionModeName;
  }

  return WORKSPACE_PERMISSION_MODE_ALIASES[mode] ?? null;
}

export function getWorkspacePermissionModeDisplayName(mode: WorkspacePermissionModeName) {
  return WORKSPACE_PERMISSION_MODE_DISPLAY_NAMES[mode];
}
