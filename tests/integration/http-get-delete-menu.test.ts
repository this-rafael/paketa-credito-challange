import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { GetMenuTree } from '../../src/application/use-cases/get-menu-tree.js';
import { createApp } from '../../src/main/create-app.js';

describe('GET /api/v1/menu', () => {
  it('GET-001: returns an empty menu', async () => {
    const getMenuTree = new GetMenuTree({
      findById: async () => null,
      create: async (item) => item,
      findAllOrderedById: async () => [],
      deleteSubtree: async () => ({ deletedCount: 0 }),
    });
    const response = await request(createApp({ getMenuTree })).get('/api/v1/menu');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
