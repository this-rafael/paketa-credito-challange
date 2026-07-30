import { Router } from 'express';
import type { CreateMenuItem } from '../../application/use-cases/create-menu-item.js';
import { MenuController } from '../controllers/menu-controller.js';
import { validateBody } from '../middlewares/validate-body.js';
import { createMenuItemBodySchema } from '../schemas/create-menu-item.schema.js';

export type MenuRouterDeps = { createMenuItem?: CreateMenuItem };

export function createMenuRouter(deps: MenuRouterDeps): Router {
  const router = Router();
  const controller = new MenuController(deps.createMenuItem);
  if (deps.createMenuItem) {
    router.post('/', validateBody(createMenuItemBodySchema), (req, res, next) => {
      void controller.create(req, res, next);
    });
  }
  return router;
}
