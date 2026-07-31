import { describe, expect, it } from 'vitest';
import { createMenuItemBodySchema } from '../../src/http/schemas/create-menu-item.schema.js';

describe('createMenuItemBodySchema', () => {
  it('accepts a root payload and trims the name', () => {
    const parsed = createMenuItemBodySchema.parse({ name: '  TVs  ' });
    expect(parsed).toEqual({ name: 'TVs' });
  });

  it('accepts a positive safe relatedId', () => {
    const parsed = createMenuItemBodySchema.parse({
      name: 'LCD',
      relatedId: 1,
    });
    expect(parsed).toEqual({ name: 'LCD', relatedId: 1 });
  });

  it('rejects unknown keys and invalid relatedId types', () => {
    expect(() =>
      createMenuItemBodySchema.parse({ name: 'TVs', position: 1 }),
    ).toThrow();
    expect(() =>
      createMenuItemBodySchema.parse({ name: 'TVs', relatedId: '1' }),
    ).toThrow();
  });
});
