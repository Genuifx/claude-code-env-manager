export interface LaunchSingleSessionInput {
  selectedWorkingDir?: string | null;
  onLaunch: () => Promise<void>;
  onLaunchWithDir: (dir: string) => Promise<void>;
}

export interface LaunchSingleSessionResult {
  launched: true;
  workingDir?: string | null;
}

export class LaunchAlreadyInProgressError extends Error {
  constructor(readonly key: string) {
    super('Session launch is already in progress for this target.');
    this.name = 'LaunchAlreadyInProgressError';
  }
}

export async function runExclusiveLaunch(
  inFlight: Set<string>,
  key: string,
  launch: () => Promise<void>,
): Promise<void> {
  if (inFlight.has(key)) {
    throw new LaunchAlreadyInProgressError(key);
  }

  inFlight.add(key);
  try {
    await launch();
  } finally {
    inFlight.delete(key);
  }
}

export function isLaunchAlreadyInProgressError(error: unknown): boolean {
  return error instanceof LaunchAlreadyInProgressError
    || (
      error instanceof Error
      && error.name === 'LaunchAlreadyInProgressError'
    );
}

export function formatSessionLaunchError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
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
