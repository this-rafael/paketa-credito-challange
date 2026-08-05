import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/infrastructure/config/env.js';

describe('env validation', () => {
  it('OPS-001: rejects invalid PORT, MONGODB_URI, LOG_LEVEL and JSON_BODY_LIMIT', () => {
    expect(() =>
      loadEnv({ PORT: '0', MONGODB_URI: 'mongodb://localhost/menu' }),
    ).toThrow();
    expect(() => loadEnv({ PORT: '3000', MONGODB_URI: '' })).toThrow();
    expect(() =>
      loadEnv({
        PORT: '3000',
        MONGODB_URI: 'mongodb://localhost/menu',
        LOG_LEVEL: 'verbose',
      }),
    ).toThrow();
    expect(() =>
      loadEnv({
        PORT: '3000',
        MONGODB_URI: 'mongodb://localhost/menu',
        JSON_BODY_LIMIT: '',
      }),
    ).toThrow();
  });

  it('OPS-001: accepts a valid environment', () => {
    const env = loadEnv({
      PORT: '3000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/menu',
      LOG_LEVEL: 'info',
      JSON_BODY_LIMIT: '100kb',
    });
    expect(env.PORT).toBe(3000);
    expect(env.MONGODB_URI).toContain('mongodb://');
    expect(env.ENABLE_DISTRIBUTED_LOCK).toBe(false);
    expect(env.LOCK_TTL_MS).toBe(5000);
    expect(env.LOCK_RETRY_COUNT).toBe(3);
  });

  it('OPS-001: requires REDIS_URL when distributed lock is enabled', () => {
    expect(() =>
      loadEnv({
        PORT: '3000',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/menu',
        ENABLE_DISTRIBUTED_LOCK: 'true',
      }),
    ).toThrow(/REDIS_URL/);
  });

  it('OPS-001: accepts Redis lock settings when enabled', () => {
    const env = loadEnv({
      PORT: '3000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/menu',
      ENABLE_DISTRIBUTED_LOCK: 'true',
      REDIS_URL: 'redis://127.0.0.1:6379',
      LOCK_TTL_MS: '8000',
      LOCK_RETRY_COUNT: '5',
    });
    expect(env.ENABLE_DISTRIBUTED_LOCK).toBe(true);
    expect(env.REDIS_URL).toBe('redis://127.0.0.1:6379');
    expect(env.LOCK_TTL_MS).toBe(8000);
    expect(env.LOCK_RETRY_COUNT).toBe(5);
  });
});
