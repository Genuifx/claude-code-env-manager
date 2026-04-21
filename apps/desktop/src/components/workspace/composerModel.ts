import type { WorkspaceFileSuggestion } from '@/lib/tauri-ipc';
import type { InstalledSkill } from '@/store';
import {
  getComposerCapabilities,
  type ComposerCommandDefinition,
  type WorkspaceComposerProvider,
} from './composerCapabilities';

export type ComposerTokenKind = 'skill' | 'command' | 'file';

export interface ComposerSkillReference {
  name: string;
  path: string;
  description: string;
  source?: string;
  scope?: string;
}

export interface ComposerToken {
  id: string;
  kind: ComposerTokenKind;
  raw: string;
  display: string;
  subtitle?: string;
  path?: string;
  skill?: ComposerSkillReference;
}

export interface ActiveComposerQuery {
  kind: ComposerTokenKind;
  query: string;
  range: {
    start: number;
    end: number;
  };
}

export interface ComposerSuggestion {
  id: string;
  kind: ComposerTokenKind;
  label: string;
  replacement: string;
  subtitle?: string;
  path?: string;
  skill?: ComposerSkillReference;
}

const SKILL_LINK_REGEX = /\[\$([A-Za-z0-9._:-]+)\]\(([^)\s]+\/SKILL\.md)\)/g;
const SKILL_TOKEN_REGEX = /(^|\s)(\$[A-Za-z0-9._:-]+)/g;
const COMMAND_TOKEN_REGEX = /(^|\s)(\/[A-Za-z0-9._:-]+)/g;
const FILE_TOKEN_REGEX = /(^|\s)(@[^\s]+)/g;

export function normalizeSkillName(value: string): string {
  return value.trim().replace(/^\$/, '').toLowerCase();
}

function sortSkills(skills: InstalledSkill[], query: string): InstalledSkill[] {
  const normalizedQuery = normalizeSkillName(query);
  return [...skills]
    .filter((skill) => {
      if (!normalizedQuery) {
        return true;
      }
      const normalizedName = normalizeSkillName(skill.name);
      return normalizedName.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const leftName = normalizeSkillName(left.name);
      const rightName = normalizeSkillName(right.name);
      const leftStartsWith = leftName.startsWith(normalizedQuery);
      const rightStartsWith = rightName.startsWith(normalizedQuery);
      if (leftStartsWith !== rightStartsWith) {
        return leftStartsWith ? -1 : 1;
      }
      return leftName.localeCompare(rightName);
    });
}

export function parseComposerTokens(
  text: string,
  provider: WorkspaceComposerProvider,
  installedSkills: InstalledSkill[],
): ComposerToken[] {
  const tokens: ComposerToken[] = [];
  const skillLookup = new Map(
    installedSkills.map((skill) => [normalizeSkillName(skill.name), skill] as const),
  );
  const commands = new Set(
    getComposerCapabilities(provider).commands.map((command) => command.token.toLowerCase()),
  );

  for (const match of text.matchAll(SKILL_LINK_REGEX)) {
    const name = match[1];
    const path = match[2];
    const skill = skillLookup.get(normalizeSkillName(name));
    tokens.push({
      id: `skill-link-${match.index ?? 0}-${name}`,
      kind: 'skill',
      raw: match[0],
      display: `$${name}`,
      subtitle: skill?.description || path,
      path,
      skill: skill
        ? {
            name: skill.name,
            path: `${skill.path}/SKILL.md`,
            description: skill.description,
            source: skill.source,
            scope: skill.scope,
          }
        : {
            name,
            path,
            description: '',
          },
    });
  }

  for (const match of text.matchAll(SKILL_TOKEN_REGEX)) {
    const raw = match[2];
    const skill = skillLookup.get(normalizeSkillName(raw));
    if (!skill) {
      continue;
    }
    tokens.push({
      id: `skill-token-${match.index ?? 0}-${raw}`,
      kind: 'skill',
      raw,
      display: raw,
      subtitle: skill.description,
      path: `${skill.path}/SKILL.md`,
      skill: {
        name: skill.name,
        path: `${skill.path}/SKILL.md`,
        description: skill.description,
        source: skill.source,
        scope: skill.scope,
      },
    });
  }

  for (const match of text.matchAll(COMMAND_TOKEN_REGEX)) {
    const raw = match[2];
    if (!commands.has(raw.toLowerCase())) {
      continue;
    }
    tokens.push({
      id: `command-token-${match.index ?? 0}-${raw}`,
      kind: 'command',
      raw,
      display: raw,
    });
  }

  for (const match of text.matchAll(FILE_TOKEN_REGEX)) {
    const raw = match[2];
    tokens.push({
      id: `file-token-${match.index ?? 0}-${raw}`,
      kind: 'file',
      raw,
      display: raw,
    });
  }

  return tokens.sort((left, right) => left.id.localeCompare(right.id));
}

