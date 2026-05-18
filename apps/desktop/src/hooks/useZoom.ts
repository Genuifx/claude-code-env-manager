import { useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

// macOS-native style zoom shortcuts for the whole desktop app:
//   Cmd/Ctrl + =  (also '+')  -> zoom in
//   Cmd/Ctrl + -              -> zoom out
//   Cmd/Ctrl + 0              -> reset to 100%
//
// Uses Tauri's built-in `webview.setZoom()` (under the hood:
// `plugin:webview|set_webview_zoom`) so the entire webview scales the way a
// browser's Cmd-+/- does, instead of layering CSS hacks. The chosen level is
// persisted to localStorage so it survives reloads. The shortcut listener is
// installed in the capture phase so it wins against inputs, textareas,
// terminals, and other contenteditable surfaces — matching native macOS apps.

const STORAGE_KEY = 'ccem-zoom-level';
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const STEP = 0.1;
const DEFAULT_ZOOM = 1.0;

function clamp(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function roundZoom(value: number): number {
  // Avoid floating-point drift when stepping by 0.1.
  return Math.round(value * 100) / 100;
}

function readStoredZoom(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ZOOM;
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_ZOOM;
    return clamp(parsed);
  } catch {
    return DEFAULT_ZOOM;
  }
}

async function applyZoom(value: number): Promise<void> {
  try {
    await getCurrentWebview().setZoom(value);
  } catch (err) {
    // The webview API can fail outside of a Tauri shell (e.g. browser preview)
    // or if the permission is missing. Don't crash the UI in that case.
    console.warn('[useZoom] setZoom failed', err);
  }
}

function persistZoom(value: number): void {
  try {
    if (value === DEFAULT_ZOOM) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function useZoom(): void {
  useEffect(() => {
    // Restore the persisted zoom on mount.
    const initial = readStoredZoom();
    void applyZoom(initial);

    let current = initial;

    const setZoom = (next: number) => {
      const clamped = roundZoom(clamp(next));
      if (clamped === current) return;
      current = clamped;
      void applyZoom(clamped);
      persistZoom(clamped);
    };

    const handler = (e: KeyboardEvent) => {
      // Only react to Cmd (macOS) / Ctrl (other platforms) combos.
      if (!(e.metaKey || e.ctrlKey)) return;
      // Ignore combinations that include Alt, which usually belong to other
      // application shortcuts.
      if (e.altKey) return;

      const key = e.key;
      // Cmd+= and Cmd++ (Shift+=) both mean "zoom in" on macOS.
      if (key === '=' || key === '+') {
        e.preventDefault();
        setZoom(current + STEP);
        return;
      }
      if (key === '-') {
        e.preventDefault();
        setZoom(current - STEP);
        return;
      }
      if (key === '0') {
        e.preventDefault();
        setZoom(DEFAULT_ZOOM);
        return;
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => {
      window.removeEventListener('keydown', handler, { capture: true });
    };
  }, []);
}
