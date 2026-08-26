import { expect, test } from '@playwright/test';
import { SEED_ADMIN, TOKEN_KEY, registerUser, route, uniqueEmail } from './fixtures';

/**
 * The app runs under a HashRouter, so routes live behind `#` — see fixtures.route().
 *
 * Failures surface as toasts rather than inline field text (ToastContext), so the assertions below
 * look for the message anywhere on the page rather than beside an input.
 */

test('login screen has no social auth and offers signup', async ({ page }) => {
  await page.goto(route('/login'));
  await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Apple/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Sign Up/i })).toBeVisible();
});

test('platform admin signs in and lands on the operator console', async ({ page }) => {
  await page.goto(route('/login'));
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.locator('input[type=password]').fill(SEED_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // postLoginPath sends platform roles to /admin, which redirects on to the overview.
  await expect(page).toHaveURL(/#\/admin\/overview/, { timeout: 15_000 });
});

test('a wrong password shows an error and stays on login', async ({ page }) => {
  await page.goto(route('/login'));
  await page.locator('input[type=email]').fill(SEED_ADMIN.email);
  await page.locator('input[type=password]').fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('alert')).toContainText(/Invalid email or password/i);
  await expect(page).toHaveURL(/#\/login/);
});

test('an unverified account is told to verify before signing in', async ({ page, request }) => {
  const email = uniqueEmail('unverified');
  await registerUser(request, email);

  await page.goto(route('/login'));
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('E2ePassw0rd!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: /Resend verification email/i })).toBeVisible({
    timeout: 15_000,
  });
});

/**
 * Registration is a three-step wizard: who you are, the company, then the password and terms.
 * Filling it through the UI is the only way to cover the strength rules and the terms gate.
 */
async function fillRegistrationWizard(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto(route('/register'));

  await page.locator('input[placeholder="e.g. Siti Nurhaliza"]').fill('E2E User');
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: /Continue/i }).click();

  await page.locator('input[placeholder="e.g. WeSee Green Tech Sdn Bhd"]').fill(`E2E Co ${Date.now()}`);
  await page.getByRole('button', { name: /Continue/i }).click();

  const passwords = page.locator('input[placeholder="••••••••••••"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
}

test('registering shows the check-your-email state', async ({ page }) => {
  const email = uniqueEmail('signup');
  await fillRegistrationWizard(page, email, 'E2ePassw0rd!');

  // The submit button stays disabled until the terms are accepted, so this also covers that gate.
  await page.getByRole('checkbox').last().check();
  await page.getByRole('button', { name: /Create|Provision|Register|Finish/i }).click();

  await expect(page.getByText(/Check your email/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(email)).toBeVisible();
});

test('a password that fails the strength rules is rejected before any request is sent', async ({ page }) => {
  // Long enough and has a capital, but no digit and no special character.
  await fillRegistrationWizard(page, uniqueEmail('weak'), 'Passwordd');

  await page.getByRole('checkbox').last().check();
  await page.getByRole('button', { name: /Create|Provision|Register|Finish/i }).click();

  await expect(page.getByRole('alert')).toContainText(/password strength/i);
});

test('a bad verification token reports failure', async ({ page }) => {
  await page.goto(route('/verify-email?token=not-a-real-token'));
  await expect(page.getByText(/Verification link not valid/i)).toBeVisible({ timeout: 15_000 });
});

test('a protected route redirects to login when logged out', async ({ page }) => {
  await page.goto(route('/dashboard'));
  await expect(page).toHaveURL(/#\/login/);
});

test('a stale token is cleared and the user is returned to login', async ({ page }) => {
  await page.goto(route('/login'));
  await page.evaluate((key) => localStorage.setItem(key, 'expired.invalid.token'), TOKEN_KEY);

  // Reloaded, not navigated: under a HashRouter, moving between #/login and #/dashboard only
  // changes the fragment, so the app is never remounted and never re-reads the token. Booting with
  // the stale token in place is the situation being tested.
  await page.goto(route('/dashboard'));
  await page.reload();

  await expect(page).toHaveURL(/#\/login/, { timeout: 15_000 });
  expect(await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)).toBeNull();
});
