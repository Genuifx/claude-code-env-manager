#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const repoRoot = new URL('../../', import.meta.url);

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, repoRoot), 'utf8'));
}

function readPackageVersion(relativePath, packageName) {
  const contents = readFileSync(new URL(relativePath, repoRoot), 'utf8');
  const packageBlock = contents
    .split('[[package]]')
    .find((block) => block.includes(`\nname = "${packageName}"\n`));
  const version = packageBlock?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

  if (!version) {
    throw new Error(`Could not find ${packageName} in ${relativePath}`);
  }

  return version;
}

const cliVersion = readJson('apps/cli/package.json').version;
const versions = {
  'apps/cli/package.json': cliVersion,
  'apps/desktop/package.json': readJson('apps/desktop/package.json').version,
  'apps/desktop/src-tauri/tauri.conf.json': readJson(
    'apps/desktop/src-tauri/tauri.conf.json',
  ).version,
  'apps/desktop/src-tauri/Cargo.toml': readPackageVersion(
    'apps/desktop/src-tauri/Cargo.toml',
    'ccem-desktop',
  ),
  'apps/desktop/src-tauri/Cargo.lock': readPackageVersion(
    'apps/desktop/src-tauri/Cargo.lock',
    'ccem-desktop',
  ),
};

const expectedVersion = process.argv[2] ?? cliVersion;
const mismatches = Object.entries(versions).filter(([, version]) => version !== expectedVersion);

if (mismatches.length > 0) {
  const details = Object.entries(versions)
    .map(([path, version]) => `${path}=${version}`)
    .join(', ');
  console.error(
    `::error title=Release version mismatch::Expected ${expectedVersion}; ${details}. ` +
      'Run pnpm version-packages or node scripts/sync-version.js, then commit every version file.',
  );
  process.exit(1);
}

console.log(`Release versions are aligned at ${expectedVersion}.`);
