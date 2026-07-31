import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const openApiPath = join(backendRoot, 'openapi/openapi.yaml');

describe('OpenAPI contract', () => {
  const document = YAML.parse(readFileSync(openApiPath, 'utf8')) as {
    openapi: string;
    paths: Record<string, Record<string, unknown>>;
    components: {
      schemas: Record<string, unknown>;
    };
  };

  it('API-001: is OpenAPI 3.1 and documents only the menu endpoints', () => {
    expect(document.openapi).toMatch(/^3\.1/);
    expect(document.paths['/api/v1/menu']).toBeDefined();
    expect(document.paths['/api/v1/menu']?.post).toBeDefined();
    expect(document.paths['/api/v1/menu']?.get).toBeDefined();
    expect(document.paths['/api/v1/menu/{id}']?.delete).toBeDefined();
    expect(document.paths['/api/v1/menu']?.put).toBeUndefined();
    expect(document.paths['/api/v1/menu']?.patch).toBeUndefined();
  });

  it('API-002: documents relatedId as number and public id as string without _id', () => {
    const createRequest = document.components.schemas.CreateMenuItemRequest as {
      properties: { relatedId: { type: string }; name: { type: string } };
    };
    const createResponse = document.components.schemas
      .CreateMenuItemResponse as {
      properties: { id: { type: string } };
    };
    const serialized = JSON.stringify(document);
    expect(createRequest.properties.relatedId.type).toBe('integer');
    expect(createResponse.properties.id.type).toBe('string');
    expect(serialized).not.toContain('"_id"');
  });

  it('API-003: documents nested error payloads with code, message and requestId', () => {
    const errorBody = document.components.schemas.ErrorBody as {
      properties: {
        error: {
          properties: {
            code: unknown;
            message: unknown;
            requestId: unknown;
          };
        };
      };
    };
    expect(errorBody.properties.error.properties.code).toBeDefined();
    expect(errorBody.properties.error.properties.message).toBeDefined();
    expect(errorBody.properties.error.properties.requestId).toBeDefined();
  });

  it('API-004: challenge examples match create schemas', () => {
    const createRequest = document.components.schemas.CreateMenuItemRequest as {
      required: string[];
      additionalProperties: boolean;
    };
    expect(createRequest.required).toEqual(['name']);
    expect(createRequest.additionalProperties).toBe(false);
  });
});
