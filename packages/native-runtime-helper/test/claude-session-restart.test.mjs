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
            let queryCount = 0;
            export function query({ prompt }) {
              const turn = ++queryCount;
              let closed = false;
              return {
                close() {
                  closed = true;
                },
                async *[Symbol.asyncIterator]() {
                  const iterator = prompt[Symbol.asyncIterator]();
                  const next = await iterator.next();
                  if (closed || next.done) return;
                  const session_id = 'mock-session';
                  yield { type: 'system', subtype: 'session_state_changed', state: 'running', session_id };
                  yield {
                    type: 'assistant',
                    session_id,
                    message: { content: [{ type: 'text', text: 'mock response ' + turn }] },
                  };
                  if (turn === 1 && firstResultSubtype !== 'success') {
                    yield { type: 'result', subtype: firstResultSubtype, errors: ['hit turn limit'], session_id };
                  } else {
                    yield { type: 'result', subtype: 'success', result: 'done ' + turn, session_id };
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
