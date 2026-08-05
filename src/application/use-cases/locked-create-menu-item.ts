/**
 * @packageDocumentation
 *
 * Decorator that acquires a distributed lock on the parent node before creating
 * a child menu item, serializing with concurrent deletes of that parent.
 */
import type { SubtreeLock } from '../ports/subtree-lock.js';
import type { MenuItem } from '../../domain/menu/menu-item.js';
import {
  CreateMenuItem,
  type CreateMenuItemInput,
} from './create-menu-item.js';

/**
 * Wraps {@link CreateMenuItem} with a per-parent distributed lock.
 */
export class LockedCreateMenuItem {
  /**
   * @param inner - Underlying create use case.
   * @param lock - Distributed lock for the parent node.
   */
  constructor(
    private readonly inner: CreateMenuItem,
    private readonly lock: SubtreeLock,
  ) {}

  /**
   * Creates a menu item. Root creates skip the lock; child creates lock the
   * parent id first.
   *
   * @param input - Create payload.
   * @returns The persisted `MenuItem`.
   */
  async execute(input: CreateMenuItemInput): Promise<MenuItem> {
    const relatedId = input.relatedId ?? null;
    if (relatedId === null) {
      return this.inner.execute(input);
    }
    return this.lock.withLock(relatedId, () => this.inner.execute(input));
  }
}
