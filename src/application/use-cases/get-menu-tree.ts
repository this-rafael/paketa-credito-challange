import type { MenuRepository } from '../ports/menu-repository.js';
import {
  buildMenuTree,
  type PublicMenuNode,
} from '../../shared/tree/build-menu-tree.js';

export class GetMenuTree {
  constructor(private readonly repository: MenuRepository) {}

  async execute(): Promise<PublicMenuNode[]> {
    const items = await this.repository.findAllOrderedById();
    return buildMenuTree(items);
  }
}
