import { useEffect } from 'react';

// macOS-native style zoom shortcuts for the whole desktop app:
//   Cmd/Ctrl + =  (also '+')  -> zoom in
//   Cmd/Ctrl + -              -> zoom out
//   Cmd/Ctrl + 0              -> reset to 100%
//
// The zoom level is applied via the non-standard but widely-supported CSS
// `zoom` property on the document root, which scales layout, typography and
// hit-testing together — matching what users expect from native Mac apps.
// It is persisted to localStorage so the choice survives reloads.

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

function applyZoom(value: number): void {
  const root = document.documentElement;
  if (!root) return;
  // `zoom` is supported in Chromium-based WebKit (Tauri's webview on macOS
  // uses WKWebView, which also supports it). Setting an empty string at 1.0
  // keeps the DOM clean.
  if (value === DEFAULT_ZOOM) {
    root.style.removeProperty('zoom');
  } else {
    root.style.zoom = String(value);
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
    applyZoom(initial);

    let current = initial;

    const setZoom = (next: number) => {
      const clamped = roundZoom(clamp(next));
      if (clamped === current) return;
      current = clamped;
      applyZoom(clamped);
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

    // Use capture so the shortcuts work even when focus is inside inputs,
    // textareas, terminals or other contenteditable surfaces — matching the
    // behaviour of native macOS apps.
    window.addEventListener('keydown', handler, { capture: true });
    return () => {
      window.removeEventListener('keydown', handler, { capture: true });
    };
  }, []);
}
