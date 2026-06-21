import fs from 'fs';
import os from 'os';
import path from 'path';

const MAX_SINGLE_IMAGE_BYTES = 30 * 1024 * 1024; // 30 MB
const MAX_TOTAL_IMAGE_BYTES = 300 * 1024 * 1024; // 300 MB

export interface PromptImagePart {
  type: 'image';
  image: {
    mediaType: string;
    base64Data: string;
  };
}

export interface TextPart {
  type: 'text';
  text: string;
}

export type ContentPart = TextPart | PromptImagePart;

export interface LocalImageInputs {
  inputs: Array<{ type: string; text?: string; path?: string }>;
  tempFiles: string[];
}

/**
 * Writes image parts to temp files for Codex SDK's local_image input type.
 * Returns the input parts plus a list of temp file paths for cleanup.
 * Enforces per-image and total size limits.
 * On error (size limit, write failure), cleans up any already-written files before rethrowing.
 */
export function createLocalImageInputs(parts: ContentPart[]): LocalImageInputs {
  const tempDir = path.join(os.tmpdir(), 'ccem-images');
  fs.mkdirSync(tempDir, { recursive: true });

  const inputs: Array<{ type: string; text?: string; path?: string }> = [];
  const tempFiles: string[] = [];
  let totalSize = 0;

  try {
    for (const part of parts) {
      if (part.type === 'text') {
        inputs.push({ type: 'text', text: part.text });
        continue;
      }

      const data = Buffer.from(part.image.base64Data, 'base64');
      if (data.length > MAX_SINGLE_IMAGE_BYTES) {
        throw new Error(`Image exceeds max size of ${MAX_SINGLE_IMAGE_BYTES / 1024 / 1024}MB`);
      }
      totalSize += data.length;
      if (totalSize > MAX_TOTAL_IMAGE_BYTES) {
        throw new Error(`Total image size exceeds limit of ${MAX_TOTAL_IMAGE_BYTES / 1024 / 1024}MB`);
      }

      const ext = part.image.mediaType.split('/')[1] || 'png';
      const filename = `paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const filePath = path.join(tempDir, filename);
      fs.writeFileSync(filePath, data);
      tempFiles.push(filePath);
      inputs.push({ type: 'local_image', path: filePath });
    }
  } catch (error) {
    // Clean up any files already written before the error propagated
    cleanupTempFiles(tempFiles);
    throw error;
  }

  return { inputs, tempFiles };
}

/**
 * Delete temp files created during a Codex turn.
 * Silently ignores missing or already-deleted files.
 */
export function cleanupTempFiles(files: string[]): void {
  for (const file of files) {
    try {
      fs.unlinkSync(file);
    } catch {
      // file may already be deleted or inaccessible — ignore
    }
  }
}

export { MAX_SINGLE_IMAGE_BYTES, MAX_TOTAL_IMAGE_BYTES };
