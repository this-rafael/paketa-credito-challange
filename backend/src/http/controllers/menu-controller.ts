/**
 * @packageDocumentation
 *
 * HTTP controller for the menu resource. It adapts Express requests to the
 * menu use cases and translates domain errors into JSON error responses.
 */
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
import { withSpan } from '../../infrastructure/telemetry/tracing.js';
import type { CreateMenuItemBody } from '../schemas/create-menu-item.schema.js';
import { parseMenuItemIdParam } from '../schemas/menu-item-id.param.js';
import { sendError } from '../presenters/error-presenter.js';

/**
 * Handles menu HTTP requests.
 */
export class MenuController {
  /**
   * @param createMenuItem - Use case for creation; when omitted the create
   *   handler responds `500 INTERNAL_ERROR`.
   * @param getMenuTree - Use case for reading the tree; when omitted the tree
   *   handler responds `500 INTERNAL_ERROR`.
   * @param deleteMenuSubtree - Use case for deletion; when omitted the delete
   *   handler responds `500 INTERNAL_ERROR`.
   */
  constructor(
    private readonly createMenuItem?: CreateMenuItem,
    private readonly getMenuTree?: GetMenuTree,
    private readonly deleteMenuSubtree?: DeleteMenuSubtree,
  ) {}

  /**
   * `POST /{ handler. Creates a menu item and returns }{ id }{ with status }201`.
   *
   * @param req - Express request (expects a validated `CreateMenuItemBody`).
   * @param res - Express response.
   * @param next - Next error handler.
   * @throws Forwards any unexpected error to `next`.
   */
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
      const created = await withSpan(
        'menu.create',
        async (span) => {
          span.setAttribute('menu.name', body.name);
          if (body.relatedId !== undefined) {
            span.setAttribute('menu.related_id', body.relatedId);
          }
          return this.createMenuItem!.execute({
            name: body.name,
            ...(body.relatedId !== undefined
              ? { relatedId: body.relatedId }
              : {}),
          });
        },
      );
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

  /**
   * `GET /{ handler. Returns the nested menu tree with status }200`.
   *
   * @param _req - Express request (unused).
   * @param res - Express response.
   * @param next - Next error handler.
   * @throws Forwards any unexpected error to `next`.
   */
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
      const tree = await withSpan('menu.get_tree', () =>
        this.getMenuTree!.execute(),
      );
      res.status(200).json(tree);
    } catch (error) {
      if (error instanceof DataIntegrityError) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Unexpected error');
        return;
      }
      next(error);
    }
  };

  /**
   * `DELETE /:id` handler. Deletes the item and its subtree and responds
   * `200` with an empty body.
   *
   * @param req - Express request (expects an `:id` path parameter).
   * @param res - Express response.
   * @param next - Next error handler.
   * @throws Forwards any unexpected error to `next`.
   */
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
      await withSpan(
        'menu.delete_subtree',
        async (span) => {
          span.setAttribute('menu.id', id);
          await this.deleteMenuSubtree!.execute(id);
        },
      );
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
