import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('ops packaging', () => {
  it('OPS-007: Dockerfile runs as non-root and compose wires api + mongodb', () => {
    const dockerfile = readFileSync(join(backendRoot, 'Dockerfile'), 'utf8');
    const compose = readFileSync(
      join(backendRoot, 'docker-compose.yml'),
      'utf8',
    );
    const readme = readFileSync(join(backendRoot, 'README.md'), 'utf8');

    expect(dockerfile).toMatch(/USER\s+node/);
    expect(compose).toMatch(/mongodb:/);
    expect(compose).toMatch(/api:/);
    expect(compose).not.toMatch(/replSet|replica/i);
    expect(readme).toMatch(/docker compose/i);
    expect(readme).toMatch(/npm (ci|install)/i);
  });
});
