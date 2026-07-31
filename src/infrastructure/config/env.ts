import { z } from 'zod';

const envSchema = z.object({
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
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): Env {
  return envSchema.parse({
    PORT: source.PORT ?? '3000',
    MONGODB_URI: source.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/menu',
    LOG_LEVEL: source.LOG_LEVEL ?? 'info',
    JSON_BODY_LIMIT: source.JSON_BODY_LIMIT ?? '100kb',
  });
}
