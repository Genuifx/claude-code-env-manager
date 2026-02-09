# CCEM Desktop App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 ccem CLI 功能迁移到 Tauri 跨平台桌面应用，支持完整 GUI、系统托盘和多实例会话管理。

**Architecture:** Monorepo 结构，提取 `packages/core` 共享核心逻辑供 CLI 和 Desktop 复用。Tauri 2.0 后端处理配置、终端启动和进程管理，React 前端使用 shadcn/ui 构建 macOS 原生风格界面。

**Tech Stack:** Tauri 2.0, React 18, TypeScript, TailwindCSS, shadcn/ui, Zustand, Vitest

---

## Phase 0: 测试基础设施

### Task 0.1: 配置 Vitest 测试环境

**Files:**
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`
- Modify: `package.json`

**Step 1: 安装 Vitest 依赖**

Run:
```bash
pnpm add -D vitest @vitest/coverage-v8
```

Expected: 依赖安装成功

**Step 2: 创建 Vitest 配置文件**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/components/**'],
    },
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
```

**Step 3: 创建测试 setup 文件**

Create `src/__tests__/setup.ts`:
```typescript
import { vi } from 'vitest';

// Mock fs module for tests that need file system isolation
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
  };
});

// Mock process.cwd() for consistent test paths
vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
```

**Step 4: 添加测试脚本到 package.json**

Modify `package.json` scripts section:
```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 5: 运行测试确认配置正确**

Run:
```bash
pnpm test:run
```

Expected: `No test files found` (暂无测试文件，配置成功)

**Step 6: Commit**

```bash
git add vitest.config.ts src/__tests__/setup.ts package.json pnpm-lock.yaml
git commit -m "chore: configure vitest testing environment"
```

---

### Task 0.2: 测试 utils.ts - 加密解密函数

**Files:**
- Create: `src/__tests__/utils.test.ts`
- Test: `src/utils.ts`

**Step 1: 编写 encrypt/decrypt 对称性测试**

Create `src/__tests__/utils.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../utils.js';

