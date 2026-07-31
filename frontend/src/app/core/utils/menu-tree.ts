import { FlatMenuItem, MenuItem, MenuStats } from '../models/menu';

export function flattenMenu(
  items: MenuItem[],
  parentId: string | null = null,
  level = 0,
  path: string[] = [],
): FlatMenuItem[] {
  const result: FlatMenuItem[] = [];
  for (const item of items) {
    const children = item.submenus ?? [];
    const currentPath = [...path, item.name];
    result.push({
      id: item.id,
      name: item.name,
      level,
      parentId,
      childCount: children.length,
      path: currentPath,
    });
    result.push(...flattenMenu(children, item.id, level + 1, currentPath));
  }
  return result;
}

export function computeStats(items: MenuItem[]): MenuStats {
  const flat = flattenMenu(items);
  const maxDepth = flat.reduce((max, item) => Math.max(max, item.level), -1);
  return {
    total: flat.length,
    roots: items.length,
    maxDepth: flat.length === 0 ? 0 : maxDepth + 1,
    submenuCount: flat.filter((item) => item.level > 0).length,
  };
}

export function findItem(items: MenuItem[], id: string): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.submenus ?? [], id);
    if (found) return found;
  }
  return null;
}

export function toRelatedId(id: string): number | undefined {
  const n = Number(id);
  return Number.isFinite(n) ? n : undefined;
}
