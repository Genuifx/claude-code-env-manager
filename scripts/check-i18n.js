#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zhPath = path.join(__dirname, '../apps/desktop/src/locales/zh.json');
const enPath = path.join(__dirname, '../apps/desktop/src/locales/en.json');

if (!fs.existsSync(zhPath) || !fs.existsSync(enPath)) {
  console.log('⚠️  Locale files not found, skipping check');
  process.exit(0);
}

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const zhKeys = new Set(flattenKeys(zh));
const enKeys = new Set(flattenKeys(en));

const missingInEn = [...zhKeys].filter(k => !enKeys.has(k));
const missingInZh = [...enKeys].filter(k => !zhKeys.has(k));

let hasError = false;

if (missingInEn.length > 0) {
  console.error('❌ Keys missing in en.json:');
  missingInEn.forEach(k => console.error('  - ' + k));
  hasError = true;
}

if (missingInZh.length > 0) {
  console.error('❌ Keys missing in zh.json:');
  missingInZh.forEach(k => console.error('  - ' + k));
  hasError = true;
}

if (!hasError) {
  console.log('✅ i18n keys are consistent');
} else {
  process.exit(1);
}
