/**
 * @packageDocumentation
 *
 * Application logger built on Pino. Sensitive headers and connection strings are
 * redacted from every log record.
 */
import pino, { type Logger } from 'pino';

/**
 * Creates a Pino logger with sensible redaction defaults.
 *
 * @param level - Minimum log level (`fatal{ … }trace{ ); defaults to }info`.
 * @returns A configured `Logger`.
 */
export function createLogger(level = 'info'): Logger {
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        '*.connectionString',
        '*.uri',
        'MONGODB_URI',
      ],
      remove: true,
    },
  });
}
