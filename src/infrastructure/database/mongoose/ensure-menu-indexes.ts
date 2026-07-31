/**
 * @packageDocumentation
 *
 * Ensures the MongoDB indexes required by the menu collection exist before the
 * server starts accepting traffic.
 */
import { MenuItemModel } from './menu-item-model.js';

/**
 * Synchronizes the menu item indexes with the schema definitions.
 *
 * @returns A promise that resolves once indexes are in sync.
 */
export async function ensureMenuIndexes(): Promise<void> {
  await MenuItemModel.syncIndexes();
}
