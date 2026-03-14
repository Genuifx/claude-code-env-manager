import type { EnvConfig } from './types.js';

export interface LegacyEnvConfig extends EnvConfig {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_SMALL_FAST_MODEL?: string;
}

const TIER_MODEL_ALIASES = new Set(['opus', 'sonnet', 'haiku']);

export function hasLegacyEnvFields(envConfig: Partial<LegacyEnvConfig>): boolean {
  return Boolean(
    envConfig.ANTHROPIC_API_KEY ||
    envConfig.ANTHROPIC_SMALL_FAST_MODEL ||
    (envConfig.ANTHROPIC_MODEL &&
      !envConfig.ANTHROPIC_DEFAULT_OPUS_MODEL &&
      !envConfig.ANTHROPIC_DEFAULT_SONNET_MODEL &&
      !envConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL)
  );
}

export function normalizeEnvConfig(
  envConfig: Partial<LegacyEnvConfig>,
  defaultRuntimeModel: string = 'opus'
): EnvConfig {
  const hasTierDefaults =
    Boolean(envConfig.ANTHROPIC_DEFAULT_OPUS_MODEL) ||
    Boolean(envConfig.ANTHROPIC_DEFAULT_SONNET_MODEL) ||
    Boolean(envConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL);

  const defaultOpusModel =
    envConfig.ANTHROPIC_DEFAULT_OPUS_MODEL ??
    (hasTierDefaults ? undefined : envConfig.ANTHROPIC_MODEL);
  const defaultSonnetModel =
    envConfig.ANTHROPIC_DEFAULT_SONNET_MODEL ??
    defaultOpusModel ??
    (hasTierDefaults ? undefined : envConfig.ANTHROPIC_MODEL);
  const defaultHaikuModel =
    envConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL ??
    envConfig.ANTHROPIC_SMALL_FAST_MODEL;

  return {
    ...(envConfig.ANTHROPIC_BASE_URL && {
      ANTHROPIC_BASE_URL: envConfig.ANTHROPIC_BASE_URL,
    }),
    ...((envConfig.ANTHROPIC_AUTH_TOKEN ?? envConfig.ANTHROPIC_API_KEY) && {
      ANTHROPIC_AUTH_TOKEN:
        envConfig.ANTHROPIC_AUTH_TOKEN ?? envConfig.ANTHROPIC_API_KEY,
    }),
    ...(defaultOpusModel && {
      ANTHROPIC_DEFAULT_OPUS_MODEL: defaultOpusModel,
    }),
    ...(defaultSonnetModel && {
      ANTHROPIC_DEFAULT_SONNET_MODEL: defaultSonnetModel,
    }),
    ...(defaultHaikuModel && {
      ANTHROPIC_DEFAULT_HAIKU_MODEL: defaultHaikuModel,
    }),
    ANTHROPIC_MODEL: hasTierDefaults
      ? envConfig.ANTHROPIC_MODEL ?? defaultRuntimeModel
      : defaultRuntimeModel,
    ...(envConfig.CLAUDE_CODE_SUBAGENT_MODEL && {
      CLAUDE_CODE_SUBAGENT_MODEL: envConfig.CLAUDE_CODE_SUBAGENT_MODEL,
    }),
  };
}

function shouldRecoverTierModel(model?: string): boolean {
  return !model || TIER_MODEL_ALIASES.has(model);
}

export function recoverEnvConfigFromLegacy(
  currentEnvConfig: Partial<LegacyEnvConfig>,
  legacyEnvConfig: Partial<LegacyEnvConfig>
): EnvConfig {
  const current = normalizeEnvConfig(currentEnvConfig);
  const legacy = normalizeEnvConfig(legacyEnvConfig);

  return {
    ...current,
    ...(!current.ANTHROPIC_AUTH_TOKEN &&
      legacy.ANTHROPIC_AUTH_TOKEN && {
        ANTHROPIC_AUTH_TOKEN: legacy.ANTHROPIC_AUTH_TOKEN,
      }),
    ...(shouldRecoverTierModel(current.ANTHROPIC_DEFAULT_OPUS_MODEL) &&
      legacy.ANTHROPIC_DEFAULT_OPUS_MODEL && {
        ANTHROPIC_DEFAULT_OPUS_MODEL: legacy.ANTHROPIC_DEFAULT_OPUS_MODEL,
      }),
    ...(shouldRecoverTierModel(current.ANTHROPIC_DEFAULT_SONNET_MODEL) &&
      legacy.ANTHROPIC_DEFAULT_SONNET_MODEL && {
        ANTHROPIC_DEFAULT_SONNET_MODEL: legacy.ANTHROPIC_DEFAULT_SONNET_MODEL,
      }),
    ...(shouldRecoverTierModel(current.ANTHROPIC_DEFAULT_HAIKU_MODEL) &&
      legacy.ANTHROPIC_DEFAULT_HAIKU_MODEL && {
        ANTHROPIC_DEFAULT_HAIKU_MODEL: legacy.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      }),
    ...(!current.CLAUDE_CODE_SUBAGENT_MODEL &&
      legacy.CLAUDE_CODE_SUBAGENT_MODEL && {
        CLAUDE_CODE_SUBAGENT_MODEL: legacy.CLAUDE_CODE_SUBAGENT_MODEL,
      }),
  };
}
