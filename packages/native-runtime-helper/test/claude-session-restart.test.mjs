import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function buildHelperWithMockClaudeSdk(options = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-helper-claude-restart-test-'));
  const outfile = path.join(tempDir, 'native-runtime-helper.mjs');
  const firstResultSubtype = options.firstResultSubtype ?? 'success';
  const settleDelayMsAfterResult = options.settleDelayMsAfterResult ?? 0;
  const yieldIdleBeforeResult = options.yieldIdleBeforeResult ?? false;
  const interruptible = options.interruptible ?? false;
  const logClose = options.logClose ?? false;
  const logInterrupt = options.logInterrupt ?? false;
  const expectedQueryModel = options.expectedQueryModel ?? null;
  const reportModelState = options.reportModelState ?? false;
  const keepAliveAfterResult = options.keepAliveAfterResult ?? false;

  await build({
    entryPoints: [path.join(packageDir, 'src', 'index.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
    plugins: [{
      name: 'mock-native-runtime-sdks',
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^@anthropic-ai\/claude-agent-sdk$/ }, () => ({
          path: 'claude-agent-sdk',
          namespace: 'mock-sdk',
        }));
        pluginBuild.onLoad({ filter: /^claude-agent-sdk$/, namespace: 'mock-sdk' }, () => ({
          loader: 'js',
          contents: `
            const firstResultSubtype = ${JSON.stringify(firstResultSubtype)};
            const settleDelayMsAfterResult = ${JSON.stringify(settleDelayMsAfterResult)};
            const yieldIdleBeforeResult = ${JSON.stringify(yieldIdleBeforeResult)};
            const interruptible = ${JSON.stringify(interruptible)};
            const logClose = ${JSON.stringify(logClose)};
            const logInterrupt = ${JSON.stringify(logInterrupt)};
            const expectedQueryModel = ${JSON.stringify(expectedQueryModel)};
            const reportModelState = ${JSON.stringify(reportModelState)};
            const keepAliveAfterResult = ${JSON.stringify(keepAliveAfterResult)};
            let queryCount = 0;
            let setModelCalled = false;
            export function query({ prompt, options }) {
              if (expectedQueryModel !== null && options.model !== expectedQueryModel) {
                throw new Error('expected query model ' + expectedQueryModel + ', got ' + options.model);
              }
              const turn = ++queryCount;
              let closed = false;
              let interruptResolver = null;
              const waitForInterrupt = () => new Promise((resolve) => {
                interruptResolver = resolve;
              });
              return {
                close() {
                  closed = true;
                  if (logClose) {
                    process.stderr.write('__MOCK_CLAUDE_CLOSE__\\n');
                  }
                  interruptResolver?.();
                },
                async interrupt() {
                  if (logInterrupt) {
                    process.stderr.write('__MOCK_CLAUDE_INTERRUPT__\\n');
                  }
                  interruptResolver?.();
                },
                async setModel() {
                  setModelCalled = true;
                },
                async *[Symbol.asyncIterator]() {
                  const iterator = prompt[Symbol.asyncIterator]();
                  const session_id = 'mock-session';
                  let localTurn = 0;
                  while (!closed) {
                    const next = await iterator.next();
                    if (closed || next.done) return;
                    localTurn += 1;
                    const responseNumber = interruptible || keepAliveAfterResult ? localTurn : turn;
                    const text = reportModelState
                      ? 'model=' + (options.model ?? '<none>') + ';setModel=' + setModelCalled
                      : 'mock response ' + responseNumber;
                    yield { type: 'system', subtype: 'session_state_changed', state: 'running', session_id };
                    yield {
                      type: 'assistant',
                      session_id,
                      message: { content: [{ type: 'text', text }] },
                    };
                    if (interruptible && localTurn === 1) {
                      await waitForInterrupt();
                      if (closed) return;
                      yield { type: 'system', subtype: 'session_state_changed', state: 'idle', session_id };
                      yield { type: 'result', subtype: 'error_during_execution', errors: ['interrupted'], session_id };
                      continue;
                    }
                    if (yieldIdleBeforeResult) {
                      yield { type: 'system', subtype: 'session_state_changed', state: 'idle', session_id };
                    }
                    if (!interruptible && turn === 1 && firstResultSubtype !== 'success') {
                      yield { type: 'result', subtype: firstResultSubtype, errors: ['hit turn limit'], session_id };
                    } else {
                      yield { type: 'result', subtype: 'success', result: 'done ' + responseNumber, session_id };
                    }
                    if (settleDelayMsAfterResult > 0) {
                      await new Promise((resolve) => setTimeout(resolve, settleDelayMsAfterResult));
                    }
                    if (!interruptible && !keepAliveAfterResult) return;
                  }
                },
              };
            }
          `,
        }));
        pluginBuild.onResolve({ filter: /^@openai\/codex-sdk$/ }, () => ({
          path: 'codex-sdk',
          namespace: 'mock-sdk',
        }));
        pluginBuild.onLoad({ filter: /^codex-sdk$/, namespace: 'mock-sdk' }, () => ({
          loader: 'js',
          contents: 'export class Codex {}',
        }));
      },
    }],
  });

  return outfile;
}

