import { APIRequestContext, Page, expect, test } from '@playwright/test';
import {
  loginThroughUi,
  registerUser,
  uniqueEmail,
  upgradeToIssuerReady,
  verifyUser,
} from './fixtures';

async function issuerReady(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('ifrs');
  await registerUser(request, email);
  await verifyUser(email);
  await upgradeToIssuerReady(email);
  await loginThroughUi(page, email);
  return email;
}

test('IFRS is hidden below ISSUER_READY', async ({ page, request }) => {
  const starter = uniqueEmail('ifrsstarter');
  await registerUser(request, starter);
  await verifyUser(starter);
  await loginThroughUi(page, starter);
  await page.goto('/indicators');
  await expect(page.getByText('Indicators').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'IFRS Disclosures' })).toHaveCount(0);
});

test('IFRS is visible at ISSUER_READY', async ({ page, request }) => {
  // Kept separate: clearing localStorage does not reset the in-memory session, so a second
  // sign-in inside one test never reaches the login form.
  await issuerReady(page, request);
  await page.goto('/indicators');
  await expect(page.getByRole('button', { name: 'IFRS Disclosures' })).toBeVisible({ timeout: 15_000 });
});

test('saving an S1 narrative field persists it', async ({ page, request }) => {
  await issuerReady(page, request);
  await page.goto('/ifrs');
  await expect(page.getByText('IFRS S1 · GENERAL REQUIREMENTS')).toBeVisible({ timeout: 15_000 });

  const committee = 'Board Sustainability Committee';
  await page.locator('textarea').nth(1).fill(committee);
  await page.getByRole('button', { name: 'Save S1' }).click();
  await expect(page.getByText('IFRS S1 saved.')).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.locator('textarea').nth(1)).toHaveValue(committee, { timeout: 15_000 });
});

test('S2 exposes its climate-specific fields', async ({ page, request }) => {
  await issuerReady(page, request);
  await page.goto('/ifrs');
  await page.getByRole('button', { name: 'IFRS S2' }).click();
  await expect(page.getByText('IFRS S2 · CLIMATE')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Physical risks')).toBeVisible();
  await expect(page.getByText('Transition plan')).toBeVisible();
  await expect(page.getByText('Internal carbon pricing')).toBeVisible();
});

test('a business segment can hold a risk and an opportunity', async ({ page, request }) => {
  await issuerReady(page, request);
  await page.goto('/ifrs');
  await page.getByRole('button', { name: 'Risks & opportunities' }).click();
  await expect(page.getByText('ADD BUSINESS SEGMENT')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="e.g. Manufacturing"]').fill('Palm Oil Refining');
  await page.getByRole('button', { name: 'Add segment' }).click();

  // Each company is seeded with four default segments, so scope to the one under test.
  const card = page.locator('[data-segment="Palm Oil Refining"]');
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.locator('input[placeholder="Title"]').fill('Drought reduces yield');
  await card.locator('input[placeholder="Impact"]').fill('250000');
  await card.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(card.getByText('Drought reduces yield')).toBeVisible({ timeout: 15_000 });
  // 'Risk' also appears as an <option> in the type dropdown; assert on the badge span.
  await expect(card.locator('span').filter({ hasText: /^Risk$/ })).toBeVisible();
  await expect(card.getByText(/MYR 250000/)).toBeVisible();
});

test('a segment can be deleted', async ({ page, request }) => {
  await issuerReady(page, request);
  await page.goto('/ifrs');
  await page.getByRole('button', { name: 'Risks & opportunities' }).click();
  await page.locator('input[placeholder="e.g. Manufacturing"]').fill('Temporary Segment');
  await page.getByRole('button', { name: 'Add segment' }).click();

  const card = page.locator('[data-segment="Temporary Segment"]');
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.getByRole('button', { name: 'Delete segment' }).click();
  await expect(card).toHaveCount(0, { timeout: 15_000 });
});
