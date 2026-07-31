import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../../src/application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../../src/application/use-cases/get-menu-tree.js';
import { MongoIdGenerator } from '../../src/infrastructure/database/mongo-id-generator.js';
import { CounterModel } from '../../src/infrastructure/database/mongoose/counter-model.js';
import { ensureMenuIndexes } from '../../src/infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MenuItemModel } from '../../src/infrastructure/database/mongoose/menu-item-model.js';
import { MongooseMenuRepository } from '../../src/infrastructure/database/mongoose/mongoose-menu-repository.js';
import { createLogger } from '../../src/infrastructure/logging/logger.js';
import { createApp } from '../../src/main/create-app.js';
import {
  resetMongoCollections,
  startMongoTestContext,
  stopMongoTestContext,
} from '../integration/mongo-test-context.js';

describe('concurrent creates and id exhaustion', () => {
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

  function buildApp() {
    const repository = new MongooseMenuRepository();
    return createApp({
      createMenuItem: new CreateMenuItem(repository, new MongoIdGenerator()),
      getMenuTree: new GetMenuTree(repository),
      deleteMenuSubtree: new DeleteMenuSubtree(repository),
    });
  }

  it('CON-001: parallel creates with distinct names all succeed with unique ids', async () => {
    const app = buildApp();
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        request(app)
          .post('/api/v1/menu')
          .send({ name: `Item-${index}` }),
      ),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);
    const ids = responses.map(
      (response) => (response.body as { id: string }).id,
    );
    expect(new Set(ids).size).toBe(20);
    expect(await MenuItemModel.countDocuments()).toBe(20);
  });

  it('CON-002: parallel creates with the same name yield one 201 and the rest 409', async () => {
    const app = buildApp();
    const responses = await Promise.all(
      Array.from({ length: 15 }, () =>
        request(app).post('/api/v1/menu').send({ name: 'Televisores' }),
      ),
    );

    const created = responses.filter((response) => response.status === 201);
    const conflicts = responses.filter((response) => response.status === 409);
    expect(created).toHaveLength(1);
    expect(conflicts).toHaveLength(14);
    expect(await MenuItemModel.countDocuments({ name: 'Televisores' })).toBe(1);
  });

  it('CON-005: refusing unsafe ids above MAX_SAFE_INTEGER', async () => {
    const logger = createLogger('info');
    const errorSpy = vi.spyOn(logger, 'error');

    await CounterModel.findOneAndUpdate(
      { _id: 'menu-item' },
      { $set: { seq: Number.MAX_SAFE_INTEGER } },
      { upsert: true },
    );

    const generator = new MongoIdGenerator(logger);
    await expect(generator.next()).rejects.toBeTruthy();
    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify(errorSpy.mock.calls)).toMatch(
      /MAX_SAFE_INTEGER|unsafe|alert/i,
    );
  });
});
