import { useEffect } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Build key string: "meta+1", "meta+enter", "meta+shift+m", etc.
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('meta');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');

      let key = e.key.toLowerCase();
      // Normalize special keys
      if (key === ' ') key = 'space';

      parts.push(key);
      const combo = parts.join('+');

      const action = shortcuts[combo];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