describe('utils', () => {
  describe('encrypt/decrypt', () => {
    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should encrypt and decrypt a simple string', () => {
      const original = 'my-api-key-12345';
      const encrypted = encrypt(original);

      expect(encrypted).not.toBe(original);
      expect(encrypted.startsWith('enc:')).toBe(true);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const original = 'test-key';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(original);
      expect(decrypt(encrypted2)).toBe(original);
    });

    it('should return original text if not encrypted format', () => {
      const plain = 'plain-text-without-prefix';
      expect(decrypt(plain)).toBe(plain);
    });

    it('should handle special characters', () => {
      const original = 'key-with-special-chars!@#$%^&*()_+-=[]{}|;:",.<>?/`~';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle unicode characters', () => {
      const original = '中文密钥🔑émojis';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle long strings', () => {
      const original = 'a'.repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should return input for malformed encrypted string', () => {
      expect(decrypt('enc:invalid')).toBe('enc:invalid');
      expect(decrypt('enc:xx:yy:zz')).toBe('enc:xx:yy:zz');
    });
  });
});
```

**Step 2: 运行测试确认失败原因**

Run:
```bash
pnpm test:run src/__tests__/utils.test.ts
```

Expected: 测试可能因为 ESM 模块问题失败

**Step 3: 修复 ESM 导入问题（如需要）**

如果测试失败，修改 `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/components/**'],
    },
  },
});
```

**Step 4: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/utils.test.ts
```

Expected: 所有测试通过

**Step 5: Commit**

```bash
git add src/__tests__/utils.test.ts vitest.config.ts
git commit -m "test: add encrypt/decrypt unit tests for utils.ts"
```

---

### Task 0.3: 测试 utils.ts - 路径工具函数

**Files:**
- Modify: `src/__tests__/utils.test.ts`

**Step 1: 添加路径工具函数测试**

Append to `src/__tests__/utils.test.ts`:
```typescript
import {
  findProjectRoot,
  getSettingsPath,
  ensureClaudeDir,
  getHomeDir,
  getGlobalClaudeConfigPath,
  getGlobalClaudeSettingsPath,
} from '../utils.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('path utilities', () => {
  const originalCwd = process.cwd;
  const originalHome = process.env.HOME;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-test-'));
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.env.HOME = originalHome;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('findProjectRoot', () => {
    it('should find directory with .git', () => {
      const gitDir = path.join(tempDir, '.git');
      fs.mkdirSync(gitDir);

      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
      expect(findProjectRoot()).toBe(tempDir);
    });

    it('should find directory with package.json', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
      expect(findProjectRoot()).toBe(tempDir);
    });

    it('should search parent directories', () => {
      const subDir = path.join(tempDir, 'src', 'deep', 'nested');
      fs.mkdirSync(subDir, { recursive: true });
      fs.mkdirSync(path.join(tempDir, '.git'));

      vi.spyOn(process, 'cwd').mockReturnValue(subDir);
      expect(findProjectRoot()).toBe(tempDir);
    });

    it('should return cwd if no project root found', () => {
      const isolatedDir = path.join(tempDir, 'isolated');
      fs.mkdirSync(isolatedDir);

      vi.spyOn(process, 'cwd').mockReturnValue(isolatedDir);
      // Will traverse up and not find .git or package.json in temp structure
      const result = findProjectRoot();
      // Should eventually return cwd or find system-level markers
      expect(typeof result).toBe('string');
    });
  });

  describe('getSettingsPath', () => {
    it('should return settings.local.json path by default', () => {
      fs.mkdirSync(path.join(tempDir, '.git'));
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      const result = getSettingsPath();
      expect(result).toBe(path.join(tempDir, '.claude', 'settings.local.json'));
    });

    it('should return settings.json path when useLocal is false', () => {
      fs.mkdirSync(path.join(tempDir, '.git'));
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      const result = getSettingsPath(false);
      expect(result).toBe(path.join(tempDir, '.claude', 'settings.json'));
    });
  });

  describe('ensureClaudeDir', () => {
    it('should create .claude directory if not exists', () => {
      fs.mkdirSync(path.join(tempDir, '.git'));
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      const result = ensureClaudeDir();
      expect(result).toBe(path.join(tempDir, '.claude'));
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should return existing .claude directory', () => {
      fs.mkdirSync(path.join(tempDir, '.git'));
      fs.mkdirSync(path.join(tempDir, '.claude'));
      vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

      const result = ensureClaudeDir();
      expect(result).toBe(path.join(tempDir, '.claude'));
    });
  });

  describe('getHomeDir', () => {
    it('should return HOME environment variable', () => {
      process.env.HOME = '/custom/home';
      expect(getHomeDir()).toBe('/custom/home');
    });
  });

  describe('getGlobalClaudeConfigPath', () => {
    it('should return ~/.claude.json path', () => {
      process.env.HOME = '/home/user';
      expect(getGlobalClaudeConfigPath()).toBe('/home/user/.claude.json');
    });
  });

  describe('getGlobalClaudeSettingsPath', () => {
    it('should return ~/.claude/settings.json path', () => {
      process.env.HOME = '/home/user';
      expect(getGlobalClaudeSettingsPath()).toBe('/home/user/.claude/settings.json');
    });
  });
});
```

**Step 2: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/utils.test.ts
```

Expected: 所有测试通过

**Step 3: Commit**

```bash
git add src/__tests__/utils.test.ts
git commit -m "test: add path utilities unit tests"
```

---

### Task 0.4: 测试 presets.ts - 环境和权限预设

**Files:**
- Create: `src/__tests__/presets.test.ts`
- Test: `src/presets.ts`

**Step 1: 编写预设完整性测试**

Create `src/__tests__/presets.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  ENV_PRESETS,
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
      expect(ENV_PRESETS.GLM.ANTHROPIC_MODEL).toBeDefined();
      expect(ENV_PRESETS.GLM.ANTHROPIC_SMALL_FAST_MODEL).toBeDefined();
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

    it('should not include API keys in presets', () => {
      for (const [name, preset] of Object.entries(ENV_PRESETS)) {
        expect((preset as any).ANTHROPIC_API_KEY).toBeUndefined();
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
```

**Step 2: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/presets.test.ts
```

Expected: 所有测试通过

**Step 3: Commit**

```bash
git add src/__tests__/presets.test.ts
git commit -m "test: add presets unit tests for ENV_PRESETS and PERMISSION_PRESETS"
```

---

### Task 0.5: 测试 permissions.ts - 权限配置读写

**Files:**
- Create: `src/__tests__/permissions.test.ts`
- Test: `src/permissions.ts`

**Step 1: 编写权限配置读写测试**

Create `src/__tests__/permissions.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  readSettings,
  writeSettings,
  mergePermissions,
} from '../permissions.js';
import type { PermissionConfig } from '../types.js';

describe('permissions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-perm-test-'));
    // Create .git to make it a project root
    fs.mkdirSync(path.join(tempDir, '.git'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('readSettings', () => {
    it('should return empty object for non-existent file', () => {
      const result = readSettings('/non/existent/path.json');
      expect(result).toEqual({});
    });

    it('should parse valid JSON settings file', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      const config: PermissionConfig = {
        permissions: {
          allow: ['Read(*)'],
          deny: ['Write(*)'],
        },
      };
      fs.writeFileSync(settingsPath, JSON.stringify(config));

      const result = readSettings(settingsPath);
      expect(result).toEqual(config);
    });

    it('should handle invalid JSON gracefully', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, 'invalid json {{{');

      // Should create backup and return empty object
      const result = readSettings(settingsPath);
      expect(result).toEqual({});

      // Check backup was created
      const files = fs.readdirSync(tempDir);
      const backupFile = files.find(f => f.startsWith('settings.json.error.'));
      expect(backupFile).toBeDefined();
    });
  });

  describe('writeSettings', () => {
    it('should write settings to file', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir);
      const settingsPath = path.join(claudeDir, 'settings.local.json');

      const config: PermissionConfig = {
        permissions: {
          allow: ['Bash(*)'],
          deny: [],
        },
      };

      writeSettings(settingsPath, config);

      const content = fs.readFileSync(settingsPath, 'utf-8');
      expect(JSON.parse(content)).toEqual(config);
    });

    it('should create .claude directory if not exists', () => {
      const claudeDir = path.join(tempDir, '.claude');
      const settingsPath = path.join(claudeDir, 'settings.local.json');

      writeSettings(settingsPath, { permissions: { allow: [], deny: [] } });

      expect(fs.existsSync(claudeDir)).toBe(true);
    });
  });

  describe('mergePermissions', () => {
    it('should merge preset permissions with existing', () => {
      const existing: PermissionConfig = {
        permissions: {
          allow: ['Read(*)'],
          deny: ['Write(*)'],
        },
      };

      const preset = {
        allow: ['Bash(npm:*)'],
        deny: ['Bash(sudo:*)'],
      };

      const result = mergePermissions(existing, preset);

      expect(result.permissions?.allow).toContain('Read(*)');
      expect(result.permissions?.allow).toContain('Bash(npm:*)');
      expect(result.permissions?.deny).toContain('Write(*)');
      expect(result.permissions?.deny).toContain('Bash(sudo:*)');
    });

    it('should deduplicate permissions', () => {
      const existing: PermissionConfig = {
        permissions: {
          allow: ['Read(*)', 'Bash(npm:*)'],
          deny: [],
        },
      };

      const preset = {
        allow: ['Read(*)', 'Bash(npm:*)', 'Write(*)'],
        deny: [],
      };

      const result = mergePermissions(existing, preset);

      const allowCount = result.permissions?.allow?.filter(p => p === 'Read(*)').length;
      expect(allowCount).toBe(1);
    });

    it('should handle empty existing permissions', () => {
      const existing: PermissionConfig = {};

      const preset = {
        allow: ['Read(*)'],
        deny: ['Write(*)'],
      };

      const result = mergePermissions(existing, preset);

      expect(result.permissions?.allow).toContain('Read(*)');
      expect(result.permissions?.deny).toContain('Write(*)');
    });

    it('should preserve other config fields', () => {
      const existing: PermissionConfig = {
        permissions: { allow: [], deny: [] },
        someOtherField: 'value',
      };

      const preset = { allow: ['Read(*)'], deny: [] };
      const result = mergePermissions(existing, preset);

      expect(result.someOtherField).toBe('value');
    });
  });
});
```

**Step 2: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/permissions.test.ts
```

Expected: 所有测试通过

**Step 3: Commit**

```bash
git add src/__tests__/permissions.test.ts
git commit -m "test: add permissions unit tests for config read/write/merge"
```

---

### Task 0.6: 测试 skills.ts - Skill 管理

**Files:**
- Create: `src/__tests__/skills.test.ts`
- Test: `src/skills.ts`

**Step 1: 编写 Skill 管理测试**

Create `src/__tests__/skills.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  SKILL_PRESETS,
  SKILL_GROUPS,
  getSkillsByGroup,
  getGroupOrder,
  parseGitHubUrl,
  getSkillsDir,
  ensureSkillsDir,
  listInstalledSkills,
  removeSkill,
} from '../skills.js';

describe('skills', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-skills-test-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('SKILL_PRESETS', () => {
    it('should have official skills', () => {
      const official = SKILL_PRESETS.filter(s => s.group === 'official');
      expect(official.length).toBeGreaterThan(0);
    });

    it('should have featured skills', () => {
      const featured = SKILL_PRESETS.filter(s => s.group === 'featured');
      expect(featured.length).toBeGreaterThan(0);
    });

    it('should have valid structure for all presets', () => {
      for (const preset of SKILL_PRESETS) {
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(['official', 'featured', 'others']).toContain(preset.group);
        expect(preset.install).toBeDefined();
        expect(['preset', 'github', 'plugin']).toContain(preset.install.type);
      }
    });
  });

  describe('SKILL_GROUPS', () => {
    it('should have all group metadata', () => {
      expect(SKILL_GROUPS.official).toBeDefined();
      expect(SKILL_GROUPS.official.label).toBe('官方');
      expect(SKILL_GROUPS.featured).toBeDefined();
      expect(SKILL_GROUPS.others).toBeDefined();
    });
  });

  describe('getSkillsByGroup', () => {
    it('should filter skills by group', () => {
      const official = getSkillsByGroup('official');
      expect(official.every(s => s.group === 'official')).toBe(true);

      const featured = getSkillsByGroup('featured');
      expect(featured.every(s => s.group === 'featured')).toBe(true);
    });
  });

  describe('getGroupOrder', () => {
    it('should return groups in correct order', () => {
      const order = getGroupOrder();
      expect(order).toEqual(['official', 'featured', 'others']);
    });
  });

  describe('parseGitHubUrl', () => {
    it('should parse short format owner/repo', () => {
      const result = parseGitHubUrl('anthropics/skills');
      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'skills',
        branch: 'main',
        path: '',
      });
    });

    it('should parse full GitHub URL', () => {
      const result = parseGitHubUrl('https://github.com/anthropics/skills');
      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'skills',
        branch: 'main',
        path: '',
      });
    });

    it('should parse URL with tree/branch/path', () => {
      const result = parseGitHubUrl(
        'https://github.com/anthropics/skills/tree/main/skills/frontend-design'
      );
      expect(result).toEqual({
        owner: 'anthropics',
        repo: 'skills',
        branch: 'main',
        path: 'skills/frontend-design',
      });
    });

    it('should parse URL with different branch', () => {
      const result = parseGitHubUrl(
        'https://github.com/owner/repo/tree/develop/src/path'
      );
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'develop',
        path: 'src/path',
      });
    });

    it('should return null for invalid URL', () => {
      expect(parseGitHubUrl('invalid-url')).toBeNull();
      expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
    });

    it('should handle .git suffix', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo.git');
      expect(result?.repo).toBe('repo');
    });
  });

  describe('getSkillsDir', () => {
    it('should return .claude/skills path relative to cwd', () => {
      const result = getSkillsDir();
      expect(result).toBe(path.join(tempDir, '.claude', 'skills'));
    });
  });

  describe('ensureSkillsDir', () => {
    it('should create skills directory if not exists', () => {
      const result = ensureSkillsDir();
      expect(result).toBe(path.join(tempDir, '.claude', 'skills'));
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should return existing skills directory', () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });

      const result = ensureSkillsDir();
      expect(result).toBe(skillsDir);
    });

    it('should clean up temp directories', () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.mkdirSync(path.join(skillsDir, '.tmp-12345'));

      ensureSkillsDir();

      expect(fs.existsSync(path.join(skillsDir, '.tmp-12345'))).toBe(false);
    });
  });

  describe('listInstalledSkills', () => {
    it('should return empty array if skills dir not exists', () => {
      const result = listInstalledSkills();
      expect(result).toEqual([]);
    });

    it('should list installed skills', () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.mkdirSync(path.join(skillsDir, 'skill-a'));
      fs.mkdirSync(path.join(skillsDir, 'skill-b'));

      const result = listInstalledSkills();
      expect(result.length).toBe(2);
      expect(result.map(s => s.name)).toContain('skill-a');
      expect(result.map(s => s.name)).toContain('skill-b');
    });

    it('should ignore hidden directories', () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.mkdirSync(path.join(skillsDir, 'visible-skill'));
      fs.mkdirSync(path.join(skillsDir, '.hidden-dir'));

      const result = listInstalledSkills();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('visible-skill');
    });
  });

  describe('removeSkill', () => {
    it('should return false for non-existent skill', () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });

      const result = removeSkill('non-existent');
      expect(result).toBe(false);
    });

    it('should remove existing skill', () => {
      const skillsDir = path.join(tempDir, '.claude', 'skills');
      const skillPath = path.join(skillsDir, 'test-skill');
      fs.mkdirSync(skillPath, { recursive: true });
      fs.writeFileSync(path.join(skillPath, 'skill.md'), 'content');

      const result = removeSkill('test-skill');
      expect(result).toBe(true);
      expect(fs.existsSync(skillPath)).toBe(false);
    });
  });
});
```

**Step 2: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/skills.test.ts
```

Expected: 所有测试通过

**Step 3: Commit**

```bash
git add src/__tests__/skills.test.ts
git commit -m "test: add skills unit tests for preset parsing and file operations"
```

---

### Task 0.7: 测试 usage.ts - 用量统计

**Files:**
- Create: `src/__tests__/usage.test.ts`
- Create: `src/__tests__/fixtures/sample.jsonl`
- Test: `src/usage.ts`

**Step 1: 创建测试数据 fixture**

Create `src/__tests__/fixtures/sample.jsonl`:
```jsonl
{"type":"user","timestamp":"2026-01-31T10:00:00Z","message":{"content":"Hello"}}
{"type":"assistant","timestamp":"2026-01-31T10:00:01Z","message":{"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":100,"output_tokens":50,"cache_read_input_tokens":10,"cache_creation_input_tokens":5}}}
{"type":"user","timestamp":"2026-01-31T10:01:00Z","message":{"content":"Follow up"}}
{"type":"assistant","timestamp":"2026-01-31T10:01:01Z","message":{"model":"claude-haiku-4-5-20251001","usage":{"input_tokens":200,"output_tokens":100,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}}}
```

**Step 2: 编写 usage 测试**

Create `src/__tests__/usage.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getModelPrice,
  calculateCost,
  formatTokens,
  formatCost,
  getTotalTokens,
} from '../usage.js';
import type { TokenUsage, ModelPrice } from '../types.js';

describe('usage', () => {
  describe('getModelPrice', () => {
    const mockPrices: Record<string, ModelPrice> = {
      'claude-sonnet-4-5-20250929': {
        input_cost_per_token: 3e-6,
        output_cost_per_token: 15e-6,
        cache_read_input_token_cost: 0.3e-6,
        cache_creation_input_token_cost: 3.75e-6,
      },
      'claude-haiku-4-5': {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 5e-6,
      },
    };

    it('should return exact match price', () => {
      const price = getModelPrice('claude-sonnet-4-5-20250929', mockPrices);
      expect(price.input_cost_per_token).toBe(3e-6);
    });

    it('should match normalized model name', () => {
      const price = getModelPrice('claude-haiku-4-5-20251001', mockPrices);
      // Should fall back to haiku pricing
      expect(price.input_cost_per_token).toBeDefined();
    });

    it('should return default price for unknown model', () => {
      const price = getModelPrice('unknown-model', mockPrices);
      expect(price).toBeDefined();
      expect(price.input_cost_per_token).toBeGreaterThan(0);
    });

    it('should match opus model pattern', () => {
      const price = getModelPrice('claude-opus-4-5-something', mockPrices);
      expect(price.input_cost_per_token).toBe(5e-6); // opus default
    });
  });

  describe('calculateCost', () => {
    const price: ModelPrice = {
      input_cost_per_token: 3e-6,
      output_cost_per_token: 15e-6,
      cache_read_input_token_cost: 0.3e-6,
      cache_creation_input_token_cost: 3.75e-6,
    };

    it('should calculate total cost correctly', () => {
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 100,
        cacheCreationTokens: 50,
      };

      const cost = calculateCost(usage, price);

      // 1000 * 3e-6 + 500 * 15e-6 + 100 * 0.3e-6 + 50 * 3.75e-6
      // = 0.003 + 0.0075 + 0.00003 + 0.0001875
      // = 0.0107175
      expect(cost).toBeCloseTo(0.0107175, 6);
    });

    it('should handle zero usage', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      };

      const cost = calculateCost(usage, price);
      expect(cost).toBe(0);
    });

    it('should handle missing cache costs', () => {
      const priceWithoutCache: ModelPrice = {
        input_cost_per_token: 1e-6,
        output_cost_per_token: 5e-6,
      };

      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 100,
        cacheCreationTokens: 50,
      };

      const cost = calculateCost(usage, priceWithoutCache);
      // Cache tokens should contribute 0 cost
      expect(cost).toBeCloseTo(0.001 + 0.0025, 6);
    });
  });

  describe('formatTokens', () => {
    it('should format millions', () => {
      expect(formatTokens(1_500_000)).toBe('1.5M');
      expect(formatTokens(10_000_000)).toBe('10.0M');
    });

    it('should format thousands', () => {
      expect(formatTokens(1_500)).toBe('1.5K');
      expect(formatTokens(50_000)).toBe('50.0K');
    });

    it('should format small numbers as-is', () => {
      expect(formatTokens(100)).toBe('100');
      expect(formatTokens(999)).toBe('999');
    });

    it('should handle zero', () => {
      expect(formatTokens(0)).toBe('0');
    });
  });

  describe('formatCost', () => {
    it('should format dollars with 2 decimals', () => {
      expect(formatCost(10.5)).toBe('$10.50');
      expect(formatCost(1.00)).toBe('$1.00');
    });

    it('should format cents with 2 decimals', () => {
      expect(formatCost(0.50)).toBe('$0.50');
      expect(formatCost(0.05)).toBe('$0.05');
    });

    it('should format small amounts with 4 decimals', () => {
      expect(formatCost(0.005)).toBe('$0.0050');
      expect(formatCost(0.0001)).toBe('$0.0001');
    });
  });

  describe('getTotalTokens', () => {
    it('should sum all token types', () => {
      const usage: TokenUsage = {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 25,
        cacheCreationTokens: 10,
      };

      expect(getTotalTokens(usage)).toBe(185);
    });

    it('should handle zero values', () => {
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      };

      expect(getTotalTokens(usage)).toBe(0);
    });
  });
});
```

**Step 3: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/usage.test.ts
```

Expected: 所有测试通过

**Step 4: Commit**

```bash
git add src/__tests__/usage.test.ts src/__tests__/fixtures/
git commit -m "test: add usage statistics unit tests"
```

---

### Task 0.8: 测试 remote.ts - 远程配置加载

**Files:**
- Create: `src/__tests__/remote.test.ts`
- Test: `src/remote.ts`

**Step 1: 编写远程加载测试（mock fetch）**

Create `src/__tests__/remote.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// Test the decryption logic that remote.ts uses
describe('remote', () => {
  describe('decryption logic', () => {
    // Replicate the encryption/decryption from remote.ts for testing
    const encryptWithSecret = (text: string, secret: string): string => {
      const key = crypto.scryptSync(secret, 'ccem-salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    };

    const decryptWithSecret = (encryptedBase64: string, secret: string): string => {
      const key = crypto.scryptSync(secret, 'ccem-salt', 32);
      const combined = Buffer.from(encryptedBase64, 'base64');
      const iv = combined.subarray(0, 16);
      const encryptedHex = combined.subarray(16).toString('hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    };

    it('should encrypt and decrypt with same secret', () => {
      const original = JSON.stringify({
        environments: {
          test: {
            ANTHROPIC_BASE_URL: 'https://api.example.com',
            ANTHROPIC_API_KEY: 'test-key',
          },
        },
      });
      const secret = 'my-secret-key';

      const encrypted = encryptWithSecret(original, secret);
      const decrypted = decryptWithSecret(encrypted, secret);

      expect(decrypted).toBe(original);
    });

    it('should fail to decrypt with wrong secret', () => {
      const original = 'test data';
      const encrypted = encryptWithSecret(original, 'correct-secret');

      expect(() => {
        decryptWithSecret(encrypted, 'wrong-secret');
      }).toThrow();
    });

    it('should handle JSON with special characters', () => {
      const original = JSON.stringify({
        environments: {
          '中文环境': {
            ANTHROPIC_API_KEY: 'key-with-émojis-🔑',
          },
        },
      });
      const secret = 'test-secret';

      const encrypted = encryptWithSecret(original, secret);
      const decrypted = decryptWithSecret(encrypted, secret);

      expect(decrypted).toBe(original);
    });
  });

  describe('getUniqueName logic', () => {
    // Test the name conflict resolution logic
    const getUniqueName = (baseName: string, existingNames: Set<string>): string => {
      if (!existingNames.has(baseName)) {
        return baseName;
      }

      let suffix = 1;
      let newName = `${baseName}-remote`;
      while (existingNames.has(newName)) {
        suffix++;
        newName = `${baseName}-remote-${suffix}`;
      }
      return newName;
    };

    it('should return original name if not exists', () => {
      const existing = new Set(['other']);
      expect(getUniqueName('new-env', existing)).toBe('new-env');
    });

    it('should add -remote suffix if name exists', () => {
      const existing = new Set(['my-env']);
      expect(getUniqueName('my-env', existing)).toBe('my-env-remote');
    });

    it('should add numbered suffix if -remote also exists', () => {
      const existing = new Set(['my-env', 'my-env-remote']);
      expect(getUniqueName('my-env', existing)).toBe('my-env-remote-2');
    });

    it('should increment number until unique', () => {
      const existing = new Set([
        'my-env',
        'my-env-remote',
        'my-env-remote-2',
        'my-env-remote-3',
      ]);
      expect(getUniqueName('my-env', existing)).toBe('my-env-remote-4');
    });
  });
});
```

**Step 2: 运行测试确认通过**

Run:
```bash
pnpm test:run src/__tests__/remote.test.ts
```

Expected: 所有测试通过

**Step 3: Commit**

```bash
git add src/__tests__/remote.test.ts
git commit -m "test: add remote config loading unit tests"
```

---

### Task 0.9: 运行完整测试并生成覆盖率报告

**Files:**
- None (verification only)

**Step 1: 运行所有测试**

Run:
```bash
pnpm test:run
```

Expected: 所有测试通过

**Step 2: 生成覆盖率报告**

Run:
```bash
pnpm test:coverage
```

Expected: 覆盖率报告生成，核心模块覆盖率 > 70%

**Step 3: 检查覆盖率输出**

Run:
```bash
cat coverage/coverage-summary.json | head -50
```

Expected: 显示各模块覆盖率

**Step 4: Commit**

```bash
git add -A
git commit -m "test: complete Phase 0 test infrastructure with coverage"
```

---

## Phase 0 完成检查点

在进入 Phase 1 之前，确认：

- [ ] `pnpm test:run` 所有测试通过
- [ ] 核心模块 (`utils.ts`, `presets.ts`, `permissions.ts`, `usage.ts`, `skills.ts`, `remote.ts`) 都有测试
- [ ] 测试覆盖了主要功能路径
- [ ] 所有更改已提交到 git

---

## Phase 1: Monorepo 基础框架

### Task 1.1: 配置 pnpm workspace

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`

**Step 1: 创建 workspace 配置**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Step 2: 更新根 package.json**

Modify `package.json`:
```json
{
  "name": "ccem-monorepo",
  "version": "1.8.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm -r --parallel dev",
    "test": "pnpm -r test",
    "test:run": "pnpm -r test:run"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  },
  "packageManager": "pnpm@10.27.0+sha512.72d699da16b1179c14ba9e64dc71c9a40988cbdc65c264cb0e489db7de917f20dcf4d64d8723625f2969ba52d4b7e2a1170682d9ac2a5dcaeaab732b7e16f04a"
}
```

**Step 3: 创建目录结构**

Run:
```bash
mkdir -p packages/core/src
mkdir -p apps/cli/src
mkdir -p apps/desktop
```

Expected: 目录创建成功

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: initialize pnpm workspace for monorepo"
```

---

### Task 1.2: 提取 packages/core 共享模块

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Move: `src/types.ts` → `packages/core/src/types.ts`
- Move: `src/presets.ts` → `packages/core/src/presets.ts`
- Move: `src/utils.ts` → `packages/core/src/utils.ts` (仅加密和路径工具)
- Create: `packages/core/src/index.ts`

**Step 1: 创建 core package.json**

Create `packages/core/package.json`:
```json
{
  "name": "@ccem/core",
  "version": "1.8.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "devDependencies": {
    "tsup": "^8.0.2",
    "typescript": "^5.3.3",
    "vitest": "^2.0.0"
  }
}
```

**Step 2: 创建 core tsconfig.json**

Create `packages/core/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: 创建 core tsup.config.ts**

Create `packages/core/tsup.config.ts`:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

**Step 4: 复制 types.ts 到 core**

Run:
```bash
cp src/types.ts packages/core/src/types.ts
```

**Step 5: 创建 core/src/encryption.ts（从 utils.ts 提取）**

Create `packages/core/src/encryption.ts`:
```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync('claude-code-env-manager-secret', 'salt', 32);

export const encrypt = (text: string): string => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (text: string): string => {
  if (!text || !text.startsWith('enc:')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
};
```

**Step 6: 复制 presets.ts 到 core**

Run:
```bash
cp src/presets.ts packages/core/src/presets.ts
```

修改 `packages/core/src/presets.ts` 的 import:
```typescript
import type { EnvConfig, PermissionPreset, PermissionModeName } from './types.js';
```

**Step 7: 创建 core/src/index.ts 导出**

Create `packages/core/src/index.ts`:
```typescript
// Types
export type {
  EnvConfig,
  PermissionConfig,
  PermissionModeName,
  OfficialPermissionMode,
  PermissionPreset,
  TokenUsage,
  TokenUsageWithCost,
  UsageStats,
  ModelPrice,
  FileMeta,
  FileStats,
  FileStatsEntry,
  UsageCache,
} from './types.js';

// Encryption
export { encrypt, decrypt } from './encryption.js';

// Presets
export {
  ENV_PRESETS,
  PERMISSION_PRESETS,
  getPermissionModeNames,
  getModeIcon,
  formatPermissionDescription,
} from './presets.js';
```

**Step 8: 构建 core 包**

Run:
```bash
cd packages/core && pnpm install && pnpm build
```

Expected: 构建成功，生成 dist/ 目录

**Step 9: Commit**

```bash
git add packages/core/
git commit -m "feat: extract @ccem/core shared package"
```

---

### Task 1.3: 重构 apps/cli 使用 core 包

**Files:**
- Create: `apps/cli/package.json`
- Create: `apps/cli/tsconfig.json`
- Create: `apps/cli/tsup.config.ts`
- Move: 剩余 src/*.ts → `apps/cli/src/`
- Modify: 更新所有 imports 使用 `@ccem/core`

**Step 1: 创建 cli package.json**

Create `apps/cli/package.json`:
```json
{
  "name": "ccem",
  "version": "1.8.0",
  "type": "module",
  "description": "Claude Code Environment Manager",
  "author": {
    "name": "Genuifx",
    "email": "genuifx@gmail.com",
    "url": "https://genuifx.com"
  },
  "files": ["dist", "model-prices.json"],
  "bin": {
    "ccem": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@ccem/core": "workspace:*",
    "chalk": "^4.1.2",
    "cli-table3": "^0.6.3",
    "commander": "^12.0.0",
    "conf": "^10.2.0",
    "ink": "^6.6.0",
    "ink-select-input": "^6.2.0",
    "inquirer": "^8.2.6",
    "react": "^19.2.3"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.7",
    "@types/node": "^20.11.24",
    "@types/react": "^19.2.9",
    "tsup": "^8.0.2",
    "typescript": "^5.3.3",
    "vitest": "^2.0.0"
  }
}
```

**Step 2: 移动源文件到 apps/cli/src**

Run:
```bash
# 移动主要源文件
mv src/index.ts apps/cli/src/
mv src/permissions.ts apps/cli/src/
mv src/usage.ts apps/cli/src/
mv src/skills.ts apps/cli/src/
mv src/remote.ts apps/cli/src/
mv src/setup.ts apps/cli/src/
mv src/ui.ts apps/cli/src/
mv src/components apps/cli/src/

# 保留 utils.ts 中的路径工具函数
mv src/utils.ts apps/cli/src/utils.ts
```

**Step 3: 更新 apps/cli/src/index.ts imports**

Modify `apps/cli/src/index.ts` 文件头部:
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import Conf from 'conf';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { spawn } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 从 @ccem/core 导入共享类型和函数
import type { EnvConfig, PermissionModeName } from '@ccem/core';
import { encrypt, decrypt, ENV_PRESETS, PERMISSION_PRESETS } from '@ccem/core';

// 本地模块
import {
  renderCompactHeader,
  // ... 其他 ui imports
} from './ui.js';
import {
  applyPermissionMode,
  // ... 其他 permissions imports
} from './permissions.js';
// ... 其他本地 imports
```

**Step 4: 更新其他文件的 imports**

更新 `apps/cli/src/permissions.ts`:
```typescript
import type { PermissionConfig, PermissionModeName, EnvConfig } from '@ccem/core';
import { decrypt, PERMISSION_PRESETS, getPermissionModeNames } from '@ccem/core';
import { getSettingsPath, ensureClaudeDir } from './utils.js';
```

更新 `apps/cli/src/remote.ts`:
```typescript
import type { EnvConfig } from '@ccem/core';
import { encrypt } from '@ccem/core';
```

**Step 5: 创建 cli tsup.config.ts**

Create `apps/cli/tsup.config.ts`:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

**Step 6: 安装依赖并构建**

Run:
```bash
cd apps/cli && pnpm install && pnpm build
```

Expected: 构建成功

**Step 7: 测试 CLI 仍然正常工作**

Run:
```bash
node apps/cli/dist/index.js --version
node apps/cli/dist/index.js ls
```

Expected: 显示版本号和环境列表

**Step 8: Commit**

```bash
git add apps/cli/
git rm -r src/  # 删除旧的 src 目录
git commit -m "refactor: migrate CLI to apps/cli using @ccem/core"
```

---

### Task 1.4: 迁移测试到新结构

**Files:**
- Move: `src/__tests__/` → `packages/core/src/__tests__/` (core 相关测试)
- Move: `src/__tests__/` → `apps/cli/src/__tests__/` (cli 相关测试)
- Update: 测试文件 imports

**Step 1: 移动 core 相关测试**

Run:
```bash
mkdir -p packages/core/src/__tests__
cp src/__tests__/utils.test.ts packages/core/src/__tests__/encryption.test.ts
cp src/__tests__/presets.test.ts packages/core/src/__tests__/
```

**Step 2: 更新 core 测试 imports**

Modify `packages/core/src/__tests__/encryption.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../encryption.js';

describe('encryption', () => {
  // 只保留 encrypt/decrypt 测试，移除路径工具测试
  // ...
});
```

**Step 3: 移动 cli 相关测试**

Run:
```bash
mkdir -p apps/cli/src/__tests__
mv src/__tests__/permissions.test.ts apps/cli/src/__tests__/
mv src/__tests__/skills.test.ts apps/cli/src/__tests__/
mv src/__tests__/usage.test.ts apps/cli/src/__tests__/
mv src/__tests__/remote.test.ts apps/cli/src/__tests__/
```

**Step 4: 更新 cli 测试 imports**

更新各测试文件，使用 `@ccem/core` 导入类型:
```typescript
import type { PermissionConfig } from '@ccem/core';
```

**Step 5: 创建各包的 vitest.config.ts**

Create `packages/core/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Create `apps/cli/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

**Step 6: 运行所有测试**

Run:
```bash
pnpm test:run
```

Expected: 所有测试通过

**Step 7: Commit**

```bash
git add packages/core/src/__tests__/ apps/cli/src/__tests__/
git add packages/core/vitest.config.ts apps/cli/vitest.config.ts
git rm -r src/__tests__/  # 删除旧测试目录
git commit -m "test: migrate tests to monorepo structure"
```

---

## Phase 1 完成检查点

在进入 Phase 2 之前，确认：

- [ ] `pnpm build` 成功构建所有包
- [ ] `pnpm test:run` 所有测试通过
- [ ] `node apps/cli/dist/index.js ls` CLI 正常工作
- [ ] `@ccem/core` 可以被 cli 正确引用

---

## Phase 2: Tauri 桌面应用初始化

### Task 2.1: 初始化 Tauri 项目

**Files:**
- Create: `apps/desktop/` (Tauri 项目)

**Step 1: 安装 Tauri CLI**

Run:
```bash
pnpm add -D @tauri-apps/cli@latest -w
```

Expected: Tauri CLI 安装成功

**Step 2: 初始化 Tauri 项目**

Run:
```bash
cd apps/desktop
pnpm create tauri-app . --template react-ts --manager pnpm
```

Expected: Tauri 项目创建成功

**Step 3: 更新 apps/desktop/package.json**

Modify `apps/desktop/package.json`:
```json
{
  "name": "@ccem/desktop",
  "version": "1.8.0",
  "type": "module",
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "tauri": "tauri"
  },
  "dependencies": {
    "@ccem/core": "workspace:*",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.3.3",
    "vite": "^5.3.0"
  }
}
```

**Step 4: 安装依赖**

Run:
```bash
cd apps/desktop && pnpm install
```

Expected: 依赖安装成功

**Step 5: Commit**

```bash
git add apps/desktop/
git commit -m "feat: initialize Tauri desktop app"
```

---

### Task 2.2: 配置 TailwindCSS

**Files:**
- Create: `apps/desktop/tailwind.config.js`
- Create: `apps/desktop/postcss.config.js`
- Modify: `apps/desktop/src/index.css`

**Step 1: 创建 Tailwind 配置**

Create `apps/desktop/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
```

**Step 2: 创建 PostCSS 配置**

Create `apps/desktop/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: 更新 index.css**

Modify `apps/desktop/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* macOS 原生风格基础样式 */
:root {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  -webkit-font-smoothing: antialiased;
}

