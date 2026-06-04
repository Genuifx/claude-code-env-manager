import type { SelectedSkillContent, WorkspaceFileSuggestion } from '@/lib/tauri-ipc';
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
  provider?: string;
  skillFile?: string;
  displayName?: string;
  invocationLabel?: string;
  pluginName?: string;
  pluginMarketplace?: string;
  disabled?: boolean;
  visibility?: string;
  implicitAllowed?: boolean;
  diagnostics?: string[];
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
  trigger: '$' | '/' | '@';
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
  badges?: string[];
  disabled?: boolean;
}

export const SKILL_LINK_REGEX = /\[([/$])([^\]]+)\]\(([^)]+\/SKILL\.md)\)/g;
const SKILL_TOKEN_REGEX = /(^|\s)(\$[A-Za-z0-9._:-]+)/g;
const COMMAND_TOKEN_REGEX = /(^|\s)(\/[A-Za-z0-9._:-]+)/g;
const FILE_TOKEN_REGEX = /(^|\s)(@[^\s]+)/g;

export function normalizeSkillName(value: string): string {
  return value.trim().replace(/^[$/]/, '').toLowerCase();
}

export function getSkillFilePath(skill: InstalledSkill): string {
  return skill.skillFile ?? `${skill.path}/SKILL.md`;
}

function normalizePath(value: string): string {
  return value.trim();
}

function getSkillDisplayName(skill: InstalledSkill): string {
  return skill.displayName ?? skill.uiMetadata?.displayName ?? skill.name;
}

export function getSkillInvocationLabel(skill: InstalledSkill): string {
  return skill.invocationLabel ?? skill.displayName ?? skill.name;
}

function skillBadges(skill: InstalledSkill): string[] {
  const badges = [
    skill.provider,
    skill.scope,
    skill.pluginName ? `plugin:${skill.pluginName}` : undefined,
    skill.visibility && skill.visibility !== 'native' ? skill.visibility : undefined,
  ].filter(Boolean) as string[];
  return badges.slice(0, 4);
}

function skillSubtitle(skill: InstalledSkill): string {
  const description = skill.uiMetadata?.shortDescription ?? skill.description;
  const parts = [
    description,
    skill.source,
    skill.pluginMarketplace,
  ].filter(Boolean);
  return parts.join(' · ');
}

function skillReference(skill: InstalledSkill): ComposerSkillReference {
  const skillFile = getSkillFilePath(skill);
  return {
    name: skill.name,
    path: skillFile,
    description: skill.description,
    source: skill.source,
    scope: skill.scope,
    provider: skill.provider,
    skillFile,
    displayName: getSkillDisplayName(skill),
    invocationLabel: getSkillInvocationLabel(skill),
    pluginName: skill.pluginName,
    pluginMarketplace: skill.pluginMarketplace,
    disabled: skill.disabled,
    visibility: skill.visibility,
    implicitAllowed: skill.implicitAllowed,
    diagnostics: skill.diagnostics,
  };
}

