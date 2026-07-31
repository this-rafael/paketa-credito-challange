export interface HttpConsoleEntry {
  id: string;
  method: string;
  url: string;
  status: number | null;
  statusText: string;
  durationMs: number;
  timestamp: number;
  operation: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  errorMessage?: string;
}

export type MethodFilter = 'ALL' | 'GET' | 'POST' | 'DELETE';
export type StatusFilter = 'ALL' | '2xx' | '4xx' | '5xx';
