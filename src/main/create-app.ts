import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import type { CreateMenuItem } from '../application/use-cases/create-menu-item.js';
import type { DeleteMenuSubtree } from '../application/use-cases/delete-menu-subtree.js';
import type { GetMenuTree } from '../application/use-cases/get-menu-tree.js';
import { errorHandler } from '../http/middlewares/error-handler.js';
import { httpLoggerMiddleware } from '../http/middlewares/http-logger.js';
import {
  mapBodyParserErrors,
  requireJsonContentType,
} from '../http/middlewares/json-body-guards.js';
import { notFoundMiddleware } from '../http/middlewares/not-found.js';
import { requestIdMiddleware } from '../http/middlewares/request-id.js';
import { createMenuRouter } from '../http/routes/menu-routes.js';
import { createLogger } from '../infrastructure/logging/logger.js';

export type CreateAppOptions = {
  jsonBodyLimit?: string;
  logger?: Logger;
  createMenuItem?: CreateMenuItem;
  getMenuTree?: GetMenuTree;
  deleteMenuSubtree?: DeleteMenuSubtree;
};

const openApiDocument = YAML.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../openapi/openapi.yaml'),
    'utf8',
  ),
) as Record<string, unknown>;

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const logger =
    options.logger ?? createLogger(process.env['VITEST'] ? 'silent' : 'info');

  app.use(requestIdMiddleware);
  app.use(httpLoggerMiddleware(logger));
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(requireJsonContentType);
  app.use(express.json({ limit: options.jsonBodyLimit ?? '100kb' }));
  app.use(mapBodyParserErrors);

  app.get('/openapi.yaml', (_req, res) => {
    res
      .type('application/yaml')
      .send(
        readFileSync(
          join(
            dirname(fileURLToPath(import.meta.url)),
            '../../openapi/openapi.yaml',
          ),
          'utf8',
        ),
      );
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  if (
    options.createMenuItem ||
    options.getMenuTree ||
    options.deleteMenuSubtree
  ) {
    app.use(
      '/api/v1/menu',
      createMenuRouter({
        ...(options.createMenuItem
          ? { createMenuItem: options.createMenuItem }
          : {}),
        ...(options.getMenuTree ? { getMenuTree: options.getMenuTree } : {}),
        ...(options.deleteMenuSubtree
          ? { deleteMenuSubtree: options.deleteMenuSubtree }
          : {}),
      }),
    );
  }

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
