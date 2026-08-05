/**
 * @packageDocumentation
 *
 * Redlock-backed `SubtreeLock` using a single Redis instance (experiment
 * scope). Serializes create-child and delete operations on the same node id.
 */
import { Redis } from 'ioredis';
import Redlock from 'redlock';
import {
  menuNodeLockKey,
  type SubtreeLock,
} from '../../application/ports/subtree-lock.js';

/** Options for {@link RedlockSubtreeLock}. */
export type RedlockSubtreeLockOptions = {
  /** Lock TTL in milliseconds. */
  ttlMs: number;
  /** Max acquisition attempts before failing. */
  retryCount: number;
  /** Delay between acquisition attempts in milliseconds. */
  retryDelayMs?: number;
};

/**
 * Distributed lock adapter over Redis via the Redlock algorithm.
 */
export class RedlockSubtreeLock implements SubtreeLock {
  private readonly redis: Redis;
  private readonly redlock: Redlock;
  private readonly ttlMs: number;

  /**
   * @param redisUrl - Redis connection URL (e.g. `redis://127.0.0.1:6379`).
   * @param options - TTL and retry settings.
   */
  constructor(redisUrl: string, options: RedlockSubtreeLockOptions) {
    this.ttlMs = options.ttlMs;
    // Fail the command instead of queueing forever: a lock that never resolves
    // would hang the request until the HTTP client gives up.
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    // ioredis emits 'error' on connection failures; without a listener Node
    // treats it as unhandled and the PM2 worker can exit while still looking
    // "online" during restart loops.
    this.redis.on('error', () => undefined);
    this.redlock = new Redlock([this.redis], {
      driftFactor: 0.01,
      retryCount: options.retryCount,
      retryDelay: options.retryDelayMs ?? 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });
    // Redlock emits operational errors for minority failures; swallow to avoid
    // unhandled 'error' events crashing the process in single-node mode.
    this.redlock.on('error', () => undefined);
  }

  /**
   * Acquires `menu:node:{nodeId}`, runs `fn`, then releases.
   *
   * @param nodeId - Menu item id that defines the lock resource.
   * @param fn - Critical section to execute under the lock.
   * @returns The value returned by `fn`.
   */
  async withLock<T>(nodeId: number, fn: () => Promise<T>): Promise<T> {
    return this.redlock.using([menuNodeLockKey(nodeId)], this.ttlMs, async () =>
      fn(),
    );
  }

  /**
   * Quits the underlying Redis client, forcing a disconnect when the
   * connection is already broken and `QUIT` cannot complete.
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } finally {
      this.redis.disconnect();
    }
  }
}