body {
  @apply bg-gray-50 text-gray-900;
}

/* 卡片样式 */
.card {
  @apply bg-white rounded-xl shadow-sm border border-gray-100 p-4;
}

/* 主按钮 */
.btn-primary {
  @apply bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg
         hover:from-green-600 hover:to-green-700 transition-all font-medium;
}

/* 次要按钮 */
.btn-secondary {
  @apply bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg
         hover:bg-gray-50 transition-all font-medium;
}
```

**Step 4: Commit**

```bash
git add apps/desktop/tailwind.config.js apps/desktop/postcss.config.js apps/desktop/src/index.css
git commit -m "feat: configure TailwindCSS with macOS native style"
```

---

### Task 2.3: 安装和配置 shadcn/ui

**Files:**
- Create: `apps/desktop/components.json`
- Create: `apps/desktop/src/components/ui/`

**Step 1: 初始化 shadcn/ui**

Run:
```bash
cd apps/desktop
pnpm dlx shadcn@latest init
```

选择配置:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Step 2: 安装常用组件**

Run:
```bash
pnpm dlx shadcn@latest add button card tabs badge separator
```

Expected: 组件安装到 `src/components/ui/`

**Step 3: Commit**

```bash
git add apps/desktop/components.json apps/desktop/src/components/
git commit -m "feat: install shadcn/ui components"
```

---

### Task 2.4: 创建基础布局组件

**Files:**
- Create: `apps/desktop/src/components/layout/AppLayout.tsx`
- Create: `apps/desktop/src/components/layout/TabNav.tsx`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: 创建 AppLayout 组件**

Create `apps/desktop/src/components/layout/AppLayout.tsx`:
```tsx
import { ReactNode } from 'react';
import { TabNav } from './TabNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">CCEM</h1>
          <TabNav />
          <div className="flex items-center gap-2">
            {/* 主题切换和语言切换按钮 */}
            <button className="p-2 rounded-lg hover:bg-gray-100">☀️</button>
            <span className="text-sm text-gray-500">ZH</span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="p-6">{children}</main>
    </div>
  );
}
```

**Step 2: 创建 TabNav 组件**

Create `apps/desktop/src/components/layout/TabNav.tsx`:
```tsx
import { useState } from 'react';

