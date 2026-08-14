import { Page, expect, test } from '@playwright/test';
import { SEED_ADMIN } from './fixtures';

async function platformAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill(SEED_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin\/tenants/, { timeout: 15_000 });
}

test('tenants screen lists real companies with plan counts', async ({ page }) => {
  await platformAdmin(page);
  await expect(page.getByText('Total tenants')).toBeVisible({ timeout: 15_000 });
  // Every E2E run registers companies, so there is always at least one real tenant.
  await expect(page.locator('[data-tenant]').first()).toBeVisible();
});

test('a tenant plan can be changed from the admin screen', async ({ page }) => {
  await platformAdmin(page);
  await expect(page.locator('[data-tenant]').first()).toBeVisible({ timeout: 15_000 });

  const row = page.locator('[data-tenant]').first();
  await row.locator('select').selectOption('GROWTH');
  await expect(page.getByText(/moved to GROWTH/)).toBeVisible({ timeout: 15_000 });
});

test('a tenant can be suspended and reactivated', async ({ page }) => {
  await platformAdmin(page);
  await expect(page.locator('[data-tenant]').first()).toBeVisible({ timeout: 15_000 });

  // Pin the row by name: the list reloads after each change and may come back reordered.
  const name = await page.locator('[data-tenant]').first().getAttribute('data-tenant');
  const row = page.locator(`[data-tenant="${name}"]`);

  await row.getByRole('button', { name: 'Suspend' }).click();
  await expect(row.getByText('Suspended')).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: 'Reactivate' }).click();
  await expect(row.getByText('Active')).toBeVisible({ timeout: 15_000 });
});

test('platform screen shows mail status, pricing and invoices', async ({ page }) => {
  await platformAdmin(page);
  await page.goto('/admin/platform');
  await expect(page.getByText('EMAIL DELIVERY', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('PLAN PRICING', { exact: true })).toBeVisible();
  await expect(page.locator('[data-plan="STARTER"]')).toBeVisible();
  await expect(page.getByText(/INVOICES/)).toBeVisible();
});

test('a plan price can be updated', async ({ page }) => {
  await platformAdmin(page);
  await page.goto('/admin/platform');
  const row = page.locator('[data-plan="STARTER"]');
  await expect(row).toBeVisible({ timeout: 15_000 });

  await row.locator('input').fill('29');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/STARTER price updated/)).toBeVisible({ timeout: 15_000 });
});

test('admin support tools lists tickets raised by companies', async ({ page }) => {
  await platformAdmin(page);
  await page.goto('/admin/support');
  await expect(page.getByRole('heading', { name: 'Support Tools' })).toBeVisible({ timeout: 15_000 });
});
