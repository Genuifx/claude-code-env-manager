import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceEventTranscript() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceEventTranscript.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-event-test-'));
  const outputPath = path.join(tempDir, 'workspaceEventTranscript.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function event(seq, payload) {
  return {
    runtime_id: 'runtime-1',
    seq,
    occurred_at: `2026-05-01T00:00:0${seq}.000Z`,
    payload,
  };
}

test('live transcript preserves thinking, tool, and text event order in assistant content', async () => {
  const { buildMessagesFromEvents } = await importWorkspaceEventTranscript();

  const messages = buildMessagesFromEvents(
    [{ msgType: 'user', uuid: 'user-1', content: '开始', segmentIndex: 0, isCompactBoundary: false }],
    [],
    [
      event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
      event(2, { type: 'assistant_chunk', text: '先说一句。' }),
      event(3, { type: 'tool_use_started', tool_use_id: 'tool-1', raw_name: 'Read', input_summary: 'src/a.ts', needs_response: false, category: { category: 'file_op', raw_name: 'Read' } }),
      event(4, { type: 'tool_use_completed', tool_use_id: 'tool-1', raw_name: 'Read', result_summary: 'ok', success: true }),
      event(5, { type: 'system_message', message: '再思考一下' }),
      event(6, { type: 'assistant_chunk', text: '最后回答。' }),
      event(7, { type: 'lifecycle', stage: 'turn_completed', detail: '' }),
    ],
  );

  assert.deepEqual(messages[1].content, [
    { type: 'text', text: '先说一句。' },
    {
      type: 'tool_use',
      id: 'tool-1',
      name: 'Read',
      input: { summary: 'src/a.ts' },
      _startedAt: Date.parse('2026-05-01T00:00:03.000Z'),
      _result: 'ok',
      _resultError: false,
      _completedAt: Date.parse('2026-05-01T00:00:04.000Z'),
    },
    {
      type: 'thinking',
      thinking: '再思考一下',
      _startedAt: Date.parse('2026-05-01T00:00:05.000Z'),
      _completedAt: Date.parse('2026-05-01T00:00:05.000Z'),
    },
    { type: 'text', text: '最后回答。' },
  ]);
});

test('live transcript appends streaming thinking deltas without inserting paragraph breaks', async () => {
  const { buildMessagesFromEvents } = await importWorkspaceEventTranscript();

  const messages = buildMessagesFromEvents(
    [{ msgType: 'user', uuid: 'user-1', content: 'hello', segmentIndex: 0, isCompactBoundary: false }],
    [],
    [
      event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
      event(2, { type: 'system_message', message: 'The' }),
      event(3, { type: 'system_message', message: ' user' }),
      event(4, { type: 'system_message', message: ' is' }),
      event(5, { type: 'system_message', message: ' greeting' }),
      event(6, { type: 'lifecycle', stage: 'turn_completed', detail: '' }),
    ],
  );

  assert.deepEqual(messages[1].content, [
    {
      type: 'thinking',
      thinking: 'The user is greeting',
      _startedAt: Date.parse('2026-05-01T00:00:02.000Z'),
      _completedAt: Date.parse('2026-05-01T00:00:05.000Z'),
    },
  ]);
});

test('live transcript records process timing metadata for duration display', async () => {
  const { buildMessagesFromEvents } = await importWorkspaceEventTranscript();

  const messages = buildMessagesFromEvents(
    [{ msgType: 'user', uuid: 'user-1', content: 'run', segmentIndex: 0, isCompactBoundary: false }],
    [],
    [
      event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
      event(2, { type: 'system_message', message: 'Thinking' }),
      event(3, { type: 'tool_use_started', tool_use_id: 'tool-1', raw_name: 'Bash', input_summary: 'pnpm test', needs_response: false, category: { category: 'shell', raw_name: 'Bash' } }),
      event(5, { type: 'tool_use_completed', tool_use_id: 'tool-1', raw_name: 'Bash', result_summary: 'ok', success: true }),
      event(6, { type: 'lifecycle', stage: 'turn_completed', detail: '' }),
    ],
  );

  const [thinkingBlock, toolBlock] = messages[1].content;
  assert.equal(thinkingBlock._startedAt, Date.parse('2026-05-01T00:00:02.000Z'));
  assert.equal(thinkingBlock._completedAt, Date.parse('2026-05-01T00:00:02.000Z'));
  assert.equal(toolBlock._startedAt, Date.parse('2026-05-01T00:00:03.000Z'));
  assert.equal(toolBlock._completedAt, Date.parse('2026-05-01T00:00:05.000Z'));
});

