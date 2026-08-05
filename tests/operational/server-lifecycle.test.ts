import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { loadEnv } from '../../src/infrastructure/config/env.js';
import {
  bootstrap,
  createSubtreeLock,
  gracefulShutdown,
} from '../../src/main/server.js';

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

  it('OPS-004: shutdown closes the HTTP server, optional lock and Mongo connection', async () => {
    const closeHttp = vi.fn((cb?: (err?: Error) => void) => {
      cb?.();
    });
    const disconnect = vi
      .spyOn(mongoose, 'disconnect')
      .mockResolvedValue(undefined);
    const lockClose = vi.fn().mockResolvedValue(undefined);

    await gracefulShutdown(
      {
        close: closeHttp,
      } as unknown as import('node:http').Server,
      {
        withLock: async <T>(_id: number, fn: () => Promise<T>) => fn(),
        close: lockClose,
      },
    );

    expect(closeHttp).toHaveBeenCalled();
    expect(lockClose).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });

  it('OPS-004: shutdown without lock still closes HTTP and Mongo', async () => {
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

  it('createSubtreeLock returns Noop when lock is disabled', async () => {
    const lock = createSubtreeLock(
      loadEnv({
        PORT: '3000',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/menu',
        ENABLE_DISTRIBUTED_LOCK: 'false',
      }),
    );
    expect(await lock.withLock(1, async () => 7)).toBe(7);
  });
});
