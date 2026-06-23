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

const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function getDesktopControlDescriptorPath(): string {
  return process.env.CCEM_CONTROL_FILE?.trim()
    || path.join(getCcemConfigDir(), 'control.json');
}

/**
 * Returns true when `host` is a loopback host. Accepts bare host,
 * IPv6 bracketed form `[::1]`, and the common loopback names.
 */
export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (LOOPBACK_HOSTS.has(normalized)) {
    return true;
  }
  // 127.0.0.0/8 loopback range
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) {
    return true;
  }
  // [::1] / ::1 variants
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }
  return false;
}

/**
 * Extract the host portion from an endpoint URL without relying on the
 * URL parser (which may throw). Falls back to string splitting so we
 * can still reject obviously bad endpoints.
 */
export function extractHost(endpoint: string): string | null {
  // Strip scheme
  const withoutScheme = endpoint.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  // Take up to the first / ? or #
  const hostPort = withoutScheme.split(/[\/?#]/)[0] || '';
  // IPv6 bracketed form: [::1]:port
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end === -1) return null;
    return hostPort.slice(1, end);
  }
  // host:port — split on the last colon that isn't part of an IPv6 literal
  const colonIndex = hostPort.lastIndexOf(':');
  if (colonIndex === -1) return hostPort;
  return hostPort.slice(0, colonIndex);
}

function validateLoopbackEndpoint(endpoint: string): void {
  const host = extractHost(endpoint);
  if (!host) {
    throw new Error(
      `CCEM Desktop control endpoint '${redactEndpoint(endpoint)}' is missing a host. Refusing to continue.`,
    );
  }
  if (!isLoopbackHost(host)) {
    throw new Error(
      `CCEM Desktop control endpoint '${redactEndpoint(endpoint)}' is not bound to loopback. ` +
      `Only 127.0.0.1, localhost, or ::1 are allowed.`,
    );
  }
}

/**
 * Best-effort check that a pid is still alive using signal 0.
 * Returns true if the pid is alive, false otherwise. Errors that are
 * not ESRCH (no such process) are treated as "alive" to avoid false
 * negatives from permission issues.
 */
export function isPidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false; // No such process
    // EPERM means process exists but we can't signal it — treat as alive
    if (code === 'EPERM') return true;
    return false;
  }
}

function redactEndpoint(endpoint: string): string {
  // Never leak any token that might be embedded; just show scheme+host+path
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return '<invalid endpoint>';
  }
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

  // Reject non-loopback endpoints before touching the network
  validateLoopbackEndpoint(endpoint);

  // Verify desktop process is still alive (prevents stale descriptors)
  const pid = typeof parsed.pid === 'number' ? parsed.pid : null;
  if (pid !== null && !isPidAlive(pid)) {
    throw new Error(
      `CCEM Desktop process (pid ${pid}) is not running. The control descriptor at ${descriptorPath} is stale. ` +
      `Start CCEM Desktop again, or remove ${descriptorPath} if it was left behind.`,
    );
  }

  return { endpoint, token, pid };
}

export interface RequestDesktopControlOptions {
  /** AbortSignal provided by the caller (takes precedence over timeoutMs). */
  signal?: AbortSignal;
  /** Per-request timeout in milliseconds. Defaults to 5000ms. */
  timeoutMs?: number;
}

export async function requestDesktopControl<T = unknown>(
  method: string,
  params?: unknown,
  descriptor = resolveDesktopControlDescriptor(),
  options: RequestDesktopControlOptions = {},
): Promise<T> {
  const id = `ccem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // If the caller provided their own signal, propagate its abort.
  const externalSignal = options.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

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
    if (controller.signal.aborted) {
      throw new Error(
        `CCEM Desktop control request to '${method}' timed out after ${timeoutMs}ms. ` +
        `Ensure CCEM Desktop is responsive at ${redactEndpoint(descriptor.endpoint)}.`,
      );
    }
    throw new Error(
      `CCEM Desktop control request to '${method}' failed: ${(error as Error).message}`,
    );
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }

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

/**
 * Parse and validate the `--since` option for `desktop events`.
 * Accepts a non-negative integer sequence number.
 * Returns null when the value is empty/undefined.
 */
export function parseSinceOption(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(
      `Invalid --since value '${raw}'. Expected a non-negative integer sequence number (e.g. 0, 42).`,
    );
  }
  return value;
}

/**
 * Parse and validate the `--limit` option for `desktop events`.
 * Accepts a positive integer. Returns null when the value is empty/undefined.
 */
export function parseLimitOption(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(
      `Invalid --limit value '${raw}'. Expected a positive integer (e.g. 1, 100).`,
    );
  }
  return value;
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
