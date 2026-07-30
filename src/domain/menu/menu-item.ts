import {
  InvalidMenuItemIdError,
  InvalidMenuItemNameError,
} from './menu-errors.js';

export interface MenuItem {
  id: number;
  name: string;
  parentId: number | null;
  ancestors: number[];
}

export function normalizeMenuItemName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0) {
    throw new InvalidMenuItemNameError(name);
  }
  return normalized;
}

function assertPositiveSafeId(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new InvalidMenuItemIdError(id);
  }
}

export function createRootMenuItem(id: number, name: string): MenuItem {
  assertPositiveSafeId(id);
  return {
    id,
    name: normalizeMenuItemName(name),
    parentId: null,
    ancestors: [],
  };
}

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
