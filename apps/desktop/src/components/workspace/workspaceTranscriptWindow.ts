export function getInitialTranscriptRenderCount(totalMessages: number, batchSize: number): number {
  return Math.min(Math.max(0, totalMessages), Math.max(0, batchSize));
}

export function getLatestTranscriptWindow<T>(messages: T[], renderedCount: number): T[] {
  const safeCount = Math.min(messages.length, Math.max(0, renderedCount));
  return messages.slice(Math.max(0, messages.length - safeCount));
}
