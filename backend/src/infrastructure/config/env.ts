/**
 * @packageDocumentation
 *
 * Validates and loads process configuration from the environment. Invalid values
 * cause the process to fail fast before the HTTP server opens a port.
 */
import { z } from 'zod';

/** Zod schema describing the required environment variables. */
export const envSchema = z.object({
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
  OTEL_ENABLED: z.boolean(),
  OTEL_SERVICE_NAME: z.string().trim().min(1),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url(),
});

/** Validated application configuration. */
export type Env = z.infer<typeof envSchema>;

/**
 * Parses a boolean-like environment flag.
 *
 * @param raw - Raw string value.
 * @param fallback - Value used when `raw` is missing.
 * @returns Parsed boolean.
 */
function parseBoolFlag(
  raw: string | undefined,
  fallback: boolean,
): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === 'true' || raw === '1';
}

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
  const otelDefault = source['VITEST']
    ? false
    : parseBoolFlag(source['OTEL_ENABLED'], true);

  return envSchema.parse({
    PORT: source.PORT ?? '3000',
    MONGODB_URI: source.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/menu',
    LOG_LEVEL: source.LOG_LEVEL ?? 'info',
    JSON_BODY_LIMIT: source.JSON_BODY_LIMIT ?? '100kb',
    OTEL_ENABLED: source['VITEST']
      ? parseBoolFlag(source['OTEL_ENABLED'], false)
      : otelDefault,
    OTEL_SERVICE_NAME: source.OTEL_SERVICE_NAME ?? 'menu-api',
    OTEL_EXPORTER_OTLP_ENDPOINT:
      source.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://127.0.0.1:4318',
  });
}
