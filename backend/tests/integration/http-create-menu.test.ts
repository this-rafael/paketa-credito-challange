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
import { MongoIdGenerator } from '../../src/infrastructure/database/mongo-id-generator.js';
import { CounterModel } from '../../src/infrastructure/database/mongoose/counter-model.js';
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

describe('POST /api/v1/menu', () => {
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

  function buildApp(jsonBodyLimit = '1kb') {
    const repository = new MongooseMenuRepository();
    const createMenuItem = new CreateMenuItem(
      repository,
      new MongoIdGenerator(),
    );
    return {
      app: createApp({ jsonBodyLimit, createMenuItem }),
      createMenuItem,
      repository,
    };
  }

  it.each([{}, { name: null }, { name: 123 }, { name: '' }, { name: '   ' }])(
    'VAL-001: rejects invalid name body %j',
    async (body) => {
      const { app } = buildApp();
      const response = await request(app).post('/api/v1/menu').send(body);
      expect(response.status).toBe(400);
      expect(errorBody(response.body).code).toBe('VALIDATION_ERROR');
      expect(await MenuItemModel.countDocuments()).toBe(0);
    },
  );

  it.each([
    { name: 'Item', relatedId: null },
    { name: 'Item', relatedId: '1' },
    { name: 'Item', relatedId: 0 },
    { name: 'Item', relatedId: -1 },
    { name: 'Item', relatedId: 1.5 },
    { name: 'Item', relatedId: 9007199254740992 },
  ])('VAL-002: rejects invalid relatedId body %j', async (body) => {
    const { app } = buildApp();
    const response = await request(app).post('/api/v1/menu').send(body);
    expect(response.status).toBe(400);
    expect(errorBody(response.body).code).toBe('VALIDATION_ERROR');
    expect(await MenuItemModel.countDocuments()).toBe(0);
  });

  it('VAL-003: rejects unknown properties', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Televisores', position: 1 });
    expect(response.status).toBe(400);
    expect(errorBody(response.body).code).toBe('VALIDATION_ERROR');
  });

  it('VAL-004: rejects malformed JSON without leaking parser details', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/api/v1/menu')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(response.status).toBe(400);
    expect(errorBody(response.body).code).toBe('INVALID_JSON');
    expect(JSON.stringify(response.body)).not.toMatch(
      /stack|SyntaxError|Unexpected/i,
    );
  });

  it.each(['text/plain', 'application/x-www-form-urlencoded'])(
    'VAL-005: rejects incompatible media type %s',
    async (type) => {
      const { app } = buildApp();
      const response = await request(app)
        .post('/api/v1/menu')
        .set('Content-Type', type)
        .send('name=Item');
      expect(response.status).toBe(415);
      expect(errorBody(response.body).code).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(await MenuItemModel.countDocuments()).toBe(0);
    },
  );

  it('VAL-005: rejects missing Content-Type', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/api/v1/menu')
      .unset('Content-Type')
      .send('{"name":"Item"}');
    expect(response.status).toBe(415);
    expect(errorBody(response.body).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('VAL-006: rejects oversized payloads', async () => {
    const { app } = buildApp('32b');
    const response = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'X'.repeat(200) });
    expect(response.status).toBe(413);
    expect(errorBody(response.body).code).toBe('PAYLOAD_TOO_LARGE');
    expect(await MenuItemModel.countDocuments()).toBe(0);
  });

  it('VAL-007: invalid input never reaches the use case', async () => {
    const repository = new MongooseMenuRepository();
    const createMenuItem = new CreateMenuItem(
      repository,
      new MongoIdGenerator(),
    );
    const spy = vi.spyOn(createMenuItem, 'execute');
    const app = createApp({ createMenuItem });

    await request(app).post('/api/v1/menu').send({ name: '' });
    await request(app)
      .post('/api/v1/menu')
      .set('Content-Type', 'application/json')
      .send('{');
    await request(app)
      .post('/api/v1/menu')
      .set('Content-Type', 'text/plain')
      .send('x');

    expect(spy).not.toHaveBeenCalled();
  });

  it('CRT-001: creates a root and returns only string id', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Eletrodomésticos' });
    const body = createdBody(response.body);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(Object.keys(body)).toEqual(['id']);
    expect(typeof body.id).toBe('string');
    expect(body.id).toMatch(/^\d+$/);

    const stored = await MenuItemModel.findOne({ id: Number(body.id) }).lean();
    expect(stored?.parentId ?? null).toBeNull();
    expect(stored?.ancestors).toEqual([]);
  });

  it('CRT-002: trims the name over HTTP', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/api/v1/menu')
      .send({ name: '  Televisores  ' });
    const body = createdBody(response.body);
    expect(response.status).toBe(201);
    const stored = await MenuItemModel.findOne({ id: Number(body.id) }).lean();
    expect(stored?.name).toBe('Televisores');
  });

  it('CRT-003/004: creates nested children with numeric relatedId', async () => {
    const { app } = buildApp();
    const root = createdBody(
      (
        await request(app)
          .post('/api/v1/menu')
          .send({ name: 'Eletrodomésticos' })
      ).body,
    );
    const tvs = createdBody(
      (
        await request(app)
          .post('/api/v1/menu')
          .send({ name: 'Televisores', relatedId: Number(root.id) })
      ).body,
    );
    const lcd = createdBody(
      (
        await request(app)
          .post('/api/v1/menu')
          .send({ name: 'LCD', relatedId: Number(tvs.id) })
      ).body,
    );
    const leafResponse = await request(app)
      .post('/api/v1/menu')
      .send({ name: '110', relatedId: Number(lcd.id) });
    const leaf = createdBody(leafResponse.body);

    expect(leafResponse.status).toBe(201);
    const stored = await MenuItemModel.findOne({ id: Number(leaf.id) }).lean();
    expect(stored?.parentId).toBe(Number(lcd.id));
    expect(stored?.ancestors).toEqual([
      Number(root.id),
      Number(tvs.id),
      Number(lcd.id),
    ]);
  });

  it('CRT-005: missing parent returns 404 without consuming an id', async () => {
    const { app } = buildApp();
    const before = await CounterModel.findById('menu-item').lean();
    const response = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Órfão', relatedId: 999 });
    expect(response.status).toBe(404);
    expect(errorBody(response.body).code).toBe('PARENT_MENU_ITEM_NOT_FOUND');
    const after = await CounterModel.findById('menu-item').lean();
    expect(after?.seq ?? 0).toBe(before?.seq ?? 0);
  });

  it('CRT-006/007/012: duplicate names return 409', async () => {
    const { app } = buildApp();
    await request(app).post('/api/v1/menu').send({ name: 'Televisores' });
    const duplicate = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Televisores' });
    const spaced = await request(app)
      .post('/api/v1/menu')
      .send({ name: ' Televisores ' });
    expect(duplicate.status).toBe(409);
    expect(errorBody(duplicate.body).code).toBe(
      'MENU_ITEM_NAME_ALREADY_EXISTS',
    );
    expect(spaced.status).toBe(409);
    expect(await MenuItemModel.countDocuments({ name: 'Televisores' })).toBe(1);
  });

  it('CRT-008/009: name comparison is case and accent sensitive', async () => {
    const { app } = buildApp();
    await request(app).post('/api/v1/menu').send({ name: 'Televisores' });
    const lower = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'televisores' });
    await request(app).post('/api/v1/menu').send({ name: 'Informática' });
    const noAccent = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Informatica' });

    expect(lower.status).toBe(201);
    expect(noAccent.status).toBe(201);
    expect(await MenuItemModel.countDocuments()).toBe(4);
  });

  it('CRT-011: does not require Idempotency-Key', async () => {
    const { app } = buildApp();
    const response = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Cabos' });
    expect(response.status).toBe(201);
  });
});
