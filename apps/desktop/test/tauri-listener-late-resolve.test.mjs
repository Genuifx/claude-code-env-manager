import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Test the late-resolve cleanup pattern used by useTauriEvent hook and CronTasks.
 *
 * The race condition: if the component unmounts before listen() resolves,
 * the returned unlisten function is never called, leaking the listener.
 *
 * The fix: check a mounted flag AFTER listen() resolves. If already unmounted,
 * immediately call the cleanup function.
 */

function createSafeListenerSetup(mockListen) {
  let mounted = true;
  let unlistenFn = undefined;
  const calls = [];

  async function setup(eventName, handler) {
    try {
      const cleanup = await mockListen(eventName, (event) => {
        if (mounted) handler(event.payload);
      });

      if (!mounted) {
        cleanup();
        calls.push('late-cleanup');
        return;
      }
      unlistenFn = cleanup;
    } catch (err) {
      calls.push('error');
    }
  }

  function start(eventName, handler) {
    setup(eventName, handler);
  }

  function cleanup() {
    mounted = false;
    if (unlistenFn) {
      unlistenFn();
      calls.push('normal-cleanup');
    }
  }

  return { start, cleanup, calls };
}

test('late-resolve cleanup: listener is cleaned up when listen resolves after unmount', async () => {
  let resolveListen;
  const unlistenCalls = [];

  const mockListen = (eventName, handler) => {
    return new Promise((resolve) => {
      resolveListen = () => resolve(() => {
        unlistenCalls.push(eventName);
      });
    });
  };

  const { start, cleanup } = createSafeListenerSetup(mockListen);
  start('test-event', () => {});

  // Unmount before listen resolves
  cleanup();

  // Now resolve listen — should trigger immediate cleanup
  assert.ok(resolveListen, 'listen promise should be pending');
  resolveListen();

  // Wait for microtask queue to process
  await new Promise((r) => setTimeout(r, 10));

  assert.equal(unlistenCalls.length, 1, 'unlisten should be called once after late resolve');
  assert.equal(unlistenCalls[0], 'test-event', 'unlisten should be for the correct event');
});

test('normal cleanup: listener is cleaned up on unmount when listen already resolved', async () => {
  const unlistenCalls = [];

  const mockListen = (eventName, handler) => {
    return Promise.resolve(() => {
      unlistenCalls.push(eventName);
    });
  };

  const { start, cleanup } = createSafeListenerSetup(mockListen);
  start('test-event', () => {});

  // Wait for listen to resolve
  await new Promise((r) => setTimeout(r, 10));

  // Now unmount — should call normal cleanup
  cleanup();

  assert.equal(unlistenCalls.length, 1, 'unlisten should be called once');
  assert.equal(unlistenCalls[0], 'test-event');
});

test('handler does not fire after unmount', async () => {
  let resolveListen;
  let handlerCalls = 0;

  const mockListen = (eventName, handler) => {
    return new Promise((resolve) => {
      resolveListen = () => {
        // Return the unlisten function AND immediately call the handler
        handler({ payload: 'test' });
        resolve(() => {});
      };
    });
  };

  const { start, cleanup } = createSafeListenerSetup(mockListen);
  start('test-event', () => { handlerCalls++; });

  // Unmount
  cleanup();

  // Resolve listen — handler should NOT fire because mounted=false
  resolveListen();
  await new Promise((r) => setTimeout(r, 10));

  assert.equal(handlerCalls, 0, 'handler should not fire after unmount');
});

test('multiple listeners: late-resolve cleanup handles each independently', async () => {
  const resolvers = [];
  const unlistenCalls = [];

  const mockListen = (eventName, handler) => {
    return new Promise((resolve) => {
      resolvers.push(() => resolve(() => { unlistenCalls.push(eventName); }));
    });
  };

  // Simulate the CronTasks pattern with 3 listeners
  let mounted = true;
  const unsubs = [];

  async function setup() {
    for (const evt of ['cron-task-started', 'cron-task-completed', 'cron-task-failed']) {
      const fn = await mockListen(evt, () => { if (mounted) {} });
      if (!mounted) { fn(); return; }
      unsubs.push(fn);
    }
  }

  setup();

  // Unmount after first listen resolves but before second resolves
  resolvers[0](); // First listen resolves
  await new Promise((r) => setTimeout(r, 5));

  mounted = false;
  unsubs.forEach((fn) => fn()); // Normal cleanup for first listener

  // Resolve second listen — late-resolve cleanup runs, setup() returns (third never created)
  resolvers[1]();
  await new Promise((r) => setTimeout(r, 10));

  // First listener: cleaned up via normal cleanup
  // Second listener: cleaned up via late-resolve, setup() returns early
  // Third listener: never created (setup() returned after second)
  assert.equal(unlistenCalls.length, 2, 'two listeners should be cleaned up');
  assert.ok(unlistenCalls.includes('cron-task-started'));
  assert.ok(unlistenCalls.includes('cron-task-completed'));
  assert.equal(resolvers.length, 2, 'only two listeners were created');
});
