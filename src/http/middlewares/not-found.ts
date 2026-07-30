import type { Request, Response } from 'express';
import { sendError } from '../presenters/error-presenter.js';

export function notFoundMiddleware(_req: Request, res: Response): void {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
}
