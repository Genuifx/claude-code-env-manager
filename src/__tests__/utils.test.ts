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
