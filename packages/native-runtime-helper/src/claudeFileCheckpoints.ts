const PROMPT_SUMMARY_MAX_LENGTH = 140;

export type ClaudeFileCheckpointEvent = {
  type: 'checkpoint_created';
  provider: 'claude';
  checkpoint_id: string;
  provider_session_id: string | null;
  prompt_summary: string | null;
  source: 'claude-file-checkpoint';
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateSummary(value: string) {
  if (value.length <= PROMPT_SUMMARY_MAX_LENGTH) {
    return value;
  }
  return `${value.slice(0, PROMPT_SUMMARY_MAX_LENGTH - 1)}...`;
}

export function summarizeClaudeUserPrompt(message: unknown): string | null {
  const root = readObject(message);
  const sdkMessage = readObject(root?.message);
  const content = sdkMessage?.content;

  if (typeof content === 'string') {
    const summary = normalizeWhitespace(content);
    return summary ? truncateSummary(summary) : null;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const text = content
    .map((block) => {
      const blockObject = readObject(block);
      if (blockObject?.type === 'text' && typeof blockObject.text === 'string') {
        return blockObject.text;
      }
      if (blockObject?.type === 'image') {
        return '[image]';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');

  const summary = normalizeWhitespace(text);
  return summary ? truncateSummary(summary) : null;
}

export function isClaudeUserPromptCheckpointCandidate(message: unknown): boolean {
  const root = readObject(message);
  if (root?.type !== 'user') {
    return false;
  }
  if (typeof root.uuid !== 'string' || !root.uuid.trim()) {
    return false;
  }
  if (root.parent_tool_use_id !== null && root.parent_tool_use_id !== undefined) {
    return false;
  }
  if (root.tool_use_result !== undefined) {
    return false;
  }

  const sdkMessage = readObject(root.message);
  if (sdkMessage?.role !== 'user') {
    return false;
  }

  const content = sdkMessage.content;
  if (Array.isArray(content)) {
    return !content.some((block) => readObject(block)?.type === 'tool_result');
  }
  return typeof content === 'string';
}

export function buildClaudeFileCheckpointEvent(
  message: unknown,
  providerSessionId: string | null,
): ClaudeFileCheckpointEvent | null {
  if (!isClaudeUserPromptCheckpointCandidate(message)) {
    return null;
  }

  const root = message as { uuid: string };
  return {
    type: 'checkpoint_created',
    provider: 'claude',
    checkpoint_id: root.uuid.trim(),
    provider_session_id: providerSessionId,
    prompt_summary: summarizeClaudeUserPrompt(message),
    source: 'claude-file-checkpoint',
  };
}
