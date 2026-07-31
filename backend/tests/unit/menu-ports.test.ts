import { describe, expect, it } from 'vitest';
import {
  assertMenuItemIdGenerator,
  assertMenuRepository,
} from '../../src/application/ports/menu-ports.js';
import type { MenuItemIdGenerator } from '../../src/application/ports/id-generator.js';
import type {
  DeleteSubtreeResult,
  MenuRepository,
  NewMenuItem,
} from '../../src/application/ports/menu-repository.js';
import type { MenuItem } from '../../src/domain/menu/menu-item.js';

describe('menu application ports', () => {
  it('MenuRepository exposes the persistence operations used by use cases', () => {
    const item: MenuItem = {
      id: 1,
      name: 'Electronics',
      parentId: null,
      ancestors: [],
    };
    const created: NewMenuItem = { ...item };
    const deleted: DeleteSubtreeResult = { deletedCount: 1 };

    const repository: MenuRepository = {
      findById: (id) => Promise.resolve(id === item.id ? item : null),
      create: (input) => Promise.resolve(input),
      findAllOrderedById: () => Promise.resolve([item]),
      deleteSubtree: () => Promise.resolve(deleted),
    };

    expect(assertMenuRepository(repository)).toBe(repository);
    expect(created.id).toBe(1);
  });

  it('MenuItemIdGenerator exposes next()', () => {
    const generator: MenuItemIdGenerator = {
      next: () => Promise.resolve(1),
    };

    expect(assertMenuItemIdGenerator(generator)).toBe(generator);
    expect(typeof generator.next).toBe('function');
  });
});
