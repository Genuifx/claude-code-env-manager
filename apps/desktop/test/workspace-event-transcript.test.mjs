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

test('renders persisted native user prompts as turn boundaries without lifecycle markers', async () => {
  const { buildMessagesFromEvents } = await importWorkspaceEventTranscript();

  const messages = buildMessagesFromEvents(
    [],
    [],
    [
      event(1, { type: 'user_prompt', text: 'first prompt', image_count: 0 }),
      event(2, { type: 'assistant_chunk', text: 'first reply' }),
      event(3, { type: 'user_prompt', text: 'second prompt', image_count: 0 }),
      event(4, { type: 'assistant_chunk', text: 'second reply' }),
    ],
  );

  assert.deepEqual(
    messages.map((message) => [message.msgType, message.content]),
    [
      ['user', 'first prompt'],
      ['assistant', 'first reply'],
      ['user', 'second prompt'],
      ['assistant', 'second reply'],
    ],
  );
});

test('filters optimistic native prompts already confirmed by the event log', async () => {
  const { filterConfirmedLocalUserPrompts } = await importWorkspaceEventTranscript();

  const pending = filterConfirmedLocalUserPrompts(
    [
      { id: 'first', text: 'repeat me' },
      { id: 'second', text: 'repeat me' },
      { id: 'third', text: 'still local' },
    ],
    [
      event(1, { type: 'user_prompt', text: 'repeat me', image_count: 0 }),
    ],
  );

  assert.deepEqual(
    pending.map((prompt) => prompt.id),
    ['second', 'third'],
  );
});

test('keeps optimistic continuation prompts after persisted transcript events', async () => {
  const {
    buildBaseMessages,
    buildMessagesFromEvents,
    splitLocalUserPromptsForReplay,
  } = await importWorkspaceEventTranscript();
  const split = splitLocalUserPromptsForReplay([
    { id: 'new-message', text: 'second prompt' },
  ]);

  const messages = buildMessagesFromEvents(
    buildBaseMessages([], split.initialPrompt),
    split.remainingPrompts,
    [
      event(1, { type: 'user_prompt', text: 'first prompt', image_count: 0 }),
      event(2, { type: 'assistant_chunk', text: 'first reply' }),
    ],
  );

  assert.deepEqual(
    messages.map((message) => [message.msgType, message.content]),
    [
      ['user', 'first prompt'],
      ['assistant', 'first reply'],
      ['user', 'second prompt'],
    ],
  );
});

test('keeps the unconfirmed initial prompt before legacy event streams', async () => {
  const {
    buildBaseMessages,
    buildMessagesFromEvents,
    splitLocalUserPromptsForReplay,
  } = await importWorkspaceEventTranscript();
  const split = splitLocalUserPromptsForReplay([
    { id: 'initial-user', text: 'initial prompt' },
  ]);

  const messages = buildMessagesFromEvents(
    buildBaseMessages([], split.initialPrompt),
    split.remainingPrompts,
    [
      event(1, { type: 'assistant_chunk', text: 'legacy reply without prompt event' }),
    ],
  );

  assert.deepEqual(
    messages.map((message) => [message.msgType, message.content]),
    [
      ['user', 'initial prompt'],
      ['assistant', 'legacy reply without prompt event'],
    ],
  );
});

test('trims hydrated history before the first persisted native prompt', async () => {
  const { trimSeedMessagesBeforeFirstUserPrompt } = await importWorkspaceEventTranscript();
  const seedMessages = [
    { msgType: 'user', uuid: 'old-user', content: 'old prompt', segmentIndex: 0, isCompactBoundary: false },
    { msgType: 'assistant', uuid: 'old-assistant', content: 'old reply', segmentIndex: 0, isCompactBoundary: false },
    { msgType: 'user', uuid: 'live-user', content: 'resume prompt', segmentIndex: 0, isCompactBoundary: false },
    { msgType: 'assistant', uuid: 'live-assistant', content: 'resume reply', segmentIndex: 0, isCompactBoundary: false },
  ];

  const trimmed = trimSeedMessagesBeforeFirstUserPrompt(
    seedMessages,
    [
      event(1, { type: 'user_prompt', text: 'resume prompt', image_count: 0 }),
      event(2, { type: 'assistant_chunk', text: 'resume reply' }),
    ],
  );

  assert.deepEqual(
    trimmed.map((message) => message.uuid),
    ['old-user', 'old-assistant'],
  );
});

test('trims hydrated history when the provider prompt wraps the visible prompt', async () => {
  const { trimSeedMessagesBeforeFirstUserPrompt } = await importWorkspaceEventTranscript();
  const seedMessages = [
    { msgType: 'user', uuid: 'old-user', content: 'old prompt', segmentIndex: 0, isCompactBoundary: false },
    {
      msgType: 'user',
      uuid: 'wrapped-live-user',
      content: [
        {
          type: 'text',
          text: [
            'Stay in planning mode for this reply.',
            '',
            'resume prompt from composer',
          ].join('\n'),
        },
      ],
      segmentIndex: 0,
      isCompactBoundary: false,
    },
  ];

  const trimmed = trimSeedMessagesBeforeFirstUserPrompt(
    seedMessages,
    [
      event(1, { type: 'user_prompt', text: 'resume prompt from composer', image_count: 0 }),
    ],
  );

  assert.deepEqual(
    trimmed.map((message) => message.uuid),
    ['old-user'],
  );
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
