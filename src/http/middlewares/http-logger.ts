import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Handler } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

export function createHttpLogger(logger: Logger): Handler {
  return pinoHttp({
    logger,
    genReqId: (_req: IncomingMessage, res: ServerResponse) => {
      return (res as ServerResponse & { locals: { requestId: string } }).locals
        .requestId;
    },
    customProps: (req: IncomingMessage & { id?: string }) => ({
      requestId: req.id,
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

export function httpLoggerMiddleware(logger: Logger): Handler {
  return createHttpLogger(logger);
}
