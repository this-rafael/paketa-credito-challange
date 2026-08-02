import { expect, type Page } from '@playwright/test';

/** Wait until Menu Studio finished loading the tree. */
export async function waitForStudioReady(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Criar item' })).toBeVisible();
  await expect(page.getByText('Carregando menu…')).toHaveCount(0, { timeout: 60_000 });
}

/** Open the create dialog from the header (root / no preset parent). */
export async function openCreateFromHeader(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Criar item' }).click();
  await expect(page.getByText('Criar item').first()).toBeVisible();
  await expect(page.locator('input[placeholder="Ex.: Televisores"]')).toBeVisible();
}

/** Fill name and submit the create dialog; waits until dialog closes. */
export async function submitCreateDialog(page: Page, name: string): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  const input = dialog.locator('input[placeholder="Ex.: Televisores"]');
  await input.fill(name);
  // Deep trees make the parent <select> option text (dashes × level) expand the
  // dialog past the viewport — force/JS click avoids Playwright's hit-target check.
  const createBtn = dialog.getByRole('button', { name: 'Criar', exact: true });
  await createBtn.evaluate((el: HTMLButtonElement) => el.click());
  await expect(input).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator('app-item-detail strong').first()).toHaveText(name, {
    timeout: 60_000,
  });
}

/** Create a root item via the header "Criar item" dialog. */
export async function createRootItem(page: Page, name: string): Promise<void> {
  await openCreateFromHeader(page);
  await submitCreateDialog(page, name);
}

/**
 * Create a child of the currently selected item via the detail panel
 * "Adicionar filho" action (avoids scrolling/searching the tree).
 */
export async function createChildViaDetail(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Adicionar filho' }).click();
  await expect(page.locator('input[placeholder="Ex.: Televisores"]')).toBeVisible();
  await submitCreateDialog(page, name);
}

/** Select a tree node by its display name (scrolls into view if needed). */
export async function selectItemByName(page: Page, name: string): Promise<void> {
  const node = page
    .locator('button.node__main')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${escapeRegExp(name)}$`) }) })
    .first();
  await node.scrollIntoViewIfNeeded();
  await node.click();
  await expect(page.locator('app-item-detail strong').first()).toHaveText(name, {
    timeout: 30_000,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Delete the currently selected item (accepts native confirm dialog). */
export async function deleteSelected(page: Page): Promise<void> {
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('app-item-detail').getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByText('Carregando menu…')).toHaveCount(0, { timeout: 60_000 });
}

/** Select an item by name and delete it (subtree wipe on the API). */
export async function deleteItemByName(page: Page, name: string): Promise<void> {
  await selectItemByName(page, name);
  await deleteSelected(page);
}

/**
 * Build a linear child chain of `depth` nodes under the currently selected item.
 * After each create the new child becomes selected, so the next "Adicionar filho"
 * continues the chain without tree search.
 */
export async function buildLinearChain(
  page: Page,
  depth: number,
  nameForIndex: (index: number) => string,
): Promise<void> {
  for (let i = 1; i <= depth; i += 1) {
    await createChildViaDetail(page, nameForIndex(i));
  }
}

export function padIndex(index: number, width = 3): string {
  return String(index).padStart(width, '0');
}
