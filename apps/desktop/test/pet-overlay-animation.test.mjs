import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('desktop pet cat uses a blinking eye animation layer', async () => {
  const [overlaySource, catSource, cssSource] = await Promise.all([
    fs.readFile(path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'pet-overlay', 'PetOverlayCat.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8'),
  ]);

  assert.match(overlaySource, /<PetOverlayCat\s*\/>/);
  assert.match(catSource, /aria-label="桌面猫"/);
  assert.match(catSource, /pet-overlay-cat__open-eye/);
  assert.match(cssSource, /@keyframes pet-cat-open-eye-blink/);
  assert.match(cssSource, /animation:\s*pet-cat-open-eye-blink/);
});

test('desktop pet overlay resizes its native window to visible content', async () => {
  const overlaySource = await fs.readFile(
    path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'),
    'utf8',
  );

  assert.match(overlaySource, /ResizeObserver/);
  assert.match(overlaySource, /resize_pet_window/);
  assert.match(overlaySource, /petOverlayContentRef/);
});
