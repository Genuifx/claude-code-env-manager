import { randomUUID } from 'node:crypto';
import { createSdkMcpServer, tool, type McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

type BrowserToolName =
  | 'navigate'
  | 'get_url'
  | 'snapshot'
  | 'click'
  | 'type'
  | 'press_key'
  | 'scroll'
  | 'screenshot'
  | 'evaluate'
  | 'wait_for';

export type BrowserToolRequestOutput = {
  type: 'browser_tool_request';
  request_id: string;
  tool: BrowserToolName;
  args: Record<string, unknown>;
};

export type BrowserToolResponseCommand = {
  type: 'browser_tool_response';
  request_id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

type BrowserBridgePending = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const READ_TOOLS = new Set<BrowserToolName>(['get_url', 'snapshot', 'screenshot']);
const NORMAL_TOOLS = new Set<BrowserToolName>([
  'navigate',
  'get_url',
  'snapshot',
  'click',
  'type',
  'press_key',
  'scroll',
  'screenshot',
  'wait_for',
]);
const ALL_TOOLS = new Set<BrowserToolName>([...NORMAL_TOOLS, 'evaluate']);

export function browserToolNamesForPermissionMode(permMode: string): BrowserToolName[] {
  if (
    permMode === 'readonly'
    || permMode === 'audit'
    || permMode === 'plan'
    || permMode === 'safe'
    || permMode === 'ci'
  ) {
    return [...READ_TOOLS];
  }
  if (permMode === 'yolo' || permMode === 'bypassPermissions') {
    return [...ALL_TOOLS];
  }
  return [...ALL_TOOLS];
}

export function isBrowserEvaluateToolName(toolName: string): boolean {
  return toolName === 'mcp__ccem-browser__evaluate';
}

export function browserMcpToolNamesForPermissionMode(permMode: string): string[] {
  return browserToolNamesForPermissionMode(permMode).map((name) => `mcp__ccem-browser__${name}`);
}

export function ensureBrowserMcpToolsAllowed(
  allowedTools: string[] | undefined,
  permMode: string,
): string[] | undefined {
  if (!allowedTools || allowedTools.length === 0) {
    return allowedTools;
  }

  const existing = new Set(allowedTools);
  const missing = browserMcpToolNamesForPermissionMode(permMode)
    .filter((toolName) => !existing.has(toolName));

  return missing.length ? [...allowedTools, ...missing] : allowedTools;
}

function toToolResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function createBrowserToolBridge(
  emitRequest: (request: BrowserToolRequestOutput) => void,
  timeoutMs = 30_000,
) {
  const pending = new Map<string, BrowserBridgePending>();

  function sendBrowserToolRequest(toolName: BrowserToolName, args: Record<string, unknown>) {
    const requestId = randomUUID();
    emitRequest({
      type: 'browser_tool_request',
      request_id: requestId,
      tool: toolName,
      args,
    });

    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Browser tool ${toolName} timed out.`));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timeout });
    });
  }

  function handleBrowserToolResponse(command: BrowserToolResponseCommand): boolean {
    const waiter = pending.get(command.request_id);
    if (!waiter) {
      return false;
    }
    pending.delete(command.request_id);
    clearTimeout(waiter.timeout);
    if (command.ok) {
      waiter.resolve(command.result ?? null);
    } else {
      waiter.reject(new Error(command.error || 'Browser tool request failed.'));
    }
    return true;
  }

  function rejectAll(message: string) {
    for (const [requestId, waiter] of pending.entries()) {
      pending.delete(requestId);
      clearTimeout(waiter.timeout);
      waiter.reject(new Error(message));
    }
  }

  return {
    sendBrowserToolRequest,
    handleBrowserToolResponse,
    rejectAll,
  };
}

export function createCcemBrowserMcpServer(
  permMode: string,
  sendBrowserToolRequest: (toolName: BrowserToolName, args: Record<string, unknown>) => Promise<unknown>,
): McpServerConfig {
  const enabled = new Set(browserToolNamesForPermissionMode(permMode));
  const maybe = <T>(name: BrowserToolName, definition: T): T[] => (enabled.has(name) ? [definition] : []);

  return createSdkMcpServer({
    name: 'ccem-browser',
    version: '0.1.0',
    instructions: [
      'Controls the embedded browser panel scoped to the current CCEM workspace session.',
      'Use snapshot before click or type so refs match the current page.',
      'Do not use evaluate unless the user explicitly needs arbitrary JavaScript.',
    ].join(' '),
    tools: [
      ...maybe('navigate', tool(
        'navigate',
        'Navigate the embedded browser to a URL.',
        { url: z.string().min(1) },
        async (args) => toToolResult(await sendBrowserToolRequest('navigate', args)),
      )),
      ...maybe('get_url', tool(
        'get_url',
        'Read the current embedded browser URL and title.',
        {},
        async () => toToolResult(await sendBrowserToolRequest('get_url', {})),
      )),
      ...maybe('snapshot', tool(
        'snapshot',
        'Return a compact accessibility-style snapshot with clickable refs.',
        {},
        async () => toToolResult(await sendBrowserToolRequest('snapshot', {})),
      )),
      ...maybe('click', tool(
        'click',
        'Click an element by ref from the latest snapshot.',
        { ref: z.number().int().positive() },
        async (args) => toToolResult(await sendBrowserToolRequest('click', args)),
      )),
      ...maybe('type', tool(
        'type',
        'Type text into an input-like element by ref from the latest snapshot.',
        { ref: z.number().int().positive(), text: z.string() },
        async (args) => toToolResult(await sendBrowserToolRequest('type', args)),
      )),
      ...maybe('press_key', tool(
        'press_key',
        'Dispatch a key press to the active element in the embedded browser.',
        { key: z.string().min(1) },
        async (args) => toToolResult(await sendBrowserToolRequest('press_key', args)),
      )),
      ...maybe('scroll', tool(
        'scroll',
        'Scroll the embedded browser viewport.',
        { deltaY: z.number().optional() },
        async (args) => toToolResult(await sendBrowserToolRequest('scroll', args)),
      )),
      ...maybe('screenshot', tool(
        'screenshot',
        'Capture a PNG screenshot of the embedded browser as base64.',
        {},
        async () => toToolResult(await sendBrowserToolRequest('screenshot', {})),
      )),
      ...maybe('evaluate', tool(
        'evaluate',
        'Evaluate JavaScript in the embedded browser. This is powerful and may require user approval.',
        { script: z.string().min(1) },
        async (args) => toToolResult(await sendBrowserToolRequest('evaluate', args)),
      )),
      ...maybe('wait_for', tool(
        'wait_for',
        'Wait until visible page text appears in the embedded browser.',
        { text: z.string().min(1), timeoutMs: z.number().int().positive().optional() },
        async (args) => toToolResult(await sendBrowserToolRequest('wait_for', args)),
      )),
    ],
  });
}
