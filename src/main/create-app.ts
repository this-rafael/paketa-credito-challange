/**
 * @packageDocumentation
 *
 * Composes the Express application: security headers, request id, logging, JSON
 * body handling, the menu router, the OpenAPI/Swagger endpoint and the error
 * handlers. Kept free of process/I/O so it can be reused in tests.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import type {
  CreateMenuItemPort,
  DeleteMenuSubtreePort,
  GetMenuTreePort,
} from '../http/controllers/menu-controller.js';
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

/** Configuration for `createApp`. All fields are optional. */
export type CreateAppOptions = {
  /** Maximum JSON body size passed to the body parser (e.g. `"100kb"`). */
  jsonBodyLimit?: string;
  /** Logger used by the HTTP logging middleware. */
  logger?: Logger;
  /** When provided, enables `POST /api/v1/menu`. */
  createMenuItem?: CreateMenuItemPort;
  /** When provided, enables `GET /api/v1/menu`. */
  getMenuTree?: GetMenuTreePort;
  /** When provided, enables `DELETE /api/v1/menu/:id`. */
  deleteMenuSubtree?: DeleteMenuSubtreePort;
};

const openApiDocument = YAML.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../openapi/openapi.yaml'),
    'utf8',
  ),
) as Record<string, unknown>;

/**
 * Builds the Express application.
 *
 * @param options - Optional `CreateAppOptions`; defaults to an info-level
 *   logger and no menu routes wired.
 * @returns A configured `Express` instance (not yet listening).
 */
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