function waitForOutput(outputs, predicate, stderrRef, description) {
  const timeoutMs = 1_500;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const match = outputs.find(predicate);
      if (match) {
        resolve(match);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error([
          `Timed out waiting for ${description}.`,
          `stdout=${JSON.stringify(outputs)}`,
          `stderr=${stderrRef.value}`,
        ].join('\n')));
        return;
      }

      setTimeout(check, 20);
    };

    check();
  });
}

function waitForStderr(stderrRef, pattern, description) {
  const timeoutMs = 1_500;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (pattern.test(stderrRef.value)) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error([
          `Timed out waiting for ${description}.`,
          `stderr=${stderrRef.value}`,
        ].join('\n')));
        return;
      }

      setTimeout(check, 20);
    };

    check();
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('restarts Claude query after a completed turn so later prompts are consumed', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk();
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 1',
    stderrRef,
    'first Claude response',
  );

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status after the first Claude turn',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response',
  );

  const chunks = outputs
    .filter((output) => output.type === 'event' && output.payload?.type === 'assistant_chunk')
    .map((output) => output.payload.text);

  assert.deepEqual(chunks, ['mock response 1', 'mock response 2']);
});

test('keeps an idle Claude query open for the next prompt instead of closing background work', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    keepAliveAfterResult: true,
    logClose: true,
  });
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status after the first persistent Claude turn',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response on the same persistent query',
  );

  assert.doesNotMatch(stderrRef.value, /__MOCK_CLAUDE_CLOSE__/);
});

test('closes an idle Claude query after the retention timeout', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    keepAliveAfterResult: true,
    logClose: true,
  });
  const helper = spawn(process.execPath, [helperPath], {
    env: {
      ...process.env,
      CCEM_NATIVE_CLAUDE_IDLE_TTL_MS: '40',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status before idle retention timeout',
  );

  await waitForStderr(
    stderrRef,
    /__MOCK_CLAUDE_CLOSE__/,
    'idle Claude query close after retention timeout',
  );
});

test('queues Claude settings without closing an idle retained query', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    keepAliveAfterResult: true,
    logClose: true,
  });
  const helper = spawn(process.execPath, [helperPath], {
    env: {
      ...process.env,
      CCEM_NATIVE_CLAUDE_IDLE_TTL_MS: '500',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status before settings update',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'update_settings',
    env_name: 'updated',
    env_vars: { ANTHROPIC_MODEL: 'new-model' },
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Settings will apply to the next Claude runtime.',
    stderrRef,
    'queued settings status',
  );

  await delay(80);
  assert.doesNotMatch(stderrRef.value, /__MOCK_CLAUDE_CLOSE__/);

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response on retained query after settings update',
  );

  assert.doesNotMatch(stderrRef.value, /__MOCK_CLAUDE_CLOSE__/);
});

