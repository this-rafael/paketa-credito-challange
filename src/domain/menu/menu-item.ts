/**
 * @packageDocumentation
 *
 * Domain model for menu items. A menu item is a node in a tree where each node
 * carries its own `id{ , a human-readable }name{ , the }id` of its parent (or
 * `null{ for roots) and the full chain of }ancestors` for fast subtree queries.
 */
import {
  InvalidMenuItemIdError,
  InvalidMenuItemNameError,
} from './menu-errors.js';

/**
 * A node of the corporate menu tree.
 */
export interface MenuItem {
  /** Stable, positive, safe-integer identifier of this item. */
  id: number;
  /** Display name, already trimmed and non-empty. */
  name: string;
  /** Identifier of the parent item, or `null` when this item is a root. */
  parentId: number | null;
  /** Ordered list of ancestor identifiers, from the root down to the parent. */
  ancestors: number[];
}

/**
 * Normalizes a raw menu item name.
 *
 * @param name - Raw name supplied by the caller.
 * @returns The trimmed name.
 * @throws `InvalidMenuItemNameError` When the trimmed name is empty.
 */
export function normalizeMenuItemName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0) {
    throw new InvalidMenuItemNameError(name);
  }
  return normalized;
}

/**
 * Ensures an identifier is a positive safe integer.
 *
 * @param id - Candidate identifier.
 * @throws `InvalidMenuItemIdError{ When }id` is not a positive safe integer.
 */
function assertPositiveSafeId(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new InvalidMenuItemIdError(id);
  }
}

/**
 * Builds a root menu item (no parent).
 *
 * @param id - Positive, safe-integer identifier for the new item.
 * @param name - Display name; leading/trailing whitespace is trimmed.
 * @returns A new `MenuItem` with an empty ancestor chain.
 * @throws `InvalidMenuItemIdError{ When }id` is not a positive safe integer.
 * @throws `InvalidMenuItemNameError{ When the trimmed }name` is empty.
 */
export function createRootMenuItem(id: number, name: string): MenuItem {
  assertPositiveSafeId(id);
  return {
    id,
    name: normalizeMenuItemName(name),
    parentId: null,
    ancestors: [],
  };
}

/**
 * Builds a child menu item under an existing parent.
 *
 * @param id - Positive, safe-integer identifier for the new item.
 * @param name - Display name; leading/trailing whitespace is trimmed.
 * @param parent - Existing parent `MenuItem`.
 * @returns A new `MenuItem{ whose }parentId` is the parent's id and whose
 *   `ancestors` extend the parent's chain.
 * @throws `InvalidMenuItemIdError{ When }id` is not a positive safe integer
 *   or equals an ancestor (would create a cycle).
 * @throws `InvalidMenuItemNameError{ When the trimmed }name` is empty.
 */
export function createChildMenuItem(
  id: number,
  name: string,
  parent: MenuItem,
): MenuItem {
  assertPositiveSafeId(id);
  const ancestors = [...parent.ancestors, parent.id];
  if (ancestors.includes(id)) {
    throw new InvalidMenuItemIdError(id);
  }
  return {
    id,
    name: normalizeMenuItemName(name),
    parentId: parent.id,
    ancestors,
  };
}
