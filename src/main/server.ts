import type { Server } from 'node:http';
import mongoose from 'mongoose';
import type { Logger } from 'pino';
import { CreateMenuItem } from '../application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../application/use-cases/get-menu-tree.js';
import { loadEnv, type Env } from '../infrastructure/config/env.js';
import { MongoIdGenerator } from '../infrastructure/database/mongo-id-generator.js';
import { ensureMenuIndexes } from '../infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MongooseMenuRepository } from '../infrastructure/database/mongoose/mongoose-menu-repository.js';
import { createLogger } from '../infrastructure/logging/logger.js';
import { createApp } from './create-app.js';

export type BootstrapResult = {
  env: Env;
  server: Server;
  logger: Logger;
};

export async function bootstrap(): Promise<BootstrapResult> {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);

  await mongoose.connect(env.MONGODB_URI);
  await ensureMenuIndexes();

  const repository = new MongooseMenuRepository();
  const idGenerator = new MongoIdGenerator(logger);
  const app = createApp({
    jsonBodyLimit: env.JSON_BODY_LIMIT,
    logger,
    createMenuItem: new CreateMenuItem(repository, idGenerator),
    getMenuTree: new GetMenuTree(repository),
    deleteMenuSubtree: new DeleteMenuSubtree(repository),
  });

  const server = await new Promise<Server>((resolve, reject) => {
    const httpServer = app.listen(env.PORT);
    httpServer.once('listening', () => resolve(httpServer));
    httpServer.once('error', reject);
    // Some mocks invoke listen without emitting; resolve immediately when already open.
    if (typeof httpServer.listening === 'boolean' && httpServer.listening) {
      resolve(httpServer);
    }
  });

  return { env, server, logger };
}

export async function gracefulShutdown(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await mongoose.disconnect();
}

export async function startServer(): Promise<void> {
  const { server, logger, env } = await bootstrap();
  logger.info({ port: env.PORT }, 'server listening');

  const onSignal = () => {
    void gracefulShutdown(server)
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'shutdown failed');
        process.exit(1);
      });
  };

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
}

const entryPath = process.argv[1]?.replaceAll('\\', '/');
const isDirectRun =
  entryPath !== undefined &&
  (import.meta.url === `file://${entryPath}` ||
    import.meta.url.endsWith(entryPath));

if (isDirectRun) {
  void startServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
