import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import mongoose from 'mongoose';

let container: StartedTestContainer | undefined;

export async function startMongoTestContext(): Promise<string> {
  process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';
  container = await new GenericContainer('mongo:7')
    .withExposedPorts(27017)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120_000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(27017);
  const uri = `mongodb://${host}:${port}/menu_test`;
  await mongoose.connect(uri);
  return uri;
}

export async function stopMongoTestContext(): Promise<void> {
  if (
    mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected
  ) {
    await mongoose.disconnect();
  }
  if (container) {
    await container.stop();
    container = undefined;
  }
}

export async function resetMongoCollections(): Promise<void> {
  const collections = await mongoose.connection.db?.collections();
  if (!collections) {
    return;
  }
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}
