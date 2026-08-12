import { APIRequestContext, Page, expect, test } from '@playwright/test';
import {
  loginThroughUi,
  registerUser,
  uniqueEmail,
  upgradeToIssuerReady,
  verifyUser,
} from './fixtures';

/** A STARTER company — the default a fresh signup lands on. */
async function starterCompany(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('starter');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);
  return email;
}

/** An ISSUER_READY company, upgraded before sign-in so the session caches the plan. */
async function issuerReadyCompany(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('issuer');
  await registerUser(request, email);
  await verifyUser(email);
  await upgradeToIssuerReady(email);
  await loginThroughUi(page, email);
  return email;
}

test('a STARTER company lands on /indicators, not the gated dashboard', async ({ page, request }) => {
  const email = uniqueEmail('landing');
  await registerUser(request, email);
  await verifyUser(email);

  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill('E2ePassw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/indicators/, { timeout: 15_000 });
});

test('a STARTER company does not see the Emissions Dashboard nav entry', async ({ page, request }) => {
  await starterCompany(page, request);
  await page.goto('/indicators');
  await expect(page.getByText('Indicators').first()).toBeVisible({ timeout: 15_000 });
  // climate-module is ISSUER_READY with visibleOnlyAtMinPlan, so it is hidden, not locked.
  await expect(page.getByRole('button', { name: 'Emissions Dashboard' })).toHaveCount(0);
});

test('an ISSUER_READY company sees the Emissions Dashboard nav entry', async ({ page, request }) => {
  await issuerReadyCompany(page, request);
  await page.goto('/indicators');
  await expect(page.getByRole('button', { name: 'Emissions Dashboard' })).toBeVisible({ timeout: 15_000 });
});

test('setting scope 1 and scope 2 updates the total footprint', async ({ page, request }) => {
  await issuerReadyCompany(page, request);
  await page.goto('/dashboard');
  await expect(page.getByText('Scope breakdown')).toBeVisible({ timeout: 15_000 });

  const inputs = page.locator('input[inputmode=decimal]');
  await inputs.nth(0).fill('184.2');
  await page.getByRole('button', { name: 'Set' }).first().click();
  await expect(page.getByText('184.2').first()).toBeVisible({ timeout: 15_000 });

  await inputs.nth(1).fill('97.6');
  await page.getByRole('button', { name: 'Set' }).nth(1).click();
  // 281.8 renders twice — the total card and the donut centre — so scope the assertion.
  await expect(page.getByText('281.8').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('281.8')).toHaveCount(2);
});

test('the dashboard lists the 15 GHG Protocol scope 3 categories', async ({ page, request }) => {
  await issuerReadyCompany(page, request);
  await page.goto('/dashboard');
  await expect(page.getByText('Scope 3 categories')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Category 1: Purchased Goods and Services')).toBeVisible();
  await expect(page.getByText('Category 15: Investments')).toBeVisible();
});

test('setting a scope 3 category value feeds the scope 3 total', async ({ page, request }) => {
  await issuerReadyCompany(page, request);
  await page.goto('/dashboard');
  await expect(page.getByText('Scope 3 categories')).toBeVisible({ timeout: 15_000 });

  // The first two decimal inputs are scope 1 and 2; category inputs follow.
  const catInput = page.locator('input[inputmode=decimal]').nth(2);
  await catInput.fill('432.8');
  await catInput.blur();

  await expect(page.getByText('432.8').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/across 1 of \d+ categories/)).toBeVisible();
});

test('a custom scope 3 category can be added and removed', async ({ page, request }) => {
  await issuerReadyCompany(page, request);
  await page.goto('/dashboard');
  await expect(page.getByText('Scope 3 categories')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Custom category name"]').fill('Franchise operations');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Franchise operations')).toBeVisible({ timeout: 15_000 });

  // Only custom categories carry a Delete button; the 15 standard ones do not.
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByText('Franchise operations')).toHaveCount(0, { timeout: 15_000 });
});
