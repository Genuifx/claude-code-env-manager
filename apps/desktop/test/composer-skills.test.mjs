import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importComposerModel() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-composer-skills-test-'));
  const outfile = path.join(tempDir, 'composerModel.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'workspace', 'composerModel.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

async function importComposerImageReferences() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-composer-image-refs-test-'));
  const outfile = path.join(tempDir, 'composerImageReferences.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'workspace', 'composerImageReferences.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function skill(overrides) {
  return {
    name: 'duplicate',
    displayName: 'duplicate',
    invocationLabel: 'duplicate',
    description: 'A duplicated skill',
    path: '/tmp/skill-a',
    skillFile: '/tmp/skill-a/SKILL.md',
    scope: 'project',
    agents: ['Codex'],
    provider: 'codex',
    disabled: false,
    implicitAllowed: true,
    diagnostics: [],
    ...overrides,
  };
}

test('slash query returns mixed command and skill suggestions without deduping Codex duplicates', async () => {
  const {
    buildComposerSuggestions,
    findActiveComposerQuery,
  } = await importComposerModel();
  const skills = [
    skill({ path: '/tmp/project/duplicate', skillFile: '/tmp/project/duplicate/SKILL.md' }),
    skill({ path: '/tmp/global/duplicate', skillFile: '/tmp/global/duplicate/SKILL.md', scope: 'global' }),
  ];

  const activeQuery = findActiveComposerQuery('/du', 3, 'codex');
  const suggestions = buildComposerSuggestions({
    activeQuery,
    provider: 'codex',
    installedSkills: skills,
    fileSuggestions: [],
  });

  assert.equal(activeQuery.kind, 'command');
  assert.equal(activeQuery.trigger, '/');
  assert.equal(suggestions.filter((item) => item.kind === 'skill').length, 2);
  assert.deepEqual(
    suggestions.filter((item) => item.kind === 'skill').map((item) => item.path),
    ['/tmp/project/duplicate/SKILL.md', '/tmp/global/duplicate/SKILL.md'],
  );
  assert.ok(suggestions.every((item) => item.label.startsWith('/')));
  assert.equal(
    suggestions.find((item) => item.kind === 'skill').replacement,
    '/duplicate ',
  );
});

test('dollar query is skill-only and structured tokens parse by exact SKILL.md path', async () => {
  const {
    buildComposerSuggestions,
    findActiveComposerQuery,
    parseComposerTokens,
    selectedSkillFilesFromComposerText,
  } = await importComposerModel();
  const skills = [
    skill({ path: '/tmp/project/duplicate', skillFile: '/tmp/project/duplicate/SKILL.md' }),
    skill({ path: '/tmp/global/duplicate', skillFile: '/tmp/global/duplicate/SKILL.md', scope: 'global' }),
  ];

  const activeQuery = findActiveComposerQuery('$du', 3, 'codex');
  const suggestions = buildComposerSuggestions({
    activeQuery,
    provider: 'codex',
    installedSkills: skills,
    fileSuggestions: [],
  });

  assert.equal(activeQuery.kind, 'skill');
  assert.deepEqual(suggestions.map((item) => item.label), ['$duplicate', '$duplicate']);

  const text = 'use [$duplicate](/tmp/global/duplicate/SKILL.md) now';
  const tokens = parseComposerTokens(text, 'codex', skills);
  assert.equal(tokens[0].path, '/tmp/global/duplicate/SKILL.md');
  assert.equal(tokens[0].skill.scope, 'global');
  assert.deepEqual(selectedSkillFilesFromComposerText(text, 'codex', skills), [
    '/tmp/global/duplicate/SKILL.md',
  ]);
  assert.deepEqual(
    selectedSkillFilesFromComposerText('use [/duplicate](/tmp/global/duplicate/SKILL.md) now', 'codex', skills),
    [],
  );
});

test('selected skill references expand into lightweight prompt block', async () => {
  const { buildComposerDisplayText, buildComposerPromptWithSelectedSkills } = await importComposerModel();

  const prompt = buildComposerPromptWithSelectedSkills(
    'please use $duplicate now',
    [{
      skillFile: '/tmp/project/duplicate/SKILL.md',
      directory: '/tmp/project/duplicate',
      name: 'duplicate',
      description: 'Use this skill',
      content: '---\nname: duplicate\n---\n# Skill body',
      resourceHints: ['/tmp/project/duplicate/scripts'],
      diagnostics: [],
    }],
  );

  assert.match(prompt, /<selected_skills>/);
  assert.match(prompt, /path="\/tmp\/project\/duplicate\/SKILL\.md"/);
  assert.match(prompt, /<resource_hints>\n- \/tmp\/project\/duplicate\/scripts/);
  assert.match(prompt, /progressive disclosure/);
  assert.doesNotMatch(prompt, /<content>/);
  assert.doesNotMatch(prompt, /# Skill body/);
  assert.match(prompt, /<user_request>\nplease use \$duplicate now\n<\/user_request>/);

  assert.equal(
    buildComposerDisplayText('please use [/duplicate](/tmp/project/duplicate/SKILL.md) now'),
    'please use /duplicate now',
  );
});

test('selected skill prompt augmentation stays out of user-visible display text', async () => {
  const composerSource = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceSessionComposer.tsx'),
    'utf8',
  );
  const workspaceSource = await fs.readFile(
    path.join(desktopDir, 'src', 'pages', 'Workspace.tsx'),
    'utf8',
  );
  const nativeViewSource = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceNativeSessionView.tsx'),
    'utf8',
  );

  assert.match(composerSource, /const displayText = buildComposerDisplayText\(promptValue\);/);
  assert.match(composerSource, /displayText,/);
  assert.match(workspaceSource, /const displayPrompt = payload\?\.displayText \?\? rawPrompt;/);
  assert.match(workspaceSource, /const previewPrompt = buildComposerPromptPreview\(displayPrompt, attachments\);/);
  assert.match(nativeViewSource, /const displayText = payload\?\.displayText \?\? text;/);
  assert.match(nativeViewSource, /buildComposerPromptPreview\(payload\.displayText \?\? payload\.text, payload\.attachments \?\? \[\]\)/);
  assert.match(nativeViewSource, /sendNativeSessionInput\(session\.runtime_id, requestText, requestImages, promptEntry\.text\)/);
});

test('image attachments are referenced only while their chip or placeholder remains', async () => {
  const { composerSegmentsReferenceImageAttachment } = await importComposerImageReferences();
  const attachment = {
    id: 'attachment-image-1',
    kind: 'image',
    source: 'paste',
    name: 'Pasted image',
    placeholder: '[Image #1]',
    mediaType: 'image/png',
    base64Data: 'abc',
    byteSize: 3,
    objectUrl: null,
  };

  assert.equal(composerSegmentsReferenceImageAttachment([
    {
      type: 'chip',
      trigger: '',
      value: '[Image #1]',
      displayText: '[Image #1]',
      data: { kind: 'image', attachmentId: 'attachment-image-1', placeholder: '[Image #1]' },
    },
  ], attachment), true);

  assert.equal(composerSegmentsReferenceImageAttachment([
    { type: 'text', text: 'before [Image #1] after' },
  ], attachment), true);

  assert.equal(composerSegmentsReferenceImageAttachment([
    { type: 'text', text: 'before after' },
  ], attachment), false);
});
