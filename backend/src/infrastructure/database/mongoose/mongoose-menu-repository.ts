/**
 * @packageDocumentation
 *
 * MongoDB implementation of `MenuRepository` using Mongoose. It maps
 * between the `menu_items{ documents and the domain }MenuItem`.
 */
import type {
  DeleteSubtreeResult,
  MenuRepository,
  NewMenuItem,
} from '../../../application/ports/menu-repository.js';
import { MenuItemNameAlreadyExistsError } from '../../../domain/menu/menu-errors.js';
import type { MenuItem } from '../../../domain/menu/menu-item.js';
import { MenuItemModel } from './menu-item-model.js';

/**
 * Converts a raw menu item document into a domain `MenuItem`.
 *
 * @param doc - Plain document with `id{ , }name{ , optional }parentId`/`ancestors`.
 * @returns The normalized domain entity.
 */
function toDomain(doc: {
  id: number;
  name: string;
  parentId?: number | null;
  ancestors?: number[];
}): MenuItem {
  return {
    id: doc.id,
    name: doc.name,
    parentId:
      doc.parentId === undefined || doc.parentId === null ? null : doc.parentId,
    ancestors: Array.isArray(doc.ancestors) ? doc.ancestors : [],
  };
}

/**
 * Checks whether an error is a MongoDB duplicate-key violation (code 11000).
 *
 * @param error - Arbitrary error value.
 * @returns `true` for duplicate-key errors.
 */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Persists menu items in MongoDB.
 */
export class MongooseMenuRepository implements MenuRepository {
  /**
   * @param id - Identifier of the item to look up.
   * @returns The matching `MenuItem{ , or }null` when none exists.
   */
  async findById(id: number): Promise<MenuItem | null> {
    const doc = await MenuItemModel.findOne({ id }).lean();
    return doc ? toDomain(doc) : null;
  }

  /**
   * @param input - Fully-formed `NewMenuItem` to persist.
   * @returns The persisted `MenuItem`.
   * @throws `MenuItemNameAlreadyExistsError` When the insert violates the
   *   unique `name` constraint.
   */
  async create(input: NewMenuItem): Promise<MenuItem> {
    try {
      const created = await MenuItemModel.create({
        id: input.id,
        name: input.name,
        parentId: input.parentId,
        ancestors: input.ancestors,
      });
      return toDomain(created.toObject());
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const message = String(error);
        if (message.includes('name')) {
          throw new MenuItemNameAlreadyExistsError(input.name);
        }
      }
      throw error;
    }
  }

  /**
   * @returns Every `MenuItem{ ordered by ascending }id`.
   */
  async findAllOrderedById(): Promise<MenuItem[]> {
    const docs = await MenuItemModel.find({}).sort({ id: 1 }).lean();
    return docs.map((doc) => toDomain(doc));
  }

  /**
   * @param id - Identifier of the subtree root to delete.
   * @returns A `DeleteSubtreeResult` with the removed document count.
   */
  async deleteSubtree(id: number): Promise<DeleteSubtreeResult> {
    const result = await MenuItemModel.deleteMany({
      $or: [{ id }, { ancestors: id }],
    });
    return { deletedCount: result.deletedCount };
  }
}
