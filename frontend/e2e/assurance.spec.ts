import { APIRequestContext, Page, expect, test } from '@playwright/test';
import {
  fillAllIndicators,
  loginThroughUi,
  registerUser,
  uniqueEmail,
  upgradePlan,
  verifyUser,
} from './fixtures';

const YEAR = new Date().getFullYear();

async function company(
  page: Page,
  request: APIRequestContext,
  plan: 'STARTER' | 'GROWTH' | 'ISSUER_READY',
  prefix: string,
): Promise<string> {
  const email = uniqueEmail(prefix);
  await registerUser(request, email);
  await verifyUser(email);
  if (plan !== 'STARTER') await upgradePlan(email, plan);
  await loginThroughUi(page, email);
  return email;
}

/** ISSUER_READY with every indicator filled, so sign-off's 100% gate is satisfied. */
async function signableCompany(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('asr');
  await registerUser(request, email);
  await verifyUser(email);
  await upgradePlan(email, 'ISSUER_READY');
  await fillAllIndicators(email, YEAR);
  await loginThroughUi(page, email);
  return email;
}

test('assurance is hidden on STARTER', async ({ page, request }) => {
  await company(page, request, 'STARTER', 'asr');
  await page.goto('/indicators');
  await expect(page.getByText('Indicators').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Assurance', exact: true })).toHaveCount(0);
});

test('assurance is visible on ISSUER_READY', async ({ page, request }) => {
  await company(page, request, 'ISSUER_READY', 'asr');
  await page.goto('/indicators');
  await expect(page.getByRole('button', { name: 'Assurance', exact: true })).toBeVisible({ timeout: 15_000 });
});

test('a fiscal year can be signed off and shows an integrity hash', async ({ page, request }) => {
  await signableCompany(page, request);
  await page.goto('/assurance');
  await expect(page.getByText(/READINESS · FY/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Signer name"]').fill('Nurul Huda');
  await page.locator('input[placeholder="Signer title"]').fill('Chief Sustainability Officer');
  await page.getByRole('button', { name: /Sign off FY/ }).click();

  await expect(page.getByText('Signed off')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Integrity hash/)).toBeVisible();
  await expect(page.getByText(/Nurul Huda/).first()).toBeVisible();
});

test('signing off records an audit trail entry', async ({ page, request }) => {
  await signableCompany(page, request);
  await page.goto('/assurance');
  await expect(page.getByText(/READINESS · FY/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Signer name"]').fill('Lim Wei Shen');
  await page.locator('input[placeholder="Signer title"]').fill('Finance Director');
  await page.getByRole('button', { name: /Sign off FY/ }).click();
  await expect(page.getByText('Signed off')).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText(/AUDIT TRAIL \(1\)/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Signed', { exact: true })).toBeVisible();
});

test('a sign-off can be revoked', async ({ page, request }) => {
  await signableCompany(page, request);
  await page.goto('/assurance');
  await page.locator('input[placeholder="Signer name"]').fill('Aisyah Rahman');
  await page.locator('input[placeholder="Signer title"]').fill('CEO');
  await page.getByRole('button', { name: /Sign off FY/ }).click();
  await expect(page.getByText('Signed off')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Reason for revoking"]').fill('Restating scope 2');
  await page.getByRole('button', { name: 'Revoke sign-off' }).click();
  await expect(page.getByText(/has not been signed off/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/AUDIT TRAIL \(2\)/)).toBeVisible();
});

test('export center lists documents and records history after a download', async ({ page, request }) => {
  await company(page, request, 'ISSUER_READY', 'exp');
  await page.goto('/export');
  await expect(page.getByText(/AVAILABLE DOCUMENTS/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Integrated ESG report')).toBeVisible();
  await expect(page.getByText('Raw indicator ledger')).toBeVisible();

  await page.locator('[data-doc="csv"]').getByRole('button', { name: 'Download' }).click();
  await expect(page.getByText(/EXPORT HISTORY \(1\)/)).toBeVisible({ timeout: 20_000 });
});
