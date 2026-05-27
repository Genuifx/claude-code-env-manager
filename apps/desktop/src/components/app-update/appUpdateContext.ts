import { createContext, useContext } from 'react';
import type { AppUpdateMetadata } from '@/lib/tauri-ipc';
import type { AppUpdateState } from './appUpdateState';

export interface CheckForUpdateOptions {
  silent?: boolean;
}

export interface AppUpdateContextValue {
  state: AppUpdateState;
  checkForUpdate: (options?: CheckForUpdateOptions) => Promise<AppUpdateMetadata | null>;
  downloadUpdate: () => Promise<void>;
  restartForUpdate: () => Promise<void>;
}

export const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function useAppUpdate() {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within AppUpdateProvider.');
  }
  return context;
}
