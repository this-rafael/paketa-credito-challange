import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const openApiPath = join(backendRoot, 'openapi/openapi.yaml');

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('architecture boundaries', () => {
  it('ARC-001: stack majors remain aligned', () => {
    const pkg = JSON.parse(
      readFileSync(join(backendRoot, 'package.json'), 'utf8'),
    ) as {
      engines?: { node?: string };
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(pkg.engines?.node).toMatch(/24/);
    expect(deps.express).toMatch(/^[\^~]?5\./);
    expect(deps.zod).toBeDefined();
    expect(deps.mongoose).toBeDefined();
    expect(deps.vitest).toBeDefined();
    expect(deps.supertest).toBeDefined();
    expect(deps['fast-check']).toBeDefined();
    expect(deps.testcontainers).toBeDefined();
    expect(deps.ioredis).toBeDefined();
    expect(deps.redlock).toBeDefined();
  });

  it('ARC-002: domain stays framework-free', () => {
    for (const file of collectTsFiles(join(backendRoot, 'src/domain'))) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/express|mongoose|zod|pino|process\.env/);
    }
  });

  it('ARC-003: use cases depend only on domain and ports', () => {
    for (const file of collectTsFiles(
      join(backendRoot, 'src/application/use-cases'),
    )) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/express|mongoose|zod|Request|Response/);
    }
  });

  it('ARC-004: HTTP layer does not query mongoose', () => {
    for (const file of collectTsFiles(join(backendRoot, 'src/http'))) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(
        /\bmongoose\b|MenuItemModel|CounterModel|\.findOne\(|\.deleteMany\(/,
      );
    }
  });

  it('ARC-005: id conversions stay at the HTTP edge', () => {
    const controller = readFileSync(
      join(backendRoot, 'src/http/controllers/menu-controller.ts'),
      'utf8',
    );
    expect(controller).toContain('String(created.id)');
    expect(controller).toContain('parseMenuItemIdParam');
    const openapi = YAML.parse(readFileSync(openApiPath, 'utf8')) as {
      components: {
        schemas: {
          CreateMenuItemRequest: {
            properties: { relatedId: { type: string } };
          };
          CreateMenuItemResponse: { properties: { id: { type: string } } };
        };
      };
    };
    expect(
      openapi.components.schemas.CreateMenuItemRequest.properties.relatedId
        .type,
    ).toBe('integer');
    expect(
      openapi.components.schemas.CreateMenuItemResponse.properties.id.type,
    ).toBe('string');
  });

  it('ARC-006: createApp does not bind a listening adapter', () => {
    const source = readFileSync(
      join(backendRoot, 'src/main/create-app.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/\.listen\(/);
    expect(source).toContain('export function createApp');
  });
});
