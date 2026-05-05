import {
  normalizeClaudePermissionMode,
  type ClaudePermissionMode,
  type ClaudePermissionSettings,
} from './permissionModes';

export type ClaudePermissionModeController = {
  setPermissionMode: (mode: ClaudePermissionMode) => Promise<void>;
};

export async function applyClaudePermissionModeToQuery(
  query: ClaudePermissionModeController | null,
  permMode: string,
): Promise<ClaudePermissionSettings> {
  const permission = normalizeClaudePermissionMode(permMode);
  if (query) {
    await query.setPermissionMode(permission.permissionMode);
  }
  return permission;
}
