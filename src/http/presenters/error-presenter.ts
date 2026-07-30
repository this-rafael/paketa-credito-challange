import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

export type PublicErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export function buildErrorBody(
  code: string,
  message: string,
  requestId: string = randomUUID(),
): PublicErrorBody {
  return {
    error: {
      code,
      message,
      requestId,
    },
  };
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  requestId?: string,
): void {
  let resolvedId = requestId;
  if (!resolvedId) {
    const localId: unknown = res.locals['requestId'];
    resolvedId = typeof localId === 'string' ? localId : randomUUID();
  }
  res.status(status).json(buildErrorBody(code, message, resolvedId));
}
