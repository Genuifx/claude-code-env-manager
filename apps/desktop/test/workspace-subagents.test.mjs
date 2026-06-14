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
