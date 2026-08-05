/**
 * @packageDocumentation
 *
 * No-op lock used when distributed locking is disabled. Allows the same
 * wiring path as Redlock while exposing the parent/child race for demos.
 */
import type { SubtreeLock } from '../../application/ports/subtree-lock.js';

/**
 * Pass-through lock that never coordinates across processes.
 */
export class NoopSubtreeLock implements SubtreeLock {
  /**
   * Executes `fn` immediately without acquiring any lock.
   *
   * @param _nodeId - Ignored.
   * @param fn - Critical section.
   * @returns The value returned by `fn`.
   */
  async withLock<T>(_nodeId: number, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
