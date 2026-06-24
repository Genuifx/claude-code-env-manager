#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const suppressionPath = path.join(rootDir, 'docs/security/production-audit-suppressions.json');
const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function runAudit() {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['audit', '--prod', '--json'], {
      cwd: rootDir,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function readSuppressions() {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(suppressionPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${path.relative(rootDir, suppressionPath)}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.suppressions)) {
    throw new Error('Audit suppression file must contain a top-level suppressions array.');
  }

  return parsed.suppressions;
}

function advisoryId(advisory) {
  return advisory.github_advisory_id || String(advisory.id);
}

function highProductionAdvisories(auditJson) {
  return Object.values(auditJson.advisories ?? {})
    .filter(advisory => severityRank[advisory.severity] >= severityRank.high)
    .map(advisory => ({
      ...advisory,
      paths: advisory.findings?.flatMap(finding => finding.paths ?? []) ?? [],
    }));
}

function validateSuppression(suppression, index) {
  const prefix = `suppression[${index}]`;
  for (const field of ['id', 'package', 'reason', 'owner', 'reviewCondition', 'expires']) {
    if (typeof suppression[field] !== 'string' || suppression[field].trim() === '') {
      throw new Error(`${prefix}.${field} is required.`);
    }
  }

  if (!Array.isArray(suppression.paths) || suppression.paths.length === 0) {
    throw new Error(`${prefix}.paths must list every accepted advisory path.`);
  }

  for (const advisoryPath of suppression.paths) {
    if (typeof advisoryPath !== 'string' || advisoryPath.trim() === '') {
      throw new Error(`${prefix}.paths contains an empty path.`);
    }
  }

  const expires = new Date(`${suppression.expires}T23:59:59Z`);
  if (Number.isNaN(expires.getTime())) {
    throw new Error(`${prefix}.expires must be an ISO date.`);
  }

  if (expires < new Date()) {
    throw new Error(`${prefix} expired on ${suppression.expires}. Review or remove it.`);
  }
}

function matchingSuppression(advisory, suppressions) {
  const id = advisoryId(advisory);
  return suppressions.find(suppression =>
    suppression.id === id
    && suppression.package === advisory.module_name
  );
}

function formatAdvisory(advisory, paths = advisory.paths) {
  const formattedPaths = paths.map(auditPath => `    - ${auditPath}`).join('\n');
  return `${advisory.severity.toUpperCase()} ${advisory.module_name} ${advisoryId(advisory)}\n`
    + `  ${advisory.title}\n`
    + `  ${advisory.url}\n`
    + formattedPaths;
}

async function main() {
  const suppressions = await readSuppressions();
  suppressions.forEach(validateSuppression);

  const audit = await runAudit();
  let auditJson;
  try {
    auditJson = JSON.parse(audit.stdout);
  } catch (error) {
    process.stderr.write(audit.stderr);
    throw new Error(`pnpm audit did not return JSON: ${error.message}`);
  }

  const highAdvisories = highProductionAdvisories(auditJson);
  const failures = [];
  const usedSuppressions = new Set();

  for (const advisory of highAdvisories) {
    const suppression = matchingSuppression(advisory, suppressions);
    if (!suppression) {
      failures.push(formatAdvisory(advisory));
      continue;
    }

    usedSuppressions.add(suppression);
    const acceptedPaths = new Set(suppression.paths);
    const uncoveredPaths = advisory.paths.filter(auditPath => !acceptedPaths.has(auditPath));
    if (uncoveredPaths.length > 0) {
      failures.push(formatAdvisory(advisory, uncoveredPaths));
    }
  }

  const staleSuppressions = suppressions.filter(suppression => !usedSuppressions.has(suppression));
  if (staleSuppressions.length > 0) {
    const staleList = staleSuppressions
      .map(suppression => `  - ${suppression.id} ${suppression.package}`)
      .join('\n');
    failures.push(`Stale production audit suppressions must be removed:\n${staleList}`);
  }

  if (failures.length > 0) {
    process.stderr.write(
      'Production high/critical audit gate failed.\n'
      + 'Upgrade the dependency, add a scoped override, or document a short-term suppression with owner, reason, reviewCondition, expires, and exact paths.\n\n'
      + failures.join('\n\n')
      + '\n',
    );
    process.exit(1);
  }

  const metadata = auditJson.metadata?.vulnerabilities;
  const counts = metadata
    ? `low=${metadata.low ?? 0}, moderate=${metadata.moderate ?? 0}, high=${metadata.high ?? 0}, critical=${metadata.critical ?? 0}`
    : 'metadata unavailable';
  process.stdout.write(`Production audit gate passed (${counts}).\n`);
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
