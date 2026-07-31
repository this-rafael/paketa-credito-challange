/**
 * @packageDocumentation
 *
 * Assigns a correlation id to every request and echoes it back in the
 * `x-request-id` response header so failures can be traced end to end.
 */
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Generates (or reuses) a request id and stores it on `res.locals` and the
 * `x-request-id` header.
 *
 * @param req - Incoming request.
 * @param res - Express response.
 * @param next - Next middleware.
 */
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
