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
