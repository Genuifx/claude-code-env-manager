export type ComposerAttachmentSource = 'drop' | 'paste' | 'recent' | 'search';

export interface ComposerFileAttachment {
  id: string;
  kind: 'file';
  source: ComposerAttachmentSource;
  name: string;
  absolutePath: string;
  relativePath: string | null;
  displayPath: string;
  isOutsideWorkspace: boolean;
}

export interface ComposerTextAttachment {
  id: string;
  kind: 'text';
  source: ComposerAttachmentSource;
  name: string;
  content: string;
  lineCount: number;
  charCount: number;
}

export type ComposerAttachment = ComposerFileAttachment | ComposerTextAttachment;

export interface ComposerSubmitPayload {
  text: string;
  attachments: ComposerAttachment[];
}

export interface ComposerRecentFile {
  path: string;
  relativePath: string | null;
  displayPath: string;
  name: string;
  lastUsed: number;
}

const RECENT_FILES_LIMIT = 8;
const RECENT_FILES_STORAGE_PREFIX = 'ccem:workspace-composer-recent-files:v1:';
const LARGE_PASTE_CHAR_THRESHOLD = 1200;
const LARGE_PASTE_LINE_THRESHOLD = 14;
const MAX_TEXT_ATTACHMENT_CHARS = 16_000;

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeComposerPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

export function getComposerPathName(path: string): string {
  const normalized = normalizeComposerPath(path);
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

export function getRelativeComposerPath(path: string, workingDir?: string | null): string | null {
  if (!workingDir) {
    return null;
  }

  const normalizedPath = normalizeComposerPath(path);
  const normalizedWorkingDir = normalizeComposerPath(workingDir);
  if (normalizedPath === normalizedWorkingDir) {
    return getComposerPathName(normalizedPath);
  }

  const prefix = `${normalizedWorkingDir}/`;
  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  return normalizedPath.slice(prefix.length);
}

export function createComposerFileAttachment(
  path: string,
  workingDir?: string | null,
  source: ComposerAttachmentSource = 'drop',
): ComposerFileAttachment {
  const normalizedPath = normalizeComposerPath(path);
  const relativePath = getRelativeComposerPath(normalizedPath, workingDir);

  return {
    id: makeId('attachment-file'),
    kind: 'file',
    source,
    name: getComposerPathName(normalizedPath),
    absolutePath: normalizedPath,
    relativePath,
    displayPath: relativePath ?? normalizedPath,
    isOutsideWorkspace: relativePath == null,
  };
}

export function createComposerTextAttachment(
  content: string,
  name?: string,
  source: ComposerAttachmentSource = 'paste',
): ComposerTextAttachment {
  const trimmedContent = content.trimEnd();
  const limitedContent = trimmedContent.length > MAX_TEXT_ATTACHMENT_CHARS
    ? `${trimmedContent.slice(0, MAX_TEXT_ATTACHMENT_CHARS)}\n...[truncated]`
    : trimmedContent;
  const lineCount = limitedContent.split('\n').length;

  return {
    id: makeId('attachment-text'),
    kind: 'text',
    source,
    name: name ?? 'Pasted text',
    content: limitedContent,
    lineCount,
    charCount: limitedContent.length,
  };
}

export function isLargeComposerPaste(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const lineCount = trimmed.split('\n').length;
  return trimmed.length >= LARGE_PASTE_CHAR_THRESHOLD || lineCount >= LARGE_PASTE_LINE_THRESHOLD;
}

export function mergeComposerAttachments(
  previous: ComposerAttachment[],
  next: ComposerAttachment[],
): ComposerAttachment[] {
  const merged = [...previous];

  for (const attachment of next) {
    if (attachment.kind === 'file') {
      const existingIndex = merged.findIndex((candidate) =>
        candidate.kind === 'file' && candidate.absolutePath === attachment.absolutePath,
      );
      if (existingIndex >= 0) {
        merged.splice(existingIndex, 1);
      }
      merged.push(attachment);
      continue;
    }

    const existingIndex = merged.findIndex((candidate) =>
      candidate.kind === 'text'
      && candidate.name === attachment.name
      && candidate.content === attachment.content,
    );
    if (existingIndex === -1) {
      merged.push(attachment);
    }
  }

  return merged;
}

function storageKey(workingDir?: string | null): string | null {
  if (!workingDir) {
    return null;
  }

  return `${RECENT_FILES_STORAGE_PREFIX}${normalizeComposerPath(workingDir)}`;
}

export function loadComposerRecentFiles(workingDir?: string | null): ComposerRecentFile[] {
  const key = storageKey(workingDir);
  if (!key || typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is ComposerRecentFile =>
      Boolean(entry)
      && typeof entry.path === 'string'
      && typeof entry.displayPath === 'string'
      && typeof entry.name === 'string'
      && typeof entry.lastUsed === 'number',
    );
  } catch {
    return [];
  }
}

