/**
 * @packageDocumentation
 *
 * Compile-time identities for the menu ports. These pass-through helpers let
 * call sites annotate a dependency as a specific port type without runtime cost.
 */
import type { MenuItemIdGenerator } from './id-generator.js';
import type { MenuRepository } from './menu-repository.js';

/**
 * Returns the given repository, narrowed to the `MenuRepository` port.
 *
 * @param repository - The repository implementation to annotate.
 * @returns The same `repository` instance.
 */
export function assertMenuRepository(
  repository: MenuRepository,
): MenuRepository {
  return repository;
}

/**
 * Returns the given generator, narrowed to the `MenuItemIdGenerator` port.
 *
 * @param generator - The generator implementation to annotate.
 * @returns The same `generator` instance.
 */
export function assertMenuItemIdGenerator(
  generator: MenuItemIdGenerator,
): MenuItemIdGenerator {
  return generator;
}
