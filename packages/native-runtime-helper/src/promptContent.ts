export type PromptImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

export type PromptImage = {
  mediaType: PromptImageMediaType;
  base64Data: string;
  placeholder?: string | null;
};

export type PromptContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: PromptImage };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function defaultImagePlaceholder(index: number): string {
  return `[Image #${index + 1}]`;
}

function pushTextPart(parts: PromptContentPart[], text: string) {
  const trimmed = text.trim();
  if (trimmed) {
    parts.push({ type: 'text', text: trimmed });
  }
}

export function buildPromptContentParts(
  text: string,
  images?: PromptImage[] | null,
): PromptContentPart[] {
  const trimmedText = text.trim();
  const promptImages = images?.filter((image) => image.base64Data.trim()) ?? [];

  if (promptImages.length === 0) {
    return trimmedText ? [{ type: 'text', text: trimmedText }] : [];
  }

  if (!trimmedText) {
    return promptImages.map((image) => ({ type: 'image', image }));
  }

  const occurrences: Array<{
    imageIndex: number;
    start: number;
    end: number;
  }> = [];

  for (const [imageIndex, image] of promptImages.entries()) {
    const candidates = Array.from(new Set([
      image.placeholder?.trim() || null,
      defaultImagePlaceholder(imageIndex),
    ].filter((candidate): candidate is string => Boolean(candidate))));

    let best: { start: number; end: number } | null = null;
    for (const candidate of candidates) {
      const match = new RegExp(escapeRegExp(candidate)).exec(trimmedText);
      if (!match || match.index == null) {
        continue;
      }

      const occurrence = {
        start: match.index,
        end: match.index + candidate.length,
      };
      if (!best || occurrence.start < best.start) {
        best = occurrence;
      }
    }

    if (best) {
      occurrences.push({ imageIndex, ...best });
    }
  }

  occurrences.sort((a, b) => a.start - b.start || a.end - b.end);

  const parts: PromptContentPart[] = [];
  const usedImageIndexes = new Set<number>();
  let cursor = 0;

  for (const occurrence of occurrences) {
    if (usedImageIndexes.has(occurrence.imageIndex) || occurrence.start < cursor) {
      continue;
    }

    pushTextPart(parts, trimmedText.slice(cursor, occurrence.start));
    parts.push({ type: 'image', image: promptImages[occurrence.imageIndex]! });
    usedImageIndexes.add(occurrence.imageIndex);
    cursor = occurrence.end;
  }

  pushTextPart(parts, trimmedText.slice(cursor));

  for (const [imageIndex, image] of promptImages.entries()) {
    if (!usedImageIndexes.has(imageIndex)) {
      parts.push({ type: 'image', image });
    }
  }

  return parts;
}
