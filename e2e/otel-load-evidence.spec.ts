import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildLinearChain,
  createChildViaDetail,
  createRootItem,
  deleteItemByName,
  padIndex,
  selectItemByName,
  waitForStudioReady,
} from './helpers/menu-studio';
import {
  EVIDENCE_DIR,
  ensureEvidenceDir,
  loginGrafana,
  openOtelDashboard,
  openTempoExplore,
  saveEvidenceScreenshot,
  scrollToPanel,
  waitForDashboardData,
} from './helpers/grafana';

const DEPTHS = [50, 200, 500] as const;

/** Set by the load test; reused if Grafana is run in the same worker after load. */
let lastRunId = '';

test.describe.configure({ mode: 'serial' });

test('OTel evidence: Menu Studio load 50/200/500', async ({ page }) => {
  test.setTimeout(45 * 60 * 1000);
  ensureEvidenceDir();

  const runId = Date.now().toString(36);
  lastRunId = runId;
  const rootName = `${runId}-otel-load-root`;
  const branchNames = Object.fromEntries(
    DEPTHS.map((d) => [d, `${runId}-branch-d${d}`]),
  ) as Record<(typeof DEPTHS)[number], string>;

  await waitForStudioReady(page);
  await createRootItem(page, rootName);

  for (const depth of DEPTHS) {
    await selectItemByName(page, rootName);
    await createChildViaDetail(page, branchNames[depth]);
  }

  for (const depth of DEPTHS) {
    await selectItemByName(page, branchNames[depth]);
    await buildLinearChain(page, depth, (i) => `${runId}-d${depth}-${padIndex(i)}`);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  const rootNode = page
    .locator('button.node__main')
    .filter({
      has: page.locator('strong', {
        hasText: new RegExp(`^${rootName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .first();
  if (await rootNode.isVisible().catch(() => false)) {
    await rootNode.scrollIntoViewIfNeeded();
  }

  await saveEvidenceScreenshot(page, '05-studio-tree-before-delete.png');

  const reloadResponse = page.waitForResponse(
    (res) => res.url().includes('/api/v1/menu') && res.request().method() === 'GET',
    { timeout: 120_000 },
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  const menuRes = await reloadResponse.catch(() => null);
  if (menuRes) {
    expect(menuRes.status()).toBe(200);
  }
  await expect(page.getByText('Carregando menu…')).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByText(rootName, { exact: true }).first()).toBeVisible({
    timeout: 120_000,
  });

  await saveEvidenceScreenshot(page, '06-studio-after-reload.png');

  for (const depth of DEPTHS) {
    await deleteItemByName(page, branchNames[depth]);
  }

  await page.waitForTimeout(30_000);
  expect(lastRunId).toBeTruthy();
});

test('OTel evidence: Grafana + Tempo screenshots', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  ensureEvidenceDir();

  await loginGrafana(page);
  await openOtelDashboard(page);
  await waitForDashboardData(page, 120_000);

  await saveEvidenceScreenshot(page, '01-grafana-dashboard-overview.png');

  await scrollToPanel(page, 'HTTP request rate');
  await saveEvidenceScreenshot(page, '02-grafana-http-rate-latency.png');

  await scrollToPanel(page, 'Menu API route rate');
  await saveEvidenceScreenshot(page, '03-grafana-menu-route-rate.png');

  await openTempoExplore(page);
  await saveEvidenceScreenshot(page, '04-tempo-explore-menu-api.png', {
    fullPage: true,
  });

  for (const file of [
    '01-grafana-dashboard-overview.png',
    '02-grafana-http-rate-latency.png',
    '03-grafana-menu-route-rate.png',
    '04-tempo-explore-menu-api.png',
    '05-studio-tree-before-delete.png',
    '06-studio-after-reload.png',
  ]) {
    expect(fs.existsSync(path.join(EVIDENCE_DIR, file))).toBeTruthy();
  }
});
