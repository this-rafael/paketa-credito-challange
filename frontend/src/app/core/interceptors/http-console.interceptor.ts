import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { HttpConsoleStore } from '../state/http-console.store';
import { HttpConsoleEntry } from '../models/http-console';

function resolveOperation(method: string, url: string): string {
  if (method === 'GET' && url.includes('/menu')) return 'Listar menu';
  if (method === 'POST' && url.includes('/menu')) return 'Criar item';
  if (method === 'DELETE' && url.includes('/menu')) return 'Excluir item';
  return `${method} request`;
}

function headersToRecord(headers: { keys: () => string[]; get: (k: string) => string | null }): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of headers.keys()) {
    result[key] = headers.get(key) ?? '';
  }
  return result;
}

export const httpConsoleInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(HttpConsoleStore);
  const started = performance.now();
  const id = crypto.randomUUID();

  let responseBody: unknown = null;
  let responseHeaders: Record<string, string> = {};
  let status: number | null = null;
  let statusText = '';
  let errorMessage: string | undefined;

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        status = event.status;
        statusText = event.statusText || 'OK';
        responseBody = event.body;
        responseHeaders = headersToRecord(event.headers);
      }
    }),
    catchError((err) => {
      status = err.status ?? 0;
      statusText = err.statusText || 'Error';
      responseBody = err.error ?? null;
      errorMessage = err.message;
      if (err.headers) {
        responseHeaders = headersToRecord(err.headers);
      }
      return throwError(() => err);
    }),
    finalize(() => {
      const entry: HttpConsoleEntry = {
        id,
        method: req.method,
        url: req.urlWithParams,
        status,
        statusText,
        durationMs: Math.round(performance.now() - started),
        timestamp: Date.now(),
        operation: resolveOperation(req.method, req.url),
        requestHeaders: headersToRecord(req.headers),
        requestBody: req.body,
        responseHeaders,
        responseBody,
        errorMessage,
      };
      store.push(entry);
      store.select(id);
    }),
  );
};
