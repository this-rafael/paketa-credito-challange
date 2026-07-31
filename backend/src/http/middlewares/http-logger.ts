/**
 * @packageDocumentation
 *
 * HTTP request logging middleware built on `pino-http`. It reuses the correlation
 * id produced by the request-id middleware and redacts sensitive headers.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Handler } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { activeTraceFields } from '../../infrastructure/telemetry/tracing.js';

/**
 * Builds a `pino-http` handler bound to the given logger.
 *
 * The request id is sourced from `res.locals.requestId` (set by the request-id
 * middleware), the request/response serializers keep only `id{ , }method{ , }url`
 * and `statusCode`, and authorization/cookie headers are redacted.
 *
 * @param logger - Pino logger used to emit request logs.
 * @returns An Express `Handler`.
 */
export function createHttpLogger(logger: Logger): Handler {
  return pinoHttp({
    logger,
    genReqId: (_req: IncomingMessage, res: ServerResponse) => {
      return (res as ServerResponse & { locals: { requestId: string } }).locals
        .requestId;
    },
    customProps: (req: IncomingMessage & { id?: string }) => ({
      requestId: req.id,
      ...activeTraceFields(),
    }),
    serializers: {
      req(req: IncomingMessage & { id?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
      ],
      remove: true,
    },
  }) as Handler;
}

/**
 * Creates the HTTP logging middleware.
 *
 * @param logger - Pino logger used to emit request logs.
 * @returns An Express `Handler{ produced by }createHttpLogger`.
 */
export function httpLoggerMiddleware(logger: Logger): Handler {
  return createHttpLogger(logger);
}
