import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../presenters/error-presenter.js';

export function requireJsonContentType(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    next();
    return;
  }
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    sendError(
      res,
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json',
    );
    return;
  }
  next();
}

export function mapBodyParserErrors(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!error || typeof error !== 'object') {
    next(error);
    return;
  }

  const err = error as { type?: string; status?: number; statusCode?: number };
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON body');
    return;
  }
  if (
    err.type === 'entity.too.large' ||
    err.status === 413 ||
    err.statusCode === 413
  ) {
    sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds size limit');
    return;
  }
  next(error);
}
