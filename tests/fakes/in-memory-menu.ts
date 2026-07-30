import type { MenuItemIdGenerator } from '../../src/application/ports/id-generator.js';
import type {
  DeleteSubtreeResult,
  MenuRepository,
  NewMenuItem,
} from '../../src/application/ports/menu-repository.js';
import { MenuItemNameAlreadyExistsError } from '../../src/domain/menu/menu-errors.js';
import type { MenuItem } from '../../src/domain/menu/menu-item.js';

export class InMemoryMenuRepository implements MenuRepository {
  private readonly items = new Map<number, MenuItem>();

  seed(items: MenuItem[]): void {
    this.items.clear();
    for (const item of items) {
      this.items.set(item.id, structuredClone(item));
    }
  }

  findById(id: number): Promise<MenuItem | null> {
    const item = this.items.get(id);
    return Promise.resolve(item ? structuredClone(item) : null);
  }

  create(input: NewMenuItem): Promise<MenuItem> {
    for (const existing of this.items.values()) {
      if (existing.name === input.name) {
        throw new MenuItemNameAlreadyExistsError(input.name);
      }
    }
    const created = structuredClone(input);
    this.items.set(created.id, created);
    return Promise.resolve(structuredClone(created));
  }

  findAllOrderedById(): Promise<MenuItem[]> {
    return Promise.resolve(
      [...this.items.values()]
        .sort((a, b) => a.id - b.id)
        .map((item) => structuredClone(item)),
    );
  }

  deleteSubtree(id: number): Promise<DeleteSubtreeResult> {
    let deletedCount = 0;
    for (const item of [...this.items.values()]) {
      if (item.id === id || item.ancestors.includes(id)) {
        this.items.delete(item.id);
        deletedCount += 1;
      }
    }
    return Promise.resolve({ deletedCount });
  }
}

export class InMemoryMenuItemIdGenerator implements MenuItemIdGenerator {
  private current = 0;
  nextCalls = 0;

  constructor(start = 0) {
    this.current = start;
  }

  next(): Promise<number> {
    this.nextCalls += 1;
    this.current += 1;
    return Promise.resolve(this.current);
  }
}
