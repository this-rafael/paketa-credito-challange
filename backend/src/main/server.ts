/**
 * @packageDocumentation
 *
 * Process entry point: loads configuration, connects to MongoDB, wires the use
 * cases and starts listening. Also exposes the building blocks so tests can
 * boot the server without opening a port.
 */
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
import { shutdownTelemetry } from '../infrastructure/telemetry/start-telemetry.js';
import { createApp } from './create-app.js';

/** Result of `bootstrap`, exposing the wired pieces. */
export type BootstrapResult = {
  /** Validated environment configuration. */
  env: Env;
  /** Listening HTTP server. */
  server: Server;
  /** Application logger. */
  logger: Logger;
};

/**
 * Connects to the database, wires dependencies and starts the HTTP server.
 *
 * @returns A `BootstrapResult` once the server is listening.
 * @throws When MongoDB connection or index synchronization fails.
 */
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

/**
 * Stops the HTTP server and closes the MongoDB connection.
 *
 * @param server - The `Server{ returned by }bootstrap`.
 * @returns A promise that resolves once both are closed.
 */
export async function gracefulShutdown(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await mongoose.disconnect();
  await shutdownTelemetry();
}

/**
 * Boots the server and registers `SIGINT`/`SIGTERM` handlers for graceful
 * shutdown. Intended as the process entry point.
 *
 * @returns A promise that resolves once the server is listening (it then stays
 *   alive until a termination signal arrives).
 */
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
/** `true` when this module is executed directly (not imported by a test/harness). */
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
