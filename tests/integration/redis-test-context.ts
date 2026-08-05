import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';

let container: StartedTestContainer | undefined;

/**
 * Starts a Redis 7 testcontainer and returns its connection URL.
 */
export async function startRedisTestContext(): Promise<string> {
  process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';
  container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(6379);
  return `redis://${host}:${port}`;
}

/**
 * Stops the Redis testcontainer when present.
 */
export async function stopRedisTestContext(): Promise<void> {
  if (container) {
    await container.stop();
    container = undefined;
  }
}
