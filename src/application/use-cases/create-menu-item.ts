/**
 * @packageDocumentation
 *
 * Application use case that creates a menu item, either as a root or as a child
 * of an existing item referenced by `relatedId`.
 */
import type { MenuItemIdGenerator } from '../ports/id-generator.js';
import type { MenuRepository } from '../ports/menu-repository.js';
import { ParentMenuItemNotFoundError } from '../../domain/menu/menu-errors.js';
import {
  createChildMenuItem,
  createRootMenuItem,
  type MenuItem,
} from '../../domain/menu/menu-item.js';

/** Input payload for `CreateMenuItem`. */
export type CreateMenuItemInput = {
  /** Display name of the new item. */
  name: string;
  /** Identifier of the parent item, or `null`/`undefined` to create a root. */
  relatedId?: number | null;
};

/** Optional hooks for experiments / race-window tests. */
export type CreateMenuItemHooks = {
  /**
   * Invoked after a successful parent lookup and before id allocation /
   * persistence. Used by CON-009 to widen the race window.
   */
  afterParentLookup?: () => Promise<void>;
};

/**
 * Creates menu items.
 */
export class CreateMenuItem {
  /**
   * @param repository - Persists and reads `MenuItem` entities.
   * @param idGenerator - Produces unique identifiers for new items.
   * @param hooks - Optional hooks (race-window delay for experiments).
   */
  constructor(
    private readonly repository: MenuRepository,
    private readonly idGenerator: MenuItemIdGenerator,
    private readonly hooks: CreateMenuItemHooks = {},
  ) {}

  /**
   * Creates a new menu item.
   *
   * @param input - `CreateMenuItemInput` with the name and optional parent.
   * @returns The persisted `MenuItem`.
   * @throws `ParentMenuItemNotFoundError{ When }relatedId` points to a
   *   non-existent item.
   */
  async execute(input: CreateMenuItemInput): Promise<MenuItem> {
    const relatedId = input.relatedId ?? null;
    let parent: MenuItem | null = null;

    if (relatedId !== null) {
      parent = await this.repository.findById(relatedId);
      if (!parent) {
        throw new ParentMenuItemNotFoundError(relatedId);
      }
      if (this.hooks.afterParentLookup) {
        await this.hooks.afterParentLookup();
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
