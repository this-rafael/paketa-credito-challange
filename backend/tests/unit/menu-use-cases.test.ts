import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../../src/application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../../src/application/use-cases/get-menu-tree.js';
import {
  MenuItemNameAlreadyExistsError,
  MenuItemNotFoundError,
  ParentMenuItemNotFoundError,
} from '../../src/domain/menu/menu-errors.js';
import {
  InMemoryMenuItemIdGenerator,
  InMemoryMenuRepository,
} from '../fakes/in-memory-menu.js';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const useCasesRoot = join(backendRoot, 'src/application/use-cases');

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(dir, name));
}

describe('menu use cases', () => {
  it('creates a root with null parentId and empty ancestors', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    const created = await create.execute({ name: 'Electronics' });

    expect(created).toEqual({
      id: 1,
      name: 'Electronics',
      parentId: null,
      ancestors: [],
    });
  });

  it('CRT-004: creates a child with parentId and ancestors from the parent chain', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    const root = await create.execute({ name: 'Electronics' });
    const parent = await create.execute({ name: 'TVs', relatedId: root.id });
    const child = await create.execute({ name: 'LCD', relatedId: parent.id });

    expect(child.parentId).toBe(parent.id);
    expect(child.ancestors).toEqual([root.id, parent.id]);
  });

  it('CRT-002: trims the name before persisting', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    const created = await create.execute({ name: '  Electronics  ' });
    expect(created.name).toBe('Electronics');
  });

  it('CRT-005: missing parent fails without calling the id generator', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    await expect(
      create.execute({ name: 'LCD', relatedId: 99 }),
    ).rejects.toBeInstanceOf(ParentMenuItemNotFoundError);
    expect(ids.nextCalls).toBe(0);
  });

  it('rejects duplicate names', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    await create.execute({ name: 'Electronics' });
    await expect(
      create.execute({ name: 'Electronics' }),
    ).rejects.toBeInstanceOf(MenuItemNameAlreadyExistsError);
  });

  it('GetMenuTree returns an empty array when there are no items', async () => {
    const repository = new InMemoryMenuRepository();
    const getTree = new GetMenuTree(repository);

    await expect(getTree.execute()).resolves.toEqual([]);
  });

  it('GetMenuTree returns the public forest for stored items', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);
    const getTree = new GetMenuTree(repository);

    await create.execute({ name: 'Electronics' });
    await create.execute({ name: 'TVs', relatedId: 1 });

    await expect(getTree.execute()).resolves.toEqual([
      {
        id: '1',
        name: 'Electronics',
        submenus: [{ id: '2', name: 'TVs' }],
      },
    ]);
  });

  it('DeleteMenuSubtree removes an existing item and fails when missing', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);
    const deleteSubtree = new DeleteMenuSubtree(repository);

    await create.execute({ name: 'Electronics' });
    await create.execute({ name: 'TVs', relatedId: 1 });

    await expect(deleteSubtree.execute(1)).resolves.toEqual({
      deletedCount: 2,
    });
    await expect(deleteSubtree.execute(1)).rejects.toBeInstanceOf(
      MenuItemNotFoundError,
    );
  });

  it('ARC-003: use cases do not import express, mongoose or zod', () => {
    for (const file of collectTsFiles(useCasesRoot)) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('express');
      expect(source).not.toContain('mongoose');
      expect(source).not.toContain('zod');
      expect(source).not.toContain('Request');
      expect(source).not.toContain('Response');
    }
  });
});
