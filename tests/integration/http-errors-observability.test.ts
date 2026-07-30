import { Writable } from 'node:stream';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import pino from 'pino';
import request from 'supertest';
import { CreateMenuItem } from '../../src/application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../../src/application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../../src/application/use-cases/get-menu-tree.js';
import { MongoIdGenerator } from '../../src/infrastructure/database/mongo-id-generator.js';
import { ensureMenuIndexes } from '../../src/infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MongooseMenuRepository } from '../../src/infrastructure/database/mongoose/mongoose-menu-repository.js';
import { createApp } from '../../src/main/create-app.js';
import {
  resetMongoCollections,
  startMongoTestContext,
  stopMongoTestContext,
} from './mongo-test-context.js';

type PublicError = {
  error: { code: string; message: string; requestId: string };
};

function asError(body: unknown): PublicError {
  return body as PublicError;
}

function createLogCapture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  const logger = pino({ level: 'info' }, stream);
  return {
    logger,
    lines,
    joined: () => lines.join('\n'),
  };
}

describe('HTTP errors and observability', () => {
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

  function buildApp(logger?: pino.Logger) {
    const repository = new MongooseMenuRepository();
    return createApp({
      ...(logger ? { logger } : {}),
      createMenuItem: new CreateMenuItem(repository, new MongoIdGenerator()),
      getMenuTree: new GetMenuTree(repository),
      deleteMenuSubtree: new DeleteMenuSubtree(repository),
    });
  }

  it('ERR-001/002: unknown route returns ROUTE_NOT_FOUND with nested error schema', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/v1/unknown');
    const body = asError(response.body);
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body).toEqual({
      error: {
        code: body.error.code,
        message: body.error.message,
        requestId: body.error.requestId,
      },
    });
  });

  it('ERR-003: database unavailable maps to 503 without internals', async () => {
    const repository = new MongooseMenuRepository();
    const getMenuTree = new GetMenuTree(repository);
    vi.spyOn(repository, 'findAllOrderedById').mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), {
        name: 'MongoServerSelectionError',
      }),
    );
    const app = createApp({
      getMenuTree,
      createMenuItem: new CreateMenuItem(repository, new MongoIdGenerator()),
      deleteMenuSubtree: new DeleteMenuSubtree(repository),
    });

    const response = await request(app).get('/api/v1/menu');
    const body = asError(response.body);
    expect(response.status).toBe(503);
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toMatch(
      /ECONNREFUSED|mongodb|mongoose|stack/i,
    );
  });

  it('ERR-004: uncatalogued failures become INTERNAL_ERROR without stack', async () => {
    const repository = new MongooseMenuRepository();
    const getMenuTree = new GetMenuTree(repository);
    vi.spyOn(getMenuTree, 'execute').mockRejectedValue(
      new Error('boom-secret'),
    );
    const app = createApp({ getMenuTree });

    const response = await request(app).get('/api/v1/menu');
    const body = asError(response.body);
    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('boom-secret');
    expect(JSON.stringify(body)).not.toMatch(/stack/i);
  });

  it('ERR-005/006: success and error logs include requestId and route metadata', async () => {
    const capture = createLogCapture();
    const app = buildApp(capture.logger);

    const created = await request(app)
      .post('/api/v1/menu')
      .send({ name: 'Root' });
    expect(created.status).toBe(201);

    const missing = await request(app).delete('/api/v1/menu/999');
    const requestId = asError(missing.body).error.requestId;
    expect(missing.status).toBe(404);

    const logs = capture.joined();
    expect(logs).toContain(requestId);
    expect(logs).toMatch(/"req"|"method"|"url"|"statusCode"|"responseTime"/);
  });

  it('ERR-007: does not log authorization, cookies or connection strings by default', async () => {
    const capture = createLogCapture();
    const app = buildApp(capture.logger);

    await request(app)
      .post('/api/v1/menu')
      .set('Authorization', 'Bearer secret-token')
      .set('Cookie', 'session=abc')
      .send({ name: 'Root' });

    const logs = capture.joined();
    expect(logs).not.toContain('Bearer secret-token');
    expect(logs).not.toContain('session=abc');
    expect(logs).not.toMatch(/mongodb:\/\//i);
  });

  it('ERR-008: applies Helmet security headers without permissive CORS', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/v1/menu');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('ERR-009: createApp source keeps the required middleware order', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../src/main/create-app.ts',
      ),
      'utf8',
    );

    const requestIdAt = source.indexOf('app.use(requestIdMiddleware)');
    const loggerAt = source.indexOf('app.use(httpLoggerMiddleware');
    const helmetAt = source.indexOf('app.use(\n    helmet');
    if (helmetAt < 0) {
      expect(source.indexOf('helmet(')).toBeGreaterThan(loggerAt);
    } else {
      expect(helmetAt).toBeGreaterThan(loggerAt);
    }
    const mediaAt = source.indexOf('app.use(requireJsonContentType)');
    const jsonAt = source.indexOf('app.use(express.json');
    const routesAt = source.indexOf("'/api/v1/menu'");
    const notFoundAt = source.indexOf('app.use(notFoundMiddleware)');
    const errorHandlerAt = source.indexOf('app.use(errorHandler)');

    expect(requestIdAt).toBeGreaterThan(-1);
    expect(loggerAt).toBeGreaterThan(requestIdAt);
    expect(source.indexOf('helmet(')).toBeGreaterThan(loggerAt);
    expect(mediaAt).toBeGreaterThan(source.indexOf('helmet('));
    expect(jsonAt).toBeGreaterThan(mediaAt);
    expect(routesAt).toBeGreaterThan(jsonAt);
    expect(notFoundAt).toBeGreaterThan(routesAt);
    expect(errorHandlerAt).toBeGreaterThan(notFoundAt);
  });
});
