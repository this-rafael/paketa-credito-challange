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
import { LockedCreateMenuItem } from '../application/use-cases/locked-create-menu-item.js';
import { LockedDeleteMenuSubtree } from '../application/use-cases/locked-delete-menu-subtree.js';
import { CreateMenuItem } from '../application/use-cases/create-menu-item.js';
import { DeleteMenuSubtree } from '../application/use-cases/delete-menu-subtree.js';
import { GetMenuTree } from '../application/use-cases/get-menu-tree.js';
import type { SubtreeLock } from '../application/ports/subtree-lock.js';
import { loadEnv, type Env } from '../infrastructure/config/env.js';
import { MongoIdGenerator } from '../infrastructure/database/mongo-id-generator.js';
import { ensureMenuIndexes } from '../infrastructure/database/mongoose/ensure-menu-indexes.js';
import { MongooseMenuRepository } from '../infrastructure/database/mongoose/mongoose-menu-repository.js';
import { createLogger } from '../infrastructure/logging/logger.js';
import { NoopSubtreeLock } from '../infrastructure/redis/noop-subtree-lock.js';
import { RedlockSubtreeLock } from '../infrastructure/redis/redlock-subtree-lock.js';
import { createApp } from './create-app.js';

/** Result of `bootstrap`, exposing the wired pieces. */
export type BootstrapResult = {
  /** Validated environment configuration. */
  env: Env;
  /** Listening HTTP server. */
  server: Server;
  /** Application logger. */
  logger: Logger;
  /** Active subtree lock (may hold Redis connections). */
  lock: SubtreeLock;
};

/**
 * Builds the subtree lock from env (Redlock when enabled, otherwise no-op).
 *
 * @param env - Validated environment.
 * @returns A `SubtreeLock` implementation.
 */
export function createSubtreeLock(env: Env): SubtreeLock {
  if (!env.ENABLE_DISTRIBUTED_LOCK) {
    return new NoopSubtreeLock();
  }
  if (!env.REDIS_URL) {
    throw new Error(
      'REDIS_URL is required when ENABLE_DISTRIBUTED_LOCK is true',
    );
  }
  return new RedlockSubtreeLock(env.REDIS_URL, {
    ttlMs: env.LOCK_TTL_MS,
    retryCount: env.LOCK_RETRY_COUNT,
  });
}

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
  const lock = createSubtreeLock(env);
  const raceDelayMs = env.CREATE_RACE_DELAY_MS;
  const app = createApp({
    jsonBodyLimit: env.JSON_BODY_LIMIT,
    logger,
    createMenuItem: new LockedCreateMenuItem(
      new CreateMenuItem(
        repository,
        idGenerator,
        raceDelayMs > 0
          ? {
              afterParentLookup: () =>
                new Promise<void>((resolve) =>
                  setTimeout(resolve, raceDelayMs),
                ),
            }
          : {},
      ),
      lock,
    ),
    getMenuTree: new GetMenuTree(repository),
    deleteMenuSubtree: new LockedDeleteMenuSubtree(
      new DeleteMenuSubtree(repository),
      lock,
    ),
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

  return { env, server, logger, lock };
}

/**
 * Stops the HTTP server, closes Redis (when present) and closes MongoDB.
 *
 * @param server - The `Server{ returned by }bootstrap`.
 * @param lock - Optional lock to close (Redis client).
 * @returns A promise that resolves once both are closed.
 */
export async function gracefulShutdown(
  server: Server,
  lock?: SubtreeLock,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (lock?.close) {
    await lock.close();
  }
  await mongoose.disconnect();
}

/**
 * Boots the server and registers `SIGINT`/`SIGTERM` handlers for graceful
 * shutdown. Intended as the process entry point.
 *
 * @returns A promise that resolves once the server is listening (it then stays
 *   alive until a termination signal arrives).
 */
export async function startServer(): Promise<void> {
  const { server, logger, env, lock } = await bootstrap();
  logger.info(
    {
      port: env.PORT,
      distributedLock: env.ENABLE_DISTRIBUTED_LOCK,
    },
    'server listening',
  );

  const onSignal = () => {
    void gracefulShutdown(server, lock)
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'shutdown failed');
        process.exit(1);
      });
  };

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
}

// Under PM2 cluster mode argv[1] is PM2's ProcessContainer, not this script;
// pm_exec_path carries the real entry point.
const entryPath = (process.env['pm_exec_path'] ?? process.argv[1])?.replaceAll(
  '\\',
  '/',
);
/** `true` when this module is executed directly (not imported by a test/harness). */
const isDirectRun =
  entryPath !== undefined &&
  !process.env['VITEST'] &&
  (import.meta.url === `file://${entryPath}` ||
    import.meta.url.endsWith(entryPath));

if (isDirectRun) {
  void startServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
