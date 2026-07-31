/**
 * @packageDocumentation
 *
 * Output port that produces the next unique identifier for a menu item. The
 * concrete implementation is chosen by the infrastructure layer.
 */
export interface MenuItemIdGenerator {
  /**
   * Reserves and returns the next menu item identifier.
   *
   * @returns A positive, safe-integer identifier guaranteed to be unique within
   *   the menu collection.
   * @throws `InvalidMenuItemIdError` When the underlying sequence would
   *   overflow `Number.MAX_SAFE_INTEGER`.
   */
  next(): Promise<number>;
}
