/**
 * @packageDocumentation
 *
 * Terminal Express error-handling middleware. It maps domain errors, database
 * outages and body-parser failures to the public error envelope. Must be
 * registered last so it catches errors from every preceding handler.
 */
import type { NextFunction, Request, Response } from 'express';
import {
  DataIntegrityError,
  MenuItemNameAlreadyExistsError,
  MenuItemNotFoundError,
  ParentMenuItemNotFoundError,
} from '../../domain/menu/menu-errors.js';
import { sendError } from '../presenters/error-presenter.js';

/**
 * Detects MongoDB connection failures from an unknown error value.
 *
 * @param error - Arbitrary error value.
 * @returns `true` when the error looks like a database outage.
 */
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

/**
 * Express error handler. Delegates to `sendError` with the appropriate
 * status and code for each known failure, and falls back to `500 INTERNAL_ERROR`.
 *
 * @param error - Error forwarded by a previous handler (or thrown synchronously).
 * @param _req - Incoming request (unused).
 * @param res - Express response.
 * @param next - Next error handler (used only when headers are already sent).
 */
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