export function findActiveComposerQuery(
  text: string,
  caretPosition: number,
  provider: WorkspaceComposerProvider,
): ActiveComposerQuery | null {
  const safeCaret = Math.max(0, Math.min(caretPosition, text.length));
  let tokenStart = safeCaret;
  while (tokenStart > 0) {
    const previousChar = text[tokenStart - 1];
    if (previousChar === '\n' || previousChar === '\t' || previousChar === ' ') {
      break;
    }
    tokenStart -= 1;
  }

  const token = text.slice(tokenStart, safeCaret);
  if (token.length < 1) {
    return null;
  }

  const trigger = token[0];
  if (trigger !== '$' && trigger !== '/' && trigger !== '@') {
    return null;
  }

  if (token.includes('(') || token.includes(')')) {
    return null;
  }

  const providerCommands = new Set(
    getComposerCapabilities(provider).commands.map((command) => command.token),
  );

  if (trigger === '/') {
    if (token.length === 1) {
      return {
        kind: 'command',
        query: '',
        range: { start: tokenStart, end: safeCaret },
      };
    }

    if (![...providerCommands].some((command) => command.startsWith(token))) {
      return null;
    }
  }

  return {
    kind: trigger === '$'
      ? 'skill'
      : trigger === '/'
        ? 'command'
        : 'file',
    query: token.slice(1),
    range: {
      start: tokenStart,
      end: safeCaret,
    },
  };
}

function commandSuggestions(
  query: string,
  provider: WorkspaceComposerProvider,
): ComposerSuggestion[] {
  const normalizedQuery = query.trim().toLowerCase();
  return getComposerCapabilities(provider).commands
    .filter((command) => {
      if (!normalizedQuery) {
        return true;
      }
      return command.token.toLowerCase().startsWith(`/${normalizedQuery}`)
        || command.token.toLowerCase().includes(normalizedQuery);
    })
    .slice(0, 8)
    .map((command: ComposerCommandDefinition) => ({
      id: `command-${command.token}`,
      kind: 'command',
      label: command.token,
      replacement: `${command.token} `,
      subtitle: command.description,
    }));
}

function skillSuggestions(
  query: string,
  installedSkills: InstalledSkill[],
): ComposerSuggestion[] {
  const seen = new Set<string>();

  return sortSkills(installedSkills, query)
    .filter((skill) => {
      const key = normalizeSkillName(skill.name);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((skill) => ({
      id: `skill-${skill.path}`,
      kind: 'skill',
      label: `$${skill.name}`,
      replacement: `[$${skill.name}](${skill.path}/SKILL.md) `,
      subtitle: skill.description,
      path: `${skill.path}/SKILL.md`,
      skill: {
        name: skill.name,
        path: `${skill.path}/SKILL.md`,
        description: skill.description,
        source: skill.source,
        scope: skill.scope,
      },
    }));
}

function fileSuggestions(items: WorkspaceFileSuggestion[]): ComposerSuggestion[] {
  return items.slice(0, 8).map((item) => ({
    id: `file-${item.absolute_path}`,
    kind: 'file',
    label: `@${item.relative_path}`,
    replacement: `@${item.relative_path} `,
    subtitle: item.absolute_path,
    path: item.absolute_path,
  }));
}

export function buildComposerSuggestions(options: {
  activeQuery: ActiveComposerQuery | null;
  provider: WorkspaceComposerProvider;
  installedSkills: InstalledSkill[];
  fileSuggestions: WorkspaceFileSuggestion[];
}): ComposerSuggestion[] {
  const { activeQuery, provider, installedSkills, fileSuggestions: matchedFiles } = options;
  if (!activeQuery) {
    return [];
  }

  if (activeQuery.kind === 'command') {
    return commandSuggestions(activeQuery.query, provider);
  }
  if (activeQuery.kind === 'skill') {
    return skillSuggestions(activeQuery.query, installedSkills);
  }
  return fileSuggestions(matchedFiles);
}

export function applySuggestionToComposerText(
  text: string,
  activeQuery: ActiveComposerQuery,
  suggestion: ComposerSuggestion,
): { nextValue: string; nextCaretPosition: number } {
  const nextValue = `${text.slice(0, activeQuery.range.start)}${suggestion.replacement}${text.slice(activeQuery.range.end)}`;
  const nextCaretPosition = activeQuery.range.start + suggestion.replacement.length;
  return { nextValue, nextCaretPosition };
}
