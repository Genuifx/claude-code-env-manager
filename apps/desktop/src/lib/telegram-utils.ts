export function buildBindCommand(
  projectDir: string,
  envName?: string | null,
  permMode?: string | null,
): string {
  let command = `/bind ${projectDir}`;
  if (envName) {
    command += ` env=${envName}`;
  }
  if (permMode) {
    command += ` perm=${permMode}`;
  }
  return command;
}

export async function copyBindCommand(
  projectDir: string,
  envName?: string | null,
  permMode?: string | null,
): Promise<string> {
  const command = buildBindCommand(projectDir, envName, permMode);
  await navigator.clipboard.writeText(command);
  return command;
}
