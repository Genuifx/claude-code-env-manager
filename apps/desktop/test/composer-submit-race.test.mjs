import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceSessionComposer.tsx');

async function readComposerSource() {
  return fs.readFile(sourcePath, 'utf8');
}

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `missing ${endNeedle}`);
  return source.slice(start, end);
}

test('composer submit reads live DOM text and attachment ref to avoid paste/submit races', async () => {
  const source = await readComposerSource();
  const submitBlock = sliceBetween(source, 'const handleComposerSubmit = useCallback', 'const hasComposerAttentionPanel');

  assert.match(
    submitBlock,
    /promptAreaRef\.current\?\.getPlainText\(\) \?\? segmentsToPlainText\(composerSegments\)/,
  );
  assert.match(submitBlock, /const currentAttachments = attachmentsRef\.current;/);
  assert.match(submitBlock, /attachments: currentAttachments,/);
  assert.match(submitBlock, /revokeComposerImageUrls\(currentAttachments\);/);
});

test('composer attachment ref updates synchronously when pasted attachments are added', async () => {
  const source = await readComposerSource();
  const addBlock = sliceBetween(source, 'const addAttachments = useCallback', 'const syncComposerSegments');

  assert.match(addBlock, /const next = mergeComposerAttachments\(attachmentsRef\.current, nextAttachments\);/);
  assert.match(addBlock, /attachmentsRef\.current = next;/);
  assert.match(addBlock, /setAttachments\(next\);/);
});
