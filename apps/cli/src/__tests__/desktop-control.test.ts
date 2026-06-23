import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  extractHost,
  isLoopbackHost,
  isPidAlive,
  parseLimitOption,
  parseSinceOption,
  requestDesktopControl,
  resolveDesktopControlDescriptor,
} from '../desktopControl.js';

describe('desktop control client', () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-desktop-control-test-'));
    process.env = { ...originalEnv };
    process.env.CCEM_CONTROL_FILE = path.join(tempDir, 'control.json');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeDescriptor(data: { endpoint: string; token: string; pid?: number | null }): void {
    fs.writeFileSync(
      process.env.CCEM_CONTROL_FILE!,
      JSON.stringify(data),
    );
  }

  // ----------------------------------------------------------------------
  // resolveDesktopControlDescriptor boundary checks
  // ----------------------------------------------------------------------

  it('resolves the descriptor from CCEM_CONTROL_FILE', () => {
    writeDescriptor({ endpoint: 'http://127.0.0.1:34567/rpc', token: 'secret', pid: process.pid });

    expect(resolveDesktopControlDescriptor()).toEqual({
      endpoint: 'http://127.0.0.1:34567/rpc',
      token: 'secret',
      pid: process.pid,
    });
  });

  it('rejects a non-loopback endpoint (example.com)', () => {
    writeDescriptor({ endpoint: 'http://example.com:1234/rpc', token: 'secret', pid: 123 });

    expect(() => resolveDesktopControlDescriptor()).toThrow(/not bound to loopback/);
  });

  it('rejects a 192.168 endpoint as non-loopback', () => {
    writeDescriptor({ endpoint: 'http://192.168.1.5:1234/rpc', token: 'secret', pid: 123 });

    expect(() => resolveDesktopControlDescriptor()).toThrow(/not bound to loopback/);
  });

  it('rejects a stale descriptor when pid is dead', () => {
    // Use a pid that definitely doesn't exist.
    // On Unix, pid 1 is init (always exists). Pick a very high pid number
    // that is extremely unlikely to be assigned.
    const deadPid = 2_000_000;
    writeDescriptor({ endpoint: 'http://127.0.0.1:34567/rpc', token: 'secret', pid: deadPid });

    expect(() => resolveDesktopControlDescriptor()).toThrow(/not running|stale/);
  });

  it('accepts localhost endpoints', () => {
    writeDescriptor({ endpoint: 'http://localhost:34567/rpc', token: 'secret', pid: process.pid });

    const descriptor = resolveDesktopControlDescriptor();
    expect(descriptor.endpoint).toBe('http://localhost:34567/rpc');
  });

  it('accepts ::1 endpoints', () => {
    writeDescriptor({ endpoint: 'http://[::1]:34567/rpc', token: 'secret', pid: process.pid });

    const descriptor = resolveDesktopControlDescriptor();
    expect(descriptor.endpoint).toBe('http://[::1]:34567/rpc');
  });

  // ----------------------------------------------------------------------
  // requestDesktopControl
  // ----------------------------------------------------------------------

  it('sends JSON-RPC requests with the descriptor bearer token', async () => {
    writeDescriptor({ endpoint: 'http://127.0.0.1:34567/rpc', token: 'secret', pid: process.pid });
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

  it('times out when the server is slow and produces a readable error', async () => {
    writeDescriptor({ endpoint: 'http://127.0.0.1:34567/rpc', token: 'secret', pid: process.pid });
    // Mock fetch that respects the AbortSignal by rejecting with AbortError.
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const error = new DOMException('The operation was aborted', 'AbortError');
            reject(error);
          });
        }
        // Never resolves otherwise — simulates a hung server.
      });
    }));

    await expect(
      requestDesktopControl('ccem.health', undefined, undefined, { timeoutMs: 50 }),
    ).rejects.toThrow(/timed out after 50ms/);
  });

  it('respects an externally provided AbortSignal', async () => {
    writeDescriptor({ endpoint: 'http://127.0.0.1:34567/rpc', token: 'secret', pid: process.pid });
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const error = new DOMException('The operation was aborted', 'AbortError');
            reject(error);
          });
        }
      });
    }));

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);

    await expect(
      requestDesktopControl('ccem.health', undefined, undefined, {
        signal: controller.signal,
        timeoutMs: 30000,
      }),
    ).rejects.toThrow(/timed out/);
  });

  // ----------------------------------------------------------------------
  // parseSinceOption / parseLimitOption
  // ----------------------------------------------------------------------

  describe('parseSinceOption', () => {
    it('accepts non-negative integers', () => {
      expect(parseSinceOption(undefined)).toBeNull();
      expect(parseSinceOption('0')).toBe(0);
      expect(parseSinceOption('42')).toBe(42);
    });

    it('rejects negative values', () => {
      expect(() => parseSinceOption('-1')).toThrow(/Invalid --since/);
    });

    it('rejects non-integer values', () => {
      expect(() => parseSinceOption('1.5')).toThrow(/Invalid --since/);
      expect(() => parseSinceOption('abc')).toThrow(/Invalid --since/);
      expect(() => parseSinceOption('NaN')).toThrow(/Invalid --since/);
    });
  });

  describe('parseLimitOption', () => {
    it('accepts positive integers', () => {
      expect(parseLimitOption(undefined)).toBeNull();
      expect(parseLimitOption('1')).toBe(1);
      expect(parseLimitOption('100')).toBe(100);
    });

    it('rejects zero', () => {
      expect(() => parseLimitOption('0')).toThrow(/Invalid --limit/);
    });

    it('rejects negative values', () => {
      expect(() => parseLimitOption('-5')).toThrow(/Invalid --limit/);
    });

    it('rejects non-integer values', () => {
      expect(() => parseLimitOption('abc')).toThrow(/Invalid --limit/);
      expect(() => parseLimitOption('1.5')).toThrow(/Invalid --limit/);
    });
  });

  // ----------------------------------------------------------------------
  // isLoopbackHost / extractHost / isPidAlive unit tests
  // ----------------------------------------------------------------------

  describe('isLoopbackHost', () => {
    it('accepts loopback hosts', () => {
      expect(isLoopbackHost('127.0.0.1')).toBe(true);
      expect(isLoopbackHost('localhost')).toBe(true);
      expect(isLoopbackHost('::1')).toBe(true);
      expect(isLoopbackHost('[::1]')).toBe(true);
      expect(isLoopbackHost('127.255.255.255')).toBe(true);
    });

    it('rejects non-loopback hosts', () => {
      expect(isLoopbackHost('example.com')).toBe(false);
      expect(isLoopbackHost('192.168.1.1')).toBe(false);
      expect(isLoopbackHost('10.0.0.1')).toBe(false);
      expect(isLoopbackHost('0.0.0.0')).toBe(false);
    });
  });

  describe('extractHost', () => {
    it('extracts host from IPv4 endpoint', () => {
      expect(extractHost('http://127.0.0.1:34567/rpc')).toBe('127.0.0.1');
    });

    it('extracts host from localhost endpoint', () => {
      expect(extractHost('http://localhost:34567/rpc')).toBe('localhost');
    });

    it('extracts host from IPv6 endpoint', () => {
      expect(extractHost('http://[::1]:34567/rpc')).toBe('::1');
    });

    it('extracts host without scheme', () => {
      expect(extractHost('example.com:1234')).toBe('example.com');
    });
  });

  describe('isPidAlive', () => {
    it('returns true for the current process', () => {
      expect(isPidAlive(process.pid)).toBe(true);
    });

    it('returns false for a clearly dead pid', () => {
      expect(isPidAlive(2_000_000)).toBe(false);
    });

    it('returns false for invalid pids', () => {
      expect(isPidAlive(-1)).toBe(false);
      expect(isPidAlive(NaN)).toBe(false);
      expect(isPidAlive(0)).toBe(false);
    });
  });
});
