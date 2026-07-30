import type { MenuItemIdGenerator } from './id-generator.js';
import type { MenuRepository } from './menu-repository.js';

export function assertMenuRepository(
  repository: MenuRepository,
): MenuRepository {
  return repository;
}

export function assertMenuItemIdGenerator(
  generator: MenuItemIdGenerator,
): MenuItemIdGenerator {
  return generator;
}
