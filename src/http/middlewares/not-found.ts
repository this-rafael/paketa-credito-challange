/**
 * @packageDocumentation
 *
 * Terminal Express middleware that answers unmatched routes with `404`.
 */
import type { Request, Response } from 'express';
import { sendError } from '../presenters/error-presenter.js';

/**
 * Responds with `404 ROUTE_NOT_FOUND` for any request that reaches it.
 *
 * @param _req - Incoming request (unused).
 * @param res - Express response.
 */
export function notFoundMiddleware(_req: Request, res: Response): void {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
}
