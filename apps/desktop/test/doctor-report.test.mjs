import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importPerfLog() {
  const sourcePath = path.join(desktopDir, 'src', 'lib', 'perf-log.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-doctor-report-test-'));
  const outputPath = path.join(tempDir, 'perf-log.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('doctor report combines frontend perf data and backend diagnostics', async () => {
  const perfLog = await importPerfLog();
  perfLog._resetPerfLogForTests();
  perfLog.recordPerfMark('doctor-test', { source: 'unit' });

  const report = JSON.parse(perfLog.exportDoctorReportAsJson({
    backend: {
      appVersion: '0.0.0-test',
      commands: [{ name: 'node', installed: true }],
    },
  }));

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.kind, 'ccem-doctor-report');
  assert.equal(report.backend.appVersion, '0.0.0-test');
  assert.equal(report.frontend.summary.mark.count, 1);
  assert.ok(report.frontend.events.some((event) => event.name === 'doctor-test'));
});

test('doctor report preserves backend collection errors', async () => {
  const perfLog = await importPerfLog();
  perfLog._resetPerfLogForTests();

  const report = JSON.parse(perfLog.exportDoctorReportAsJson({
    backendError: 'collect_doctor_report failed',
  }));

  assert.equal(report.kind, 'ccem-doctor-report');
  assert.equal(report.backendError, 'collect_doctor_report failed');
  assert.equal(Object.hasOwn(report, 'backend'), false);
});

test('perf logger does not crash when Tauri invoke is read-only', async () => {
  const perfLog = await importPerfLog();
  perfLog._resetPerfLogForTests();
  const internals = {};
  Object.defineProperty(internals, 'invoke', {
    value: async () => undefined,
    configurable: false,
    writable: false,
  });

  const fakeWindow = {
    __TAURI_INTERNALS__: internals,
    addEventListener: () => undefined,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => undefined,
    setTimeout: () => 1,
  };

  assert.doesNotThrow(() => {
    perfLog.initPerfLog(fakeWindow, { patchTauri: true });
  });

  const events = perfLog.getPerfEvents();
  assert.ok(events.some((event) => event.name === 'perf-log:ipc-patch-skipped'));
  assert.ok(events.some((event) => event.name === 'perf-log:installed'));
});
