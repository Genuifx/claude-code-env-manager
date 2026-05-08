import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importClaudeSkillsModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-claude-skills-test-'));
  const outfile = path.join(tempDir, 'claudeSkills.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'claudeSkills.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('adds Claude Skill tool when allowed tools are allowlisted', async () => {
  const { CLAUDE_SKILL_SETTING_SOURCES, ensureClaudeSkillToolAllowed } = await importClaudeSkillsModule();

  assert.deepEqual(ensureClaudeSkillToolAllowed(['Read', 'Write']), ['Read', 'Write', 'Skill']);
  assert.deepEqual(ensureClaudeSkillToolAllowed(['Read', 'Skill']), ['Read', 'Skill']);
  assert.equal(ensureClaudeSkillToolAllowed([]), undefined);
  assert.equal(ensureClaudeSkillToolAllowed(null), undefined);
  assert.deepEqual([...CLAUDE_SKILL_SETTING_SOURCES], ['user', 'project']);
});
