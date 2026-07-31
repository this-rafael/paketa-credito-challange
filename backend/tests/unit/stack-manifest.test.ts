import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('stack manifest', () => {
  it('ARC-001: package engines and runtime deps match the decided stack majors', () => {
    const pkg = JSON.parse(
      readFileSync(join(backendRoot, 'package.json'), 'utf8'),
    ) as {
      engines?: { node?: string };
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.engines?.node).toMatch(/24/);

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps.express).toBeDefined();
    expect(deps.express).toMatch(/^[\^~]?5\./);
    expect(deps.typescript).toBeDefined();
    expect(deps.vitest).toBeDefined();
    expect(deps.zod).toBeDefined();
    expect(deps.mongoose).toBeDefined();
  });

  it('ARC-001: TypeScript is configured in strict mode', () => {
    const tsconfig = JSON.parse(
      readFileSync(join(backendRoot, 'tsconfig.json'), 'utf8'),
    ) as { compilerOptions?: { strict?: boolean } };

    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });
});
