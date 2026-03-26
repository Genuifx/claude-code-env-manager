export type PerformanceMode = 'default' | 'reduced';
export type PerformancePreference = 'auto' | PerformanceMode;

type NavigatorWithHints = Navigator & {
  connection?: {
    saveData?: boolean;
  };
  deviceMemory?: number;
};

type StoredSettings = {
  performanceMode?: unknown;
};

const PERFORMANCE_MODE_QUERY = '(prefers-reduced-motion: reduce)';
const SETTINGS_STORAGE_KEY = 'ccem-settings';

let currentPerformanceMode: PerformanceMode = 'default';
let currentPerformancePreference: PerformancePreference = 'auto';
let isInitialized = false;

function isPerformanceMode(value: unknown): value is PerformanceMode {
  return value === 'default' || value === 'reduced';
}

function isPerformancePreference(value: unknown): value is PerformancePreference {
  return value === 'auto' || isPerformanceMode(value);
}

function readPerformancePreference(targetWindow: Window): PerformancePreference {
  const envOverride = import.meta.env.VITE_PERF_MODE;
  if (isPerformancePreference(envOverride)) {
    return envOverride;
  }

  try {
    const rawSettings = targetWindow.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return 'auto';
    }

    const parsedSettings = JSON.parse(rawSettings) as StoredSettings;
    if (isPerformancePreference(parsedSettings.performanceMode)) {
      return parsedSettings.performanceMode;
    }
  } catch {
    // Ignore malformed local settings and fall back to automatic detection.
  }

  return 'auto';
}

function detectPerformanceMode(targetWindow: Window): PerformanceMode {
  const navigatorWithHints = targetWindow.navigator as NavigatorWithHints;
  const prefersReducedMotion = targetWindow.matchMedia?.(PERFORMANCE_MODE_QUERY).matches ?? false;
  const saveData = navigatorWithHints.connection?.saveData === true;
  const hardwareConcurrency = navigatorWithHints.hardwareConcurrency ?? 8;
  const deviceMemory = navigatorWithHints.deviceMemory ?? 8;

  if (prefersReducedMotion || saveData) {
    return 'reduced';
  }

  if (hardwareConcurrency <= 4 || deviceMemory <= 4) {
    return 'reduced';
  }

  return 'default';
}

function resolvePerformanceMode(
  targetWindow: Window,
  preference: PerformancePreference
): PerformanceMode {
  if (isPerformanceMode(preference)) {
    return preference;
  }

  return detectPerformanceMode(targetWindow);
}

function applyPerformanceMode(targetWindow: Window, mode: PerformanceMode) {
  currentPerformanceMode = mode;
  targetWindow.document.documentElement.dataset.performanceMode = mode;
}

function syncPerformanceMode(targetWindow: Window): PerformanceMode {
  currentPerformancePreference = readPerformancePreference(targetWindow);
  const resolvedMode = resolvePerformanceMode(targetWindow, currentPerformancePreference);
  applyPerformanceMode(targetWindow, resolvedMode);
  return resolvedMode;
}

export function initPerformanceMode(targetWindow: Window = window): PerformanceMode {
  const update = () => syncPerformanceMode(targetWindow);

  update();

  if (!isInitialized) {
    isInitialized = true;

    const mediaQuery = targetWindow.matchMedia?.(PERFORMANCE_MODE_QUERY);
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', update);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(update);
    }
  }

  return currentPerformanceMode;
}

export function setPerformancePreference(
  preference: PerformancePreference,
  targetWindow: Window = window
): PerformanceMode {
  const nextPreference = isPerformancePreference(preference) ? preference : 'auto';
  currentPerformancePreference = nextPreference;
  const resolvedMode = resolvePerformanceMode(targetWindow, nextPreference);
  applyPerformanceMode(targetWindow, resolvedMode);
  return resolvedMode;
}

export function getPerformanceMode(): PerformanceMode {
  if (typeof document !== 'undefined') {
    const appliedMode = document.documentElement.dataset.performanceMode;
    if (isPerformanceMode(appliedMode)) {
      currentPerformanceMode = appliedMode;
    }
  }

  return currentPerformanceMode;
}
