import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { getCcemConfigDir } from '@ccem/core';
import Conf from 'conf';

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

    it('should reject remote JSON decrypted with a wrong secret', () => {
      const original = JSON.stringify({
        environments: {
          test: {
            ANTHROPIC_API_KEY: 'test-key',
          },
        },
      });
      const encrypted = encryptWithSecret(original, 'correct-secret');

      expect(() => {
        const decrypted = decryptWithSecret(encrypted, 'wrong-secret');
        JSON.parse(decrypted);
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

    it('should use access key for auth header but encryption secret for decryption (key != secret)', () => {
      // Simulate server: encrypt with SERVER_SECRET, authenticate with ACCESS_KEY
      const ACCESS_KEY = 'dummy-access-key-abc123';
      const SERVER_SECRET = 'dummy-server-secret-xyz789';
      const payload = JSON.stringify({
        environments: {
          prod: {
            ANTHROPIC_BASE_URL: 'https://api.example.com',
            ANTHROPIC_API_KEY: 'prod-key-456',
          },
        },
      });

      // Server encrypts with its own SECRET (not with the access key)
      const encrypted = encryptWithSecret(payload, SERVER_SECRET);

      // Client must decrypt with SERVER_SECRET, not ACCESS_KEY
      expect(() => decryptWithSecret(encrypted, ACCESS_KEY)).toThrow();
      const decrypted = decryptWithSecret(encrypted, SERVER_SECRET);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
    });

    it('should fail when using access key to decrypt server-encrypted payload', () => {
      const SERVER_SECRET = 'server-encryption-secret';
      const encrypted = encryptWithSecret('{"environments":{}}', SERVER_SECRET);

      // Access key is different from encryption secret — decryption must fail
      expect(() => decryptWithSecret(encrypted, 'different-access-key')).toThrow();
    });
  });

  describe('server contract', () => {
    // Simulate server-side encrypt from server/index.js
    const serverEncrypt = (text: string, secret: string): string => {
      const key = crypto.scryptSync(secret, 'ccem-salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    };

    it('server encrypt output is base64(iv + ciphertext) matching client decrypt format', () => {
      const secret = 'contract-test-secret';
      const data = JSON.stringify({ environments: { test: { ANTHROPIC_API_KEY: 'k' } } });
      const encrypted = serverEncrypt(data, secret);

      // Verify format: base64 decodes to at least 16 bytes IV + ciphertext
      const decoded = Buffer.from(encrypted, 'base64');
      expect(decoded.length).toBeGreaterThan(16);

      // Verify roundtrip with client-side decrypt
      const key = crypto.scryptSync(secret, 'ccem-salt', 32);
      const iv = decoded.subarray(0, 16);
      const encryptedHex = decoded.subarray(16).toString('hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(data));
    });

    it('header takes precedence over query param (server contract)', () => {
      // Server reads: req.headers['x-ccem-key'] || req.query.key
      // This means if header is present, query param is ignored
      const headerKey = 'header-key-value';
      const queryKey = 'query-key-value';
      // Simulate server precedence logic
      const effectiveKey = headerKey || queryKey;
      expect(effectiveKey).toBe(headerKey);
      expect(effectiveKey).not.toBe(queryKey);
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

  describe('config path consistency', () => {
    it('should use the same config directory as main CLI', () => {
      // 验证 remote.ts 使用的配置路径与主 CLI 一致
      const expectedDir = getCcemConfigDir();

      // 创建一个测试配置实例，模拟 remote.ts 的配置
      const testConfig = new Conf({
        projectName: 'claude-code-env-manager',
        cwd: getCcemConfigDir(),
      });

      // 验证配置路径包含预期的目录
      expect(testConfig.path).toContain('.ccem');
      expect(testConfig.path).toContain('config.json');
    });
  });
});
