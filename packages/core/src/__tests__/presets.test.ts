import { describe, it, expect } from 'vitest';
import {
  ENV_PRESETS,
  ENV_PRESET_METADATA,
  PERMISSION_PRESETS,
  getPermissionModeNames,
  getModeIcon,
  formatPermissionDescription,
} from '../presets.js';
import type { PermissionModeName } from '../types.js';

describe('presets', () => {
  describe('ENV_PRESETS', () => {
    it('should have GLM preset with correct structure', () => {
      expect(ENV_PRESETS.GLM).toBeDefined();
      expect(ENV_PRESETS.GLM.ANTHROPIC_BASE_URL).toContain('bigmodel.cn');
      expect(ENV_PRESETS.GLM.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('glm-5.1');
      expect(ENV_PRESETS.GLM.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('glm-5.1');
      expect(ENV_PRESETS.GLM.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('glm-4.5-air');
      expect(ENV_PRESETS.GLM.ANTHROPIC_MODEL).toBeDefined();
    });

    it('should have KIMI preset with correct structure', () => {
      expect(ENV_PRESETS.KIMI).toBeDefined();
      expect(ENV_PRESETS.KIMI.ANTHROPIC_BASE_URL).toContain('moonshot.cn');
    });

    it('should have MiniMax preset with correct structure', () => {
      expect(ENV_PRESETS.MiniMax).toBeDefined();
      expect(ENV_PRESETS.MiniMax.ANTHROPIC_BASE_URL).toContain('minimaxi.com');
    });

    it('should have DeepSeek preset with correct structure', () => {
      expect(ENV_PRESETS.DeepSeek).toBeDefined();
      expect(ENV_PRESETS.DeepSeek.ANTHROPIC_BASE_URL).toContain('deepseek.com');
    });

    it('should include new preset providers', () => {
      expect(ENV_PRESETS.Bailian).toBeDefined();
      expect(ENV_PRESETS.BailianCodePlan).toBeDefined();
      expect(ENV_PRESETS.OpenRouter).toBeDefined();
    });

    it('should not include auth tokens in presets', () => {
      for (const preset of Object.values(ENV_PRESETS)) {
        expect((preset as any).ANTHROPIC_AUTH_TOKEN).toBeUndefined();
        expect((preset as any).CLAUDE_CODE_SUBAGENT_MODEL).toBeUndefined();
      }
    });

    it('should define metadata for every preset', () => {
      expect(Object.keys(ENV_PRESET_METADATA)).toEqual(Object.keys(ENV_PRESETS));
      for (const [name, meta] of Object.entries(ENV_PRESET_METADATA)) {
        expect(meta.displayName.zh).toBeTruthy();
        expect(meta.displayName.en).toBeTruthy();
        expect(meta.description.zh).toBeTruthy();
        expect(meta.description.en).toBeTruthy();
        expect(meta.credentialUrl).toBeTruthy();
        expect(ENV_PRESETS[name]).toBeDefined();
      }
    });
  });

  describe('PERMISSION_PRESETS', () => {
    const expectedModes: PermissionModeName[] = ['yolo', 'dev', 'readonly', 'safe', 'ci', 'audit'];

    it('should have all expected permission modes', () => {
      for (const mode of expectedModes) {
        expect(PERMISSION_PRESETS[mode]).toBeDefined();
      }
    });

    it('should have valid structure for each preset', () => {
      for (const [modeName, preset] of Object.entries(PERMISSION_PRESETS)) {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.permissionMode).toBeTruthy();
        expect(Array.isArray(preset.permissions.allow)).toBe(true);
        expect(Array.isArray(preset.permissions.deny)).toBe(true);
      }
    });

    it('should have yolo mode with bypassPermissions', () => {
      expect(PERMISSION_PRESETS.yolo.permissionMode).toBe('bypassPermissions');
      expect(PERMISSION_PRESETS.yolo.permissions.allow.length).toBeGreaterThan(0);
      expect(PERMISSION_PRESETS.yolo.permissions.deny.length).toBe(0);
    });

    it('should have dev mode with acceptEdits', () => {
      expect(PERMISSION_PRESETS.dev.permissionMode).toBe('acceptEdits');
      expect(PERMISSION_PRESETS.dev.permissions.deny).toContain('Bash(sudo:*)');
    });

    it('should have readonly mode with plan permissionMode', () => {
      expect(PERMISSION_PRESETS.readonly.permissionMode).toBe('plan');
      expect(PERMISSION_PRESETS.readonly.permissions.deny).toContain('Edit(*)');
      expect(PERMISSION_PRESETS.readonly.permissions.deny).toContain('Write(*)');
    });

    it('should have audit mode that denies modifications', () => {
      expect(PERMISSION_PRESETS.audit.permissionMode).toBe('plan');
      expect(PERMISSION_PRESETS.audit.permissions.deny).toContain('Edit(*)');
    });
  });

  describe('getPermissionModeNames', () => {
    it('should return all permission mode names', () => {
      const names = getPermissionModeNames();
      expect(names).toContain('yolo');
      expect(names).toContain('dev');
      expect(names).toContain('readonly');
      expect(names).toContain('safe');
      expect(names).toContain('ci');
      expect(names).toContain('audit');
      expect(names.length).toBe(6);
    });
  });

  describe('getModeIcon', () => {
    it('should return correct icons for each mode', () => {
      expect(getModeIcon('yolo')).toBe('🔓');
      expect(getModeIcon('dev')).toBe('💻');
      expect(getModeIcon('readonly')).toBe('👀');
      expect(getModeIcon('safe')).toBe('🛡️');
      expect(getModeIcon('ci')).toBe('🔧');
      expect(getModeIcon('audit')).toBe('🔍');
    });
  });

  describe('formatPermissionDescription', () => {
    it('should format yolo mode description', () => {
      const description = formatPermissionDescription('yolo');
      expect(description).toContain('✅');
      expect(description).toContain('❌');
    });

    it('should format dev mode description', () => {
      const description = formatPermissionDescription('dev');
      expect(description).toContain('✅');
      expect(description).toContain('❌');
    });
  });
});
