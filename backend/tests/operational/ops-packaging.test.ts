import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = join(backendRoot, '..');

describe('ops packaging', () => {
  it('OPS-007: Dockerfile runs as non-root and compose wires api + mongodb + web', () => {
    const dockerfile = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8');
    const compose = readFileSync(join(repoRoot, 'docker-compose.yml'), 'utf8');
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
    const frontendDockerfile = readFileSync(
      join(repoRoot, 'frontend/Dockerfile'),
      'utf8',
    );

    expect(dockerfile).toMatch(/USER\s+node/);
    expect(frontendDockerfile).toMatch(/nginx/i);
    expect(compose).toMatch(/mongodb:/);
    expect(compose).toMatch(/api:/);
    expect(compose).toMatch(/web:/);
    expect(compose).toMatch(/context:\s*\.\/backend/);
    expect(compose).toMatch(/context:\s*\.\/frontend/);
    expect(compose).not.toMatch(/replSet|replica/i);
    expect(readme).toMatch(/docker compose/i);
    expect(readme).toMatch(/npm (ci|install|run)/i);
  });
});
