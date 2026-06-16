export interface LaunchSingleSessionInput {
  selectedWorkingDir?: string | null;
  onLaunch: () => Promise<void>;
  onLaunchWithDir: (dir: string) => Promise<void>;
}

export interface LaunchSingleSessionResult {
  launched: true;
  workingDir?: string | null;
}

export async function launchSingleSession(
  input: LaunchSingleSessionInput,
): Promise<LaunchSingleSessionResult> {
  if (input.selectedWorkingDir) {
    await input.onLaunchWithDir(input.selectedWorkingDir);
    return { launched: true, workingDir: input.selectedWorkingDir };
  }
  await input.onLaunch();
  return { launched: true, workingDir: null };
}
