/**
 * @packageDocumentation
 *
 * Application use case that deletes a menu item together with its entire subtree
 * of descendants.
 */
import type {
  DeleteSubtreeResult,
  MenuRepository,
} from '../ports/menu-repository.js';
import { MenuItemNotFoundError } from '../../domain/menu/menu-errors.js';

/**
 * Deletes a menu item subtree.
 */
export class DeleteMenuSubtree {
  /**
   * @param repository - Persists and reads `MenuItem` entities.
   */
  constructor(private readonly repository: MenuRepository) {}

  /**
   * Deletes the item identified by `id` and all of its descendants.
   *
   * @param id - Identifier of the subtree root to delete.
   * @returns A `DeleteSubtreeResult` with the number of removed items.
   * @throws `MenuItemNotFoundError{ When no item with }id` exists.
   */
  async execute(id: number): Promise<DeleteSubtreeResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new MenuItemNotFoundError(id);
    }
    return this.repository.deleteSubtree(id);
  }
}
