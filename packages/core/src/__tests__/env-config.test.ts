import { describe, expect, it } from 'vitest';
import {
  hasLegacyEnvFields,
  normalizeEnvConfig,
  recoverEnvConfigFromLegacy,
} from '../env-config.js';

describe('env config migration', () => {
  it('detects legacy auth and model fields', () => {
    expect(
      hasLegacyEnvFields({
        ANTHROPIC_API_KEY: 'legacy-key',
        ANTHROPIC_MODEL: 'glm-4.6',
      })
    ).toBe(true);
  });

  it('migrates legacy auth and model fields into tier defaults', () => {
    const normalized = normalizeEnvConfig({
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_API_KEY: 'legacy-key',
      ANTHROPIC_MODEL: 'glm-4.6',
      ANTHROPIC_SMALL_FAST_MODEL: 'glm-4.5-air',
    });

    expect(normalized).toEqual({
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'legacy-key',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.6',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.6',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_MODEL: 'opus',
    });
  });

  it('preserves tier-based configs and runtime model', () => {
    const normalized = normalizeEnvConfig({
      ANTHROPIC_AUTH_TOKEN: 'token',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_MODEL: 'sonnet',
      CLAUDE_CODE_SUBAGENT_MODEL: 'haiku',
    });

    expect(normalized).toEqual({
      ANTHROPIC_AUTH_TOKEN: 'token',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_MODEL: 'sonnet',
      CLAUDE_CODE_SUBAGENT_MODEL: 'haiku',
    });
  });

  it('recovers missing auth token and tier models from legacy config', () => {
    const recovered = recoverEnvConfigFromLegacy(
      {
        ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'opus',
        ANTHROPIC_MODEL: 'opus',
      },
      {
        ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
        ANTHROPIC_API_KEY: 'legacy-key',
        ANTHROPIC_MODEL: 'glm-5',
        ANTHROPIC_SMALL_FAST_MODEL: 'glm-4.5-air',
      }
    );

    expect(recovered).toEqual({
      ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
      ANTHROPIC_AUTH_TOKEN: 'legacy-key',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_MODEL: 'opus',
    });
  });
});
