import type { Segment } from '../types';
import type { ComposerImageAttachment } from './composerAttachments';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function composerSegmentsReferenceImageAttachment(
  segments: Segment[],
  attachment: ComposerImageAttachment,
): boolean {
  return segments.some((segment) => {
    if (segment.type === 'text') {
      return segment.text.includes(attachment.placeholder);
    }

    if (segment.value === attachment.placeholder || segment.displayText === attachment.placeholder) {
      return true;
    }

    if (!isRecord(segment.data)) {
      return false;
    }

    return segment.data.kind === 'image'
      && (
        segment.data.attachmentId === attachment.id
        || segment.data.placeholder === attachment.placeholder
      );
  });
}
