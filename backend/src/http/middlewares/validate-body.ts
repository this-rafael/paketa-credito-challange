/**
 * @packageDocumentation
 *
 * Factory that builds an Express middleware validating `req.body` against a Zod
 * schema, replacing the body with the parsed value on success.
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { sendError } from '../presenters/error-presenter.js';

/**
 * Creates a middleware that validates the request body.
 *
 * On failure responds `400 VALIDATION_ERROR` and short-circuits. On success the
 * parsed value is written back to `req.body{ before calling }next`.
 *
 * @param schema - Zod schema describing the expected body.
 * @returns An Express middleware.
 */
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
