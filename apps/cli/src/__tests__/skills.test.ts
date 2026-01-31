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
