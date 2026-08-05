const base = {
  PORT: 3000,
  MONGODB_URI: 'mongodb://127.0.0.1:27017/menu',
  REDIS_URL: 'redis://127.0.0.1:6379',
  LOG_LEVEL: 'info',
  JSON_BODY_LIMIT: '100kb',
  LOCK_TTL_MS: '5000',
  LOCK_RETRY_COUNT: '10',
  // Widens the window between the parent lookup and the child insert so the
  // race is observable in a demo; keep at 0 outside the experiment.
  CREATE_RACE_DELAY_MS: '80',
};

module.exports = {
  apps: [
    {
      name: 'menu-api',
      script: 'dist/main/server.js',
      instances: 3,
      exec_mode: 'cluster',
      env: {
        ...base,
        ENABLE_DISTRIBUTED_LOCK: 'true',
      },
      env_baseline: {
        ...base,
        ENABLE_DISTRIBUTED_LOCK: 'false',
      },
    },
  ],
};
