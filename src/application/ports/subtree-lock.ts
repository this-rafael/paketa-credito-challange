/**
 * @packageDocumentation
 *
 * Distributed lock port used to serialize mutations that touch the same menu
 * node (create-child under a parent vs delete of that parent).
 */

/**
 * Acquires an exclusive lock for a menu node, runs `fn`, then releases the lock.
 */
export interface SubtreeLock {
  /**
   * Runs `fn` while holding a lock keyed by `nodeId`.
   *
   * @param nodeId - Menu item id that defines the lock resource.
   * @param fn - Critical section to execute under the lock.
   * @returns The value returned by `fn`.
   */
  withLock<T>(nodeId: number, fn: () => Promise<T>): Promise<T>;

  /**
   * Releases underlying clients (e.g. Redis connections). Optional for no-op.
   */
  close?(): Promise<void>;
}

/**
 * Builds the Redis resource key for a menu node lock.
 *
 * @param nodeId - Menu item identifier.
 * @returns A stable lock resource string.
 */
export function menuNodeLockKey(nodeId: number): string {
  return `menu:node:${nodeId}`;
}
