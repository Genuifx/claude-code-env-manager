import { describe, expect, it } from 'vitest';
import { buildPermArgs } from '../launcher.js';

describe('launcher', () => {
  describe('buildPermArgs', () => {
    it('passes allowed and disallowed tool rules as separate argv values', () => {
      const args = buildPermArgs('dev');
      const allowedIndex = args.indexOf('--allowedTools');
      const disallowedIndex = args.indexOf('--disallowedTools');

      expect(args.slice(0, 2)).toEqual(['--permission-mode', 'acceptEdits']);
      expect(allowedIndex).toBeGreaterThan(-1);
      expect(disallowedIndex).toBeGreaterThan(allowedIndex);
      expect(args[allowedIndex + 1]).toBe('Read');
      expect(args[allowedIndex + 1]).not.toContain('"');
      expect(args[allowedIndex + 1]).not.toContain(' ');
      expect(args).toContain('Bash(npm:*)');
      expect(args).not.toContain('Read(*)');
      expect(args).toContain('Bash(sudo:*)');
    });
  });
});
