import type { MenuItem } from '../../domain/menu/menu-item.js';

export type NewMenuItem = MenuItem;

export interface DeleteSubtreeResult {
  deletedCount: number;
}

export interface MenuRepository {
  findById(id: number): Promise<MenuItem | null>;
  create(input: NewMenuItem): Promise<MenuItem>;
  findAllOrderedById(): Promise<MenuItem[]>;
  deleteSubtree(id: number): Promise<DeleteSubtreeResult>;
}
