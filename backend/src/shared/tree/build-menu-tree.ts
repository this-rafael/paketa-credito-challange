/**
 * @packageDocumentation
 *
 * Pure helpers that assemble a nested menu tree from a flat, id-ordered list of
 * items. Kept free of I/O and domain entities so it can be unit-tested directly.
 */
import { DataIntegrityError } from '../../domain/menu/menu-errors.js';

/** A flat item consumed by `buildMenuTree`. */
export interface MenuTreeInputItem {
  /** Identifier of the item. */
  id: number;
  /** Display name of the item. */
  name: string;
  /** Identifier of the parent item, or `null` for a root. */
  parentId: number | null;
}

/** Public, serializable representation of a node in the menu tree. */
export interface PublicMenuNode {
  /** Stringified item identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Child nodes, present only when the node has descendants. */
  submenus?: PublicMenuNode[];
}

/** Internal mutable variant used while assembling the tree. */
interface MutablePublicMenuNode {
  id: string;
  name: string;
  submenus?: MutablePublicMenuNode[];
}

/**
 * Builds a nested tree from a flat list of items.
 *
 * Each item is wired to its parent using `parentId`; roots form the returned
 * array. The input is processed in two passes (create nodes, then attach to
 * parents) so item order does not matter.
 *
 * @param items - Flat list of `MenuTreeInputItem`.
 * @returns An array of root `PublicMenuNode{ with }submenus` nested.
 * @throws `DataIntegrityError{ When an item references a }parentId` that
 *   does not exist.
 */
export function buildMenuTree(items: MenuTreeInputItem[]): PublicMenuNode[] {
  const nodesById = new Map<number, MutablePublicMenuNode>();
  const roots: MutablePublicMenuNode[] = [];

  for (const item of items) {
    nodesById.set(item.id, { id: String(item.id), name: item.name });
  }

  for (const item of items) {
    const node = nodesById.get(item.id)!;
    if (item.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = nodesById.get(item.parentId);
    if (!parent) {
      throw new DataIntegrityError(
        `Orphan menu item ${item.id}: missing parent ${item.parentId}`,
      );
    }

    if (!parent.submenus) {
      parent.submenus = [];
    }
    parent.submenus.push(node);
  }

  return roots;
}
