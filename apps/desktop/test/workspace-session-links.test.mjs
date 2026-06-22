import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importSessionLinks() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'sessionLinks.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-session-links-test-'));
  const outputPath = path.join(tempDir, 'sessionLinks.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('builds runtime ccem links without confusing provider session ids', async () => {
  const { buildCcemSessionLink, parseCcemSessionLink } = await importSessionLinks();

  const link = buildCcemSessionLink({
    source: 'codex',
    id: 'runtime-123',
    idKind: 'runtime',
    runtimeId: 'runtime-123',
    providerSessionId: 'provider-456',
    cwd: '/tmp/project with space',
  });

  assert.equal(
    link,
    'ccem://workspace/session?source=codex&idKind=runtime&id=runtime-123&runtimeId=runtime-123&providerSessionId=provider-456&cwd=%2Ftmp%2Fproject%20with%20space'
  );
  assert.deepEqual(parseCcemSessionLink(link), {
    source: 'codex',
    idKind: 'runtime',
    id: 'runtime-123',
    runtimeId: 'runtime-123',
    providerSessionId: 'provider-456',
    cwd: '/tmp/project with space',
    focus: null,
  });
});

test('builds provider ccem links for history sessions', async () => {
  const { buildCcemSessionLink, parseCcemSessionLink } = await importSessionLinks();

  const link = buildCcemSessionLink({
    source: 'claude',
    id: 'provider-abc',
    idKind: 'provider',
    cwd: '/Users/wzt/project',
    focus: 'history',
  });

  assert.equal(
    link,
    'ccem://workspace/session?source=claude&idKind=provider&id=provider-abc&cwd=%2FUsers%2Fwzt%2Fproject&focus=history'
  );
  assert.deepEqual(parseCcemSessionLink(link), {
    source: 'claude',
    idKind: 'provider',
    id: 'provider-abc',
    runtimeId: null,
    providerSessionId: null,
    cwd: '/Users/wzt/project',
    focus: 'history',
  });
});

test('rejects invalid ccem session links', async () => {
  const { parseCcemSessionLink } = await importSessionLinks();

  assert.equal(parseCcemSessionLink('https://example.com/session?id=x'), null);
  assert.equal(parseCcemSessionLink('ccem://workspace/session?source=codex&id=x'), null);
  assert.equal(parseCcemSessionLink('ccem://workspace/session?source=bad&idKind=runtime&id=x'), null);
  assert.equal(parseCcemSessionLink('ccem://workspace/session?source=codex&idKind=bad&id=x'), null);
});
