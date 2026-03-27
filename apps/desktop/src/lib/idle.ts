interface ScheduleAfterFirstPaintOptions {
  delayMs?: number;
  timeoutMs?: number;
}

export function scheduleAfterFirstPaint(
  task: () => void,
  options: ScheduleAfterFirstPaintOptions = {}
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const delayMs = options.delayMs ?? 120;
  const timeoutMs = options.timeoutMs ?? 1000;
  const windowWithIdleApi = window as Window & {
    requestIdleCallback?: Window['requestIdleCallback'];
    cancelIdleCallback?: Window['cancelIdleCallback'];
  };
  const requestIdle = typeof windowWithIdleApi.requestIdleCallback === 'function'
    ? windowWithIdleApi.requestIdleCallback
    : null;
  const cancelIdle = typeof windowWithIdleApi.cancelIdleCallback === 'function'
    ? windowWithIdleApi.cancelIdleCallback
    : null;

  let cancelled = false;
  let frameId: number | null = null;
  let idleId: number | null = null;
  let timeoutId: number | null = null;

  const runTask = () => {
    if (!cancelled) {
      task();
    }
  };

  frameId = window.requestAnimationFrame(() => {
    frameId = null;

    if (cancelled) {
      return;
    }

    if (requestIdle && cancelIdle) {
      idleId = requestIdle.call(window, () => {
        idleId = null;
        runTask();
      }, { timeout: timeoutMs });
      return;
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      runTask();
    }, delayMs);
  });

  return () => {
    cancelled = true;

    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
    }

    if (idleId !== null && cancelIdle) {
      cancelIdle.call(window, idleId);
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}
