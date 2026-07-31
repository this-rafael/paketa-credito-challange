import mongoose from 'mongoose';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { MongoIdGenerator } from '../../src/infrastructure/database/mongo-id-generator.js';
import { ensureMenuIndexes } from '../../src/infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MenuItemModel } from '../../src/infrastructure/database/mongoose/menu-item-model.js';
import { MongooseMenuRepository } from '../../src/infrastructure/database/mongoose/mongoose-menu-repository.js';
import {
  resetMongoCollections,
  startMongoTestContext,
  stopMongoTestContext,
} from './mongo-test-context.js';

describe('mongo menu persistence', () => {
  beforeAll(async () => {
    await startMongoTestContext();
    await ensureMenuIndexes();
  }, 120_000);

  afterAll(async () => {
    await stopMongoTestContext();
  }, 60_000);

  beforeEach(async () => {
    await resetMongoCollections();
    await ensureMenuIndexes();
  });

  it('CON-003: ensures unique id/name and parentId/ancestors indexes', async () => {
    const indexes = await MenuItemModel.collection.indexes();
    const byKey = indexes.map((index) => JSON.stringify(index.key));

    expect(byKey).toContain(JSON.stringify({ id: 1 }));
    expect(byKey).toContain(JSON.stringify({ name: 1 }));
    expect(byKey).toContain(JSON.stringify({ parentId: 1 }));
    expect(byKey).toContain(JSON.stringify({ ancestors: 1 }));

    const idIndex = indexes.find(
      (index) => JSON.stringify(index.key) === JSON.stringify({ id: 1 }),
    );
    const nameIndex = indexes.find(
      (index) => JSON.stringify(index.key) === JSON.stringify({ name: 1 }),
    );
    const parentIndex = indexes.find(
      (index) => JSON.stringify(index.key) === JSON.stringify({ parentId: 1 }),
    );
    const ancestorsIndex = indexes.find(
      (index) => JSON.stringify(index.key) === JSON.stringify({ ancestors: 1 }),
    );

    expect(idIndex?.unique).toBe(true);
    expect(nameIndex?.unique).toBe(true);
    expect(parentIndex?.unique).toBeFalsy();
    expect(ancestorsIndex?.unique).toBeFalsy();
  });

  it('CON-004: rejects a duplicated functional id', async () => {
    const repository = new MongooseMenuRepository();
    await repository.create({
      id: 10,
      name: 'First',
      parentId: null,
      ancestors: [],
    });

    await expect(
      repository.create({
        id: 10,
        name: 'Second',
        parentId: null,
        ancestors: [],
      }),
    ).rejects.toBeTruthy();

    expect(await MenuItemModel.countDocuments({ id: 10 })).toBe(1);
  });

  it('CON-006/007/008: persists independent root and child documents with invariants', async () => {
    const repository = new MongooseMenuRepository();
    const ids = new MongoIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    const root = await create.execute({ name: 'Electronics' });
    const child = await create.execute({ name: 'TVs', relatedId: root.id });

    const docs = await MenuItemModel.find().lean();
    expect(docs).toHaveLength(2);
    for (const doc of docs) {
      expect(doc).not.toHaveProperty('children');
      expect(doc).not.toHaveProperty('submenus');
    }

    const persistedRoot = await repository.findById(root.id);
    const persistedChild = await repository.findById(child.id);

    expect(persistedRoot).toEqual({
      id: root.id,
      name: 'Electronics',
      parentId: null,
      ancestors: [],
    });
    expect(persistedChild).toEqual({
      id: child.id,
      name: 'TVs',
      parentId: root.id,
      ancestors: [root.id],
    });
    expect(persistedChild).not.toHaveProperty('_id');
  });

  it('CRT-010: does not reuse an id reserved before a failed insert', async () => {
    const repository = new MongooseMenuRepository();
    const ids = new MongoIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    await create.execute({ name: 'Electronics' });
    const reserved = await ids.next();
    await expect(
      repository.create({
        id: reserved,
        name: 'Electronics',
        parentId: null,
        ancestors: [],
      }),
    ).rejects.toBeTruthy();

    const later = await create.execute({ name: 'Computers' });
    expect(later.id).toBeGreaterThan(reserved);
    expect(await MenuItemModel.countDocuments({ id: reserved })).toBe(0);
  });

  it('GET-007: findAllOrderedById performs a single ordered read', async () => {
    const repository = new MongooseMenuRepository();
    const ids = new MongoIdGenerator();
    const create = new CreateMenuItem(repository, ids);
    await create.execute({ name: 'A' });
    await create.execute({ name: 'B', relatedId: 1 });

    const findSpy = vi.spyOn(MenuItemModel, 'find');
    const items = await repository.findAllOrderedById();

    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(findSpy.mock.calls[0]?.[0]).toEqual({});
    expect(items.map((item) => item.id)).toEqual([1, 2]);
    findSpy.mockRestore();
  });

  it('DEL-003: deleteSubtree removes target and descendants via ancestors', async () => {
    const repository = new MongooseMenuRepository();
    const ids = new MongoIdGenerator();
    const create = new CreateMenuItem(repository, ids);

    const root = await create.execute({ name: 'Electronics' });
    const tvs = await create.execute({ name: 'TVs', relatedId: root.id });
    await create.execute({ name: 'LCD', relatedId: tvs.id });
    await create.execute({ name: 'Computers' });

    const result = await repository.deleteSubtree(tvs.id);
    expect(result.deletedCount).toBe(2);
    expect(await MenuItemModel.countDocuments()).toBe(2);
    expect(await MenuItemModel.countDocuments({ id: tvs.id })).toBe(0);
    expect(await MenuItemModel.countDocuments({ ancestors: tvs.id })).toBe(0);
  });

  it('increments ids monotonically through the counter document', async () => {
    const ids = new MongoIdGenerator();
    const first = await ids.next();
    const second = await ids.next();
    const third = await ids.next();

    expect([first, second, third]).toEqual([1, 2, 3]);
    const counter = await mongoose.connection.db
      ?.collection('counters')
      .findOne({ _id: 'menu-item' as unknown as mongoose.Types.ObjectId });
    expect(counter?.seq).toBe(3);
  });
});
