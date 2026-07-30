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
  });
});
