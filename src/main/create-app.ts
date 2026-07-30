import express, { type Express } from 'express';
import type { CreateMenuItem } from '../application/use-cases/create-menu-item.js';
import { requireJsonContentType, mapBodyParserErrors } from '../http/middlewares/json-body-guards.js';
import { createMenuRouter } from '../http/routes/menu-routes.js';

export type CreateAppOptions = {
  createMenuItem?: CreateMenuItem;
  jsonBodyLimit?: string;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  app.use(requireJsonContentType);
  app.use(express.json({ limit: options.jsonBodyLimit ?? '100kb' }));
  app.use(mapBodyParserErrors);
  if (options.createMenuItem) {
    app.use('/api/v1/menu', createMenuRouter({ createMenuItem: options.createMenuItem }));
  }
  return app;
}
