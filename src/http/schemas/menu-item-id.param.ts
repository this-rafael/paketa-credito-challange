const MENU_ITEM_ID_PATTERN = /^[1-9][0-9]*$/;

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
