import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Control where the *default* control descriptor lives. The mock lets the
// "auto-clean default descriptor" tests point getCcmConfigDir() at a per-test
// temp dir without disturbing other tests that use CCEM_CONTROL_FILE directly.
let mockedCcemConfigDir: string | null = null;
vi.mock('@ccem/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ccem/core')>();
  return {
    ...actual,
    getCcemConfigDir: () => mockedCcemConfigDir ?? actual.getCcemConfigDir(),
  };
});

// Import after the mock is registered so the module sees the wrapped helper.
const { requestDesktopControl, resolveDesktopControlDescriptor, StaleDesktopControlDescriptorError } =
  await import('../desktopControl.js');

const STALE_PID = 999_999_999;

function killStub(deadPids: number[]) {
  return vi.spyOn(process, 'kill').mockImplementation(((
    pid: number,
    signal?: number | string,
  ) => {
    if (signal === 0 && deadPids.includes(pid)) {
      const error = new Error(`kill ESRCH ${pid}`);
      (error as NodeJS.ErrnoException).code = 'ESRCH';
      throw error;
    }
    return true;
  }) as typeof process.kill);
}

function writeDescriptor(
  filePath: string,
  overrides: Partial<{ endpoint: string; token: string; pid: number | null }> = {},
) {
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      endpoint: 'http://127.0.0.1:34567/rpc',
      token: 'secret',
      pid: 123,
      ...overrides,
    }),
  );
}

