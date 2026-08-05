module.exports = {
  apps: [
    {
      name: 'menu-api',
      script: 'dist/main/server.js',
      instances: 3,
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/menu',
        REDIS_URL: 'redis://127.0.0.1:6379',
        LOG_LEVEL: 'info',
        JSON_BODY_LIMIT: '100kb',
        ENABLE_DISTRIBUTED_LOCK: 'true',
        LOCK_TTL_MS: '5000',
        LOCK_RETRY_COUNT: '10',
      },
    },
  ],
};
