import { z } from 'zod';

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

export type CreateMenuItemBody = z.infer<typeof createMenuItemBodySchema>;
