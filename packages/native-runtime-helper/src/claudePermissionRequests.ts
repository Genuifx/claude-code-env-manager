export type ClaudeToolPermissionOptions = {
  toolUseID: string;
  requestId?: string;
};

export function resolveClaudePermissionRequestId(
  options: ClaudeToolPermissionOptions,
  now: () => number = Date.now,
) {
  const sdkRequestId = options.requestId?.trim();
  return sdkRequestId || `${options.toolUseID}:${now()}`;
}
