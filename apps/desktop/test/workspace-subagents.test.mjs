import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceSubagents() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceSubagents.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-subagents-test-'));
  const outputPath = path.join(tempDir, 'workspaceSubagents.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('subagent entry only appears when there is useful state to inspect', async () => {
  const { shouldShowSubagentEntry } = await importWorkspaceSubagents();

  assert.equal(shouldShowSubagentEntry({ canLoad: false, loading: true, count: 2 }), false);
  assert.equal(shouldShowSubagentEntry({ canLoad: true, loading: false, count: 0 }), false);
  assert.equal(shouldShowSubagentEntry({ canLoad: true, loading: true, count: 0 }), true);
  assert.equal(shouldShowSubagentEntry({ canLoad: true, loading: false, count: 1 }), true);
  assert.equal(
    shouldShowSubagentEntry({ canLoad: true, loading: false, error: 'failed', count: 0 }),
    true,
  );
});

test('subagent selection keeps a valid current agent or falls back to the first available one', async () => {
  const { resolveSubagentSelection } = await importWorkspaceSubagents();
  const agents = [{ agentId: 'a1' }, { agentId: 'a2' }];

  assert.equal(resolveSubagentSelection([], null), null);
  assert.equal(resolveSubagentSelection(agents, null), 'a1');
  assert.equal(resolveSubagentSelection(agents, 'a2'), 'a2');
  assert.equal(resolveSubagentSelection(agents, 'missing'), 'a1');
});

test('subagent personas give anonymous agents stable readable identities', async () => {
  const { getSubagentPersona, SUBAGENT_PERSONAS } = await importWorkspaceSubagents();

  assert.deepEqual(
    SUBAGENT_PERSONAS.slice(0, 5).map((persona) => persona.name),
    ['Godel', 'Laplace', 'Popper', 'Wegener', 'Faraday'],
  );

  const first = getSubagentPersona({ agentId: 'agent-stable-1', status: 'running' }, 0);
  const second = getSubagentPersona({ agentId: 'agent-stable-1', status: 'completed' }, 4);
  assert.equal(first.name, second.name);
  assert.equal(first.symbol, second.symbol);

  assert.equal(getSubagentPersona({ agentId: '', status: 'running' }, 0).name, 'Godel');
  assert.equal(getSubagentPersona({ agentId: '', status: 'running' }, 1).name, 'Laplace');
});

test('subagent display metadata separates persona, task, and status', async () => {
  const { getSubagentDisplayMeta } = await importWorkspaceSubagents();

  const display = getSubagentDisplayMeta(
    {
      agentId: '',
      description: 'Search transcript rendering edge cases',
      subagentType: 'Explore',
      status: 'running',
      messageCount: 8,
      toolCount: 3,
      startedAt: 1,
    },
    0,
  );

  assert.equal(display.name, 'Godel');
  assert.equal(display.subtitle, 'Search transcript rendering edge cases');
  assert.equal(display.detail, 'Explore · 8 条 · 3 工具');
  assert.equal(display.statusLabel, '运行中');
  assert.equal(display.running, true);
});

test('subagent display personas stay varied across a multi-agent list', async () => {
  const { getSubagentDisplayMeta } = await importWorkspaceSubagents();

  const names = Array.from({ length: 7 }).map((_, index) => (
    getSubagentDisplayMeta(
      {
        agentId: `agent-${index}`,
        description: `Task ${index}`,
        subagentType: 'general-purpose',
        status: 'completed',
        messageCount: 1,
        toolCount: 0,
        startedAt: index,
      },
      index,
    ).name
  ));

  assert.deepEqual(names, ['Godel', 'Laplace', 'Popper', 'Wegener', 'Faraday', 'Noether', 'Turing']);
});

test('subagent entry preview lists visible persona names for the overview row', async () => {
  const { getSubagentEntryPreview } = await importWorkspaceSubagents();
  const subagents = Array.from({ length: 14 }).map((_, index) => ({
    agentId: `agent-${index}`,
    description: `Task ${index}`,
    subagentType: 'general-purpose',
    status: index === 1 ? 'running' : 'completed',
    messageCount: index + 1,
    toolCount: index,
    startedAt: index,
  }));

  const preview = getSubagentEntryPreview(subagents, 5);

  assert.deepEqual(
    preview.items.map((item) => item.name),
    ['Godel', 'Laplace', 'Popper', 'Wegener', 'Faraday'],
  );
  assert.equal(preview.items[1].running, true);
  assert.equal(preview.overflowCount, 9);
});
