/**
 * @packageDocumentation
 *
 * Express router for the `/api/v1/menu` resource. Routes are only registered
 * when the corresponding use case is supplied, allowing partial wiring in tests.
 */
import { Router } from 'express';
import type { CreateMenuItem } from '../../application/use-cases/create-menu-item.js';
import type { DeleteMenuSubtree } from '../../application/use-cases/delete-menu-subtree.js';
import type { GetMenuTree } from '../../application/use-cases/get-menu-tree.js';
import { MenuController } from '../controllers/menu-controller.js';
import { validateBody } from '../middlewares/validate-body.js';
import { createMenuItemBodySchema } from '../schemas/create-menu-item.schema.js';

/** Optional use cases the menu router can be wired with. */
export type MenuRouterDeps = {
  /** Enables `POST /`. */
  createMenuItem?: CreateMenuItem;
  /** Enables `GET /`. */
  getMenuTree?: GetMenuTree;
  /** Enables `DELETE /:id`. */
  deleteMenuSubtree?: DeleteMenuSubtree;
};

/**
 * Builds the menu router.
 *
 * @param deps - `MenuRouterDeps` selecting which endpoints are mounted.
 * @returns An Express `Router` with the enabled routes.
 */
export function createMenuRouter(deps: MenuRouterDeps): Router {
  const router = Router();
  const controller = new MenuController(
    deps.createMenuItem,
    deps.getMenuTree,
    deps.deleteMenuSubtree,
  );

  if (deps.createMenuItem) {
    router.post(
      '/',
      validateBody(createMenuItemBodySchema),
      (req, res, next) => {
        void controller.create(req, res, next);
      },
    );
  }

  if (deps.getMenuTree) {
    router.get('/', (req, res, next) => {
      void controller.getTree(req, res, next);
    });
  }

  if (deps.deleteMenuSubtree) {
    router.delete('/:id', (req, res, next) => {
      void controller.deleteSubtree(req, res, next);
    });
  }

  return router;
}
