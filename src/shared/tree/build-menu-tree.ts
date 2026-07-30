import { DataIntegrityError } from '../../domain/menu/menu-errors.js';

export interface MenuTreeInputItem {
  id: number;
  name: string;
  parentId: number | null;
}

export interface PublicMenuNode {
  id: string;
  name: string;
  submenus?: PublicMenuNode[];
}

interface MutablePublicMenuNode {
  id: string;
  name: string;
  submenus?: MutablePublicMenuNode[];
}

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
