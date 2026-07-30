import type {
  DeleteSubtreeResult,
  MenuRepository,
} from '../ports/menu-repository.js';
import { MenuItemNotFoundError } from '../../domain/menu/menu-errors.js';

export class DeleteMenuSubtree {
  constructor(private readonly repository: MenuRepository) {}

  async execute(id: number): Promise<DeleteSubtreeResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new MenuItemNotFoundError(id);
    }
    return this.repository.deleteSubtree(id);
  }
}
