export class ParentMenuItemNotFoundError extends Error {
  readonly code = 'PARENT_MENU_ITEM_NOT_FOUND' as const;

  constructor(readonly parentId: number) {
    super(`Parent menu item not found: ${parentId}`);
    this.name = 'ParentMenuItemNotFoundError';
  }
}

export class MenuItemNotFoundError extends Error {
  readonly code = 'MENU_ITEM_NOT_FOUND' as const;

  constructor(readonly menuItemId: number) {
    super(`Menu item not found: ${menuItemId}`);
    this.name = 'MenuItemNotFoundError';
  }
}

export class MenuItemNameAlreadyExistsError extends Error {
  readonly code = 'MENU_ITEM_NAME_ALREADY_EXISTS' as const;

  constructor(readonly menuItemName: string) {
    super(`Menu item name already exists: ${menuItemName}`);
    this.name = 'MenuItemNameAlreadyExistsError';
  }
}

export class InvalidMenuItemIdError extends Error {
  readonly code = 'INVALID_MENU_ITEM_ID' as const;

  constructor(readonly value: unknown) {
    super(`Invalid menu item id: ${String(value)}`);
    this.name = 'InvalidMenuItemIdError';
  }
}

export class InvalidMenuItemNameError extends Error {
  readonly code = 'INVALID_MENU_ITEM_NAME' as const;

  constructor(readonly value: unknown) {
    super(`Invalid menu item name: ${String(value)}`);
    this.name = 'InvalidMenuItemNameError';
  }
}

export class DataIntegrityError extends Error {
  readonly code = 'DATA_INTEGRITY_ERROR' as const;

  constructor(message: string) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}
