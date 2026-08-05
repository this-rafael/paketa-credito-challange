import { describe, expect, it } from 'vitest';
import { LockedCreateMenuItem } from '../../src/application/use-cases/locked-create-menu-item.js';
import { LockedDeleteMenuSubtree } from '../../src/application/use-cases/locked-delete-menu-subtree.js';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../../src/application/use-cases/delete-menu-subtree.js';
import {
  menuNodeLockKey,
  type SubtreeLock,
} from '../../src/application/ports/subtree-lock.js';
import { NoopSubtreeLock } from '../../src/infrastructure/redis/noop-subtree-lock.js';
import {
  InMemoryMenuItemIdGenerator,
  InMemoryMenuRepository,
} from '../fakes/in-memory-menu.js';

function recordingLock(): {
  lock: SubtreeLock;
  calls: number[];
} {
  const calls: number[] = [];
  const lock: SubtreeLock = {
    withLock: async <T>(nodeId: number, fn: () => Promise<T>): Promise<T> => {
      calls.push(nodeId);
      return fn();
    },
  };
  return { lock, calls };
}

describe('distributed lock wrappers', () => {
  it('menuNodeLockKey uses a stable resource name', () => {
    expect(menuNodeLockKey(42)).toBe('menu:node:42');
  });

  it('NoopSubtreeLock runs the critical section without coordination', async () => {
    const lock = new NoopSubtreeLock();
    const result = await lock.withLock(1, async () => 'ok');
    expect(result).toBe('ok');
  });

  it('LockedCreateMenuItem skips the lock for root creates', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const { lock, calls } = recordingLock();
    const create = new LockedCreateMenuItem(
      new CreateMenuItem(repository, ids),
      lock,
    );

    const created = await create.execute({ name: 'Root' });
    expect(created.id).toBe(1);
    expect(calls).toEqual([]);
  });

  it('LockedCreateMenuItem locks the parent id for child creates', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const { lock, calls } = recordingLock();
    const create = new LockedCreateMenuItem(
      new CreateMenuItem(repository, ids),
      lock,
    );

    const root = await create.execute({ name: 'Root' });
    const child = await create.execute({ name: 'Child', relatedId: root.id });

    expect(child.parentId).toBe(root.id);
    expect(calls).toEqual([root.id]);
  });

  it('LockedDeleteMenuSubtree locks the target id', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const create = new CreateMenuItem(repository, ids);
    const root = await create.execute({ name: 'Root' });

    const { lock, calls } = recordingLock();
    const deleteSubtree = new LockedDeleteMenuSubtree(
      new DeleteMenuSubtree(repository),
      lock,
    );

    const result = await deleteSubtree.execute(root.id);
    expect(result.deletedCount).toBe(1);
    expect(calls).toEqual([root.id]);
  });

  it('CreateMenuItem afterParentLookup hook runs between lookup and persist', async () => {
    const repository = new InMemoryMenuRepository();
    const ids = new InMemoryMenuItemIdGenerator();
    const order: string[] = [];
    const create = new CreateMenuItem(repository, ids, {
      afterParentLookup: async () => {
        order.push('hook');
      },
    });
    const originalCreate = repository.create.bind(repository);
    repository.create = async (item) => {
      order.push('create');
      return originalCreate(item);
    };

    const root = await create.execute({ name: 'Root' });
    order.length = 0;

    await create.execute({ name: 'Child', relatedId: root.id });
    expect(order).toEqual(['hook', 'create']);
  });
});
