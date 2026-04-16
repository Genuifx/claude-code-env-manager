export type HistorySource = 'claude' | 'codex' | 'opencode';

export type HistorySourceFilter = 'all' | HistorySource;

export interface HistorySessionItem {
  id: string;
  source: HistorySource;
  display: string;
  timestamp: number;
  project: string;
  projectName: string;
  envName?: string;
  configSource?: 'ccem' | 'native';
}

export interface ConversationContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  input?: unknown;
  content?: unknown;
  is_error?: boolean;
  tool_use_id?: string;
  _result?: unknown;
  _resultError?: boolean;
  [key: string]: unknown;
}

export interface ConversationMessageData {
  msgType: string;
  uuid?: string;
  content: ConversationContentBlock[] | ConversationContentBlock | string | null;
  model?: string;
  summary?: string;
  timestamp?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  segmentIndex: number;
  isCompactBoundary: boolean;
  planContent?: string;
}

export interface HistorySegment {
  segmentIndex: number;
  timestamp: number;
  trigger?: string;
  preTokens?: number;
  messageCount: number;
}

export function toSessionKey(session: Pick<HistorySessionItem, 'id' | 'source'>): string {
  return `${session.source}:${session.id}`;
}
