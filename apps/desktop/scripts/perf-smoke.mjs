#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importPerfSmokeModule() {
  const sourcePath = path.join(desktopDir, 'src', 'lib', 'doctor-perf-smoke.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-perf-smoke-'));
  const outputPath = path.join(tempDir, 'doctor-perf-smoke.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text;
}

function usage() {
  return [
    'Usage:',
    '  pnpm --filter @ccem/desktop perf:smoke -- <doctor-report.json>',
    '  pnpm --filter @ccem/desktop perf:smoke -- - < doctor-report.json',
    '  pnpm --filter @ccem/desktop perf:smoke -- --print-budgets',
  ].join('\n');
}

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith('-'));
const printBudgets = args.includes('--print-budgets');
const module = await importPerfSmokeModule();

if (printBudgets) {
  console.log(JSON.stringify({
    kind: 'ccem-doctor-perf-smoke-budgets',
    budgets: module.DOCTOR_PERF_SMOKE_BUDGETS,
  }, null, 2));
  process.exit(0);
}

if (!inputPath && !args.includes('-')) {
  console.error(usage());
  process.exit(2);
}

const raw = inputPath
  ? await fs.readFile(path.resolve(inputPath), 'utf8')
  : await readStdin();
const parsed = JSON.parse(raw);
const perfSmoke = parsed?.perfSmoke ?? parsed;
const summary = module.summarizeDoctorPerfSmoke(perfSmoke);

assert.equal(typeof summary.ok, 'boolean');

const result = {
  ok: summary.ok,
  verdict: summary.verdict,
  generatedAt: perfSmoke?.generatedAt,
  failedRuns: summary.failedRuns.map((run) => ({
    name: run.name,
    durationMs: run.durationMs,
    budgetMs: run.budgetMs,
    error: run.error,
  })),
  skippedRuns: summary.skippedRuns.map((run) => run.name),
};

console.log(JSON.stringify(result, null, 2));
if (!summary.ok) {
  process.exitCode = 1;
}
