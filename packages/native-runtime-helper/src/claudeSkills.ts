export const CLAUDE_SKILL_SETTING_SOURCES = ['user', 'project'] as const;

export function ensureClaudeSkillToolAllowed(allowedTools?: string[] | null): string[] | undefined {
  if (!allowedTools || allowedTools.length === 0) {
    return undefined;
  }
  if (allowedTools.some((tool) => tool === 'Skill')) {
    return allowedTools;
  }
  return [...allowedTools, 'Skill'];
}
