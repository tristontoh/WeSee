import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { loginThroughUi, registerUser, uniqueEmail, verifyUser } from './fixtures';

async function admin(page: Page, request: APIRequestContext): Promise<string> {
  const email = uniqueEmail('acct');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);
  return email;
}

test('account screen shows the signed-in user profile', async ({ page, request }) => {
  const email = await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText('PROFILE', { exact: true })).toBeVisible({ timeout: 15_000 });
  // Angular's [value] sets the DOM property, not the attribute, so a [value=…] CSS
  // selector never matches — assert on the resolved value instead.
  await expect(page.locator('input[disabled]')).toHaveValue(email);
});

test('profile details can be saved', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText('PROFILE', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Job title"]').fill('Head of Sustainability');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.locator('input[placeholder="Job title"]')).toHaveValue('Head of Sustainability', {
    timeout: 15_000,
  });
});

test('a short new password is rejected before any request', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText('PASSWORD', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Current password"]').fill('E2ePassw0rd!');
  await page.locator('input[placeholder="New password (min 8)"]').fill('short');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText(/at least 8 characters/)).toBeVisible();
});

test('the current session is listed and marked as this device', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText(/ACTIVE SESSIONS/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('This device')).toBeVisible();
});

test('notification preferences can be saved', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText('NOTIFICATIONS', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Save notifications' }).click();
  await expect(page.getByText('Notification preferences saved.')).toBeVisible({ timeout: 15_000 });
});

test('creating an API token reveals it exactly once', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText(/API TOKENS/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Token name"]').fill('CI pipeline');
  await page.getByRole('button', { name: 'Create token' }).click();

  await expect(page.getByText('API token created')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/only time it is shown/)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('API token created')).toHaveCount(0);
  await expect(page.getByText('CI pipeline')).toBeVisible();
});

test('privacy consent can be saved', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText('PRIVACY', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Save consent' }).click();
  await expect(page.getByText('Consent saved.')).toBeVisible({ timeout: 15_000 });
});

test('a support ticket can be raised and appears in the list', async ({ page, request }) => {
  await admin(page, request);
  await page.goto('/account');
  await expect(page.getByText(/SUPPORT TICKETS/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Subject"]').fill('Cannot export CSI file');
  await page.locator('input[placeholder="What do you need help with?"]').fill('The download fails.');
  await page.getByRole('button', { name: 'Raise ticket' }).click();

  const row = page.locator('[data-ticket="Cannot export CSI file"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText('OPEN')).toBeVisible();
});
