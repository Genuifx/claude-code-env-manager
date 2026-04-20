import { useEffect } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if the event originates from an input, textarea, or contenteditable element
      // — those elements handle their own keyboard shortcuts.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

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