export function saveComposerRecentFile(
  workingDir: string | null | undefined,
  attachment: ComposerFileAttachment,
): ComposerRecentFile[] {
  const key = storageKey(workingDir);
  if (!key || typeof window === 'undefined') {
    return [];
  }

  const nextEntry: ComposerRecentFile = {
    path: attachment.absolutePath,
    relativePath: attachment.relativePath,
    displayPath: attachment.displayPath,
    name: attachment.name,
    lastUsed: Date.now(),
  };

  const existing = loadComposerRecentFiles(workingDir)
    .filter((entry) => entry.path !== attachment.absolutePath);
  const next = [nextEntry, ...existing].slice(0, RECENT_FILES_LIMIT);

  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    return next;
  }

  return next;
}

function wrapAttachmentContent(content: string): string {
  const fence = content.includes('```') ? '````' : '```';
  return `${fence}text\n${content}\n${fence}`;
}

export function buildComposerPromptText(
  text: string,
  attachments: ComposerAttachment[],
): string {
  const trimmedText = text.trim();
  if (attachments.length === 0) {
    return trimmedText;
  }

  const fileAttachments = attachments.filter((attachment): attachment is ComposerFileAttachment => attachment.kind === 'file');
  const textAttachments = attachments.filter((attachment): attachment is ComposerTextAttachment => attachment.kind === 'text');
  const sections: string[] = [];

  if (trimmedText) {
    sections.push(trimmedText);
  }

  if (fileAttachments.length > 0) {
    sections.push([
      'Attached files:',
      ...fileAttachments.map((attachment) =>
        attachment.relativePath
          ? `- @${attachment.relativePath} (${attachment.absolutePath})`
          : `- ${attachment.absolutePath}`,
      ),
    ].join('\n'));
  }

  if (textAttachments.length > 0) {
    sections.push([
      'Attached text snippets:',
      ...textAttachments.map((attachment) => [
        `- ${attachment.name} (${attachment.lineCount} lines)`,
        wrapAttachmentContent(attachment.content),
      ].join('\n')),
    ].join('\n\n'));
  }

  return sections.join('\n\n').trim();
}

export function buildComposerPromptPreview(
  text: string,
  attachments: ComposerAttachment[],
): string {
  const trimmedText = text.trim();
  if (attachments.length === 0) {
    return trimmedText;
  }

  const fileCount = attachments.filter((attachment) => attachment.kind === 'file').length;
  const textCount = attachments.filter((attachment) => attachment.kind === 'text').length;
  const summaryLines = [
    fileCount > 0 ? `Files attached: ${fileCount}` : null,
    textCount > 0 ? `Text snippets attached: ${textCount}` : null,
  ].filter((line): line is string => Boolean(line));

  if (!trimmedText) {
    return summaryLines.join('\n');
  }

  return [
    trimmedText,
    '',
    ...summaryLines,
  ].join('\n');
}
