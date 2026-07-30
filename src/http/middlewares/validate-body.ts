import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { sendError } from '../presenters/error-presenter.js';

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Request body validation failed');
      return;
    }
    req.body = parsed.data;
    next();
  };
}
