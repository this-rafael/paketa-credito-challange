/**
 * @packageDocumentation
 *
 * Domain errors raised by the menu domain. Every error exposes a stable `code`
 * (a `SCREAMING_SNAKE_CASE` string) so the HTTP layer can map it to a response
 * status and public error code without inspecting messages.
 */
export class ParentMenuItemNotFoundError extends Error {
  /** Stable public error code: `PARENT_MENU_ITEM_NOT_FOUND`. */
  readonly code = 'PARENT_MENU_ITEM_NOT_FOUND' as const;

  /**
   * @param parentId - Identifier of the referenced parent that does not exist.
   */
  constructor(readonly parentId: number) {
    super(`Parent menu item not found: ${parentId}`);
    this.name = 'ParentMenuItemNotFoundError';
  }
}

export class MenuItemNotFoundError extends Error {
  /** Stable public error code: `MENU_ITEM_NOT_FOUND`. */
  readonly code = 'MENU_ITEM_NOT_FOUND' as const;

  /**
   * @param menuItemId - Identifier of the menu item that does not exist.
   */
  constructor(readonly menuItemId: number) {
    super(`Menu item not found: ${menuItemId}`);
    this.name = 'MenuItemNotFoundError';
  }
}

export class MenuItemNameAlreadyExistsError extends Error {
  /** Stable public error code: `MENU_ITEM_NAME_ALREADY_EXISTS`. */
  readonly code = 'MENU_ITEM_NAME_ALREADY_EXISTS' as const;

  /**
   * @param menuItemName - Name that already exists in the menu.
   */
  constructor(readonly menuItemName: string) {
    super(`Menu item name already exists: ${menuItemName}`);
    this.name = 'MenuItemNameAlreadyExistsError';
  }
}

export class InvalidMenuItemIdError extends Error {
  /** Stable public error code: `INVALID_MENU_ITEM_ID`. */
  readonly code = 'INVALID_MENU_ITEM_ID' as const;

  /**
   * @param value - Offending identifier value that failed validation.
   */
  constructor(readonly value: unknown) {
    super(`Invalid menu item id: ${String(value)}`);
    this.name = 'InvalidMenuItemIdError';
  }
}

export class InvalidMenuItemNameError extends Error {
  /** Stable public error code: `INVALID_MENU_ITEM_NAME`. */
  readonly code = 'INVALID_MENU_ITEM_NAME' as const;

  /**
   * @param value - Offending name value that failed validation.
   */
  constructor(readonly value: unknown) {
    super(`Invalid menu item name: ${String(value)}`);
    this.name = 'InvalidMenuItemNameError';
  }
}

export class DataIntegrityError extends Error {
  /** Stable public error code: `DATA_INTEGRITY_ERROR`. */
  readonly code = 'DATA_INTEGRITY_ERROR' as const;

  /**
   * @param message - Description of the integrity violation.
   */
  constructor(message: string) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}
