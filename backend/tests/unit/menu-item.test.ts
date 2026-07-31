import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createChildMenuItem,
  createRootMenuItem,
  normalizeMenuItemName,
} from '../../src/domain/menu/menu-item.js';
import {
  DataIntegrityError,
  InvalidMenuItemIdError,
  InvalidMenuItemNameError,
  MenuItemNameAlreadyExistsError,
  MenuItemNotFoundError,
  ParentMenuItemNotFoundError,
} from '../../src/domain/menu/menu-errors.js';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const domainRoot = join(backendRoot, 'src/domain');

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

describe('menu item domain', () => {
  it('CON-007: root has positive id, trimmed name, null parentId and empty ancestors', () => {
    const root = createRootMenuItem(1, '  Electronics  ');

    expect(root.id).toBe(1);
    expect(root.id).toBeGreaterThan(0);
    expect(Number.isSafeInteger(root.id)).toBe(true);
    expect(root.name).toBe('Electronics');
    expect(root.parentId).toBeNull();
    expect(root.ancestors).toEqual([]);
  });

  it('CON-008: child ancestors end with parentId and exclude own id', () => {
    const root = createRootMenuItem(1, 'Electronics');
    const parent = createChildMenuItem(2, 'TVs', root);
    const child = createChildMenuItem(3, 'LCD', parent);

    expect(child.id).toBe(3);
    expect(child.parentId).toBe(2);
    expect(child.ancestors).toEqual([1, 2]);
    expect(child.ancestors.at(-1)).toBe(child.parentId);
    expect(child.ancestors).not.toContain(child.id);
  });

  it('normalizes names by trimming whitespace', () => {
    expect(normalizeMenuItemName('  X  ')).toBe('X');
  });

  it('rejects blank names after trim', () => {
    expect(() => normalizeMenuItemName('   ')).toThrow(
      InvalidMenuItemNameError,
    );
    expect(() => createRootMenuItem(1, '   ')).toThrow(
      InvalidMenuItemNameError,
    );
  });

  it('rejects non-positive or unsafe ids', () => {
    expect(() => createRootMenuItem(0, 'Root')).toThrow(InvalidMenuItemIdError);
    expect(() => createRootMenuItem(-1, 'Root')).toThrow(
      InvalidMenuItemIdError,
    );
    expect(() =>
      createRootMenuItem(Number.MAX_SAFE_INTEGER + 1, 'Root'),
    ).toThrow(InvalidMenuItemIdError);
  });

  it('exposes the application error catalog used by later flows', () => {
    const errors = [
      new ParentMenuItemNotFoundError(99),
      new MenuItemNotFoundError(99),
      new MenuItemNameAlreadyExistsError('Electronics'),
      new InvalidMenuItemIdError('abc'),
      new InvalidMenuItemNameError('name'),
      new DataIntegrityError('orphan'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(error.constructor.name);
      expect(typeof error.code).toBe('string');
      expect(error.code.length).toBeGreaterThan(0);
    }

    expect(new ParentMenuItemNotFoundError(1).code).toBe(
      'PARENT_MENU_ITEM_NOT_FOUND',
    );
    expect(new MenuItemNotFoundError(1).code).toBe('MENU_ITEM_NOT_FOUND');
    expect(new MenuItemNameAlreadyExistsError('A').code).toBe(
      'MENU_ITEM_NAME_ALREADY_EXISTS',
    );
    expect(new InvalidMenuItemIdError('x').code).toBe('INVALID_MENU_ITEM_ID');
    expect(new DataIntegrityError('x').code).toBe('DATA_INTEGRITY_ERROR');
  });

  it('ARC-002: domain modules do not import frameworks or read env', () => {
    const forbidden = [
      'express',
      'mongoose',
      'mongodb',
      'zod',
      'pino',
      'process.env',
    ];

    for (const file of collectTsFiles(domainRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const token of forbidden) {
        expect(source, `${file} must not reference ${token}`).not.toContain(
          token,
        );
      }
      expect(source).not.toMatch(/\b(statusCode|status)\s*[:=]/);
    }
  });
});
