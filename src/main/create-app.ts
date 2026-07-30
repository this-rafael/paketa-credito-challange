import express, { type Express } from 'express';
import type { CreateMenuItem } from '../application/use-cases/create-menu-item.js';
import type { GetMenuTree } from '../application/use-cases/get-menu-tree.js';
import { requireJsonContentType, mapBodyParserErrors } from '../http/middlewares/json-body-guards.js';
import { createMenuRouter } from '../http/routes/menu-routes.js';

export type CreateAppOptions = {
  createMenuItem?: CreateMenuItem;
  getMenuTree?: GetMenuTree;
  jsonBodyLimit?: string;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  app.use(requireJsonContentType);
  app.use(express.json({ limit: options.jsonBodyLimit ?? '100kb' }));
  app.use(mapBodyParserErrors);
  if (options.createMenuItem || options.getMenuTree) {
    app.use('/api/v1/menu', createMenuRouter({
      ...(options.createMenuItem ? { createMenuItem: options.createMenuItem } : {}),
      ...(options.getMenuTree ? { getMenuTree: options.getMenuTree } : {}),
    }));
  }
  return app;
}
