import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('desktop pet cat uses the image generated state sprite', async () => {
  const [overlaySource, catSource, cssSource] = await Promise.all([
    fs.readFile(path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'pet-overlay', 'PetOverlayCat.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8'),
  ]);

  assert.match(overlaySource, /<PetOverlayCat[\s\S]*notification=\{notifications\[0\]/);
  assert.match(catSource, /aria-label="桌面猫"/);
  assert.match(catSource, /golden-cat-imagegen-states\.png/);
  assert.match(catSource, /golden-cat-hover-rise\.png/);
  assert.match(catSource, /golden-cat-hover-puffed\.png/);
  assert.match(catSource, /cursorPosition/);
  assert.match(catSource, /CAT_HOVER_POLL_INTERVAL_MS/);
  assert.match(catSource, /h-\[256px\] w-\[256px\]/);
  assert.match(catSource, /-ml-\[72px\]/);
  assert.match(catSource, /pointer-events-none/);
  assert.match(catSource, /pet-overlay-cat__hit-area/);
  assert.match(catSource, /hitAreaRef/);
  assert.match(catSource, /getBoundingClientRect/);
  assert.match(catSource, /innerPosition\(\)/);
  assert.match(catSource, /scaleFactor\(\)/);
  assert.match(catSource, /window\.setInterval/);
  assert.match(catSource, /window\.clearInterval/);
  assert.match(catSource, /onPointerEnter=\{\(\) => setIsFurRaised\(true\)\}/);
  assert.match(catSource, /onPointerLeave=\{\(\) => setIsFurRaised\(false\)\}/);
  assert.match(catSource, /onPointerDown=\{handlePointerDown\}/);
  assert.match(catSource, /data-fur-raised=\{isFurRaised \? 'true' : 'false'\}/);
  assert.doesNotMatch(catSource, /drop-shadow|filter:\s*drop-shadow/);
  assert.match(catSource, /<canvas/);
  assert.match(catSource, /pet-overlay-cat__hover-fur/);
  assert.match(catSource, /pet-overlay-cat__hover-frame-rise/);
  assert.match(catSource, /pet-overlay-cat__hover-frame-puffed/);
  assert.match(catSource, /requestAnimationFrame/);
  assert.match(catSource, /findLargestAlphaComponent/);
  assert.match(catSource, /tone === 'failed'/);
  assert.match(catSource, /const THINKING_MESSAGE = '正在思考'/);
  assert.match(catSource, /notification\.message === THINKING_MESSAGE/);
  assert.doesNotMatch(catSource, /pet-overlay-cat__open-eye/);
  assert.doesNotMatch(catSource, /pet-overlay-cat__spark/);
  assert.doesNotMatch(cssSource, /pet-overlay-cat__spark/);
  assert.doesNotMatch(cssSource, /@keyframes pet-cat-spark-pulse/);
  assert.doesNotMatch(cssSource, /pet-cat-open-eye-blink/);
  assert.match(cssSource, /pet-overlay-cat__base/);
  assert.match(cssSource, /pet-overlay-cat__hover-fur/);
  assert.match(cssSource, /pet-overlay-cat__hit-area/);
  assert.match(cssSource, /--pet-cat-hit-left:\s*76px/);
  assert.match(cssSource, /--pet-cat-hit-top:\s*132px/);
  assert.match(cssSource, /--pet-cat-hit-width:\s*86px/);
  assert.match(cssSource, /--pet-cat-hit-height:\s*108px/);
  assert.doesNotMatch(cssSource, /--pet-cat-hit-width:\s*128px/);
  assert.match(cssSource, /--pet-cat-hover-frame-size/);
  assert.doesNotMatch(cssSource, /\.pet-overlay-cat:hover/);
  assert.match(cssSource, /\.pet-overlay-cat\[data-fur-raised='true'\]/);
  assert.match(cssSource, /@keyframes pet-cat-hover-fur-rise/);
  assert.match(cssSource, /@keyframes pet-cat-hover-fur-puffed/);
  assert.match(cssSource, /@keyframes pet-cat-hover-base-out/);
});

test('desktop pet overlay resizes its native window to visible content', async () => {
  const overlaySource = await fs.readFile(
    path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'),
    'utf8',
  );

  assert.match(overlaySource, /ResizeObserver/);
  assert.match(overlaySource, /resize_pet_window/);
  assert.match(overlaySource, /preservePosition/);
  assert.match(overlaySource, /petOverlayContentRef/);
  assert.match(overlaySource, /mark_pet_notification_read/);
  assert.match(overlaySource, /onDismiss=\{dismissNotification\}/);
  assert.match(overlaySource, /optimisticallyMarkNotificationRead/);
});

test('desktop pet refreshes recent external Codex history sessions', async () => {
  const overlaySource = await fs.readFile(
    path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'),
    'utf8',
  );

  assert.match(overlaySource, /fetchHistorySessions\('codex'\)/);
  assert.match(overlaySource, /get_conversation_messages/);
  assert.match(overlaySource, /hydrateCodexHistorySession/);
  assert.match(overlaySource, /provider_session_id/);
  assert.match(overlaySource, /CODEX_HISTORY_RECENCY_MS/);
  assert.match(overlaySource, /displayCacheRef/);
  assert.match(overlaySource, /refreshInFlightRef/);
  assert.match(overlaySource, /refreshQueuedRef/);
});

test('workspace selection marks external Codex pet bubbles as read', async () => {
  const workspaceSource = await fs.readFile(
    path.join(desktopDir, 'src', 'pages', 'Workspace.tsx'),
    'utf8',
  );

  assert.match(workspaceSource, /session\.source === 'codex'/);
  assert.match(workspaceSource, /buildPetNotificationId\('codex', session\.id, 'running'\)/);
  assert.match(workspaceSource, /buildPetNotificationId\('codex', session\.id, 'stopped'\)/);
  assert.match(workspaceSource, /const refreshedSessions = await refreshWorkspaceData/);
  assert.match(workspaceSource, /const refreshedMatchingSession = refreshedSessions\?\.find/);
  assert.match(workspaceSource, /await handleSelect\(refreshedMatchingSession\)/);
});

test('desktop pet keeps the three-bubble stack close to the cat without clipping', async () => {
  const [overlaySource, bubbleSource, petWindowSource] = await Promise.all([
    fs.readFile(path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'pet-overlay', 'PetBubble.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src-tauri', 'src', 'pet_window.rs'), 'utf8'),
  ]);

  assert.doesNotMatch(overlaySource, /max-h-\[/);
  assert.doesNotMatch(overlaySource, /overflow-hidden/);
  assert.match(overlaySource, /gap-0/);
  assert.match(overlaySource, /h-\[136px\] flex-col gap-1/);
  assert.doesNotMatch(overlaySource, /flex-col-reverse/);
  assert.match(overlaySource, /pb-5/);

  assert.match(bubbleSource, /bg-white\/95/);
  assert.match(bubbleSource, /border-amber-300\/80/);
  assert.match(bubbleSource, /h-\[36px\] w-\[184px\]/);
  assert.match(bubbleSource, /px-1\.5 py-1/);
  assert.match(bubbleSource, /text-\[10\.5px\] leading-3/);
  assert.match(bubbleSource, /aria-label="关闭气泡"/);
  assert.match(bubbleSource, /onDismiss\(item\)/);
  assert.match(bubbleSource, /absolute -left-1\.5 -top-1\.5/);
  assert.match(bubbleSource, /absolute right-1\.5 top-1\.5/);
  assert.doesNotMatch(bubbleSource, /pl-7/);
  assert.doesNotMatch(bubbleSource, /item\.statusLabel/);
  assert.doesNotMatch(bubbleSource, /shadow-\[|shadow-|backdrop-blur/);
  assert.doesNotMatch(bubbleSource, /bg-\[rgba/);

  assert.match(petWindowSource, /PET_WINDOW_MAX_WIDTH: f64 = 560\.0/);
  assert.match(petWindowSource, /PET_WINDOW_MAX_HEIGHT: f64 = 420\.0/);
  assert.doesNotMatch(petWindowSource, /set_activation_policy|ActivationPolicy::Accessory/);
});

test('desktop pet hides the cat and ignores clicks when there are no bubbles', async () => {
  const [overlaySource, petWindowSource] = await Promise.all([
    fs.readFile(path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src-tauri', 'src', 'pet_window.rs'), 'utf8'),
  ]);

  assert.match(overlaySource, /const hasNotifications = notifications\.length > 0/);
  assert.match(overlaySource, /set_pet_window_content_visible/);
  assert.match(overlaySource, /\{hasNotifications \? \(/);
  assert.match(petWindowSource, /set_pet_window_content_visible/);
  assert.match(petWindowSource, /set_ignore_cursor_events\(!visible\)/);
  assert.match(petWindowSource, /hide pet window content/);
  assert.match(petWindowSource, /setAcceptsMouseMovedEvents\(true\)/);
});

test('desktop pet cat starts native window dragging', async () => {
  const [overlaySource, catSource, cssSource] = await Promise.all([
    fs.readFile(path.join(desktopDir, 'src', 'pages', 'PetOverlay.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'components', 'pet-overlay', 'PetOverlayCat.tsx'), 'utf8'),
    fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8'),
  ]);

  assert.match(catSource, /getCurrentWindow/);
  assert.match(catSource, /CAT_HOVER_POLL_INTERVAL_MS = 200/);
  assert.match(catSource, /WINDOW_METRIC_CACHE_MS = 1000/);
  assert.match(catSource, /cachedWindowMetrics/);
  assert.match(catSource, /startDragging/);
  assert.match(catSource, /onDragStart/);
  assert.match(catSource, /pet-overlay-cat__hit-area/);
  assert.match(cssSource, /\.pet-overlay-cat__hit-area[\s\S]*cursor: grab/);
  assert.match(cssSource, /\.pet-overlay-cat__hit-area:active[\s\S]*cursor: grabbing/);
  assert.match(overlaySource, /markPetWindowMoved/);
  assert.match(overlaySource, /<PetOverlayCat[\s\S]*onDragStart=\{markPetWindowMoved\}/);
});
