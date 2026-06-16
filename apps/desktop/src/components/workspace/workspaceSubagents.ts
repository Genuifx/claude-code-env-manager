import type { SubagentMeta } from '@/features/conversations/types';

export interface SubagentPersona {
  name: string;
  symbol: 'blocks' | 'steps' | 'frame' | 'bridge' | 'spark' | 'axis' | 'orbit';
  accent: string;
}

export interface SubagentDisplayMeta extends SubagentPersona {
  subtitle: string;
  detail: string;
  statusLabel: string;
  running: boolean;
  failed: boolean;
  completed: boolean;
}

export interface SubagentEntryPreviewItem extends SubagentDisplayMeta {
  key: string;
}

export const SUBAGENT_PERSONAS: SubagentPersona[] = [
  { name: 'Godel', symbol: 'blocks', accent: '42 96% 50%' },
  { name: 'Laplace', symbol: 'steps', accent: '207 90% 55%' },
  { name: 'Popper', symbol: 'frame', accent: '214 92% 58%' },
  { name: 'Wegener', symbol: 'bridge', accent: '0 79% 59%' },
  { name: 'Faraday', symbol: 'spark', accent: '212 96% 58%' },
  { name: 'Noether', symbol: 'axis', accent: '155 65% 42%' },
  { name: 'Turing', symbol: 'orbit', accent: '276 75% 62%' },
  { name: 'Curie', symbol: 'spark', accent: '188 78% 42%' },
  { name: 'Lovelace', symbol: 'steps', accent: '326 74% 56%' },
  { name: 'Feynman', symbol: 'blocks', accent: '24 92% 54%' },
  { name: 'Hopper', symbol: 'frame', accent: '259 82% 64%' },
  { name: 'Shannon', symbol: 'bridge', accent: '168 72% 38%' },
];

export function shouldShowSubagentEntry({
  canLoad,
  loading,
  error,
  count,
}: {
  canLoad: boolean;
  loading: boolean;
  error?: string | null;
  count: number;
}) {
  return canLoad && (loading || Boolean(error) || count > 0);
}

export function resolveSubagentSelection(
  subagents: Pick<SubagentMeta, 'agentId'>[],
  selectedAgentId: string | null,
) {
  if (subagents.length === 0) {
    return null;
  }
  if (selectedAgentId && subagents.some((agent) => agent.agentId === selectedAgentId)) {
    return selectedAgentId;
  }
  return subagents[0].agentId;
}

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getSubagentPersona(
  subagent: Pick<SubagentMeta, 'agentId' | 'status'>,
  index: number,
): SubagentPersona {
  const key = subagent.agentId.trim();
  const personaIndex = key ? hashText(key) % SUBAGENT_PERSONAS.length : index % SUBAGENT_PERSONAS.length;
  return SUBAGENT_PERSONAS[personaIndex];
}

export function subagentStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return '运行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status || '未知';
  }
}

export function getSubagentDisplayMeta(subagent: SubagentMeta, index: number): SubagentDisplayMeta {
  const persona = SUBAGENT_PERSONAS[index % SUBAGENT_PERSONAS.length];
  const type = subagent.subagentType?.trim();
  const description = subagent.description?.trim();
  const fallbackId = subagent.agentId ? subagent.agentId.slice(0, 8) : 'agent';
  const detailParts = [
    type,
    `${subagent.messageCount} 条`,
    `${subagent.toolCount} 工具`,
  ].filter(Boolean);

  return {
    ...persona,
    subtitle: description || type || fallbackId,
    detail: detailParts.join(' · '),
    statusLabel: subagentStatusLabel(subagent.status),
    running: subagent.status === 'running',
    failed: subagent.status === 'failed',
    completed: subagent.status === 'completed',
  };
}

export function getSubagentEntryPreview(subagents: SubagentMeta[], maxItems = 12) {
  const limit = Math.max(0, maxItems);
  const items: SubagentEntryPreviewItem[] = subagents.slice(0, limit).map((subagent, index) => ({
    ...getSubagentDisplayMeta(subagent, index),
    key: subagent.agentId || `subagent-${index}`,
  }));

  return {
    items,
    overflowCount: Math.max(0, subagents.length - items.length),
  };
}
