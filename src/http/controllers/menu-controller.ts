import type { NextFunction, Request, Response } from 'express';
import type { CreateMenuItem } from '../../application/use-cases/create-menu-item.js';
import type { DeleteMenuSubtree } from '../../application/use-cases/delete-menu-subtree.js';
import type { GetMenuTree } from '../../application/use-cases/get-menu-tree.js';
import {
  DataIntegrityError,
  MenuItemNameAlreadyExistsError,
  MenuItemNotFoundError,
  ParentMenuItemNotFoundError,
} from '../../domain/menu/menu-errors.js';
import type { CreateMenuItemBody } from '../schemas/create-menu-item.schema.js';
import { parseMenuItemIdParam } from '../schemas/menu-item-id.param.js';
import { sendError } from '../presenters/error-presenter.js';

export class MenuController {
  constructor(
    private readonly createMenuItem?: CreateMenuItem,
    private readonly getMenuTree?: GetMenuTree,
    private readonly deleteMenuSubtree?: DeleteMenuSubtree,
  ) {}

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!this.createMenuItem) {
        sendError(
          res,
          500,
          'INTERNAL_ERROR',
          'Create use case is not configured',
        );
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

  getTree = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!this.getMenuTree) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Get use case is not configured');
        return;
      }
      const tree = await this.getMenuTree.execute();
      res.status(200).json(tree);
    } catch (error) {
      if (error instanceof DataIntegrityError) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Unexpected error');
        return;
      }
      next(error);
    }
  };

  deleteSubtree = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!this.deleteMenuSubtree) {
        sendError(
          res,
          500,
          'INTERNAL_ERROR',
          'Delete use case is not configured',
        );
        return;
      }
      const rawId = req.params['id'];
      if (typeof rawId !== 'string') {
        sendError(res, 400, 'INVALID_MENU_ITEM_ID', 'Invalid menu item id');
        return;
      }
      const id = parseMenuItemIdParam(rawId);
      if (id === null) {
        sendError(res, 400, 'INVALID_MENU_ITEM_ID', 'Invalid menu item id');
        return;
      }
      await this.deleteMenuSubtree.execute(id);
      res.status(200).end();
    } catch (error) {
      if (error instanceof MenuItemNotFoundError) {
        sendError(res, 404, error.code, error.message);
        return;
      }
      next(error);
    }
  };
}
