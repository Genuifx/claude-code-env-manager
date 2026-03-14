#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TOOL_NAME = 'approval_prompt';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) {
      continue;
    }
    args.set(key.slice(2), argv[index + 1] ?? '');
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const bridgeDir = args.get('bridge-dir');
const timeoutSecs = Number(args.get('timeout-secs') || '1800');

if (!bridgeDir) {
  console.error('Missing --bridge-dir');
  process.exit(1);
}

const requestsDir = path.join(bridgeDir, 'requests');
const responsesDir = path.join(bridgeDir, 'responses');
const debugEnabled = process.env.CCEM_PERMISSION_MCP_DEBUG === '1';
const debugLogPath = path.join(bridgeDir, 'mcp-debug.log');
fs.mkdirSync(requestsDir, { recursive: true });
fs.mkdirSync(responsesDir, { recursive: true });

let buffer = Buffer.alloc(0);

function debugLog(message, extra = null) {
  if (!debugEnabled) {
    return;
  }

  const parts = [`[${new Date().toISOString()}] ${message}`];
  if (extra !== null) {
    parts.push(
      typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2),
    );
  }

  fs.appendFileSync(debugLogPath, `${parts.join('\n')}\n`);
}

function send(message) {
  const body = JSON.stringify(message);
  debugLog('send', message);
  process.stdout.write(`${body}\n`);
}

function sendError(id, code, message) {
  send({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  });
}

function toolDefinition() {
  return {
    name: TOOL_NAME,
    description: 'CCEM permission approval bridge for Claude Code headless runtimes.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_name: { type: 'string' },
        input: {},
        tool_use_id: { type: 'string' },
      },
      required: ['tool_name'],
    },
  };
}

async function waitForResponse(responsePath) {
  const deadline = Date.now() + timeoutSecs * 1000;

  while (Date.now() < deadline) {
    try {
      const content = await fs.promises.readFile(responsePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return {
    behavior: 'deny',
    message: 'Timed out waiting for CCEM permission response.',
  };
}

async function handleToolCall(id, params) {
  const name = params?.name;
  if (name !== TOOL_NAME) {
    sendError(id, -32602, `Unknown tool: ${name}`);
    return;
  }

  const args = params?.arguments ?? {};
  const requestId = typeof args.tool_use_id === 'string' && args.tool_use_id.length > 0
    ? args.tool_use_id
    : randomUUID();
  const requestPath = path.join(requestsDir, `${requestId}.json`);
  const responsePath = path.join(responsesDir, `${requestId}.json`);

  const requestPayload = {
    request_id: requestId,
    tool_name: typeof args.tool_name === 'string' ? args.tool_name : 'unknown',
    input: args.input ?? null,
    tool_use_id: typeof args.tool_use_id === 'string' ? args.tool_use_id : null,
    created_at: new Date().toISOString(),
  };

  await fs.promises.writeFile(requestPath, JSON.stringify(requestPayload, null, 2));

  const response = await waitForResponse(responsePath);
  const resultPayload = response?.behavior === 'allow'
    ? {
        behavior: 'allow',
        updatedInput:
          response?.updatedInput && typeof response.updatedInput === 'object'
            ? response.updatedInput
            : (args.input && typeof args.input === 'object' ? args.input : {}),
      }
    : {
        behavior: 'deny',
        message:
          typeof response?.message === 'string' && response.message.trim().length > 0
            ? response.message
            : 'Permission denied by CCEM.',
      };

  send({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(resultPayload),
        },
      ],
    },
  });

  await fs.promises.rm(requestPath, { force: true });
  await fs.promises.rm(responsePath, { force: true });
}

async function handleMessage(message) {
  debugLog('handleMessage', message);
  if (message.method === 'initialize') {
    const protocolVersion =
      typeof message?.params?.protocolVersion === 'string' &&
      message.params.protocolVersion.length > 0
        ? message.params.protocolVersion
        : '2025-11-25';
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion,
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'ccem-permission-mcp',
          version: '0.1.0',
        },
      },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    return;
  }

  if (message.method === 'tools/list') {
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: [toolDefinition()],
      },
    });
    return;
  }

  if (message.method === 'tools/call') {
    await handleToolCall(message.id, message.params);
    return;
  }

  if (typeof message.id !== 'undefined') {
    sendError(message.id, -32601, `Method not found: ${message.method}`);
  }
}

function processBuffer() {
  while (true) {
    const preview = buffer.slice(0, Math.min(buffer.length, 32)).toString('utf8');
    if (!preview.toLowerCase().startsWith('content-length:')) {
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const payload = buffer.slice(0, newlineIndex).toString('utf8').trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!payload) {
        continue;
      }

      debugLog('payload', payload);

      try {
        const message = JSON.parse(payload);
        void handleMessage(message);
      } catch (error) {
        console.error('Failed to process MCP message:', error);
      }

      continue;
    }

    const crlfHeaderEnd = buffer.indexOf('\r\n\r\n');
    const lfHeaderEnd = buffer.indexOf('\n\n');
    const headerEnd = (() => {
      if (crlfHeaderEnd === -1) {
        return lfHeaderEnd;
      }
      if (lfHeaderEnd === -1) {
        return crlfHeaderEnd;
      }
      return Math.min(crlfHeaderEnd, lfHeaderEnd);
    })();
    if (headerEnd === -1) {
      return;
    }

    const headerText = buffer.slice(0, headerEnd).toString('utf8');
    debugLog('headerText', headerText);
    const delimiterLength =
      headerEnd === crlfHeaderEnd ? 4 : 2;
    const contentLengthHeader = headerText
      .split(/\r?\n/)
      .find((line) => line.toLowerCase().startsWith('content-length:'));
    if (!contentLengthHeader) {
      buffer = buffer.slice(headerEnd + delimiterLength);
      continue;
    }

    const contentLength = Number(contentLengthHeader.split(':')[1]?.trim() || '0');
    const messageStart = headerEnd + delimiterLength;
    const messageEnd = messageStart + contentLength;
    if (buffer.length < messageEnd) {
      return;
    }

    const payload = buffer.slice(messageStart, messageEnd).toString('utf8');
    buffer = buffer.slice(messageEnd);
    debugLog('payload', payload);

    try {
      const message = JSON.parse(payload);
      void handleMessage(message);
    } catch (error) {
      console.error('Failed to process MCP message:', error);
    }
  }
}

process.stdin.on('data', (chunk) => {
  debugLog('stdin chunk', {
    length: chunk.length,
    preview: chunk.toString('utf8'),
  });
  buffer = Buffer.concat([buffer, chunk]);
  processBuffer();
});

process.stdin.on('end', () => {
  process.exit(0);
});
