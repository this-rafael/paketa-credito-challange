/**
 * @packageDocumentation
 *
 * Zod schema for the `POST /api/v1/menu` request body. The schema is strict: any
 * unknown property is rejected.
 */
import { z } from 'zod';

/**
 * Validates a create-menu-item request body.
 *
 * Rules:
 * - `name` must be a non-empty string (after trimming).
 * - `relatedId`, when present, must be a positive integer up to
 *   `Number.MAX_SAFE_INTEGER` (the parent item id).
 */
export const createMenuItemBodySchema = z
  .object({
    name: z.string().trim().min(1),
    relatedId: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strict();

/** Parsed shape of a valid create-menu-item request body. */
export type CreateMenuItemBody = z.infer<typeof createMenuItemBodySchema>;
