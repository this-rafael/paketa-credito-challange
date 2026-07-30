import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DataIntegrityError } from '../../src/domain/menu/menu-errors.js';
import {
  buildMenuTree,
  type MenuTreeInputItem,
  type PublicMenuNode,
} from '../../src/shared/tree/build-menu-tree.js';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const implementationPath = join(
  backendRoot,
  'src/shared/tree/build-menu-tree.ts',
);

function collectNodes(nodes: PublicMenuNode[]): PublicMenuNode[] {
  const all: PublicMenuNode[] = [];
  const stack = [...nodes].reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    all.push(node);
    if (node.submenus) {
      for (let i = node.submenus.length - 1; i >= 0; i -= 1) {
        stack.push(node.submenus[i]!);
      }
    }
  }
  return all;
}

function publicIdsInOrder(nodes: PublicMenuNode[]): string[] {
  return nodes.map((node) => node.id);
}

describe('buildMenuTree', () => {
  it('GET-003: public nodes expose only id string, name and optional submenus', () => {
    const tree = buildMenuTree([
      { id: 1, name: 'Electronics', parentId: null },
      { id: 2, name: 'TVs', parentId: 1 },
    ]);

    const root = tree[0]!;
    expect(Object.keys(root).sort()).toEqual(['id', 'name', 'submenus']);
    expect(root.id).toBe('1');
    expect(typeof root.id).toBe('string');
    expect(root.name).toBe('Electronics');
    expect(root).not.toHaveProperty('parentId');
    expect(root).not.toHaveProperty('ancestors');
    expect(root).not.toHaveProperty('_id');
    expect(root).not.toHaveProperty('createdAt');
    expect(root).not.toHaveProperty('updatedAt');
  });

  it('GET-004: leaves omit the submenus property', () => {
    const tree = buildMenuTree([{ id: 1, name: 'Root', parentId: null }]);
    const leaf = tree[0]!;

    expect(leaf).not.toHaveProperty('submenus');
    expect(Object.prototype.hasOwnProperty.call(leaf, 'submenus')).toBe(false);
  });

  it('GET-005: siblings keep numeric id order, not lexicographic', () => {
    const tree = buildMenuTree([
      { id: 1, name: 'One', parentId: null },
      { id: 2, name: 'Two', parentId: null },
      { id: 10, name: 'Ten', parentId: null },
    ]);

    expect(publicIdsInOrder(tree)).toEqual(['1', '2', '10']);
  });

  it('GET-006: implementation is iterative Map-based and O(n)', () => {
    const source = readFileSync(implementationPath, 'utf8');

    expect(source).toMatch(/\bMap\b/);
    expect(source.includes('buildMenuTree(')).toBe(true);
    expect(source.match(/buildMenuTree\s*\(/g)?.length).toBe(1);
    expect(source).not.toMatch(/\bfunction\s+attach\b/);
    expect(source).not.toMatch(/\bfunction\s+walk\b/);
    expect(source).not.toMatch(
      /\bfunction\s+build\w*\([^)]*\)[^{]*\{[^}]*build\w*\s*\(/s,
    );

    const items: MenuTreeInputItem[] = [
      { id: 1, name: 'A', parentId: null },
      { id: 2, name: 'B', parentId: 1 },
      { id: 3, name: 'C', parentId: 1 },
    ];
    const tree = buildMenuTree(items);
    expect(collectNodes(tree)).toHaveLength(items.length);
  });

  it('GET-008: missing parent fails with DataIntegrityError and is not promoted', () => {
    expect(() =>
      buildMenuTree([{ id: 2, name: 'Orphan', parentId: 99 }]),
    ).toThrow(DataIntegrityError);
  });

  it('GET-010: builds a chain of at least 1000 levels without stack overflow', () => {
    const depth = 1000;
    const items: MenuTreeInputItem[] = Array.from(
      { length: depth },
      (_, index) => {
        const id = index + 1;
        return {
          id,
          name: `N${id}`,
          parentId: index === 0 ? null : index,
        };
      },
    );

    const tree = buildMenuTree(items);
    let node = tree[0]!;
    let levels = 1;
    while (node.submenus?.[0]) {
      node = node.submenus[0];
      levels += 1;
    }

    expect(levels).toBe(depth);
    expect(node.id).toBe(String(depth));
  });

  it('GET-011: preserves forest invariants for arbitrary valid forests', () => {
    const forestArb = fc
      .integer({ min: 1, max: 40 })
      .chain((size) =>
        fc.tuple(
          fc.constant(size),
          fc.array(fc.integer({ min: 0, max: size - 1 }), {
            minLength: size - 1,
            maxLength: size - 1,
          }),
          fc.array(fc.string({ minLength: 1, maxLength: 8 }), {
            minLength: size,
            maxLength: size,
          }),
        ),
      )
      .map(([size, parentOffsets, names]) => {
        const items: MenuTreeInputItem[] = [];
        for (let id = 1; id <= size; id += 1) {
          const resolvedParent =
            id === 1 ? null : (parentOffsets[id - 2]! % (id - 1)) + 1;
          items.push({
            id,
            name: `${names[id - 1]}-${id}`,
            parentId: resolvedParent,
          });
        }
        return items;
      });

    fc.assert(
      fc.property(forestArb, (items) => {
        const first = buildMenuTree(items);
        const second = buildMenuTree(items);
        const nodes = collectNodes(first);

        expect(nodes).toHaveLength(items.length);
        expect(new Set(nodes.map((n) => n.id)).size).toBe(items.length);
        expect(first).toEqual(second);

        const byId = new Map(nodes.map((n) => [n.id, n]));
        for (const item of items) {
          const node = byId.get(String(item.id));
          expect(node).toBeDefined();
          expect(node!.name).toBe(item.name);
          if (item.parentId === null) {
            expect(first.some((root) => root.id === String(item.id))).toBe(
              true,
            );
          } else {
            const parent = byId.get(String(item.parentId));
            expect(
              parent?.submenus?.some((child) => child.id === String(item.id)),
            ).toBe(true);
          }
          if (!node!.submenus) {
            expect(
              Object.prototype.hasOwnProperty.call(node!, 'submenus'),
            ).toBe(false);
          }
        }

        expect(publicIdsInOrder(first)).toEqual(
          [...items]
            .filter((item) => item.parentId === null)
            .map((item) => String(item.id)),
        );
      }),
      { numRuns: 50 },
    );
  });
});
