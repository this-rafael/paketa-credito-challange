import pino, { type Logger } from 'pino';

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
