import { expect, test, type Page } from '@playwright/test';
import {
  completeOnboarding,
  loginThroughUi,
  registerUser,
  route,
  uniqueEmail,
  upgradePlan,
  verifyUser,
} from './fixtures';

/**
 * The user guide (#4) and the dashboard's empty state.
 *
 * Two things here are only checkable in a browser against a real backend, which is why this is an
 * e2e spec and not a unit test:
 *
 *   - the screenshots are files in public/, referenced by absolute path. A typo in one path is
 *     invisible to tsc and to the build, and shows up as a broken image in front of a new user.
 *     Every thumbnail is asserted to have actually decoded.
 *   - the checklist and the cards both claim to know what the workspace's plan includes. A fresh
 *     SME registration is on STARTER, so the assertions below are written from that plan's point
 *     of view — three of the nine steps are above it.
 */

/** A verified, onboarded company admin, signed in. Fresh SME registration, so: STARTER. */
async function signedInStarterUser(page: Page, request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail('guide');
  await registerUser(request, email);
  await verifyUser(email);
  await completeOnboarding(email);
  await loginThroughUi(page, email);
  return email;
}

test.describe('the user guide', () => {
  test('the sidebar offers it, and it opens', async ({ page, request }) => {
    await signedInStarterUser(page, request);

    await page.getByRole('button', { name: 'User guide' }).click();

    await expect(page).toHaveURL(/\/guide/);
    await expect(page.getByRole('heading', { name: /From a bill to a filed disclosure/i })).toBeVisible();
  });

  test('all nine steps are there, in order', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/guide'));

    const cards = page.locator('img[alt$="screen"]');
    await expect(cards).toHaveCount(9);

    // The numbering is the point of the page — a sequence that reorders is a wrong instruction.
    const numbers = await page.locator('.tabular-nums').allTextContents();
    expect(numbers.slice(0, 9)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
  });

  test('every thumbnail actually decoded', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/guide'));

    const thumbnails = page.locator('img[alt$="screen"]');
    await expect(thumbnails).toHaveCount(9);

    const broken: string[] = [];
    for (let i = 0; i < 9; i++) {
      const img = thumbnails.nth(i);
      await img.scrollIntoViewIfNeeded();
      await expect(img).toBeVisible();
      const state = await img.evaluate((el: HTMLImageElement) => ({
        src: el.getAttribute('src') ?? '',
        width: el.naturalWidth,
      }));
      if (state.width === 0) broken.push(state.src);
    }
    expect(broken, `thumbnails that did not load: ${broken.join(', ')}`).toEqual([]);
  });

  test('a card opens its detail, and Escape closes it again', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/guide'));

    await page.getByRole('button', { name: /Step 4: Accept each figure/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Nothing is written to your data until a person accepts');
    // The screenshot inside the dialog is the one worth reading — assert it decoded too.
    const shot = dialog.locator('img').first();
    expect(await shot.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('the detail dialog can take you to the screen it describes', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/guide'));

    await page.getByRole('button', { name: /Step 4: Accept each figure/ }).click();
    await page.getByRole('button', { name: /Go to Documents/ }).click();

    await expect(page).toHaveURL(/\/documents/);
  });

  /**
   * Every card carries an Open button, and the router answers an unknown path by redirecting to
   * the landing page — so a mistyped path here would look like the app logging you out.
   */
  const OPEN_TARGETS: Array<[number, string, RegExp]> = [
    [1, 'Read the Dashboard', /\/dashboard/],
    [2, 'Say what matters', /\/materiality/],
    [3, 'Drop in a bill', /\/extraction/],
    [4, 'Accept each figure', /\/documents/],
    [5, 'One entry, two books', /\/activity/],
    [6, 'Answer S1 and S2', /\/ifrs-s1-s2/],
    [7, 'Set a target', /\/targets/],
    [8, 'Sign and lock', /\/assurance-workspace/],
    [9, 'Export and file', /\/reports/],
  ];

  for (const [n, title, expected] of OPEN_TARGETS) {
    test(`Open on step ${n} (${title}) lands on that screen`, async ({ page, request }) => {
      await signedInStarterUser(page, request);
      await page.goto(route('/guide'));

      const card = page.locator('.group', { has: page.getByRole('heading', { name: title, exact: true }) });
      await card.getByRole('button', { name: /^Open$/ }).click();

      await expect(page).toHaveURL(expected);
    });
  }

  /**
   * Three of the nine steps are above STARTER (targets is growth; IFRS and assurance are
   * issuer-ready). Sending someone to an upgrade wall from a guide, with no warning on the card,
   * reads as the guide being wrong about the product.
   */
  test('steps above the current plan say so on the card', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/guide'));

    for (const title of ['Answer S1 and S2', 'Set a target', 'Sign and lock']) {
      const card = page.locator('.group', { has: page.getByRole('heading', { name: title, exact: true }) });
      await expect(card, `${title} should be flagged as not included in this plan`)
        .toContainText(/Needs (Growth|Issuer-Ready)/i);
    }
  });

  test('a step the plan does include is not flagged', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/guide'));

    const card = page.locator('.group', { has: page.getByRole('heading', { name: 'Say what matters', exact: true }) });
    await expect(card).not.toContainText(/Needs (Growth|Issuer-Ready)/i);
  });

  test('the page does not scroll sideways on a narrow viewport', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route('/guide'));

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("the dashboard's empty state", () => {
  test('a workspace with no figures gets the checklist instead of four zeroes', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/dashboard'));

    await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Total Matters')).toHaveCount(0);
    await expect(page.getByText('0 of', { exact: false })).toBeVisible();
  });

  test('the first thing to do is marked as next', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/dashboard'));

    await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible({ timeout: 15_000 });
    const firstStep = page.locator('ol li').first();
    await expect(firstStep).toContainText('Complete your materiality assessment');
    await expect(firstStep).toContainText('Next');
  });

  test('steps the plan does not include are left out, not shown as undone', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/dashboard'));

    await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible({ timeout: 15_000 });
    // STARTER: no targets (growth), no assurance (issuer-ready).
    await expect(page.getByText('Set a reduction target')).toHaveCount(0);
    await expect(page.getByText('Sign off the cycle')).toHaveCount(0);
  });

  test('a plan that includes them shows them', async ({ page, request }) => {
    const email = uniqueEmail('guide-issuer');
    await registerUser(request, email);
    await verifyUser(email);
    await completeOnboarding(email);
    await upgradePlan(email, 'ISSUER_READY');
    await loginThroughUi(page, email);
    await page.goto(route('/dashboard'));

    await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Set a reduction target')).toBeVisible();
    await expect(page.getByText('Sign off the cycle')).toBeVisible();
  });

  test('the checklist can open the guide', async ({ page, request }) => {
    await signedInStarterUser(page, request);
    await page.goto(route('/dashboard'));

    await page.getByRole('button', { name: /Open the guide/ }).click();

    await expect(page).toHaveURL(/\/guide/);
  });

  test('a step already done is ticked, and the tiles come back', async ({ page, request }) => {
    const email = await signedInStarterUser(page, request);

    // One indicator value is all it takes for the workspace to stop being empty.
    const token = await (await fetch(`${process.env.E2E_API_BASE_URL ?? 'http://localhost:8080'}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'E2ePassw0rd!' }),
    })).json().then((r: any) => r?.auth?.token);
    const api = `${process.env.E2E_API_BASE_URL ?? 'http://localhost:8080'}/api/v1`;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const indicators = await (await fetch(`${api}/indicators`, { headers })).json();
    const first = indicators[0];
    const url = first.aggregationRule === 'DIRECT_ANNUAL'
      ? `${api}/indicators/${first.id}/values/2026`
      : `${api}/indicators/${first.id}/monthly/2026/1`;
    const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ value: 10 }) });
    expect(res.ok, `seeding an indicator value failed: ${res.status}`).toBeTruthy();

    await page.goto(route('/dashboard'));

    await expect(page.getByText('Total Matters')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Getting started' })).toHaveCount(0);
  });
});
