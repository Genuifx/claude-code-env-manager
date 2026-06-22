import fs from 'fs';
import path from 'path';
import { getCcemConfigDir } from '@ccem/core';

export interface DesktopControlDescriptor {
  endpoint: string;
  token: string;
  pid?: number | null;
}

export interface DesktopCreateSessionInput {
  provider: 'claude' | 'codex';
  cwd: string;
  prompt: string;
  envName?: string | null;
  permissionMode?: string | null;
  runtimePermissionMode?: string | null;
  providerSessionId?: string | null;
  effort?: string | null;
  open?: boolean;
}

export function getDesktopControlDescriptorPath(): string {
  return process.env.CCEM_CONTROL_FILE?.trim()
    || path.join(getCcemConfigDir(), 'control.json');
}

export function resolveDesktopControlDescriptor(
  descriptorPath = getDesktopControlDescriptorPath(),
): DesktopControlDescriptor {
  if (!fs.existsSync(descriptorPath)) {
    throw new Error(`CCEM Desktop control endpoint not found at ${descriptorPath}. Start CCEM Desktop first.`);
  }

  const parsed = JSON.parse(fs.readFileSync(descriptorPath, 'utf-8')) as Partial<DesktopControlDescriptor>;
  const endpoint = parsed.endpoint?.trim();
  const token = parsed.token?.trim();
  if (!endpoint || !token) {
    throw new Error(`Invalid CCEM Desktop control descriptor at ${descriptorPath}`);
  }

  return {
    endpoint,
    token,
    pid: typeof parsed.pid === 'number' ? parsed.pid : null,
  };
}

export async function requestDesktopControl<T = unknown>(
  method: string,
  params?: unknown,
  descriptor = resolveDesktopControlDescriptor(),
): Promise<T> {
  const id = `ccem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await fetch(descriptor.endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${descriptor.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params: params ?? {},
    }),
  });

  if (!response.ok) {
    throw new Error(`CCEM Desktop control request failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as {
    result?: T;
    error?: { code?: number; message?: string };
  };
  if (payload.error) {
    throw new Error(payload.error.message || `CCEM Desktop control error ${payload.error.code ?? ''}`.trim());
  }
  return payload.result as T;
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
