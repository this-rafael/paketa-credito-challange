/**
 * @packageDocumentation
 *
 * Validates and loads process configuration from the environment. Invalid values
 * cause the process to fail fast before the HTTP server opens a port.
 */
import { z } from 'zod';

/** Zod schema describing the required environment variables. */
export const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive(),
    MONGODB_URI: z.string().min(1),
    LOG_LEVEL: z.enum([
      'fatal',
      'error',
      'warn',
      'info',
      'debug',
      'trace',
      'silent',
    ]),
    JSON_BODY_LIMIT: z.string().min(1),
    ENABLE_DISTRIBUTED_LOCK: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    REDIS_URL: z.string().min(1).optional(),
    LOCK_TTL_MS: z.coerce.number().int().positive().default(5000),
    LOCK_RETRY_COUNT: z.coerce.number().int().nonnegative().default(3),
  })
  .superRefine((env, ctx) => {
    if (env.ENABLE_DISTRIBUTED_LOCK && !env.REDIS_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required when ENABLE_DISTRIBUTED_LOCK is true',
      });
    }
  });

/** Validated application configuration. */
export type Env = z.infer<typeof envSchema>;

/**
 * Loads and validates configuration.
 *
 * @param source - Variable source; defaults to `process.env`. Useful for tests.
 * @returns A validated `Env` object (with documented defaults applied for
 *   missing optional values).
 * @throws When the resolved variables violate `envSchema`.
 */
export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  return envSchema.parse({
    PORT: source.PORT ?? '3000',
    MONGODB_URI: source.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/menu',
    LOG_LEVEL: source.LOG_LEVEL ?? 'info',
    JSON_BODY_LIMIT: source.JSON_BODY_LIMIT ?? '100kb',
    ENABLE_DISTRIBUTED_LOCK: source.ENABLE_DISTRIBUTED_LOCK ?? 'false',
    REDIS_URL: source.REDIS_URL,
    LOCK_TTL_MS: source.LOCK_TTL_MS ?? '5000',
    LOCK_RETRY_COUNT: source.LOCK_RETRY_COUNT ?? '3',
  });
}
