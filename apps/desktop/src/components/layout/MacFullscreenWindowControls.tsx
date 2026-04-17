import { useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useLocale } from '@/locales';

type WindowControlAction = 'close' | 'minimize' | 'exit-fullscreen';

function isMacOSPlatform() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /mac/i.test(navigator.userAgent) || /mac/i.test(navigator.platform);
}

export function MacFullscreenWindowControls() {
  const { t } = useLocale();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMacOS = isMacOSPlatform();

  useEffect(() => {
    if (!isMacOS) {
      return;
    }

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const register = async () => {
      try {
        const fullscreen = await getCurrentWindow().isFullscreen();
        if (!disposed) {
          setIsFullscreen(fullscreen);
        }
      } catch (error) {
        console.error('Failed to read current fullscreen state:', error);
      }

      const listeners = await Promise.all([
        listen('will-enter-fullscreen', () => setIsFullscreen(true)),
        listen('did-enter-fullscreen', () => setIsFullscreen(true)),
        listen('did-exit-fullscreen', () => setIsFullscreen(false)),
      ]);

      if (disposed) {
        listeners.forEach((unlisten) => unlisten());
        return;
      }

      unlisteners.push(...listeners);
    };

    void register();

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [isMacOS]);

  const controls = useMemo(() => ([
    { action: 'close' as const, label: t('common.close'), variant: 'close' as const },
    { action: 'minimize' as const, label: t('common.minimize'), variant: 'minimize' as const },
    { action: 'exit-fullscreen' as const, label: t('common.exitFullscreen'), variant: 'fullscreen' as const },
  ]), [t]);

  if (!isMacOS || !isFullscreen) {
    return null;
  }

  const handleAction = async (action: WindowControlAction) => {
    try {
      await invoke('window_control', { action });
    } catch (error) {
      console.error(`Failed to run window action "${action}":`, error);
    }
  };

  return (
    <div
      className="mac-window-controls-overlay"
      aria-label={t('common.windowControls')}
      role="group"
    >
      {controls.map((control) => (
        <button
          key={control.action}
          type="button"
          className="mac-window-controls-button"
          data-variant={control.variant}
          aria-label={control.label}
          title={control.label}
          onClick={() => { void handleAction(control.action); }}
        />
      ))}
    </div>
  );
}