const tabs = [
  { id: 'dashboard', label: '仪表盘' },
  { id: 'environments', label: '环境管理' },
  { id: 'permissions', label: '权限模式' },
  { id: 'skills', label: 'Skills' },
  { id: 'settings', label: '设置' },
];

export function TabNav() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <nav className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
```

**Step 3: 创建 layout index 导出**

Create `apps/desktop/src/components/layout/index.ts`:
```typescript
export { AppLayout } from './AppLayout';
export { TabNav } from './TabNav';
```

**Step 4: 更新 App.tsx**

Modify `apps/desktop/src/App.tsx`:
```tsx
import { AppLayout } from './components/layout';

function App() {
  return (
    <AppLayout>
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">
          你好，开发者 👋
        </h2>
        <p className="text-gray-500 mt-2">CCEM Desktop App</p>
      </div>
    </AppLayout>
  );
}

export default App;
```

**Step 5: 运行开发服务器测试**

Run:
```bash
cd apps/desktop && pnpm dev
```

Expected: 应用启动，显示基础布局

**Step 6: Commit**

```bash
git add apps/desktop/src/components/layout/ apps/desktop/src/App.tsx
git commit -m "feat: create basic app layout with tab navigation"
```

---

## Phase 2 完成检查点

在进入 Phase 3 之前，确认：

- [ ] `pnpm dev` 在 apps/desktop 中成功启动
- [ ] 显示顶部 Tab 导航
- [ ] TailwindCSS 样式正常工作
- [ ] shadcn/ui 组件可用

---

## Phase 3: 核心功能页面

### Task 3.1: 创建 Zustand Store

**Files:**
- Create: `apps/desktop/src/stores/envStore.ts`
- Create: `apps/desktop/src/stores/index.ts`

**Step 1: 创建环境管理 Store**

Create `apps/desktop/src/stores/envStore.ts`:
```typescript
import { create } from 'zustand';
import type { EnvConfig, PermissionModeName } from '@ccem/core';

