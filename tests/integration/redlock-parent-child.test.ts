import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { LockedCreateMenuItem } from '../../src/application/use-cases/locked-create-menu-item.js';
import { LockedDeleteMenuSubtree } from '../../src/application/use-cases/locked-delete-menu-subtree.js';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../../src/application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../../src/application/use-cases/get-menu-tree.js';
import { MongoIdGenerator } from '../../src/infrastructure/database/mongo-id-generator.js';
import { ensureMenuIndexes } from '../../src/infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MenuItemModel } from '../../src/infrastructure/database/mongoose/menu-item-model.js';
import { MongooseMenuRepository } from '../../src/infrastructure/database/mongoose/mongoose-menu-repository.js';
import { NoopSubtreeLock } from '../../src/infrastructure/redis/noop-subtree-lock.js';
import { RedlockSubtreeLock } from '../../src/infrastructure/redis/redlock-subtree-lock.js';
import { createApp } from '../../src/main/create-app.js';
import {
  resetMongoCollections,
  startMongoTestContext,
  stopMongoTestContext,
} from './mongo-test-context.js';
import {
  startRedisTestContext,
  stopRedisTestContext,
} from './redis-test-context.js';

const RACE_DELAY_MS = 50;
const ITERATIONS = 30;

describe('CON-009: parent delete vs child create race', () => {
  let redisUrl: string;

  beforeAll(async () => {
    await startMongoTestContext();
    await ensureMenuIndexes();
    redisUrl = await startRedisTestContext();
  }, 180_000);

  afterAll(async () => {
    await stopRedisTestContext();
    await stopMongoTestContext();
  }, 60_000);

  beforeEach(async () => {
    await resetMongoCollections();
    await ensureMenuIndexes();
  });

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function seedParent(
    create: CreateMenuItem | LockedCreateMenuItem,
  ): Promise<number> {
    const parent = await create.execute({
      name: `Pai-${Date.now()}-${Math.random()}`,
    });
    return parent.id;
  }

  it('baseline without lock: orphan child can appear (race demonstrated)', async () => {
    const repository = new MongooseMenuRepository();
    const idGenerator = new MongoIdGenerator();
    const lock = new NoopSubtreeLock();
    const create = new LockedCreateMenuItem(
      new CreateMenuItem(repository, idGenerator, {
        afterParentLookup: () => sleep(RACE_DELAY_MS),
      }),
      lock,
    );
    const deleteSubtree = new LockedDeleteMenuSubtree(
      new DeleteMenuSubtree(repository),
      lock,
    );
    const app = createApp({
      createMenuItem: create,
      getMenuTree: new GetMenuTree(repository),
      deleteMenuSubtree: deleteSubtree,
    });

    let orphanObserved = false;

    for (let i = 0; i < ITERATIONS && !orphanObserved; i += 1) {
      await resetMongoCollections();
      await ensureMenuIndexes();

      const parentId = await seedParent(create);
      const childName = `Filho-${i}`;

      const [deleteResponse, createResponse] = await Promise.all([
        request(app).delete(`/api/v1/menu/${parentId}`),
        request(app)
          .post('/api/v1/menu')
          .send({ name: childName, relatedId: parentId }),
      ]);

      expect([200, 404]).toContain(deleteResponse.status);
      expect([201, 404]).toContain(createResponse.status);

      const parent = await MenuItemModel.findOne({ id: parentId }).lean();
      const child = await MenuItemModel.findOne({ name: childName }).lean();

      if (child && !parent) {
        orphanObserved = true;
        expect(child.parentId).toBe(parentId);
      }
    }

    expect(orphanObserved).toBe(true);
  }, 180_000);

  it('with Redlock: parent/child invariant holds across concurrent delete+create', async () => {
    const repository = new MongooseMenuRepository();
    const idGenerator = new MongoIdGenerator();
    const lock = new RedlockSubtreeLock(redisUrl, {
      ttlMs: 5_000,
      retryCount: 25,
      retryDelayMs: 50,
    });

    try {
      const create = new LockedCreateMenuItem(
        new CreateMenuItem(repository, idGenerator, {
          afterParentLookup: () => sleep(RACE_DELAY_MS),
        }),
        lock,
      );
      const deleteSubtree = new LockedDeleteMenuSubtree(
        new DeleteMenuSubtree(repository),
        lock,
      );
      const app = createApp({
        createMenuItem: create,
        getMenuTree: new GetMenuTree(repository),
        deleteMenuSubtree: deleteSubtree,
      });

      for (let i = 0; i < ITERATIONS; i += 1) {
        await resetMongoCollections();
        await ensureMenuIndexes();

        const parentId = await seedParent(create);
        const childName = `Filho-locked-${i}`;

        const [deleteResponse, createResponse] = await Promise.all([
          request(app).delete(`/api/v1/menu/${parentId}`),
          request(app)
            .post('/api/v1/menu')
            .send({ name: childName, relatedId: parentId }),
        ]);

        expect([200, 404]).toContain(deleteResponse.status);
        expect([201, 404]).toContain(createResponse.status);

        const parent = await MenuItemModel.findOne({ id: parentId }).lean();
        const child = await MenuItemModel.findOne({ name: childName }).lean();

        if (child) {
          expect(parent).not.toBeNull();
          expect(child.parentId).toBe(parentId);
        }
        if (!parent) {
          expect(child).toBeNull();
        }

        const treeResponse = await request(app).get('/api/v1/menu');
        expect(treeResponse.status).toBe(200);
      }
    } finally {
      await lock.close();
    }
  }, 180_000);

  it('RedlockSubtreeLock swallows Redis connection errors instead of crashing', async () => {
    // Port 1 refuses connections, so ioredis emits 'error'. Without a listener
    // Node would treat it as unhandled and kill the process.
    const lock = new RedlockSubtreeLock('redis://127.0.0.1:1', {
      ttlMs: 1_000,
      retryCount: 0,
      retryDelayMs: 10,
    });
    try {
      await expect(lock.withLock(1, async () => 'never')).rejects.toBeTruthy();
    } finally {
      await lock.close().catch(() => undefined);
    }
  }, 30_000);

  it('RedlockSubtreeLock defaults retryDelayMs when omitted', async () => {
    const lock = new RedlockSubtreeLock(redisUrl, {
      ttlMs: 2_000,
      retryCount: 1,
    });
    try {
      const value = await lock.withLock(99, async () => 'default-delay');
      expect(value).toBe('default-delay');
    } finally {
      await lock.close();
    }
  });
});
