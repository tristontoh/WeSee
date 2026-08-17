import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { loginThroughUi, registerUser, uniqueEmail, verifyUser } from './fixtures';

async function freshAdmin(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('ind');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);
  return email;
}

test('indicators screen lists the seeded indicators grouped by category', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ENVIRONMENTAL \(\d+\)/)).toBeVisible();
  await expect(page.getByText(/SOCIAL \(\d+\)/)).toBeVisible();
  await expect(page.getByText(/GOVERNANCE \(\d+\)/)).toBeVisible();
});

test('category tabs filter the list', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible({ timeout: 15_000 });

  await page.locator('[data-tab="SOCIAL"]').click();
  await expect(page.getByText(/SOCIAL \(\d+\)/)).toBeVisible();
  await expect(page.getByText(/ENVIRONMENTAL \(\d+\)/)).toHaveCount(0);
  await expect(page.getByText('Total Electricity Consumed')).toHaveCount(0);

  await page.locator('[data-tab="ALL"]').click();
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible();
});

test('completion rises as data is entered', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');

  const panel = page.locator('[data-completion]');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('0%')).toBeVisible();
  await expect(panel.getByText(/0 of 12 indicators have data/)).toBeVisible();

  const row = page.locator('[data-indicator="IND-ENG-01"]');
  await row.getByRole('button', { name: '+ Add data' }).click();
  const jan = row.locator('input[inputmode=decimal]').first();
  await jan.fill('120');
  await jan.blur();

  await expect(panel.getByText(/1 of 12 indicators have data/)).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('8%')).toBeVisible();
});

test('the fiscal-year selector displays the year actually in use', async ({ page, request }) => {
  // Regression: binding [value] on a <select> left the browser showing the first option
  // (an older year) while the app operated on the current one.
  const year = String(new Date().getFullYear());
  await freshAdmin(page, request);
  await page.goto('/indicators');
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('select').first()).toHaveValue(year);

  await page.goto('/activity');
  await expect(page.getByText('ADD ACTIVITY')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('select').first()).toHaveValue(year);
});

test('a computed indicator shows the month grid and no annual field', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  // The entry panel opens from the row's own "+ Add data" button.
  const row = page.locator('[data-indicator="IND-ENG-01"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: '+ Add data' }).click();
  // All 12 seeded indicators are computed (SUM/AVERAGE/LATEST/COUNT), never DIRECT_ANNUAL.
  await expect(row.getByText(/MONTHLY ENTRY/)).toBeVisible();
  await expect(page.getByText(/ANNUAL ENTRY/)).toHaveCount(0);
});

test('saving a monthly value updates the computed annual figure', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  const row = page.locator('[data-indicator="IND-ENG-01"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: '+ Add data' }).click();
  await expect(row.getByText(/MONTHLY ENTRY/)).toBeVisible();

  const jan = row.locator('input[inputmode=decimal]').first();
  await jan.fill('120');
  await jan.blur();

  await expect(row.getByText(/from 1 of 12 months/)).toBeVisible({ timeout: 15_000 });
});

test('setting a target persists with its direction', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/indicators');
  const row = page.locator('[data-indicator="IND-WAT-01"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: '+ Add data' }).click();
  // exact:true — plain 'TARGET' also matches the "Target NNN" summary on every row.
  await expect(row.getByText('TARGET', { exact: true })).toBeVisible();

  const target = row.locator('input[inputmode=decimal]').last();
  await target.fill('900');
  await row.getByRole('button', { name: 'Set target' }).click();
  await expect(row.getByText('Target 900')).toBeVisible({ timeout: 15_000 });
});

test('activity screen lists Malaysian emission factors', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  // Factors render as <option> inside a closed <select>, so they are never "visible" —
  // assert on the options themselves rather than on visible text.
  const options = page.locator('select option');
  await expect(options.filter({ hasText: /Grid Electricity \(Peninsular/ })).toHaveCount(1, { timeout: 15_000 });
  await expect(options.filter({ hasText: /Diesel \(Stationary Combustion/ })).toHaveCount(1);
});

test('adding an activity entry computes tCO2e and totals it', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await expect(page.getByText('ADD ACTIVITY')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Quantity"]').fill('1000');
  await page.getByRole('button', { name: 'Add entry' }).click();

  await expect(page.getByText('TOTAL')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/tCO₂e/).first()).toBeVisible();
});

test('applying entries to a scope reports success', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await page.locator('input[placeholder="Quantity"]').fill('500');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('TOTAL')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /Apply \d+ entries/ }).click();
  await expect(page.getByText(/Applied \d+ entries to SCOPE/i)).toBeVisible({ timeout: 15_000 });
});

test('deleting an activity entry removes it', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/activity');
  await page.locator('input[placeholder="Quantity"]').fill('250');
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('TOTAL')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByText(/No entries for/)).toBeVisible({ timeout: 15_000 });
});
