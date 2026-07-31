import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { bootstrap, gracefulShutdown } from '../../src/main/server.js';

describe('server lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('OPS-002/003: does not listen when Mongo connection fails during bootstrap', async () => {
    const listenError = new Error('connect ECONNREFUSED');
    vi.spyOn(mongoose, 'connect').mockRejectedValue(listenError);

    await expect(bootstrap()).rejects.toThrow(/ECONNREFUSED/);
    expect(mongoose.connect).toHaveBeenCalled();
  });

  it('OPS-004: shutdown closes the HTTP server and Mongo connection', async () => {
    const closeHttp = vi.fn((cb?: (err?: Error) => void) => {
      cb?.();
    });
    const disconnect = vi
      .spyOn(mongoose, 'disconnect')
      .mockResolvedValue(undefined);

    await gracefulShutdown({
      close: closeHttp,
    } as unknown as import('node:http').Server);

    expect(closeHttp).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });
});
