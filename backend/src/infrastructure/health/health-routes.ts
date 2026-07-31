/**
 * @packageDocumentation
 *
 * Liveness/readiness probe for Compose and operators. Outside the Menu API
 * contract; returns MongoDB ping status.
 */
import type { Request, Response, Router } from 'express';
import mongoose from 'mongoose';

/**
 * Registers `GET /` on the given router as a health check.
 *
 * @param router - Express router (mounted at `/health`).
 */
export function registerHealthRoutes(router: Router): void {
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const database = mongoose.connection.db;
      if (!database) {
        res.status(503).json({
          status: 'unhealthy',
          database: 'unavailable',
        });
        return;
      }
      await database.admin().ping();
      res.status(200).json({
        status: 'ok',
        database: 'up',
        checkedAt: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'unhealthy',
        database: 'unavailable',
      });
    }
  });
}
