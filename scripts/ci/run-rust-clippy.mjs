#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';

const relativeCwd = process.argv[2] ?? '.';
const cwd = path.resolve(process.cwd(), relativeCwd);
const child = spawn('cargo', ['clippy', '--', '-D', 'warnings'], {
  cwd,
  shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';

function append(chunk, stream) {
  const text = chunk.toString();
  output += text;
  stream.write(chunk);
}

function tail(text, maxLines) {
  const lines = text.trimEnd().split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

function escapeAnnotation(text) {
  return text
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .slice(-7000);
}

async function writeSummary(text) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }

  const fs = await import('node:fs/promises');
  await fs.appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `### Rust clippy failure\n\n\`\`\`text\n${text}\n\`\`\`\n`,
  );
}

child.stdout.on('data', chunk => append(chunk, process.stdout));
child.stderr.on('data', chunk => append(chunk, process.stderr));

child.on('close', async code => {
  if (code !== 0) {
    const summary = tail(output, 120);
    await writeSummary(summary);
    const annotation = escapeAnnotation(tail(output, 60));
    process.stdout.write(
      `::error file=apps/desktop/src-tauri/Cargo.toml,title=Rust clippy failed::${annotation}\n`,
    );
  }

  process.exit(code ?? 1);
});
