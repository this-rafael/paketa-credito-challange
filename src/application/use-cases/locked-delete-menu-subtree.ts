/**
 * @packageDocumentation
 *
 * Decorator that acquires a distributed lock on the target node before deleting
 * its subtree, serializing with concurrent child creates under that node.
 */
import type { SubtreeLock } from '../ports/subtree-lock.js';
import type { DeleteSubtreeResult } from '../ports/menu-repository.js';
import { DeleteMenuSubtree } from './delete-menu-subtree.js';

/**
 * Wraps {@link DeleteMenuSubtree} with a per-node distributed lock.
 */
export class LockedDeleteMenuSubtree {
  /**
   * @param inner - Underlying delete use case.
   * @param lock - Distributed lock for the target node.
   */
  constructor(
    private readonly inner: DeleteMenuSubtree,
    private readonly lock: SubtreeLock,
  ) {}

  /**
   * Deletes the subtree rooted at `id` while holding the node lock.
   *
   * @param id - Identifier of the subtree root to delete.
   * @returns A `DeleteSubtreeResult` with the number of removed items.
   */
  async execute(id: number): Promise<DeleteSubtreeResult> {
    return this.lock.withLock(id, () => this.inner.execute(id));
  }
}
