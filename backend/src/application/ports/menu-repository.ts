/**
 * @packageDocumentation
 *
 * Persistence port for menu items. Implementations live in the infrastructure
 * layer; use cases depend only on this abstraction.
 */
import type { MenuItem } from '../../domain/menu/menu-item.js';

/** A menu item in the shape accepted by `MenuRepository.create`. */
export type NewMenuItem = MenuItem;

/** Result of deleting a subtree of menu items. */
export interface DeleteSubtreeResult {
  /** Number of documents removed (the root plus all of its descendants). */
  deletedCount: number;
}

/**
 * Repository of menu items.
 */
export interface MenuRepository {
  /**
   * Finds a menu item by its identifier.
   *
   * @param id - Identifier of the item to look up.
   * @returns The matching `MenuItem{ , or }null` when none exists.
   */
  findById(id: number): Promise<MenuItem | null>;

  /**
   * Persists a new menu item.
   *
   * @param input - Fully-formed `NewMenuItem` (including id and ancestors).
   * @returns The persisted `MenuItem`.
   * @throws `MenuItemNameAlreadyExistsError` When a concurrent write
   *   inserted an item with the same name (unique constraint violation).
   */
  create(input: NewMenuItem): Promise<MenuItem>;

  /**
   * Returns all menu items ordered by ascending `id`.
   *
   * @returns The complete list of `MenuItem`.
   */
  findAllOrderedById(): Promise<MenuItem[]>;

  /**
   * Deletes a menu item and its entire subtree.
   *
   * @param id - Identifier of the subtree root to delete.
   * @returns A `DeleteSubtreeResult` reporting how many items were removed.
   */
  deleteSubtree(id: number): Promise<DeleteSubtreeResult>;
}
