import { MenuItemModel } from './menu-item-model.js';

export async function ensureMenuIndexes(): Promise<void> {
  await MenuItemModel.syncIndexes();
}
