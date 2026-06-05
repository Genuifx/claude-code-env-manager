import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importAnalyticsTimeBuckets() {
  const sourcePath = path.join(desktopDir, 'src', 'lib', 'analyticsTimeBuckets.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-analytics-time-buckets-test-'));
  const outputPath = path.join(tempDir, 'analyticsTimeBuckets.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('weekly analytics buckets match the backend Monday-based bucket format', async () => {
  const { buildWeekBucketKey } = await importAnalyticsTimeBuckets();

  assert.equal(buildWeekBucketKey('2026-05-29'), '2026-W22');
  assert.equal(buildWeekBucketKey('2026-05-30'), '2026-W22');
  assert.equal(buildWeekBucketKey('2026-05-31'), '2026-W22');
  assert.equal(buildWeekBucketKey('2026-06-01'), '2026-W23');
  assert.equal(buildWeekBucketKey('2026-06-05'), '2026-W23');
  assert.equal(buildWeekBucketKey('2026-06-06'), '2026-W23');
  assert.equal(buildWeekBucketKey('2026-06-07'), '2026-W23');
  assert.equal(buildWeekBucketKey('2026-06-08'), '2026-W24');
});
