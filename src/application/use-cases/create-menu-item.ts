import type { MenuItemIdGenerator } from '../ports/id-generator.js';
import type { MenuRepository } from '../ports/menu-repository.js';
import { ParentMenuItemNotFoundError } from '../../domain/menu/menu-errors.js';
import {
  createChildMenuItem,
  createRootMenuItem,
  type MenuItem,
} from '../../domain/menu/menu-item.js';

export type CreateMenuItemInput = {
  name: string;
  relatedId?: number | null;
};

export class CreateMenuItem {
  constructor(
    private readonly repository: MenuRepository,
    private readonly idGenerator: MenuItemIdGenerator,
  ) {}

  async execute(input: CreateMenuItemInput): Promise<MenuItem> {
    const relatedId = input.relatedId ?? null;
    let parent: MenuItem | null = null;

    if (relatedId !== null) {
      parent = await this.repository.findById(relatedId);
      if (!parent) {
        throw new ParentMenuItemNotFoundError(relatedId);
      }
    }

    const id = await this.idGenerator.next();
    const item =
      parent === null
        ? createRootMenuItem(id, input.name)
        : createChildMenuItem(id, input.name, parent);

    return this.repository.create(item);
  }
}
