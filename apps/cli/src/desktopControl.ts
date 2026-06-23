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

export interface DesktopControlRequestOptions {
  /** Per-request fetch timeout in milliseconds. Defaults to 5000ms. */
  fetchTimeoutMs?: number;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;

const ENDPOINT_UNREACHABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTCONN',
  'EHOSTUNREACH',
  'ECONNABORTED',
]);

type StaleDescriptorReason = 'dead-pid' | 'endpoint-unreachable' | 'request-timeout';

export interface StaleDesktopControlDescriptorDetails {
  reason: StaleDescriptorReason;
  descriptorPath: string;
  pid: number | null;
  cleanedUp: boolean;
  timeoutMs?: number;
  cause?: unknown;
}

/**
 * Raised when the desktop control descriptor points at a dead process or an
 * unreachable endpoint. The message intentionally omits the bearer token and
 * the descriptor body; only the descriptor path, pid, and a remediation hint
 * are exposed.
 */
export class StaleDesktopControlDescriptorError extends Error {
  override readonly name = 'StaleDesktopControlDescriptorError';
  readonly reason: StaleDescriptorReason;
  readonly descriptorPath: string;
  readonly pid: number | null;
  readonly cleanedUp: boolean;
  readonly cause?: unknown;

  constructor(details: StaleDesktopControlDescriptorDetails) {
    const subject = details.pid !== null
      ? `process ${details.pid}`
      : 'the publishing process';
    const symptom = details.reason === 'dead-pid'
      ? `${subject} is no longer running`
      : details.reason === 'endpoint-unreachable'
        ? 'the control endpoint refused the connection'
        : `the control request timed out after ${details.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS}ms`;
    const remedy = details.cleanedUp
      ? 'The stale descriptor was removed automatically; start CCEM Desktop and rerun the command.'
      : details.pid !== null
        ? 'Restart CCEM Desktop so it republishes a fresh control endpoint.'
        : 'Restart CCEM Desktop to refresh the descriptor, or remove the stale file manually if it is no longer managed.';
    super(
      `CCEM Desktop control descriptor at ${details.descriptorPath} is stale: ${symptom}. ${remedy}`,
    );
    this.reason = details.reason;
    this.descriptorPath = details.descriptorPath;
    this.pid = details.pid;
    this.cleanedUp = details.cleanedUp;
    if (details.cause !== undefined) {
      this.cause = details.cause;
    }
  }
}

export function getDesktopControlDescriptorPath(): string {
  return process.env.CCEM_CONTROL_FILE?.trim()
    || getDefaultControlDescriptorPath();
}

function getDefaultControlDescriptorPath(): string {
  return path.join(getCcemConfigDir(), 'control.json');
}

/**
 * Returns true when the descriptor path is the global default that CCEM Desktop
 * owns. Only the default path is safe to auto-clean; paths overridden via
 * `CCEM_CONTROL_FILE` are caller-managed and must not be touched.
 */
function isDefaultDescriptorPath(descriptorPath: string): boolean {
  try {
    return path.resolve(descriptorPath) === path.resolve(getDefaultControlDescriptorPath());
  } catch {
    return false;
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: pid exists but we cannot signal it (e.g., different user). Treat
    // the desktop as alive and let the network call surface real errors.
    // ESRCH (or anything else) means the pid is gone.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function safeRemoveStaleDescriptor(descriptorPath: string): boolean {
  if (!isDefaultDescriptorPath(descriptorPath)) {
    return false;
  }
  try {
    fs.rmSync(descriptorPath);
    return true;
  } catch {
    return false;
  }
}

function readErrnoCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code ?? candidate.cause?.code;
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
  options: DesktopControlRequestOptions = {},
): Promise<T> {
  const descriptorPath = getDesktopControlDescriptorPath();
  const descriptor = resolveDesktopControlDescriptor(descriptorPath);
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const pid = typeof descriptor.pid === 'number' && descriptor.pid > 0
    ? descriptor.pid
    : null;

  if (pid !== null && !isPidAlive(pid)) {
    const cleanedUp = safeRemoveStaleDescriptor(descriptorPath);
    throw new StaleDesktopControlDescriptorError({
      reason: 'dead-pid',
      descriptorPath,
      pid,
      cleanedUp,
    });
  }

  const id = `ccem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), fetchTimeoutMs);

  let response: Response;
  try {
    response = await fetch(descriptor.endpoint, {
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
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutHandle);

    if (controller.signal.aborted) {
      throw new StaleDesktopControlDescriptorError({
        reason: 'request-timeout',
        descriptorPath,
        pid,
        cleanedUp: false,
        timeoutMs: fetchTimeoutMs,
        cause: error,
      });
    }

    const code = readErrnoCode(error);
    if (code && ENDPOINT_UNREACHABLE_CODES.has(code)) {
      throw new StaleDesktopControlDescriptorError({
        reason: 'endpoint-unreachable',
        descriptorPath,
        pid,
        cleanedUp: false,
        cause: error,
      });
    }

    throw error;
  }

  clearTimeout(timeoutHandle);

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
