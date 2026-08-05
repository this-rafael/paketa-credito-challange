/**
 * Ambient module shim: redlock's package.json "exports" omit the "types"
 * condition, so TypeScript cannot resolve dist/index.d.ts under NodeNext.
 */
declare module 'redlock' {
  import type { EventEmitter } from 'node:events';
  import type { Redis, Cluster } from 'ioredis';

  type Client = Redis | Cluster;

  export interface Settings {
    readonly driftFactor: number;
    readonly retryCount: number;
    readonly retryDelay: number;
    readonly retryJitter: number;
    readonly automaticExtensionThreshold: number;
  }

  export type RedlockAbortSignal = AbortSignal & {
    error?: Error;
  };

  export class ResourceLockedError extends Error {
    constructor(message: string);
  }

  export class ExecutionError extends Error {
    readonly attempts: ReadonlyArray<Promise<unknown>>;
    constructor(message: string, attempts: ReadonlyArray<Promise<unknown>>);
  }

  export default class Redlock extends EventEmitter {
    constructor(clients: Client[], settings?: Partial<Settings>);
    using<T>(
      resources: string[],
      duration: number,
      routine: (signal: RedlockAbortSignal) => Promise<T>,
    ): Promise<T>;
    using<T>(
      resources: string[],
      duration: number,
      settings: Partial<Settings>,
      routine: (signal: RedlockAbortSignal) => Promise<T>,
    ): Promise<T>;
    acquire(
      resources: string[],
      duration: number,
    ): Promise<{ release(): Promise<unknown> }>;
  }
}
