import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const headerValue = req.headers['x-request-id'];
  const requestId =
    typeof headerValue === 'string' && headerValue.trim().length > 0
      ? headerValue
      : randomUUID();
  res.locals['requestId'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
