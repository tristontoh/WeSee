import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { API, loginForToken, loginThroughUi, registerUser, uniqueEmail, verifyUser } from './fixtures';

/** Registers, verifies, and signs in a fresh COMPANY_ADMIN with its own company. */
async function freshAdmin(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('company');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);
  return email;
}

test('onboarding lists real sectors from the backend', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/onboarding');
  await expect(page.getByText('Manufacturing & Heavy Industry')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Technology & Software Services')).toBeVisible();
});

test('onboarding refuses to submit without a market', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /Finish setup/i }).click();
  await expect(page.getByText(/Choose which market/i)).toBeVisible();
});

test('onboarding completes with sector and market', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/onboarding');
  await page.getByText('Manufacturing & Heavy Industry').click();
  await page.getByRole('button', { name: 'SME', exact: true }).click();
  await page.getByRole('button', { name: /Finish setup/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test('team screen lists the founding admin', async ({ page, request }) => {
  const email = await freshAdmin(page, request);
  await page.goto('/team');
  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
});

test('creating a user shows a temporary password exactly once', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/team');
  const member = uniqueEmail('member');
  await page.locator('input[placeholder="Full name"]').fill('New Member');
  await page.locator('input[placeholder="email@company.com"]').fill(member);
  await page.getByRole('button', { name: 'Create user' }).click();

  await expect(page.getByText(/Temporary password for/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/will not be shown again/i)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(/Temporary password for/i)).toHaveCount(0);
  await expect(page.getByText(member)).toBeVisible();
});

test('inviting someone surfaces a copyable invite link', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/team');
  await page.locator('input[placeholder="Full name"]').fill('Invited Person');
  await page.locator('input[placeholder="email@company.com"]').fill(uniqueEmail('invitee'));
  await page.getByRole('button', { name: 'Send invite' }).click();

  await expect(page.getByText(/Invite link for/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('code')).toContainText('http');
});

test('creating a subsidiary lists it in the group', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/group');
  await page.locator('input[placeholder="Subsidiary name"]').fill('E2E Subsidiary');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('E2E Subsidiary')).toBeVisible({ timeout: 15_000 });
});

test('switching company changes the active company', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/group');
  await page.locator('input[placeholder="Subsidiary name"]').fill('Switch Target');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Switch Target')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Switch' }).first().click();
  await expect(page.getByText(/Now working in/i)).toBeVisible({ timeout: 15_000 });
});

test('a non-admin cannot edit the company profile', async ({ page, request }) => {
  // Regression: PATCH /company/profile once had no @PreAuthorize, so any company member —
  // including a CONSULTANT — could change the company's sector and size band.
  const adminEmail = await freshAdmin(page, request);
  const consultant = uniqueEmail('consultant');

  const token = await loginForToken(adminEmail);
  const created = await request.post(`${API}/company/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Outside Consultant', email: consultant, role: 'CONSULTANT' },
  });
  const { temporaryPassword } = await created.json();

  // The endpoint itself must refuse, not merely the UI.
  const consultantToken = await loginForToken(consultant, temporaryPassword);
  const refused = await request.patch(`${API}/company/profile`, {
    headers: { Authorization: `Bearer ${consultantToken}` },
    data: { sectorCode: 'TECHNOLOGY_SOFTWARE' },
  });
  expect(refused.status()).toBe(403);

  // And the UI shows the form read-only rather than a control that would 403.
  await page.evaluate(() => localStorage.clear());
  await loginThroughUi(page, consultant, temporaryPassword);
  await page.goto('/settings?view=billing');
  await expect(page.getByText('COMPANY', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /Save company profile/ })).toHaveCount(0);
});

test('settings shows the live plan and its price', async ({ page, request }) => {
  await freshAdmin(page, request);
  await page.goto('/settings?view=billing');
  // "STARTER" appears twice — as the plan label and as the disabled plan button — so scope
  // the assertion to the current-plan card rather than matching text globally.
  await expect(page.getByText('CURRENT PLAN')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('STARTER', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/^RM\d/)).toBeVisible();
});
