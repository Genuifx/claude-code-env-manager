import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../utils.js';
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
      const original = 'key-with-special-chars!@#$%^&*()_+-=[]{}|;:",./<>?/`~';
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

describe('path utilities', () => {
  const originalHome = process.env.HOME;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-test-'));
  });

  afterEach(() => {
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
      const result = findProjectRoot();
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