test('dedupes live events linearly while preserving first-seen order', async () => {
  const { dedupeEvents } = await importWorkspaceEventTranscript();

  const events = [
    event(1, { type: 'assistant_chunk', text: 'a' }),
    event(2, { type: 'assistant_chunk', text: 'b' }),
    event(1, { type: 'assistant_chunk', text: 'duplicate' }),
    { ...event(1, { type: 'assistant_chunk', text: 'other runtime' }), runtime_id: 'runtime-2' },
  ];

  assert.deepEqual(
    dedupeEvents(events).map((item) => `${item.runtime_id}:${item.seq}:${item.payload.text}`),
    ['runtime-1:1:a', 'runtime-1:2:b', 'runtime-2:1:other runtime'],
  );
});

test('appends monotonic live events without reallocating on duplicate-only batches', async () => {
  const { appendSessionEvents } = await importWorkspaceEventTranscript();

  const previous = [
    event(1, { type: 'assistant_chunk', text: 'a' }),
    event(2, { type: 'assistant_chunk', text: 'b' }),
  ];
  const appended = appendSessionEvents(previous, [
    event(3, { type: 'assistant_chunk', text: 'c' }),
  ]);
  assert.deepEqual(appended.map((item) => item.seq), [1, 2, 3]);

  const dedupedIncoming = appendSessionEvents(previous, [
    event(3, { type: 'assistant_chunk', text: 'c' }),
    event(3, { type: 'assistant_chunk', text: 'duplicate' }),
  ]);
  assert.deepEqual(dedupedIncoming.map((item) => `${item.seq}:${item.payload.text}`), [
    '1:a',
    '2:b',
    '3:c',
  ]);

  const unchanged = appendSessionEvents(appended, [
    event(2, { type: 'assistant_chunk', text: 'duplicate' }),
  ]);
  assert.equal(unchanged, appended);

  const reset = appendSessionEvents(appended, [
    event(10, { type: 'assistant_chunk', text: 'reset' }),
  ], true);
  assert.deepEqual(reset.map((item) => item.seq), [10]);
});

test('stabilizes unchanged message references but updates visible tool metadata changes', async () => {
  const {
    buildMessagesFromEvents,
    stabilizeMessageRefs,
  } = await importWorkspaceEventTranscript();

  const base = [
    { msgType: 'user', uuid: 'user-1', content: 'run', segmentIndex: 0, isCompactBoundary: false },
  ];
  const first = buildMessagesFromEvents(base, [], [
    event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
    event(2, { type: 'tool_use_started', tool_use_id: 'tool-1', raw_name: 'Bash', input_summary: 'pnpm test', needs_response: false, category: { category: 'execution', raw_name: 'Bash' } }),
    event(3, { type: 'tool_use_completed', tool_use_id: 'tool-1', raw_name: 'Bash', result_summary: 'ok', success: true }),
  ]);
  const same = buildMessagesFromEvents(base, [], [
    event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
    event(2, { type: 'tool_use_started', tool_use_id: 'tool-1', raw_name: 'Bash', input_summary: 'pnpm test', needs_response: false, category: { category: 'execution', raw_name: 'Bash' } }),
    event(3, { type: 'tool_use_completed', tool_use_id: 'tool-1', raw_name: 'Bash', result_summary: 'ok', success: true }),
  ]);
  const stabilized = stabilizeMessageRefs(same, first);
  assert.equal(stabilized[1], first[1]);

  const changedInput = buildMessagesFromEvents(base, [], [
    event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
    event(2, { type: 'tool_use_started', tool_use_id: 'tool-1', raw_name: 'Bash', input_summary: 'pnpm build', needs_response: false, category: { category: 'execution', raw_name: 'Bash' } }),
    event(3, { type: 'tool_use_completed', tool_use_id: 'tool-1', raw_name: 'Bash', result_summary: 'ok', success: true }),
  ]);
  const changedStabilized = stabilizeMessageRefs(changedInput, first);
  assert.notEqual(changedStabilized[1], first[1]);

  const changedTiming = buildMessagesFromEvents(base, [], [
    event(1, { type: 'lifecycle', stage: 'turn_started', detail: '' }),
    event(4, { type: 'tool_use_started', tool_use_id: 'tool-1', raw_name: 'Bash', input_summary: 'pnpm test', needs_response: false, category: { category: 'execution', raw_name: 'Bash' } }),
    event(5, { type: 'tool_use_completed', tool_use_id: 'tool-1', raw_name: 'Bash', result_summary: 'ok', success: true }),
  ]);
  const timingStabilized = stabilizeMessageRefs(changedTiming, first);
  assert.notEqual(timingStabilized[1], first[1]);
});