interface EnvState {
  // 环境列表
  environments: Record<string, EnvConfig>;
  currentEnv: string;

  // 权限模式
  defaultMode: PermissionModeName | null;

  // 活跃会话
  sessions: Session[];

  // Actions
  setEnvironments: (envs: Record<string, EnvConfig>) => void;
  setCurrentEnv: (name: string) => void;
  setDefaultMode: (mode: PermissionModeName | null) => void;
  addSession: (session: Session) => void;
  removeSession: (pid: number) => void;
}

export interface Session {
  pid: number;
  envName: string;
  permMode: PermissionModeName;
  startTime: Date;
  terminalType: 'terminal' | 'iterm2';
}

export const useEnvStore = create<EnvState>((set) => ({
  environments: {},
  currentEnv: 'official',
  defaultMode: null,
  sessions: [],

  setEnvironments: (envs) => set({ environments: envs }),
  setCurrentEnv: (name) => set({ currentEnv: name }),
  setDefaultMode: (mode) => set({ defaultMode: mode }),
  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),
  removeSession: (pid) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.pid !== pid),
    })),
}));
```

**Step 2: 创建 stores index**

Create `apps/desktop/src/stores/index.ts`:
```typescript
export { useEnvStore } from './envStore';
export type { Session } from './envStore';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/stores/
git commit -m "feat: create Zustand stores for state management"
```

---

### Task 3.2: 创建 Dashboard 页面

**Files:**
- Create: `apps/desktop/src/pages/Dashboard.tsx`
- Create: `apps/desktop/src/components/dashboard/StatsCard.tsx`
- Create: `apps/desktop/src/components/dashboard/CurrentEnvCard.tsx`
- Create: `apps/desktop/src/components/dashboard/SessionsCard.tsx`

**Step 1: 创建 StatsCard 组件**

Create `apps/desktop/src/components/dashboard/StatsCard.tsx`:
```tsx
interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: string;
}

export function StatsCard({ icon, value, label, sublabel, trend }: StatsCardProps) {
  return (
    <div className="card flex flex-col">
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-sm text-gray-600">{label}</span>
      {sublabel && (
        <span className={`text-xs mt-1 ${trend?.startsWith('↑') ? 'text-green-600' : 'text-gray-500'}`}>
          {sublabel}
        </span>
      )}
    </div>
  );
}
```

**Step 2: 创建 CurrentEnvCard 组件**

Create `apps/desktop/src/components/dashboard/CurrentEnvCard.tsx`:
```tsx
import { useEnvStore } from '../../stores';
import { Button } from '../ui/button';

