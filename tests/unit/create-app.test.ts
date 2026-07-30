import { createServer } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/main/create-app.js';

describe('createApp', () => {
  it('OPS-005: returns a testable Express app without opening an HTTP port', async () => {
    const listenSpy = vi.spyOn(
      await import('node:http').then((m) => m.Server.prototype),
      'listen',
    );

    const app = createApp();

    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.listen).toBe('function');
    expect(listenSpy).not.toHaveBeenCalled();

    listenSpy.mockRestore();
  });

  it('OPS-005: does not bind a TCP port as a side effect of createApp', async () => {
    const probe = createServer();
    await new Promise<void>((resolve, reject) => {
      probe.listen(0, '127.0.0.1', () => resolve());
      probe.on('error', reject);
    });
    const { port } = probe.address() as { port: number };
    await new Promise<void>((resolve, reject) => {
      probe.close((err) => (err ? reject(err) : resolve()));
    });

    createApp();

    await expect(
      new Promise<void>((resolve, reject) => {
        const server = createServer();
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve());
        });
      }),
    ).resolves.toBeUndefined();
  });
});
