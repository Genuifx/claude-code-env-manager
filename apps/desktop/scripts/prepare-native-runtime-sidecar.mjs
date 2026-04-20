import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const helperRoot = path.join(repoRoot, 'packages', 'native-runtime-helper');
const helperDist = path.join(helperRoot, 'dist', 'native-runtime-helper.mjs');
const resourceTarget = path.join(desktopRoot, 'src-tauri', 'resources', 'native-runtime-helper.mjs');
const binariesDir = path.join(desktopRoot, 'src-tauri', 'binaries');

function getTargetTriple() {
  try {
    return execFileSync('rustc', ['--print', 'host-tuple'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    const verbose = execFileSync('rustc', ['-vV'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const match = verbose.match(/^host:\s+(\S+)$/m);
    if (!match) {
      throw new Error('Failed to determine Rust host target triple.');
    }
    return match[1];
  }
}

function resolveBundledNodeBinary() {
  if (!process.execPath || !fs.existsSync(process.execPath)) {
    throw new Error('Unable to locate the current Node.js executable for sidecar packaging.');
  }
  return process.execPath;
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, 0o755);
}

execSync('pnpm --dir ../../ --filter @ccem/native-runtime-helper build', {
  cwd: desktopRoot,
  stdio: 'inherit',
});

if (!fs.existsSync(helperDist)) {
  throw new Error(`Expected helper output at ${helperDist}`);
}

copyFile(helperDist, resourceTarget);

const ext = process.platform === 'win32' ? '.exe' : '';
const targetTriple = getTargetTriple();
const nodeBinary = resolveBundledNodeBinary();
const sidecarTarget = path.join(binariesDir, `ccem-node-${targetTriple}${ext}`);

copyFile(nodeBinary, sidecarTarget);

process.stdout.write(`Prepared native runtime sidecar for ${targetTriple}\n`);
