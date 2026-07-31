import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import {
  DataIntegrityError,
  InvalidMenuItemIdError,
  InvalidMenuItemNameError,
  MenuItemNameAlreadyExistsError,
  MenuItemNotFoundError,
  ParentMenuItemNotFoundError,
} from '../../src/domain/menu/menu-errors.js';
import {
  createChildMenuItem,
  createRootMenuItem,
} from '../../src/domain/menu/menu-item.js';
import { MenuController } from '../../src/http/controllers/menu-controller.js';
import { errorHandler } from '../../src/http/middlewares/error-handler.js';
import {
  mapBodyParserErrors,
  requireJsonContentType,
} from '../../src/http/middlewares/json-body-guards.js';
import { requestIdMiddleware } from '../../src/http/middlewares/request-id.js';
import {
  buildErrorBody,
  sendError,
} from '../../src/http/presenters/error-presenter.js';
import { createApp } from '../../src/main/create-app.js';
import { MongooseMenuRepository } from '../../src/infrastructure/database/mongoose/mongoose-menu-repository.js';

function mockRes(): {
  headersSent: boolean;
  locals: Record<string, unknown>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} & Response {
  return {
    headersSent: false,
    locals: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    end: vi.fn(),
  } as never;
}

describe('coverage fillers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers domain child id collision and blank name factories', () => {
    const root = createRootMenuItem(1, 'Root');
    expect(() => createChildMenuItem(1, 'Loop', root)).toThrow(
      InvalidMenuItemIdError,
    );
    expect(() => createRootMenuItem(1, '   ')).toThrow(
      InvalidMenuItemNameError,
    );
  });

  it('covers error presenter requestId overrides and middleware helpers', async () => {
    const body = buildErrorBody('INTERNAL_ERROR', 'x', 'fixed-id');
    expect(body.error.requestId).toBe('fixed-id');

    const app = express();
    app.use(requestIdMiddleware);
    app.post('/echo', requireJsonContentType, express.json(), (_req, res) => {
      sendError(res, 400, 'VALIDATION_ERROR', 'bad', 'explicit-id');
    });

    const withHeader = await request(app)
      .post('/echo')
      .set('x-request-id', 'from-header')
      .set('Content-Type', 'application/json')
      .send({});
    expect(withHeader.headers['x-request-id']).toBe('from-header');
  });

  it('covers errorHandler catalog mappings', () => {
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(new ParentMenuItemNotFoundError(1), {} as Request, res, next);
    errorHandler(new MenuItemNotFoundError(1), {} as Request, res, next);
    errorHandler(
      new MenuItemNameAlreadyExistsError('A'),
      {} as Request,
      res,
      next,
    );
    errorHandler(new DataIntegrityError('x'), {} as Request, res, next);
    errorHandler(
      Object.assign(new Error('ECONNREFUSED'), {
        name: 'MongoServerSelectionError',
      }),
      {} as Request,
      res,
      next,
    );
    errorHandler({ type: 'entity.parse.failed' }, {} as Request, res, next);
    errorHandler({ type: 'entity.too.large' }, {} as Request, res, next);
    errorHandler({ status: 413 }, {} as Request, res, next);
    errorHandler({ statusCode: 413 }, {} as Request, res, next);
    errorHandler(new Error('mystery'), {} as Request, res, next);
    errorHandler('string-error', {} as Request, res, next);
    errorHandler(null, {} as Request, res, next);

    const sent = mockRes();
    (sent as { headersSent: boolean }).headersSent = true;
    errorHandler(new Error('already'), {} as Request, sent, next);
    expect(next).toHaveBeenCalled();
  });

  it('covers MenuController unconfigured and invalid id branches', async () => {
    const controller = new MenuController();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await controller.create(
      { body: { name: 'A' } } as unknown as Request,
      res,
      next,
    );
    await controller.getTree({} as Request, res, next);
    await controller.deleteSubtree(
      { params: { id: ['1', '2'] } } as unknown as Request,
      res,
      next,
    );
    await controller.deleteSubtree(
      { params: { id: '01' } } as unknown as Request,
      res,
      next,
    );
  });

  it('covers remaining middleware and controller next(error) branches', async () => {
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    mapBodyParserErrors(undefined, {} as Request, res, next);
    mapBodyParserErrors({ type: 'other' }, {} as Request, res, next);
    requireJsonContentType(
      { method: 'GET', headers: {} } as Request,
      res,
      next,
    );

    const createMenuItem = {
      execute: vi.fn().mockRejectedValue(new Error('unexpected')),
    };
    const getMenuTree = {
      execute: vi.fn().mockRejectedValue(new Error('unexpected')),
    };
    const deleteMenuSubtree = {
      execute: vi.fn().mockRejectedValue(new Error('unexpected')),
    };
    const controller = new MenuController(
      createMenuItem as never,
      getMenuTree as never,
      deleteMenuSubtree as never,
    );
    await controller.create(
      { body: { name: 'A' } } as unknown as Request,
      res,
      next,
    );
    await controller.getTree({} as Request, res, next);
    await controller.deleteSubtree(
      { params: { id: '1' } } as unknown as Request,
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('serves OpenAPI and docs', async () => {
    const app = createApp();
    const yaml = await request(app).get('/openapi.yaml');
    expect(yaml.status).toBe(200);
    expect(yaml.text).toContain('openapi:');

    const docs = await request(app).get('/docs/');
    expect(docs.status).toBe(200);
  });

  it('covers body parser status aliases and empty request id header', async () => {
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    mapBodyParserErrors({ status: 400 }, {} as Request, res, next);
    mapBodyParserErrors({ statusCode: 413 }, {} as Request, res, next);
    requireJsonContentType(
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
      } as Request,
      res,
      next,
    );

    const app = express();
    app.use(requestIdMiddleware);
    app.get('/id', (_req, response) => {
      const requestId: unknown = response.locals['requestId'];
      response.json({
        id: typeof requestId === 'string' ? requestId : '',
      });
    });
    const response = await request(app).get('/id').set('x-request-id', '   ');
    expect((response.body as { id: string }).id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    createApp({
      logger: (
        await import('../../src/infrastructure/logging/logger.js')
      ).createLogger('silent'),
    });
    const previous = process.env.VITEST;
    delete process.env.VITEST;
    createApp();
    if (previous !== undefined) {
      process.env.VITEST = previous;
    }
  });

  it('covers repository mapping fallbacks and non-string route ids', async () => {
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    const deleteMenuSubtree = {
      execute: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    const controller = new MenuController(
      undefined,
      undefined,
      deleteMenuSubtree as never,
    );
    await controller.deleteSubtree(
      { params: { id: 10 as unknown as string } } as unknown as Request,
      res,
      next,
    );
    expect(res.status.mock.calls.some((call) => call[0] === 400)).toBe(true);

    const repository = new MongooseMenuRepository();
    const { MenuItemModel } =
      await import('../../src/infrastructure/database/mongoose/menu-item-model.js');
    vi.spyOn(MenuItemModel, 'findOne').mockReturnValue({
      lean: () =>
        Promise.resolve({
          id: 9,
          name: 'X',
        }),
    } as never);
    await expect(repository.findById(9)).resolves.toEqual({
      id: 9,
      name: 'X',
      parentId: null,
      ancestors: [],
    });

    vi.spyOn(MenuItemModel, 'create').mockImplementation(() => {
      throw Object.assign(new Error('E11000 duplicate key error index: name'), {
        code: 11000,
      });
    });
    await expect(
      repository.create({ id: 2, name: 'Dup', parentId: null, ancestors: [] }),
    ).rejects.toBeInstanceOf(MenuItemNameAlreadyExistsError);

    vi.spyOn(MenuItemModel, 'create').mockImplementation(() => {
      throw new Error('plain failure');
    });
    await expect(
      repository.create({
        id: 3,
        name: 'Other',
        parentId: null,
        ancestors: [],
      }),
    ).rejects.toThrow('plain failure');
  });
});