test('applies queued Claude settings after the retained query is reclaimed', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    keepAliveAfterResult: true,
    logClose: true,
    reportModelState: true,
  });
  const helper = spawn(process.execPath, [helperPath], {
    env: {
      ...process.env,
      CCEM_NATIVE_CLAUDE_IDLE_TTL_MS: '60',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    env_vars: { ANTHROPIC_MODEL: 'old-model' },
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'model=old-model;setModel=false',
    stderrRef,
    'first Claude response with original model',
  );

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status before queued settings update',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'update_settings',
    env_name: 'updated',
    env_vars: { ANTHROPIC_MODEL: 'new-model' },
  })}\n`);

  await delay(25);
  assert.doesNotMatch(stderrRef.value, /__MOCK_CLAUDE_CLOSE__/);

  await waitForStderr(
    stderrRef,
    /__MOCK_CLAUDE_CLOSE__/,
    'idle retained query close after queued settings',
  );
  await delay(30);

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'model=new-model;setModel=false',
    stderrRef,
    'second Claude response with queued model',
  );
});

test('restarts Claude query when a prompt arrives after idle but before the old query settles', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    yieldIdleBeforeResult: true,
    settleDelayMsAfterResult: 80,
  });
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status after the first Claude turn',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response after idle-before-result race',
  );
});

test('passes Claude runtime model at query startup without setModel control request', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    expectedQueryModel: 'opus',
    reportModelState: true,
  });
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    env_vars: {
      ANTHROPIC_MODEL: ' opus ',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-test',
    },
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'model=opus;setModel=false',
    stderrRef,
    'Claude query model without setModel',
  );
});

test('marks Claude helper ready after a non-success result so the workspace can continue', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    firstResultSubtype: 'error_max_turns',
  });
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'session_completed'
      && output.payload.reason === 'hit turn limit',
    stderrRef,
    'non-success Claude completion event',
  );

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status after non-success Claude result',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response',
  );
});

test('interrupts an active Claude turn without closing the query process', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    interruptible: true,
    logClose: true,
    logInterrupt: true,
  });
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 1',
    stderrRef,
    'first Claude response before interrupt',
  );

  helper.stdin.write(`${JSON.stringify({ type: 'stop' })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'lifecycle'
      && output.payload.stage === 'turn_interrupted',
    stderrRef,
    'turn_interrupted lifecycle event',
  );

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Turn interrupted. Ready for the next prompt.',
    stderrRef,
    'ready status after interrupt',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response after interrupt',
  );

  assert.match(stderrRef.value, /__MOCK_CLAUDE_INTERRUPT__/);
  assert.doesNotMatch(stderrRef.value, /__MOCK_CLAUDE_CLOSE__/);
  assert.equal(
    outputs.some((output) => output.type === 'event' && output.payload?.type === 'session_completed'),
    false,
  );
});

test('does not drop prompts sent while a completed one-shot Claude query is settling', async (t) => {
  const helperPath = await buildHelperWithMockClaudeSdk({
    settleDelayMsAfterResult: 120,
  });
  const helper = spawn(process.execPath, [helperPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  t.after(() => {
    helper.kill('SIGTERM');
  });

  const outputs = [];
  const stderrRef = { value: '' };
  let stdoutBuffer = '';

  helper.stdout.setEncoding('utf8');
  helper.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = stdoutBuffer.slice(0, newlineIndex).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      if (line) {
        outputs.push(JSON.parse(line));
      }
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  helper.stderr.setEncoding('utf8');
  helper.stderr.on('data', (chunk) => {
    stderrRef.value += chunk;
  });

  helper.stdin.write(`${JSON.stringify({
    type: 'init',
    provider: 'claude',
    env_name: 'default',
    perm_mode: 'dev',
    working_dir: os.tmpdir(),
    initial_prompt: 'first',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'status'
      && output.status === 'ready'
      && output.detail === 'Ready for the next prompt.',
    stderrRef,
    'ready status before one-shot query settles',
  );

  helper.stdin.write(`${JSON.stringify({
    type: 'prompt',
    text: 'second',
  })}\n`);

  await waitForOutput(
    outputs,
    (output) => output.type === 'event'
      && output.payload?.type === 'assistant_chunk'
      && output.payload.text === 'mock response 2',
    stderrRef,
    'second Claude response after settling restart',
  );
});
