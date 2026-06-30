import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importDomHelpers() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-prompt-area-chip-test-'));
  const outfile = path.join(tempDir, 'dom-helpers.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'dom-helpers.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function withFakeDOM(callback) {
  const previous = {
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    HTMLBRElement: globalThis.HTMLBRElement,
    Text: globalThis.Text,
    Node: globalThis.Node,
  };

  class FakeNode {
    constructor(text = '') {
      this.textContent = text;
      this.parentNode = null;
    }
  }

  class FakeTextNode extends FakeNode {}

  class FakeHTMLElement extends FakeNode {
    constructor(tagName, text = '') {
      super(text);
      this.tagName = tagName;
      this.dataset = {};
      this.childNodes = [];
    }

    appendChild(node) {
      node.parentNode = this;
      this.childNodes.push(node);
      return node;
    }

    replaceChild(newNode, oldNode) {
      const index = this.childNodes.indexOf(oldNode);
      assert.notEqual(index, -1);
      newNode.parentNode = this;
      oldNode.parentNode = null;
      this.childNodes[index] = newNode;
      return oldNode;
    }

    normalize() {}
  }

  class FakeBRElement extends FakeHTMLElement {
    constructor() {
      super('BR');
    }
  }

  globalThis.Node = FakeNode;
  globalThis.Text = FakeTextNode;
  globalThis.HTMLElement = FakeHTMLElement;
  globalThis.HTMLBRElement = FakeBRElement;
  globalThis.document = {
    createTextNode(text) {
      return new FakeTextNode(text);
    },
  };

  try {
    return callback({ FakeTextNode, FakeHTMLElement, FakeBRElement });
  } finally {
    globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.HTMLBRElement = previous.HTMLBRElement;
    globalThis.Text = previous.Text;
    globalThis.Node = previous.Node;
  }
}

test('triggerless image chips are valid prompt-area chips', async () => {
  const { createChipSegmentFromParts } = await importDomHelpers();

  assert.deepEqual(
    createChipSegmentFromParts(
      '',
      '[Image #1]',
      '[Image #1]',
      { kind: 'image', attachmentId: 'attachment-image-1', placeholder: '[Image #1]' },
      false,
    ),
    {
      type: 'chip',
      trigger: '',
      value: '[Image #1]',
      displayText: '[Image #1]',
      data: { kind: 'image', attachmentId: 'attachment-image-1', placeholder: '[Image #1]' },
    },
  );

  assert.equal(
    createChipSegmentFromParts(undefined, '[Image #1]', '[Image #1]'),
    null,
  );
});

test('prompt-area sentinel text normalizes back into editable text', async () => {
  const { normalizeEditorDOM } = await importDomHelpers();

  withFakeDOM(({ FakeTextNode, FakeHTMLElement, FakeBRElement }) => {
    const editor = new FakeHTMLElement('DIV');
    const sentinel = new FakeHTMLElement('SPAN', '\u200B第二行');
    sentinel.dataset.sentinel = 'true';

    editor.appendChild(new FakeTextNode('大发大发'));
    editor.appendChild(new FakeBRElement());
    editor.appendChild(sentinel);

    assert.equal(normalizeEditorDOM(editor), true);
    assert.equal(editor.childNodes.length, 3);
    assert.ok(editor.childNodes[2] instanceof FakeTextNode);
    assert.equal(editor.childNodes[2].textContent, '第二行');
  });
});

test('prompt-area clear resets the rendered snapshot before publishing empty state', async () => {
  const source = await fs.readFile(path.join(desktopDir, 'src', 'components', 'use-prompt-area.ts'), 'utf8');
  const start = source.indexOf('clear: () => {');
  assert.notEqual(start, -1, 'missing clear handle');
  const end = source.indexOf('events.resetUndoHistory()', start);
  assert.notEqual(end, -1, 'missing undo reset in clear handle');
  const clearBlock = source.slice(start, end);

  assert.match(clearBlock, /lastRenderedValue\.current = \[\]/);
  assert.ok(
    clearBlock.indexOf('lastRenderedValue.current = []') < clearBlock.indexOf('onChange([])'),
    'the rendered snapshot should reset before clear emits an empty value',
  );
});
