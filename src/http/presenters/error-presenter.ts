/**
 * @packageDocumentation
 *
 * Serializes domain/infrastructure failures into the public error envelope
 * returned by every HTTP error response.
 */
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

/** Body returned for every error response. */
export type PublicErrorBody = {
  error: {
    /** Stable, `SCREAMING_SNAKE_CASE` error code. */
    code: string;
    /** Human-readable, safe-to-expose message. */
    message: string;
    /** Correlation id, taken from the request when available. */
    requestId: string;
  };
};

/**
 * Builds a `PublicErrorBody`.
 *
 * @param code - Stable error code.
 * @param message - Human-readable message.
 * @param requestId - Correlation id; a random UUID is generated when omitted.
 * @returns The error envelope object.
 */
export function buildErrorBody(
  code: string,
  message: string,
  requestId: string = randomUUID(),
): PublicErrorBody {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

/**
 * Writes a JSON error response.
 *
 * @param res - Express response.
 * @param status - HTTP status code.
 * @param code - Stable error code.
 * @param message - Human-readable message.
 * @param requestId - Correlation id; falls back to `res.locals.requestId`
 *   (set by the request-id middleware) or a random UUID.
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  requestId?: string,
): void {
  let resolvedId = requestId;
  if (!resolvedId) {
    const localId: unknown = res.locals['requestId'];
    resolvedId = typeof localId === 'string' ? localId : randomUUID();
  }
  res.status(status).json(buildErrorBody(code, message, resolvedId));
}
