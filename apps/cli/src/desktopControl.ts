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

export interface RequestDesktopControlOptions {
  /** AbortSignal provided by the caller. */
  signal?: AbortSignal;
  /** Per-request timeout in milliseconds. Defaults to 5000ms. */
  timeoutMs?: number;
  /** Backward-compatible alias for timeoutMs. */
  fetchTimeoutMs?: number;
}

export type DesktopControlRequestOptions = RequestDesktopControlOptions;

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
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

function readPid(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
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

function isDescriptor(value: unknown): value is DesktopControlDescriptor {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as DesktopControlDescriptor).endpoint === 'string'
    && typeof (value as DesktopControlDescriptor).token === 'string',
  );
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

  // Verify desktop process is still alive (prevents stale descriptors).
  const pid = readPid(parsed.pid);
  if (pid !== null && !isPidAlive(pid)) {
    const cleanedUp = safeRemoveStaleDescriptor(descriptorPath);
    throw new StaleDesktopControlDescriptorError({
      reason: 'dead-pid',
      descriptorPath,
      pid,
      cleanedUp,
    });
  }

  return { endpoint, token, pid };
}

export async function requestDesktopControl<T = unknown>(
  method: string,
  params?: unknown,
  descriptorOrOptions?: DesktopControlDescriptor | RequestDesktopControlOptions,
  maybeOptions: RequestDesktopControlOptions = {},
): Promise<T> {
  const descriptorPath = getDesktopControlDescriptorPath();
  const hasInjectedDescriptor = isDescriptor(descriptorOrOptions);
  const descriptor = hasInjectedDescriptor
    ? descriptorOrOptions
    : resolveDesktopControlDescriptor(descriptorPath);
  const options = hasInjectedDescriptor
    ? maybeOptions
    : ((descriptorOrOptions as RequestDesktopControlOptions | undefined) ?? maybeOptions ?? {});
  const timeoutMs = options.timeoutMs ?? options.fetchTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const pid = readPid(descriptor.pid);

  validateLoopbackEndpoint(descriptor.endpoint);

  if (pid !== null && !isPidAlive(pid)) {
    const cleanedUp = hasInjectedDescriptor ? false : safeRemoveStaleDescriptor(descriptorPath);
    throw new StaleDesktopControlDescriptorError({
      reason: 'dead-pid',
      descriptorPath,
      pid,
      cleanedUp,
    });
  }

  const id = `ccem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
      throw new StaleDesktopControlDescriptorError({
        reason: 'request-timeout',
        descriptorPath,
        pid,
        cleanedUp: false,
        timeoutMs,
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
