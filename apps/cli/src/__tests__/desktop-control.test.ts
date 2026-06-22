import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { requestDesktopControl, resolveDesktopControlDescriptor } from '../desktopControl.js';

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
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves the descriptor from CCEM_CONTROL_FILE', () => {
    fs.writeFileSync(
      process.env.CCEM_CONTROL_FILE!,
      JSON.stringify({
        endpoint: 'http://127.0.0.1:34567/rpc',
        token: 'secret',
        pid: 123,
      })
    );

    expect(resolveDesktopControlDescriptor()).toEqual({
      endpoint: 'http://127.0.0.1:34567/rpc',
      token: 'secret',
      pid: 123,
    });
  });

  it('sends JSON-RPC requests with the descriptor bearer token', async () => {
    fs.writeFileSync(
      process.env.CCEM_CONTROL_FILE!,
      JSON.stringify({
        endpoint: 'http://127.0.0.1:34567/rpc',
        token: 'secret',
        pid: 123,
      })
    );
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
});
