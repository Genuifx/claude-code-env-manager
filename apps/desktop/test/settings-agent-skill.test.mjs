import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopDir, '..', '..');

test('Settings exposes the bundled CCEM agent skill installer', async () => {
  const settingsSource = await fs.readFile(path.join(desktopDir, 'src/pages/Settings.tsx'), 'utf8');
  const enLocale = JSON.parse(await fs.readFile(path.join(desktopDir, 'src/locales/en.json'), 'utf8'));
  const zhLocale = JSON.parse(await fs.readFile(path.join(desktopDir, 'src/locales/zh.json'), 'utf8'));

  assert.match(settingsSource, /get_ccem_agent_skill_status/);
  assert.match(settingsSource, /install_ccem_agent_skill/);
  assert.match(settingsSource, /agentSkill/);
  assert.equal(enLocale.settings.agentSkill, 'Agent Skill');
  assert.equal(zhLocale.settings.agentSkill, 'Agent Skill');
});

test('bundled CCEM agent skill teaches agents to use the JSON desktop CLI wrapper', async () => {
  const skillSource = await fs.readFile(
    path.join(repoRoot, 'packages/agent-skills/ccem/SKILL.md'),
    'utf8',
  );

  assert.match(skillSource, /^---\nname: ccem\n/ms);
  assert.match(skillSource, /ccem desktop health --json/);
  assert.match(skillSource, /ccem desktop create/);
  assert.match(skillSource, /--json/);
  assert.match(skillSource, /Do not read or write ~\/\.ccem\/control\.json directly/);
});