function sortSkills(skills: InstalledSkill[], query: string): InstalledSkill[] {
  const normalizedQuery = normalizeSkillName(query);
  return [...skills]
    .filter((skill) => {
      if (!normalizedQuery) {
        return true;
      }
      const normalizedName = normalizeSkillName(skill.name);
      const normalizedDisplayName = normalizeSkillName(getSkillDisplayName(skill));
      const normalizedInvocation = normalizeSkillName(getSkillInvocationLabel(skill));
      return normalizedName.includes(normalizedQuery)
        || normalizedDisplayName.includes(normalizedQuery)
        || normalizedInvocation.includes(normalizedQuery);
    })
    .sort((left, right) => {
      const leftName = normalizeSkillName(getSkillInvocationLabel(left));
      const rightName = normalizeSkillName(getSkillInvocationLabel(right));
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
  const skillLookupByName = new Map<string, InstalledSkill>();
  const skillLookupByFile = new Map<string, InstalledSkill>();
  for (const skill of installedSkills) {
    const filePath = getSkillFilePath(skill);
    skillLookupByFile.set(normalizePath(filePath), skill);
    const names = [
      skill.name,
      skill.displayName,
      skill.invocationLabel,
      skill.uiMetadata?.displayName,
    ].filter(Boolean) as string[];
    for (const name of names) {
      const key = normalizeSkillName(name);
      if (!skillLookupByName.has(key)) {
        skillLookupByName.set(key, skill);
      }
    }
  }
  const commands = new Set(
    getComposerCapabilities(provider).commands.map((command) => command.token.toLowerCase()),
  );

  for (const match of text.matchAll(SKILL_LINK_REGEX)) {
    const trigger = match[1] as '$' | '/';
    const name = match[2];
    const path = match[3];
    const skill = skillLookupByFile.get(normalizePath(path))
      ?? skillLookupByName.get(normalizeSkillName(name));
    tokens.push({
      id: `skill-link-${match.index ?? 0}-${name}`,
      kind: 'skill',
      raw: match[0],
      display: `${trigger}${name}`,
      subtitle: skill?.description || path,
      path,
      skill: skill ? skillReference(skill) : {
        name,
        path,
        skillFile: path,
        description: '',
      },
    });
  }

  for (const match of text.matchAll(SKILL_TOKEN_REGEX)) {
    const raw = match[2];
    const skill = skillLookupByName.get(normalizeSkillName(raw));
    if (!skill) {
      continue;
    }
    const skillFile = getSkillFilePath(skill);
    tokens.push({
      id: `skill-token-${match.index ?? 0}-${raw}`,
      kind: 'skill',
      raw,
      display: raw,
      subtitle: skill.description,
      path: skillFile,
      skill: skillReference(skill),
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
  _provider: WorkspaceComposerProvider,
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

  const trigger = token[0] as '$' | '/' | '@';
  if (trigger !== '$' && trigger !== '/' && trigger !== '@') {
    return null;
  }

  if (token.includes('(') || token.includes(')')) {
    return null;
  }

  if (trigger === '/') {
    if (token.length === 1) {
      return {
        kind: 'command',
        trigger: '/',
        query: '',
        range: { start: tokenStart, end: safeCaret },
      };
    }
  }

  return {
    kind: trigger === '$'
      ? 'skill'
      : trigger === '/'
        ? 'command'
        : 'file',
    trigger,
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
  trigger: '$' | '/',
): ComposerSuggestion[] {
  return sortSkills(installedSkills, query)
    .filter((skill) => {
      if (!skill.disabled) {
        return true;
      }
      return skill.diagnostics && skill.diagnostics.length > 0;
    })
    .slice(0, 12)
    .map((skill) => {
      const skillFile = getSkillFilePath(skill);
      const invocationLabel = getSkillInvocationLabel(skill);
      return {
        id: `skill-${skillFile}`,
        kind: 'skill' as const,
        label: `${trigger}${invocationLabel}`,
        replacement: `${trigger}${invocationLabel} `,
        subtitle: skillSubtitle(skill),
        path: skillFile,
        skill: skillReference(skill),
        badges: skillBadges(skill),
        disabled: skill.disabled,
      };
    });
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
    if (activeQuery.trigger === '/') {
      return [
        ...commandSuggestions(activeQuery.query, provider),
        ...skillSuggestions(activeQuery.query, installedSkills, '/'),
      ].slice(0, 12);
    }
    return commandSuggestions(activeQuery.query, provider);
  }
  if (activeQuery.kind === 'skill') {
    return skillSuggestions(activeQuery.query, installedSkills, '$');
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

export function selectedSkillFilesFromComposerText(
  text: string,
  provider: WorkspaceComposerProvider,
  installedSkills: InstalledSkill[],
): string[] {
  const files = new Set<string>();
  for (const token of parseComposerTokens(text, provider, installedSkills)) {
    if (token.kind === 'skill' && token.path && token.display.startsWith('$')) {
      files.add(token.path);
    }
  }
  return [...files];
}

function escapeSelectedSkillAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeSelectedSkillText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripStructuredSkillTokens(text: string): string {
  return text
    .replace(SKILL_LINK_REGEX, (_raw, trigger: string, label: string) => `${trigger}${label}`)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildComposerDisplayText(text: string): string {
  return stripStructuredSkillTokens(text);
}

export function buildComposerPromptWithSelectedSkills(
  text: string,
  selectedSkills: SelectedSkillContent[],
): string {
  const validSkills = selectedSkills.filter((skill) => skill.skillFile.trim().length > 0);
  if (validSkills.length === 0) {
    return text.trim();
  }

  const selectedBlocks = validSkills.map((skill) => {
    const pathParts = skill.skillFile.split('/');
    const name = skill.name ?? pathParts[pathParts.length - 2] ?? 'skill';
    const description = skill.description ?? '';
    const resources = skill.resourceHints.length > 0
      ? `\n<resource_hints>\n${skill.resourceHints.map((hint) => `- ${escapeSelectedSkillText(hint)}`).join('\n')}\n</resource_hints>`
      : '';

    return [
      `<skill name="${escapeSelectedSkillAttribute(name)}" path="${escapeSelectedSkillAttribute(skill.skillFile)}" directory="${escapeSelectedSkillAttribute(skill.directory)}">`,
      description ? `<description>${escapeSelectedSkillText(description)}</description>` : '',
      resources,
      '<instruction>Use this selected skill for the user request. Follow normal skill progressive disclosure: inspect the SKILL.md path only when details are needed, then load only the relevant referenced resources.</instruction>',
      '</skill>',
    ].filter(Boolean).join('\n');
  });

  const userRequest = stripStructuredSkillTokens(text);
  return [
    '<selected_skills>',
    ...selectedBlocks,
    '</selected_skills>',
    '',
    '<user_request>',
    userRequest,
    '</user_request>',
  ].join('\n');
}
