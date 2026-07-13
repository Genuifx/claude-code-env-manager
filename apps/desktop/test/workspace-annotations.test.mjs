import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';

const desktopDir = path.resolve(import.meta.dirname, '..');

async function importWorkspaceAnnotations() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-annotations-'));
  const outfile = path.join(tempDir, 'workspaceAnnotations.mjs');
  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceAnnotationModel.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(`${outfile}?v=${Date.now()}`);
}

test('normalizes selected transcript text without destroying meaningful line breaks', async () => {
  const { normalizeWorkspaceSelection } = await importWorkspaceAnnotations();

  assert.equal(
    normalizeWorkspaceSelection('  first line  \n\n  second line  '),
    'first line\n\n  second line',
  );
  assert.equal(normalizeWorkspaceSelection('   '), null);
  assert.equal(normalizeWorkspaceSelection('x'.repeat(12_001)), null);
});

test('annotation prompt keeps selected text and notes structured and escapes XML', async () => {
  const { buildComposerPromptWithAnnotations } = await importWorkspaceAnnotations();
  const prompt = buildComposerPromptWithAnnotations('Please continue', [
    {
      id: 'a-1',
      quote: 'Use <Button> & keep it',
      note: 'Change "keep" to > remove',
      createdAt: '2026-07-12T00:00:00.000Z',
    },
    {
      id: 'a-2',
      quote: 'Second quote',
      note: 'Second note',
      createdAt: '2026-07-12T00:00:01.000Z',
    },
  ]);

  assert.match(prompt, /<workspace_annotations>/);
  assert.match(prompt, /<selected_text>Use &lt;Button&gt; &amp; keep it<\/selected_text>/);
  assert.match(prompt, /<note>Change &quot;keep&quot; to &gt; remove<\/note>/);
  assert.match(prompt, /<annotation index="2">/);
  assert.match(prompt, /<user_request>\nPlease continue\n<\/user_request>/);
});

test('annotation-only prompt is sendable without inventing a user request body', async () => {
  const { buildComposerPromptWithAnnotations } = await importWorkspaceAnnotations();
  const prompt = buildComposerPromptWithAnnotations('', [{
    id: 'a-1',
    quote: 'Selected text',
    note: 'Fix this',
    createdAt: '2026-07-12T00:00:00.000Z',
  }]);

  assert.match(prompt, /<workspace_annotations>/);
  assert.doesNotMatch(prompt, /<user_request>/);
  assert.match(prompt, /Treat these annotations as the user's requested changes/);
});

test('stored annotations reject malformed records and enforce the session limit', async () => {
  const {
    MAX_WORKSPACE_ANNOTATIONS,
    normalizeStoredWorkspaceAnnotations,
  } = await importWorkspaceAnnotations();
  const records = Array.from({ length: MAX_WORKSPACE_ANNOTATIONS + 3 }, (_, index) => ({
    id: `a-${index}`,
    quote: `quote ${index}`,
    note: `note ${index}`,
    createdAt: '2026-07-12T00:00:00.000Z',
  }));
  records.splice(2, 0, { id: 'bad', quote: '', note: 'missing quote' });

  const normalized = normalizeStoredWorkspaceAnnotations(records);
  assert.equal(normalized.length, MAX_WORKSPACE_ANNOTATIONS);
  assert.equal(normalized.some((item) => item.id === 'bad'), false);
});

test('stored annotations enforce a total prompt budget', async () => {
  const {
    MAX_WORKSPACE_ANNOTATION_TOTAL_CHARS,
    normalizeStoredWorkspaceAnnotations,
  } = await importWorkspaceAnnotations();
  const records = Array.from({ length: 8 }, (_, index) => ({
    id: `large-${index}`,
    quote: 'q'.repeat(10_000),
    note: `note ${index}`,
    createdAt: '2026-07-12T00:00:00.000Z',
  }));

  const normalized = normalizeStoredWorkspaceAnnotations(records);
  const totalChars = normalized.reduce((total, item) => total + item.quote.length + item.note.length, 0);
  assert.ok(totalChars <= MAX_WORKSPACE_ANNOTATION_TOTAL_CHARS);
  assert.ok(normalized.length < records.length);
});

test('stored annotations preserve valid transcript anchors and discard malformed anchors only', async () => {
  const { normalizeStoredWorkspaceAnnotations } = await importWorkspaceAnnotations();
  const normalized = normalizeStoredWorkspaceAnnotations([
    {
      id: 'anchored',
      quote: 'selected text',
      note: 'change this',
      createdAt: '2026-07-13T00:00:00.000Z',
      anchor: {
        startItemKey: 'message-a-segment-0-message',
        startOffset: 4,
        endItemKey: 'message-a-segment-0-message',
        endOffset: 17,
      },
    },
    {
      id: 'legacy',
      quote: 'legacy text',
      note: 'keep working',
      createdAt: '2026-07-13T00:00:01.000Z',
      anchor: { startItemKey: '', startOffset: -1 },
    },
  ]);

  assert.deepEqual(normalized[0].anchor, {
    startItemKey: 'message-a-segment-0-message',
    startOffset: 4,
    endItemKey: 'message-a-segment-0-message',
    endOffset: 17,
  });
  assert.equal('anchor' in normalized[1], false);
});

test('live and history workspace paths wire transcript selections into successful composer sends', async () => {
  const [composerSource, liveSource, historySource, detailSource, annotationSource] = await Promise.all([
    fs.readFile(path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceSessionComposer.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceNativeSessionView.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'pages', 'Workspace.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceConversationDetail.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceAnnotations.tsx'), 'utf8'),
  ]);

  assert.match(composerSource, /text = buildComposerPromptWithAnnotations\(text, annotations\)/);
  assert.match(composerSource, /if \(result !== false\)[\s\S]*onAnnotationsSent\?\.\(\)/);
  assert.match(liveSource, /composerHasDraft \|\| sessionAnnotations\.annotations\.length > 0/);
  assert.match(liveSource, /onAdd=\{sessionAnnotations\.addAnnotation\}/);
  assert.match(liveSource, /isActive=\{isVisible\}/);
  assert.match(liveSource, /annotations=\{sessionAnnotations\.annotations\}/);
  assert.match(liveSource, /onAnnotationsSent=\{sessionAnnotations\.clearAnnotations\}/);
  assert.match(historySource, /onAddAnnotation=\{selectedHistorySupportsInline \? historyAnnotations\.addAnnotation : undefined\}/);
  assert.match(historySource, /annotations=\{historyAnnotations\.annotations\}/);
  assert.match(historySource, /onAnnotationsSent=\{historyAnnotations\.clearAnnotations\}/);
  assert.match(detailSource, /<WorkspaceTranscriptSelection/);
  assert.match(annotationSource, /scopeKey/);
  assert.match(annotationSource, /data-workspace-annotation-marker/);
  assert.match(annotationSource, /group-hover:opacity-100/);
  assert.match(annotationSource, /candidate\?\.editing \? candidate\.rects/);
});
