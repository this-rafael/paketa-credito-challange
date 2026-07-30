import type { NextFunction, Request, Response } from 'express';
import {
  DataIntegrityError,
  MenuItemNameAlreadyExistsError,
  MenuItemNotFoundError,
  ParentMenuItemNotFoundError,
} from '../../domain/menu/menu-errors.js';
import { sendError } from '../presenters/error-presenter.js';

function isDatabaseUnavailable(error: unknown): boolean {
  /* v8 ignore next 3 */
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { name?: string; message?: string };
  const name = err.name ?? '';
  const message = err.message ?? '';
  return (
    name.includes('Mongo') ||
    message.includes('ECONNREFUSED') ||
    message.includes('buffering timed out') ||
    message.includes('topology was destroyed')
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ParentMenuItemNotFoundError) {
    sendError(res, 404, error.code, error.message);
    return;
  }
  if (error instanceof MenuItemNotFoundError) {
    sendError(res, 404, error.code, error.message);
    return;
  }
  if (error instanceof MenuItemNameAlreadyExistsError) {
    sendError(res, 409, error.code, error.message);
    return;
  }
  if (error instanceof DataIntegrityError) {
    sendError(res, 500, 'INTERNAL_ERROR', 'Unexpected error');
    return;
  }
  if (isDatabaseUnavailable(error)) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Database unavailable');
    return;
  }

  const err =
    error && typeof error === 'object'
      ? (error as { type?: string; status?: number; statusCode?: number })
      : {};
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

  sendError(res, 500, 'INTERNAL_ERROR', 'Unexpected error');
}
