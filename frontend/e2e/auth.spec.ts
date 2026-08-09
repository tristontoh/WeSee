import { expect, test } from '@playwright/test';
import { SEED_ADMIN, registerUser, uniqueEmail } from './fixtures';

test('login screen has no social auth and offers signup', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Apple/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Create an account/i })).toBeVisible();
});

test('platform admin signs in and lands on the admin nav', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill(SEED_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/tenants/, { timeout: 15_000 });
});

test('a wrong password shows an error and stays on login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(/Incorrect email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('an unverified account is told to verify before signing in', async ({ page, request }) => {
  const email = uniqueEmail('unverified');
  await registerUser(request, email);

  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill('E2ePassw0rd!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText(/Verify your email address/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend verification/i })).toBeVisible();
});

test('registering shows the check-your-email state', async ({ page }) => {
  const email = uniqueEmail('signup');
  await page.goto('/register');
  await page.locator('input[placeholder="Ada Lovelace"]').fill('E2E User');
  await page.locator('input[placeholder="Acme Sdn Bhd"]').fill(`E2E Co ${email}`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('E2ePassw0rd!');
  await page.getByRole('button', { name: /Create account/i }).click();

  await expect(page.getByText(/Check your email/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(email)).toBeVisible();
});

test('a short password is rejected before any request is sent', async ({ page }) => {
  await page.goto('/register');
  await page.locator('input[placeholder="Ada Lovelace"]').fill('E2E User');
  await page.locator('input[placeholder="Acme Sdn Bhd"]').fill('E2E Co');
  await page.locator('input[type=email]').fill(uniqueEmail('short'));
  await page.locator('input[type=password]').fill('short');
  await page.getByRole('button', { name: /Create account/i }).click();

  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
});

test('a bad verification token reports failure', async ({ page }) => {
  await page.goto('/verify-email?token=not-a-real-token');
  await expect(page.getByText(/Verification failed/i)).toBeVisible({ timeout: 15_000 });
});

test('a protected route redirects to login when logged out', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('a stale token is cleared and the user is returned to login', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('wesee_token', 'expired.invalid.token');
    localStorage.setItem(
      'wesee_user',
      JSON.stringify({
        userId: 'u',
        name: 'X',
        email: 'x@wesee.my',
        role: 'COMPANY_ADMIN',
        companyId: 'c',
        plan: 'STARTER',
      }),
    );
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem('wesee_token'))).toBeNull();
});
