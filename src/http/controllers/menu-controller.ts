import type { NextFunction, Request, Response } from 'express';
import { CreateMenuItem } from '../../application/use-cases/create-menu-item.js';
import {
  MenuItemNameAlreadyExistsError,
  ParentMenuItemNotFoundError,
} from '../../domain/menu/menu-errors.js';
import { sendError } from '../presenters/error-presenter.js';
import type { CreateMenuItemBody } from '../schemas/create-menu-item.schema.js';

export class MenuController {
  constructor(private readonly createMenuItem?: CreateMenuItem) {}

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!this.createMenuItem) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Create use case is not configured');
        return;
      }
      const body = req.body as CreateMenuItemBody;
      const created = await this.createMenuItem.execute({
        name: body.name,
        ...(body.relatedId !== undefined ? { relatedId: body.relatedId } : {}),
      });
      res.status(201).json({ id: String(created.id) });
    } catch (error) {
      if (error instanceof ParentMenuItemNotFoundError) {
        sendError(res, 404, error.code, error.message);
        return;
      }
      if (error instanceof MenuItemNameAlreadyExistsError) {
        sendError(res, 409, error.code, error.message);
        return;
      }
      next(error);
    }
  };
}
