const GENERIC_IMAGE_PLACEHOLDER_RE = /\[Image #\d+\]/gi;
const IMAGE_SUMMARY_LINE_RE = /^Images attached:\s*\d+\s*$/i;
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g;
const PROMPT_TIME_MATCH_WINDOW_MS = 10 * 60 * 1000;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parsePromptTimestamp(value: string | number | null | undefined): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function imagePlaceholdersFromBlocks(
  blocks?: Array<unknown> | null,
): string[] {
  if (!blocks?.length) {
    return [];
  }

  const placeholders: string[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const placeholder = block
      && typeof block === 'object'
      && 'placeholder' in block
      && typeof block.placeholder === 'string'
      ? block.placeholder.trim()
      : '';
    if (!placeholder || seen.has(placeholder)) {
      continue;
    }
    seen.add(placeholder);
    placeholders.push(placeholder);
  }
  return placeholders;
}

export function promptTextKey(text: string | null | undefined): string {
  return (text ?? '').trim();
}

export function extractTaggedUserRequest(text: string): string | null {
  const tagged = /<user_request>([\s\S]*?)(?:<\/user_request>|$)/i.exec(text);
  return tagged?.[1]?.trim() || null;
}

function removeImagesAttachedLines(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !IMAGE_SUMMARY_LINE_RE.test(line.trim()))
    .join('\n');
}

function removeImagePlaceholders(text: string, placeholders: string[]): string {
  let next = text;
  for (const placeholder of placeholders) {
    next = next.replace(new RegExp(escapeRegExp(placeholder), 'g'), '');
  }
  return next.replace(GENERIC_IMAGE_PLACEHOLDER_RE, '');
}

export function stripRenderedImageMarkers(
  text: string | null | undefined,
  imageBlocks?: Array<unknown> | null,
): string {
  const keyed = promptTextKey(text);
  if (!keyed) {
    return '';
  }

  const placeholders = imagePlaceholdersFromBlocks(imageBlocks);
  return removeImagePlaceholders(removeImagesAttachedLines(keyed), placeholders)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizePromptIdentityText(
  text: string | null | undefined,
  imageBlocks?: Array<unknown> | null,
): string {
  const keyed = promptTextKey(text).normalize('NFC').replace(ZERO_WIDTH_RE, '');
  const requestText = (extractTaggedUserRequest(keyed) ?? keyed).normalize('NFC');
  return removeImagePlaceholders(removeImagesAttachedLines(requestText), imagePlaceholdersFromBlocks(imageBlocks))
    .replace(/\s+/g, '')
    .trim();
}

export function normalizePromptConfirmationText(
  text: string | null | undefined,
  imageBlocks?: Array<unknown> | null,
): string {
  const keyed = promptTextKey(text).normalize('NFC').replace(ZERO_WIDTH_RE, '');
  const requestText = (extractTaggedUserRequest(keyed) ?? keyed).normalize('NFC');
  return stripRenderedImageMarkers(requestText, imageBlocks).normalize('NFC').replace(ZERO_WIDTH_RE, '');
}

export function promptIdentityMatches(
  promptText: string | null | undefined,
  messageText: string | null | undefined,
  promptImages?: Array<unknown> | null,
  messageImages?: Array<unknown> | null,
): { matched: boolean; exact: boolean } {
  const prompt = normalizePromptIdentityText(promptText, promptImages);
  const message = normalizePromptIdentityText(messageText, messageImages);
  if (!prompt || !message) {
    return { matched: false, exact: false };
  }

  if (prompt === message) {
    return { matched: true, exact: true };
  }

  return {
    matched: prompt.length >= 16 && message.includes(prompt),
    exact: false,
  };
}

export function promptTimestampsAreCompatible(
  promptTimestamp: number | undefined,
  messageTimestamp: number | undefined,
): boolean {
  if (promptTimestamp == null || messageTimestamp == null) {
    return true;
  }

  return Math.abs(promptTimestamp - messageTimestamp) <= PROMPT_TIME_MATCH_WINDOW_MS;
}
