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
