/**
 * @packageDocumentation
 *
 * Application use case that returns the full menu as a nested tree, built from
 * the flat, id-ordered list of items.
 */
import type { MenuRepository } from '../ports/menu-repository.js';
import {
  buildMenuTree,
  type PublicMenuNode,
} from '../../shared/tree/build-menu-tree.js';

/**
 * Reads the menu tree.
 */
export class GetMenuTree {
  /**
   * @param repository - Persists and reads `MenuItem` entities.
   */
  constructor(private readonly repository: MenuRepository) {}

  /**
   * Builds the nested menu tree.
   *
   * @returns An array of root `PublicMenuNode{ nodes with their }submenus`
   *   nested recursively.
   * @throws `DataIntegrityError` When an item references a missing parent.
   */
  async execute(): Promise<PublicMenuNode[]> {
    const items = await this.repository.findAllOrderedById();
    return buildMenuTree(items);
  }
}
