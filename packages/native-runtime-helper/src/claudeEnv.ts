import process from 'node:process';

const CLAUDE_DESKTOP_CLIENT_APP = 'ccem-desktop';
const CLAUDE_NON_INTERACTIVE_SANDBOX = '1';

type ClaudeQueryEnvInput = {
  envVars?: Record<string, string>;
  effort?: string | null;
  baseEnv?: Record<string, string | undefined>;
};

export function buildClaudeQueryEnv({
  envVars,
  effort,
  baseEnv = process.env,
}: ClaudeQueryEnvInput = {}) {
  const env = {
    ...baseEnv,
    ...envVars,
    CLAUDE_AGENT_SDK_CLIENT_APP: CLAUDE_DESKTOP_CLIENT_APP,
    CLAUDE_CODE_SANDBOXED: CLAUDE_NON_INTERACTIVE_SANDBOX,
  };

  if (env.ANTHROPIC_AUTH_TOKEN) {
    delete env.ANTHROPIC_API_KEY;
  }

  if (effort) {
    env.CLAUDE_CODE_EFFORT_LEVEL = effort;
  }

  return env;
}
