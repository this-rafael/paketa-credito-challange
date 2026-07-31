/**
 * @packageDocumentation
 *
 * Parsing of the `:id{ path parameter used by }DELETE /api/v1/menu/:id`.
 */
const MENU_ITEM_ID_PATTERN = /^[1-9][0-9]*$/;

/**
 * Parses a raw path parameter into a positive safe-integer menu item id.
 *
 * @param raw - The raw string extracted from the route (e.g. `"42"`).
 * @returns The parsed identifier, or `null{ when }raw` is not a strictly
 *   positive integer (leading zeros and zero are rejected).
 */
export function parseMenuItemIdParam(raw: string): number | null {
  if (!MENU_ITEM_ID_PATTERN.test(raw)) {
    return null;
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }
  return id;
}
