import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function loadSnapshotSlotModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-helper-snapshot-slot-test-'));
  const outfile = path.join(tempDir, 'claudeQuerySnapshotSlot.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'claudeQuerySnapshotSlot.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(pathToFileURL(outfile).href);
}

test('stale snapshot does not clear the current query slot', async () => {
  const { QuerySnapshotSlot } = await loadSnapshotSlotModule();
  const slot = new QuerySnapshotSlot();
  const closed = [];
  const queryA = { close: () => closed.push('query:A') };
  const queueA = { close: () => closed.push('queue:A') };
  const queryB = { close: () => closed.push('query:B') };
  const queueB = { close: () => closed.push('queue:B') };

  const snapshotA = slot.activate(queryA, queueA);
  const snapshotB = slot.activate(queryB, queueB);

  snapshotA.inputQueue.close();
  snapshotA.query.close();
  const clearedStale = slot.clearIfCurrent(snapshotA);

  assert.equal(clearedStale, false);
  assert.equal(slot.capture(), snapshotB);
  assert.equal(slot.isCurrent(snapshotA), false);
  assert.equal(slot.isCurrent(snapshotB), true);
  assert.deepEqual(closed, ['queue:A', 'query:A']);
});

test('query slot generations are captured from the same current snapshot object', async () => {
  const { QuerySnapshotSlot } = await loadSnapshotSlotModule();
  const slot = new QuerySnapshotSlot();

  const snapshotA = slot.activate({ id: 'A' }, null);
  const snapshotB = slot.activate({ id: 'B' }, null);

  assert.equal(snapshotA.generation, 1);
  assert.equal(snapshotB.generation, 2);
  assert.equal(slot.capture(), snapshotB);
  assert.equal(slot.clearIfCurrent(snapshotA), false);
  assert.equal(slot.clearIfCurrent(snapshotB), true);
  assert.equal(slot.capture(), null);
});