describe('desktop control client', () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-desktop-control-test-'));
    process.env = { ...originalEnv };
    process.env.CCEM_CONTROL_FILE = path.join(tempDir, 'control.json');
    mockedCcemConfigDir = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = originalEnv;
    mockedCcemConfigDir = null;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves the descriptor from CCEM_CONTROL_FILE', () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: 123 });

    expect(resolveDesktopControlDescriptor()).toEqual({
      endpoint: 'http://127.0.0.1:34567/rpc',
      token: 'secret',
      pid: 123,
    });
  });

  it('sends JSON-RPC requests with the descriptor bearer token', async () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: process.pid });

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 'ccem-test',
      result: { ok: true },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestDesktopControl('ccem.health', { verbose: true })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:34567/rpc', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        authorization: 'Bearer secret',
        'content-type': 'application/json',
      }),
    }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.method).toBe('ccem.health');
    expect(body.params).toEqual({ verbose: true });
  });

  it('detects a stale descriptor by pid and refuses to call fetch', async () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: STALE_PID });

    const killSpy = killStub([STALE_PID]);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestDesktopControl('ccem.health')).rejects.toMatchObject({
      name: 'StaleDesktopControlDescriptorError',
      reason: 'dead-pid',
      pid: STALE_PID,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    // Custom-path descriptors must not be auto-cleaned.
    expect(fs.existsSync(process.env.CCEM_CONTROL_FILE!)).toBe(true);
    // Error class identity is preserved so callers can branch on it.
    await expect(requestDesktopControl('ccem.health')).rejects.toBeInstanceOf(StaleDesktopControlDescriptorError);
    killSpy.mockRestore();
  });

  it('auto-removes stale descriptors at the default ccem path', async () => {
    // Redirect the default ccem dir to the per-test temp dir and stop using
    // CCEM_CONTROL_FILE so the descriptor resolves via getCcemConfigDir().
    mockedCcemConfigDir = tempDir;
    delete process.env.CCEM_CONTROL_FILE;
    const defaultPath = path.join(tempDir, 'control.json');
    writeDescriptor(defaultPath, { pid: STALE_PID });

    const killSpy = killStub([STALE_PID]);
    vi.stubGlobal('fetch', vi.fn());

    const caught = await requestDesktopControl('ccem.health').catch((error) => error);
    expect(caught).toBeInstanceOf(StaleDesktopControlDescriptorError);
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).cleanedUp).toBe(true);
    expect(fs.existsSync(defaultPath)).toBe(false);
    // The stale-descriptor message must not leak the bearer token.
    expect(String((caught as Error).message)).not.toContain('secret');
    killSpy.mockRestore();
  });

  it('treats descriptors without a pid as live and surfaces fetch errors instead', async () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: null });

    const killSpy = vi.spyOn(process, 'kill');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 'ccem-test',
      result: { ok: true },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestDesktopControl('ccem.health')).resolves.toEqual({ ok: true });
    expect(killSpy).not.toHaveBeenCalled();
    killSpy.mockRestore();
  });

  it('reports ECONNREFUSED as a stale endpoint descriptor', async () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: process.pid });

    const fetchMock = vi.fn(async () => {
      const error = new TypeError('fetch failed');
      (error as NodeJS.ErrnoException).cause = { code: 'ECONNREFUSED' };
      throw error;
    });
    vi.stubGlobal('fetch', fetchMock);

    const caught = await requestDesktopControl('ccem.health').catch((error) => error);
    expect(caught).toBeInstanceOf(StaleDesktopControlDescriptorError);
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).reason).toBe('endpoint-unreachable');
    expect(String((caught as Error).message)).not.toContain('secret');
    // Custom-path descriptors must not be auto-cleaned.
    expect(fs.existsSync(process.env.CCEM_CONTROL_FILE!)).toBe(true);
  });

  it('keeps the default descriptor when the owning pid is alive but endpoint is unreachable', async () => {
    mockedCcemConfigDir = tempDir;
    delete process.env.CCEM_CONTROL_FILE;
    const defaultPath = path.join(tempDir, 'control.json');
    writeDescriptor(defaultPath, { pid: process.pid });

    const fetchMock = vi.fn(async () => {
      const error = new TypeError('fetch failed');
      (error as NodeJS.ErrnoException).cause = { code: 'ECONNREFUSED' };
      throw error;
    });
    vi.stubGlobal('fetch', fetchMock);

    const caught = await requestDesktopControl('ccem.health').catch((error) => error);
    expect(caught).toBeInstanceOf(StaleDesktopControlDescriptorError);
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).reason).toBe('endpoint-unreachable');
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).cleanedUp).toBe(false);
    expect(fs.existsSync(defaultPath)).toBe(true);
  });

  it('aborts the request after the configured timeout and marks the descriptor stale', async () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: process.pid });

    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          (error as Error).name = 'AbortError';
          reject(error);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const caught = await requestDesktopControl(
      'ccem.health',
      undefined,
      { fetchTimeoutMs: 20 },
    ).catch((error) => error);
    expect(caught).toBeInstanceOf(StaleDesktopControlDescriptorError);
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).reason).toBe('request-timeout');
    expect((caught as Error).message).toContain('20ms');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      signal: expect.any(AbortSignal),
    });
    expect(String((caught as Error).message)).not.toContain('secret');
  });

  it('keeps the default descriptor on request timeout when the owning pid is alive', async () => {
    mockedCcemConfigDir = tempDir;
    delete process.env.CCEM_CONTROL_FILE;
    const defaultPath = path.join(tempDir, 'control.json');
    writeDescriptor(defaultPath, { pid: process.pid });

    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          (error as Error).name = 'AbortError';
          reject(error);
        });
      });
    }));

    const caught = await requestDesktopControl(
      'ccem.health',
      undefined,
      { fetchTimeoutMs: 20 },
    ).catch((error) => error);
    expect(caught).toBeInstanceOf(StaleDesktopControlDescriptorError);
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).reason).toBe('request-timeout');
    expect((caught as InstanceType<typeof StaleDesktopControlDescriptorError>).cleanedUp).toBe(false);
    expect(fs.existsSync(defaultPath)).toBe(true);
  });

  it('does not treat arbitrary network errors as stale descriptors', async () => {
    writeDescriptor(process.env.CCEM_CONTROL_FILE!, { pid: process.pid });

    const original = new TypeError('something else went wrong');
    vi.stubGlobal('fetch', vi.fn(async () => { throw original; }));

    await expect(requestDesktopControl('ccem.health')).rejects.toBe(original);
    expect(fs.existsSync(process.env.CCEM_CONTROL_FILE!)).toBe(true);
  });
});
