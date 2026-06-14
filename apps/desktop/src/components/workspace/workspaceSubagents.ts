import type { SubagentMeta } from '@/features/conversations/types';

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
