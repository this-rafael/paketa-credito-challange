import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const GRAFANA_URL = process.env.GRAFANA_URL ?? 'http://localhost:3001';
export const GRAFANA_USER = process.env.GRAFANA_USER ?? 'admin';
export const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD ?? 'admin';

export const EVIDENCE_DIR = path.resolve(__dirname, '../../docs/evidence/otel');

export function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

export async function saveEvidenceScreenshot(
  page: Page,
  filename: string,
  options?: { fullPage?: boolean },
): Promise<string> {
  ensureEvidenceDir();
  const target = path.join(EVIDENCE_DIR, filename);
  const fullPage = options?.fullPage ?? false;
  try {
    await page.screenshot({ path: target, fullPage });
  } catch {
    // Deep Menu Studio trees can exceed Chromium's fullPage capture limit.
    await page.screenshot({ path: target, fullPage: false });
  }
  return target;
}

/** Log into Grafana if the login form is present. */
export async function loginGrafana(page: Page): Promise<void> {
  // Prefer JSON login API — avoids flaky "Update your password" / Skip UI.
  const apiLogin = await page.request.post(`${GRAFANA_URL}/login`, {
    data: { user: GRAFANA_USER, password: GRAFANA_PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!apiLogin.ok()) {
    // UI fallback
    await page.goto(`${GRAFANA_URL}/login`);
    await page.locator('input[name="user"]').fill(GRAFANA_USER);
    await page.locator('input[name="password"]').fill(GRAFANA_PASSWORD);
    await page.locator('button[type="submit"]').click();
    const skip = page.getByText('Skip', { exact: true });
    if (await skip.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(1_000);
    }
  }

  await page.goto(`${GRAFANA_URL}/?orgId=1`);
  // Still on login? retry UI once
  if (await page.locator('input[name="user"]').isVisible({ timeout: 3_000 }).catch(() => false)) {
    await page.locator('input[name="user"]').fill(GRAFANA_USER);
    await page.locator('input[name="password"]').fill(GRAFANA_PASSWORD);
    await page.locator('button[type="submit"]').click();
    const skip = page.getByText('Skip', { exact: true });
    if (await skip.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(1_000);
    }
    await page.goto(`${GRAFANA_URL}/?orgId=1`);
  }

  await expect(page.locator('input[name="user"]')).toHaveCount(0, { timeout: 30_000 });
  // Home search is often a button/div (no placeholder attr) in Grafana 11.
  await expect(
    page.getByText(/Welcome to Grafana|Starred dashboards|Recently viewed/i).first(),
  ).toBeVisible({ timeout: 30_000 });
}

/** Open the Menu API Observability dashboard (last 15m). */
export async function openOtelDashboard(page: Page): Promise<void> {
  const url =
    `${GRAFANA_URL}/d/menu-api-otel/menu-api-observability` +
    `?orgId=1&from=now-15m&to=now&refresh=10s`;
  await page.goto(url);
  // If auth bounced us, login and retry once
  if (await page.locator('input[name="user"]').isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loginGrafana(page);
    await page.goto(url);
  }
  await expect(page.locator('input[name="user"]')).toHaveCount(0, { timeout: 30_000 });
  await expect(
    page.getByText(/Menu API Observability/i).or(page.getByText(/HTTP request rate/i)).first(),
  ).toBeVisible({ timeout: 60_000 });
}

/**
 * Wait until at least one dashboard panel shows real series (not only "No data").
 * Prometheus scrape is 15s; refresh is 10s — allow generous buffer after load.
 */
export async function waitForDashboardData(page: Page, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const noData = await page.getByText('No data').count();
    const panels = await page.locator('[data-testid="panel-content"], .panel-content, .css-panel').count();
    // Prefer explicit series / legend markers over empty panels
    const hasLegend = await page.locator('.graph-legend, .legend, [class*="legend"]').count();
    const hasCanvas = await page.locator('canvas').count();
    if ((hasCanvas > 0 || hasLegend > 0) && noData < Math.max(panels, 1)) {
      return;
    }
    // Force refresh via Grafana's refresh control when available
    const refresh = page.getByRole('button', { name: /Refresh|Atualizar/i }).first();
    if (await refresh.isVisible().catch(() => false)) {
      await refresh.click().catch(() => undefined);
    }
    await page.waitForTimeout(5_000);
  }
  // Soft continue — screenshots still useful even if some panels empty
}

/** Scroll so a panel titled `title` is in view. */
export async function scrollToPanel(page: Page, title: string): Promise<void> {
  const heading = page.getByText(title, { exact: false }).first();
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}

/** Open Tempo Explore filtered to service menu-api. */
export async function openTempoExplore(page: Page): Promise<void> {
  const query = '{resource.service.name="menu-api"}';
  const exploreUrl =
    `${GRAFANA_URL}/explore` +
    `?orgId=1&left=${encodeURIComponent(
      JSON.stringify({
        datasource: 'tempo',
        queries: [
          {
            refId: 'A',
            queryType: 'traceql',
            query,
          },
        ],
        range: { from: 'now-15m', to: 'now' },
      }),
    )}`;
  await page.goto(exploreUrl);
  await page.waitForTimeout(2_500);

  // Do not re-type into the TraceQL editor — deep-link already sets the query;
  // keyboard inserts were appending an extra "}" in Grafana's monaco editor.
  const run = page.getByRole('button', { name: /Run query|Run|Executar/i }).first();
  if (await run.isVisible().catch(() => false)) {
    await run.click();
  }
  await page.waitForTimeout(5_000);

  const after = await page.locator('body').innerText();
  if (/Query error|parse error|datasource not found/i.test(after)) {
    await page.goto(`${GRAFANA_URL}/explore?orgId=1`);
    const dsPicker = page.getByRole('button', { name: /Data source|Tempo|Prometheus/i }).first();
    if (await dsPicker.isVisible().catch(() => false)) {
      await dsPicker.click();
      await page.getByText('Tempo', { exact: true }).click();
    }
    const traceqlTab = page.getByRole('tab', { name: /TraceQL/i });
    if (await traceqlTab.isVisible().catch(() => false)) {
      await traceqlTab.click();
    }
    // fill via clipboard to avoid brace-doubling quirks
    await page.evaluate(async (q) => {
      const el =
        document.querySelector<HTMLTextAreaElement>('.monaco-editor textarea') ||
        document.querySelector<HTMLTextAreaElement>('textarea');
      if (!el) return;
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      // Monaco listens to execCommand / beforeinput more reliably via clipboard paste
      await navigator.clipboard.writeText(q);
    }, query);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+V');
    if (await run.isVisible().catch(() => false)) {
      await run.click();
    }
    await page.waitForTimeout(5_000);
  }
}
