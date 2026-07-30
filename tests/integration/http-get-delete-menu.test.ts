import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../../src/application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../../src/application/use-cases/get-menu-tree.js';
import { MongoIdGenerator } from '../../src/infrastructure/database/mongo-id-generator.js';
import { ensureMenuIndexes } from '../../src/infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MenuItemModel } from '../../src/infrastructure/database/mongoose/menu-item-model.js';
import { MongooseMenuRepository } from '../../src/infrastructure/database/mongoose/mongoose-menu-repository.js';
import { createApp } from '../../src/main/create-app.js';
import {
  resetMongoCollections,
  startMongoTestContext,
  stopMongoTestContext,
} from './mongo-test-context.js';

type ErrorBody = { error: { code: string } };
type CreatedBody = { id: string };

function errorBody(value: unknown): ErrorBody['error'] {
  return (value as ErrorBody).error;
}

function createdBody(value: unknown): CreatedBody {
  return value as CreatedBody;
}

function buildApp() {
  const repository = new MongooseMenuRepository();
  const ids = new MongoIdGenerator();
  return createApp({
    createMenuItem: new CreateMenuItem(repository, ids),
    getMenuTree: new GetMenuTree(repository),
    deleteMenuSubtree: new DeleteMenuSubtree(repository),
  });
}

async function createItem(
  app: ReturnType<typeof buildApp>,
  name: string,
  relatedId?: number,
): Promise<string> {
  const response = await request(app)
    .post('/api/v1/menu')
    .send(relatedId === undefined ? { name } : { name, relatedId });
  expect(response.status).toBe(201);
  return createdBody(response.body).id;
}

describe('GET and DELETE /api/v1/menu', () => {
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

  it('GET-001: empty menu returns [] without requiring Content-Type', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/v1/menu');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('GET-002/API-005: returns the challenge forest with string ids and no leaf submenus', async () => {
    const app = buildApp();
    const eletro = await createItem(app, 'Eletrodomésticos');
    const tvs = await createItem(app, 'Televisores', Number(eletro));
    const lcd = await createItem(app, 'LCD', Number(tvs));
    await createItem(app, '110', Number(lcd));
    await createItem(app, '220', Number(lcd));
    await createItem(app, 'Plasma', Number(tvs));
    const info = await createItem(app, 'Informática');
    const computers = await createItem(app, 'Computadores', Number(info));
    const apple = await createItem(app, 'Apple', Number(computers));
    const macbook = await createItem(app, 'MacBook', Number(apple));
    await createItem(app, 'Cabos', Number(macbook));
    await createItem(app, 'iMac', Number(apple));

    const response = await request(app).get('/api/v1/menu');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: '1',
        name: 'Eletrodomésticos',
        submenus: [
          {
            id: '2',
            name: 'Televisores',
            submenus: [
              {
                id: '3',
                name: 'LCD',
                submenus: [
                  { id: '4', name: '110' },
                  { id: '5', name: '220' },
                ],
              },
              { id: '6', name: 'Plasma' },
            ],
          },
        ],
      },
      {
        id: '7',
        name: 'Informática',
        submenus: [
          {
            id: '8',
            name: 'Computadores',
            submenus: [
              {
                id: '9',
                name: 'Apple',
                submenus: [
                  {
                    id: '10',
                    name: 'MacBook',
                    submenus: [{ id: '11', name: 'Cabos' }],
                  },
                  { id: '12', name: 'iMac' },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('GET-009: orphan parentId yields INTERNAL_ERROR without internals', async () => {
    const app = buildApp();
    await MenuItemModel.create({
      id: 1,
      name: 'Orphan',
      parentId: 99,
      ancestors: [99],
    });

    const response = await request(app).get('/api/v1/menu');
    expect(response.status).toBe(500);
    expect(errorBody(response.body).code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(
      /stack|mongodb|mongoose|uri/i,
    );
  });

  it('DEL-001: deleting a leaf removes only that item', async () => {
    const app = buildApp();
    const root = await createItem(app, 'Root');
    const leaf = await createItem(app, 'Leaf', Number(root));

    const response = await request(app).delete(`/api/v1/menu/${leaf}`);
    expect(response.status).toBe(200);
    expect(await MenuItemModel.countDocuments({ id: Number(leaf) })).toBe(0);
    expect(await MenuItemModel.countDocuments({ id: Number(root) })).toBe(1);
  });

  it('DEL-002: deleting a subtree removes descendants and keeps siblings', async () => {
    const app = buildApp();
    const eletro = await createItem(app, 'Eletrodomésticos');
    const tvs = await createItem(app, 'Televisores', Number(eletro));
    await createItem(app, 'LCD', Number(tvs));
    await createItem(app, 'Informática');

    const response = await request(app).delete(`/api/v1/menu/${tvs}`);
    expect(response.status).toBe(200);
    expect(await MenuItemModel.countDocuments({ name: 'Televisores' })).toBe(0);
    expect(await MenuItemModel.countDocuments({ name: 'LCD' })).toBe(0);
    expect(
      await MenuItemModel.countDocuments({ name: 'Eletrodomésticos' }),
    ).toBe(1);
    expect(await MenuItemModel.countDocuments({ name: 'Informática' })).toBe(1);
  });

  it('DEL-004/005: missing item and repeated delete return 404', async () => {
    const app = buildApp();
    const root = await createItem(app, 'Root');
    await request(app).delete(`/api/v1/menu/${root}`);
    const missing = await request(app).delete('/api/v1/menu/999');
    const repeated = await request(app).delete(`/api/v1/menu/${root}`);
    expect(missing.status).toBe(404);
    expect(errorBody(missing.body).code).toBe('MENU_ITEM_NOT_FOUND');
    expect(repeated.status).toBe(404);
    expect(errorBody(repeated.body).code).toBe('MENU_ITEM_NOT_FOUND');
  });

  it.each(['0', '-1', '1.5', 'abc', '01', '+1', '1e2', '9007199254740992'])(
    'DEL-006: rejects invalid route id %s',
    async (id) => {
      const app = buildApp();
      const response = await request(app).delete(`/api/v1/menu/${id}`);
      expect(response.status).toBe(400);
      expect(errorBody(response.body).code).toBe('INVALID_MENU_ITEM_ID');
    },
  );
});