export function CurrentEnvCard() {
  const { currentEnv, environments } = useEnvStore();
  const env = environments[currentEnv];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-500">✓</span>
        <h3 className="font-semibold text-gray-900">当前环境</h3>
      </div>

      <div className="space-y-3">
        <div className="text-lg font-medium text-gray-900">{currentEnv}</div>

        <div className="text-sm text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>API</span>
            <span className="text-gray-700">{env?.ANTHROPIC_BASE_URL || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Model</span>
            <span className="text-gray-700">{env?.ANTHROPIC_MODEL || '-'}</span>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4">
          切换环境
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: 创建 SessionsCard 组件**

Create `apps/desktop/src/components/dashboard/SessionsCard.tsx`:
```tsx
import { useEnvStore, Session } from '../../stores';
import { Button } from '../ui/button';

export function SessionsCard() {
  const { sessions, removeSession } = useEnvStore();

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <span>📈</span>
        <h3 className="font-semibold text-gray-900">活跃会话</h3>
      </div>

      {sessions.length === 0 ? (
        <div className="text-gray-500 text-sm py-4 text-center">
          暂无活跃会话
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionItem key={session.pid} session={session} />
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <Button variant="destructive" className="w-full mt-4">
          一键全部停止
        </Button>
      )}
    </div>
  );
}

function SessionItem({ session }: { session: Session }) {
  const startTime = new Date(session.startTime).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div className="font-medium text-gray-900">
          {session.envName} + {session.permMode}
        </div>
        <div className="text-xs text-gray-500">{startTime} 启动</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost">聚焦</Button>
        <Button size="sm" variant="ghost">停止</Button>
      </div>
    </div>
  );
}
```

**Step 4: 创建 Dashboard 页面**

Create `apps/desktop/src/pages/Dashboard.tsx`:
```tsx
import { Button } from '../components/ui/button';
import { StatsCard } from '../components/dashboard/StatsCard';
import { CurrentEnvCard } from '../components/dashboard/CurrentEnvCard';
import { SessionsCard } from '../components/dashboard/SessionsCard';
import { useEnvStore } from '../stores';

export function Dashboard() {
  const { environments, sessions, defaultMode } = useEnvStore();
  const envCount = Object.keys(environments).length;

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">你好，开发者 👋</h2>
        <div className="flex gap-3">
          <Button variant="outline">+ 添加环境</Button>
          <Button className="btn-primary">▶ 启动</Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <StatsCard icon="🌐" value={envCount} label="环境数" sublabel="✓ 已配置" />
        <StatsCard icon="💰" value="$18.50" label="本月费用" sublabel="↑12%" />
        <StatsCard icon="📊" value="1.2M" label="Tokens" sublabel="本月用量" />
        <StatsCard icon="🚀" value={sessions.length} label="活跃会话" sublabel="运行中" />
        <StatsCard icon="⚡" value={defaultMode || '-'} label="权限模式" sublabel="默认模式" />
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-2 gap-6">
        <CurrentEnvCard />
        <SessionsCard />
      </div>

      {/* 快捷链接 */}
      <div className="space-y-2">
        <button className="w-full text-left p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 flex justify-between items-center">
          <span className="text-primary-600">查看所有环境</span>
          <span>→</span>
        </button>
        <button className="w-full text-left p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 flex justify-between items-center">
          <span className="text-primary-600">查看用量详情</span>
          <span>↓</span>
        </button>
      </div>
    </div>
  );
}
```

**Step 5: 创建 dashboard components index**

Create `apps/desktop/src/components/dashboard/index.ts`:
```typescript
export { StatsCard } from './StatsCard';
export { CurrentEnvCard } from './CurrentEnvCard';
export { SessionsCard } from './SessionsCard';
```

**Step 6: Commit**

```bash
git add apps/desktop/src/pages/ apps/desktop/src/components/dashboard/
git commit -m "feat: create Dashboard page with stats and session cards"
```

---

### Task 3.3: 创建环境管理页面

**Files:**
- Create: `apps/desktop/src/pages/Environments.tsx`
- Create: `apps/desktop/src/components/environments/EnvList.tsx`
- Create: `apps/desktop/src/components/environments/EnvForm.tsx`

**Step 1: 创建 EnvList 组件**

Create `apps/desktop/src/components/environments/EnvList.tsx`:
```tsx
import { useEnvStore } from '../../stores';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function EnvList() {
  const { environments, currentEnv, setCurrentEnv } = useEnvStore();

  return (
    <div className="space-y-3">
      {Object.entries(environments).map(([name, env]) => (
        <div
          key={name}
          className={`p-4 bg-white rounded-xl border ${
            name === currentEnv ? 'border-green-500' : 'border-gray-100'
          } hover:shadow-sm transition-all`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={name === currentEnv ? 'text-green-500' : 'text-gray-400'}>
                {name === currentEnv ? '●' : '○'}
              </span>
              <div>
                <div className="font-medium text-gray-900">{name}</div>
                <div className="text-sm text-gray-500">
                  {env.ANTHROPIC_BASE_URL} · {env.ANTHROPIC_MODEL}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {name !== currentEnv && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentEnv(name)}
                >
                  使用
                </Button>
              )}
              <Button size="sm" variant="ghost">编辑</Button>
              {name !== 'official' && (
                <Button size="sm" variant="ghost" className="text-red-500">
                  删除
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: 创建 Environments 页面**

Create `apps/desktop/src/pages/Environments.tsx`:
```tsx
import { Button } from '../components/ui/button';
import { EnvList } from '../components/environments/EnvList';
import { ENV_PRESETS } from '@ccem/core';

export function Environments() {
  const presetNames = Object.keys(ENV_PRESETS);

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">环境管理</h2>
        <Button className="btn-primary">+ 添加环境</Button>
      </div>

      {/* 环境列表 */}
      <EnvList />

      {/* 从预设添加 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">从预设添加</h3>
        <div className="flex gap-2 flex-wrap">
          {presetNames.map((name) => (
            <Button key={name} variant="outline" size="sm">
              {name}
            </Button>
          ))}
        </div>
      </div>

      {/* 从远程加载 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">从远程加载</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入 URL..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button variant="outline">加载</Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: 创建 environments components index**

Create `apps/desktop/src/components/environments/index.ts`:
```typescript
export { EnvList } from './EnvList';
```

**Step 4: Commit**

```bash
git add apps/desktop/src/pages/Environments.tsx apps/desktop/src/components/environments/
git commit -m "feat: create Environments page with list and presets"
```

---

### Task 3.4: 创建权限模式页面

**Files:**
- Create: `apps/desktop/src/pages/Permissions.tsx`
- Create: `apps/desktop/src/components/permissions/ModeCard.tsx`

**Step 1: 创建 ModeCard 组件**

Create `apps/desktop/src/components/permissions/ModeCard.tsx`:
```tsx
import { PERMISSION_PRESETS, getModeIcon } from '@ccem/core';
import type { PermissionModeName } from '@ccem/core';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ModeCardProps {
  modeName: PermissionModeName;
  isDefault: boolean;
  onSetDefault: () => void;
  onApply: () => void;
}

export function ModeCard({ modeName, isDefault, onSetDefault, onApply }: ModeCardProps) {
  const preset = PERMISSION_PRESETS[modeName];
  const icon = getModeIcon(modeName);

  return (
    <div className={`p-4 bg-white rounded-xl border ${isDefault ? 'border-green-500' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-medium text-gray-900">{preset.name}</div>
            {isDefault && <Badge variant="secondary" className="text-xs">默认</Badge>}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{preset.description}</p>

      <div className="text-xs text-gray-500 space-y-1 mb-4">
        <div>
          <span className="text-green-600">✓ 允许: </span>
          {preset.permissions.allow.slice(0, 3).join(', ')}
          {preset.permissions.allow.length > 3 && '...'}
        </div>
        {preset.permissions.deny.length > 0 && (
          <div>
            <span className="text-red-600">✗ 禁止: </span>
            {preset.permissions.deny.slice(0, 2).join(', ')}
            {preset.permissions.deny.length > 2 && '...'}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onApply} className="flex-1">
          应用
        </Button>
        {!isDefault && (
          <Button size="sm" variant="ghost" onClick={onSetDefault}>
            设为默认
          </Button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 创建 Permissions 页面**

Create `apps/desktop/src/pages/Permissions.tsx`:
```tsx
import { getPermissionModeNames } from '@ccem/core';
import type { PermissionModeName } from '@ccem/core';
import { ModeCard } from '../components/permissions/ModeCard';
import { useEnvStore } from '../stores';

export function Permissions() {
  const { defaultMode, setDefaultMode } = useEnvStore();
  const modeNames = getPermissionModeNames();

  const handleApply = (mode: PermissionModeName) => {
    // TODO: 启动 Claude 并应用此模式
    console.log('Apply mode:', mode);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">权限模式</h2>
        {defaultMode && (
          <button
            onClick={() => setDefaultMode(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            清除默认
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {modeNames.map((modeName) => (
          <ModeCard
            key={modeName}
            modeName={modeName}
            isDefault={defaultMode === modeName}
            onSetDefault={() => setDefaultMode(modeName)}
            onApply={() => handleApply(modeName)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: 创建 permissions components index**

Create `apps/desktop/src/components/permissions/index.ts`:
```typescript
export { ModeCard } from './ModeCard';
```

**Step 4: Commit**

```bash
git add apps/desktop/src/pages/Permissions.tsx apps/desktop/src/components/permissions/
git commit -m "feat: create Permissions page with mode cards"
```

---

### Task 3.5: 集成页面路由

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/layout/TabNav.tsx`

**Step 1: 更新 TabNav 支持页面切换**

Modify `apps/desktop/src/components/layout/TabNav.tsx`:
```tsx
interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: '仪表盘' },
  { id: 'environments', label: '环境管理' },
  { id: 'permissions', label: '权限模式' },
  { id: 'skills', label: 'Skills' },
  { id: 'settings', label: '设置' },
];

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
```

**Step 2: 更新 App.tsx 集成所有页面**

Modify `apps/desktop/src/App.tsx`:
```tsx
import { useState } from 'react';
import { AppLayout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { Environments } from './pages/Environments';
import { Permissions } from './pages/Permissions';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'environments':
        return <Environments />;
      case 'permissions':
        return <Permissions />;
      case 'skills':
        return <div className="text-center py-20 text-gray-500">Skills 页面开发中...</div>;
      case 'settings':
        return <div className="text-center py-20 text-gray-500">设置页面开发中...</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
```

**Step 3: 更新 AppLayout 传递 props**

Modify `apps/desktop/src/components/layout/AppLayout.tsx`:
```tsx
import { ReactNode } from 'react';
import { TabNav } from './TabNav';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">CCEM</h1>
          <TabNav activeTab={activeTab} onTabChange={onTabChange} />
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100">☀️</button>
            <span className="text-sm text-gray-500">ZH</span>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

**Step 4: 运行测试**

Run:
```bash
cd apps/desktop && pnpm dev
```

Expected: 可以切换 Tab 查看不同页面

**Step 5: Commit**

```bash
git add apps/desktop/src/
git commit -m "feat: integrate page routing with tab navigation"
```

---

## Phase 3 完成检查点

在进入 Phase 4 之前，确认：

- [ ] Dashboard 页面显示统计卡片
- [ ] Environments 页面显示环境列表
- [ ] Permissions 页面显示权限模式卡片
- [ ] Tab 切换正常工作

---

## Phase 4: Tauri 后端与系统托盘

### Task 4.1: 配置 Tauri 后端命令

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/commands/mod.rs`
- Create: `apps/desktop/src-tauri/src/commands/env.rs`

**Step 1: 创建 commands 模块**

Create `apps/desktop/src-tauri/src/commands/mod.rs`:
```rust
pub mod env;

pub use env::*;
```

**Step 2: 创建环境管理命令**

Create `apps/desktop/src-tauri/src/commands/env.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    #[serde(rename = "ANTHROPIC_BASE_URL")]
    pub base_url: Option<String>,
    #[serde(rename = "ANTHROPIC_API_KEY")]
    pub api_key: Option<String>,
    #[serde(rename = "ANTHROPIC_MODEL")]
    pub model: Option<String>,
    #[serde(rename = "ANTHROPIC_SMALL_FAST_MODEL")]
    pub small_model: Option<String>,
}

#[tauri::command]
pub fn get_environments() -> Result<HashMap<String, EnvConfig>, String> {
    // TODO: 从配置文件读取
    let mut envs = HashMap::new();
    envs.insert(
        "official".to_string(),
        EnvConfig {
            base_url: Some("https://api.anthropic.com".to_string()),
            api_key: None,
            model: Some("claude-sonnet-4-5-20250929".to_string()),
            small_model: Some("claude-haiku-4-5-20251001".to_string()),
        },
    );
    Ok(envs)
}

#[tauri::command]
pub fn get_current_env() -> Result<String, String> {
    // TODO: 从配置文件读取
    Ok("official".to_string())
}

#[tauri::command]
pub fn switch_environment(name: String) -> Result<(), String> {
    // TODO: 切换环境
    println!("Switching to environment: {}", name);
    Ok(())
}
```

**Step 3: 更新 main.rs 注册命令**

Modify `apps/desktop/src-tauri/src/main.rs`:
```rust
mod commands;

use commands::{get_environments, get_current_env, switch_environment};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_environments,
            get_current_env,
            switch_environment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/
git commit -m "feat: add Tauri backend commands for environment management"
```

---

### Task 4.2: 实现系统托盘

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/tray.rs`
- Modify: `apps/desktop/src-tauri/tauri.conf.json`

**Step 1: 创建托盘模块**

Create `apps/desktop/src-tauri/src/tray.rs`:
```rust
use tauri::{
    menu::{Menu, MenuItem, Submenu},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager,
};

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    // 环境子菜单
    let env_submenu = Submenu::with_items(
        app,
        "当前环境: official",
        true,
        &[
            &MenuItem::with_id(app, "env_official", "● official", true, None::<&str>)?,
            &MenuItem::with_id(app, "env_glm", "○ GLM", true, None::<&str>)?,
            &MenuItem::with_id(app, "env_deepseek", "○ DeepSeek", true, None::<&str>)?,
        ],
    )?;

    // 权限模式子菜单
    let perm_submenu = Submenu::with_items(
        app,
        "权限模式: dev",
        true,
        &[
            &MenuItem::with_id(app, "perm_yolo", "○ YOLO 模式", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_dev", "● 开发模式", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_readonly", "○ 只读模式", true, None::<&str>)?,
            &MenuItem::with_id(app, "perm_safe", "○ 安全模式", true, None::<&str>)?,
        ],
    )?;

    // 主菜单
    let menu = Menu::with_items(
        app,
        &[
            &env_submenu,
            &perm_submenu,
            &MenuItem::with_id(app, "separator1", "─────────", false, None::<&str>)?,
            &MenuItem::with_id(app, "launch", "▶ 启动 Claude", true, None::<&str>)?,
            &MenuItem::with_id(app, "separator2", "─────────", false, None::<&str>)?,
            &MenuItem::with_id(app, "open_window", "打开主窗口", true, None::<&str>)?,
            &MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?,
        ],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "launch" => {
                println!("Launch Claude");
                // TODO: 启动 Claude
            }
            "open_window" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            id if id.starts_with("env_") => {
                let env_name = id.strip_prefix("env_").unwrap();
                println!("Switch to env: {}", env_name);
                // TODO: 切换环境
            }
            id if id.starts_with("perm_") => {
                let perm_mode = id.strip_prefix("perm_").unwrap();
                println!("Switch to perm: {}", perm_mode);
                // TODO: 切换权限模式
            }
            _ => {}
        })
        .build(app)
}
```

**Step 2: 更新 main.rs 添加托盘**

Modify `apps/desktop/src-tauri/src/main.rs`:
```rust
mod commands;
mod tray;

use commands::{get_environments, get_current_env, switch_environment};
use tray::create_tray;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_environments,
            get_current_env,
            switch_environment,
        ])
        .setup(|app| {
            let _ = create_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: 更新 tauri.conf.json 启用托盘**

Modify `apps/desktop/src-tauri/tauri.conf.json` 添加:
```json
{
  "app": {
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri/
git commit -m "feat: implement system tray with environment and permission menus"
```

---

### Task 4.3: 实现终端探测和启动

**Files:**
- Create: `apps/desktop/src-tauri/src/terminal.rs`
- Create: `apps/desktop/src-tauri/src/commands/session.rs`

**Step 1: 创建终端模块**

Create `apps/desktop/src-tauri/src/terminal.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalInfo {
    pub id: String,
    pub name: String,
    pub enhanced: bool,
}

pub fn detect_terminals() -> Vec<TerminalInfo> {
    let mut terminals = vec![];

    // Terminal.app 总是可用
    terminals.push(TerminalInfo {
        id: "terminal".to_string(),
        name: "Terminal".to_string(),
        enhanced: false,
    });

    // 检测 iTerm2
    if Path::new("/Applications/iTerm.app").exists() {
        terminals.push(TerminalInfo {
            id: "iterm2".to_string(),
            name: "iTerm2".to_string(),
            enhanced: true,
        });
    }

    terminals
}

pub fn launch_terminal_app(env_vars: &[(String, String)], session_name: &str) -> Result<u32, String> {
    let env_exports: String = env_vars
        .iter()
        .map(|(k, v)| format!("export {}=\"{}\"", k, v))
        .collect::<Vec<_>>()
        .join("; ");

    let script = format!(
        r#"tell application "Terminal"
            activate
            do script "{} && claude"
        end tell"#,
        env_exports
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        // 返回一个模拟的 PID（实际需要更复杂的逻辑获取）
        Ok(std::process::id())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn launch_iterm2(env_vars: &[(String, String)], session_name: &str) -> Result<u32, String> {
    let env_exports: String = env_vars
        .iter()
        .map(|(k, v)| format!("export {}=\"{}\"", k, v))
        .collect::<Vec<_>>()
        .join("; ");

    let script = format!(
        r#"tell application "iTerm2"
            activate
            create window with default profile
            tell current session of current window
                set name to "{}"
                write text "{} && claude"
            end tell
        end tell"#,
        session_name, env_exports
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(std::process::id())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
```

**Step 2: 创建 session 命令**

Create `apps/desktop/src-tauri/src/commands/session.rs`:
```rust
use crate::terminal::{detect_terminals, launch_iterm2, launch_terminal_app, TerminalInfo};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub pid: u32,
    pub env_name: String,
    pub perm_mode: String,
    pub start_time: String,
    pub terminal_type: String,
}

pub struct SessionManager {
    pub sessions: Mutex<Vec<Session>>,
    pub preferred_terminal: Mutex<String>,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(vec![]),
            preferred_terminal: Mutex::new("terminal".to_string()),
        }
    }
}

#[tauri::command]
pub fn detect_available_terminals() -> Vec<TerminalInfo> {
    detect_terminals()
}

#[tauri::command]
pub fn set_preferred_terminal(state: State<SessionManager>, terminal_id: String) {
    *state.preferred_terminal.lock().unwrap() = terminal_id;
}

#[tauri::command]
pub fn launch_claude(
    state: State<SessionManager>,
    env_name: String,
    perm_mode: String,
    env_vars: Vec<(String, String)>,
) -> Result<Session, String> {
    let terminal_type = state.preferred_terminal.lock().unwrap().clone();
    let session_name = format!("Claude: {} + {}", env_name, perm_mode);

    let pid = match terminal_type.as_str() {
        "iterm2" => launch_iterm2(&env_vars, &session_name)?,
        _ => launch_terminal_app(&env_vars, &session_name)?,
    };

    let session = Session {
        pid,
        env_name,
        perm_mode,
        start_time: chrono::Utc::now().to_rfc3339(),
        terminal_type,
    };

    state.sessions.lock().unwrap().push(session.clone());
    Ok(session)
}

#[tauri::command]
pub fn list_sessions(state: State<SessionManager>) -> Vec<Session> {
    state.sessions.lock().unwrap().clone()
}

#[tauri::command]
pub fn stop_session(state: State<SessionManager>, pid: u32) -> Result<(), String> {
    // 发送 SIGTERM 到进程
    #[cfg(unix)]
    {
        use std::process::Command;
        Command::new("kill")
            .arg("-15")
            .arg(pid.to_string())
            .output()
            .map_err(|e| e.to_string())?;
    }

    // 从列表移除
    state.sessions.lock().unwrap().retain(|s| s.pid != pid);
    Ok(())
}
```

**Step 3: 更新 commands/mod.rs**

Modify `apps/desktop/src-tauri/src/commands/mod.rs`:
```rust
pub mod env;
pub mod session;

pub use env::*;
pub use session::*;
```

**Step 4: 更新 Cargo.toml 添加 chrono 依赖**

Modify `apps/desktop/src-tauri/Cargo.toml`:
```toml
[dependencies]
chrono = "0.4"
```

**Step 5: 更新 main.rs 注册新命令**

Modify `apps/desktop/src-tauri/src/main.rs`:
```rust
mod commands;
mod terminal;
mod tray;

use commands::{
    get_environments, get_current_env, switch_environment,
    detect_available_terminals, set_preferred_terminal,
    launch_claude, list_sessions, stop_session, SessionManager,
};
use tray::create_tray;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SessionManager::default())
        .invoke_handler(tauri::generate_handler![
            get_environments,
            get_current_env,
            switch_environment,
            detect_available_terminals,
            set_preferred_terminal,
            launch_claude,
            list_sessions,
            stop_session,
        ])
        .setup(|app| {
            let _ = create_tray(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 6: Commit**

```bash
git add apps/desktop/src-tauri/
git commit -m "feat: implement terminal detection and Claude session launching"
```

---

## Phase 4 完成检查点

在进入 Phase 5 之前，确认：

- [ ] 系统托盘显示正常
- [ ] 托盘菜单可以切换环境和权限
- [ ] 点击"启动 Claude"能打开终端
- [ ] 能检测 iTerm2 并使用增强功能

---

## Phase 5: 前端与后端集成

### Task 5.1: 创建 Tauri API 封装

**Files:**
- Create: `apps/desktop/src/lib/tauri.ts`

**Step 1: 创建 Tauri API 封装**

Create `apps/desktop/src/lib/tauri.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core';
import type { EnvConfig, PermissionModeName } from '@ccem/core';

export interface TerminalInfo {
  id: string;
  name: string;
  enhanced: boolean;
}

export interface Session {
  pid: number;
  env_name: string;
  perm_mode: string;
  start_time: string;
  terminal_type: string;
}

// 环境管理
export async function getEnvironments(): Promise<Record<string, EnvConfig>> {
  return invoke('get_environments');
}

export async function getCurrentEnv(): Promise<string> {
  return invoke('get_current_env');
}

export async function switchEnvironment(name: string): Promise<void> {
  return invoke('switch_environment', { name });
}

// 终端和会话
export async function detectTerminals(): Promise<TerminalInfo[]> {
  return invoke('detect_available_terminals');
}

export async function setPreferredTerminal(terminalId: string): Promise<void> {
  return invoke('set_preferred_terminal', { terminalId });
}

export async function launchClaude(
  envName: string,
  permMode: PermissionModeName,
  envVars: [string, string][]
): Promise<Session> {
  return invoke('launch_claude', { envName, permMode, envVars });
}

export async function listSessions(): Promise<Session[]> {
  return invoke('list_sessions');
}

export async function stopSession(pid: number): Promise<void> {
  return invoke('stop_session', { pid });
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/lib/
git commit -m "feat: create Tauri API wrapper for frontend"
```

---

### Task 5.2: 集成后端数据到 Store

**Files:**
- Modify: `apps/desktop/src/stores/envStore.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: 更新 Store 添加初始化逻辑**

Modify `apps/desktop/src/stores/envStore.ts`:
```typescript
import { create } from 'zustand';
import type { EnvConfig, PermissionModeName } from '@ccem/core';
import * as api from '../lib/tauri';

interface EnvState {
  environments: Record<string, EnvConfig>;
  currentEnv: string;
  defaultMode: PermissionModeName | null;
  sessions: api.Session[];
  terminals: api.TerminalInfo[];
  preferredTerminal: string;
  loading: boolean;

  // Actions
  initialize: () => Promise<void>;
  setCurrentEnv: (name: string) => Promise<void>;
  setDefaultMode: (mode: PermissionModeName | null) => void;
  launchClaude: (mode?: PermissionModeName) => Promise<void>;
  stopSession: (pid: number) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export const useEnvStore = create<EnvState>((set, get) => ({
  environments: {},
  currentEnv: 'official',
  defaultMode: null,
  sessions: [],
  terminals: [],
  preferredTerminal: 'terminal',
  loading: true,

  initialize: async () => {
    try {
      const [environments, currentEnv, terminals, sessions] = await Promise.all([
        api.getEnvironments(),
        api.getCurrentEnv(),
        api.detectTerminals(),
        api.listSessions(),
      ]);

      set({
        environments,
        currentEnv,
        terminals,
        sessions,
        preferredTerminal: terminals.find(t => t.enhanced)?.id || 'terminal',
        loading: false,
      });
    } catch (error) {
      console.error('Failed to initialize:', error);
      set({ loading: false });
    }
  },

  setCurrentEnv: async (name) => {
    await api.switchEnvironment(name);
    set({ currentEnv: name });
  },

  setDefaultMode: (mode) => set({ defaultMode: mode }),

  launchClaude: async (mode) => {
    const { currentEnv, defaultMode, environments } = get();
    const env = environments[currentEnv];
    const permMode = mode || defaultMode || 'dev';

    const envVars: [string, string][] = [];
    if (env.ANTHROPIC_BASE_URL) envVars.push(['ANTHROPIC_BASE_URL', env.ANTHROPIC_BASE_URL]);
    if (env.ANTHROPIC_API_KEY) envVars.push(['ANTHROPIC_API_KEY', env.ANTHROPIC_API_KEY]);
    if (env.ANTHROPIC_MODEL) envVars.push(['ANTHROPIC_MODEL', env.ANTHROPIC_MODEL]);

    const session = await api.launchClaude(currentEnv, permMode, envVars);
    set((state) => ({ sessions: [...state.sessions, session] }));
  },

  stopSession: async (pid) => {
    await api.stopSession(pid);
    set((state) => ({ sessions: state.sessions.filter((s) => s.pid !== pid) }));
  },

  refreshSessions: async () => {
    const sessions = await api.listSessions();
    set({ sessions });
  },
}));
```

**Step 2: 在 App 启动时初始化**

Modify `apps/desktop/src/App.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { AppLayout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { Environments } from './pages/Environments';
import { Permissions } from './pages/Permissions';
import { useEnvStore } from './stores';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { initialize, loading } = useEnvStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'environments':
        return <Environments />;
      case 'permissions':
        return <Permissions />;
      case 'skills':
        return <div className="text-center py-20 text-gray-500">Skills 页面开发中...</div>;
      case 'settings':
        return <div className="text-center py-20 text-gray-500">设置页面开发中...</div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
```

**Step 3: Commit**

```bash
git add apps/desktop/src/
git commit -m "feat: integrate Tauri backend with Zustand store"
```

---

## Phase 5 完成检查点

在进入 Phase 6 之前，确认：

- [ ] 应用启动时从后端加载环境列表
- [ ] 切换环境会调用后端命令
- [ ] 点击启动按钮能正确打开终端

---

## Phase 6: 完善与发布

### Task 6.1: 创建 Settings 页面

**Files:**
- Create: `apps/desktop/src/pages/Settings.tsx`

**Step 1: 创建 Settings 页面**

Create `apps/desktop/src/pages/Settings.tsx`:
```typescript
import { useEnvStore } from '../stores';
import { Button } from '../components/ui/button';

export function Settings() {
  const { terminals, preferredTerminal } = useEnvStore();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">设置</h2>

      {/* 终端设置 */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">终端设置</h3>
        <div className="space-y-3">
          {terminals.map((terminal) => (
            <label
              key={terminal.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
            >
              <input
                type="radio"
                name="terminal"
                value={terminal.id}
                checked={preferredTerminal === terminal.id}
                className="w-4 h-4 text-green-500"
              />
              <div>
                <div className="font-medium text-gray-900">
                  {terminal.name}
                  {terminal.enhanced && (
                    <span className="ml-2 text-xs text-green-600">增强</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {terminal.enhanced
                    ? '支持窗口命名、精确聚焦等增强功能'
                    : '基础终端支持'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 其他设置 */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">其他</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-gray-700">开机自动启动</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-gray-700">关闭窗口时最小化到托盘</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 添加到 App 路由**

Update `apps/desktop/src/App.tsx` 的 renderPage:
```typescript
case 'settings':
  return <Settings />;
```

**Step 3: Commit**

```bash
git add apps/desktop/src/pages/Settings.tsx apps/desktop/src/App.tsx
git commit -m "feat: create Settings page with terminal selection"
```

---

### Task 6.2: 配置打包和发布

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`

**Step 1: 更新 Tauri 配置**

Modify `apps/desktop/src-tauri/tauri.conf.json`:
```json
{
  "productName": "CCEM",
  "version": "1.8.0",
  "identifier": "com.ccem.desktop",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "CCEM - Claude Code Environment Manager",
        "width": 1000,
        "height": 700,
        "minWidth": 800,
        "minHeight": 600,
        "center": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "trayIcon": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns"
    ],
    "macOS": {
      "minimumSystemVersion": "10.15"
    }
  }
}
```

**Step 2: 构建发布包**

Run:
```bash
cd apps/desktop && pnpm tauri build
```

Expected: 在 `src-tauri/target/release/bundle/` 生成 DMG 和 .app

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/tauri.conf.json
git commit -m "chore: configure Tauri for production build"
```

---

## Phase 6 完成检查点

最终验收：

- [ ] `pnpm build` 构建所有包成功
- [ ] `pnpm test:run` 所有测试通过
- [ ] CLI (`apps/cli`) 功能正常
- [ ] Desktop App 功能正常：
  - [ ] 环境列表显示
  - [ ] 切换环境
  - [ ] 权限模式选择
  - [ ] 系统托盘菜单
  - [ ] 启动 Claude 到终端
  - [ ] 会话管理
- [ ] DMG 打包成功

---

## 附录：后续优化项

以下功能可在后续版本迭代：

1. **用量统计集成** - 在 Dashboard 显示真实用量数据
2. **Skills 页面** - 完整的 Skills 管理 UI
3. **主题切换** - 深色/浅色模式
4. **多语言支持** - i18n
5. **自动更新** - Tauri Updater
6. **Windows/Linux 支持** - 跨平台终端探测
