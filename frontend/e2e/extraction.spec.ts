import { expect, test } from '@playwright/test';
import { loginThroughUi, registerUser, uniqueEmail, verifyUser } from './fixtures';

/**
 * Requires a backend started with `make backend-e2e`, which points the extractor at the mock in
 * gemini-mock.mjs rather than the real API. The real extractor runs — real prompt, real schema,
 * real parsing — and the mock answers with a fixed 1,240 kWh reading against GRID_ELECTRICITY_MY
 * and IND-ENG-01, so one upload still exercises both destinations. The fixture below carries no
 * figures at all, which is why the model has to be faked rather than called.
 *
 * A fresh company per test keeps the accepted values from colliding with data another spec relies on.
 *
 * Uploading and reviewing are two screens: /extraction takes the file, /documents lists what came
 * back, and /documents/:id shows the source beside the figures read from it.
 */

/** Contents are irrelevant while the stub extractor is in place; only the type is checked. */
const FIXTURE = {
  name: 'electricity-bill.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\nelectricity bill\n'),
};

test('uploads a document, reviews the proposals beside it, and commits them', async ({ page, request }) => {
  const email = uniqueEmail('extraction');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);

  await page.goto('/extraction');
  await expect(page.getByText('UPLOAD A SOURCE DOCUMENT')).toBeVisible();
  await page.setInputFiles('input[type="file"]', FIXTURE);

  // The upload screen hands over to the document rather than showing the result itself.
  await expect(page.getByText('electricity-bill.pdf is being read')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'View document' }).click();

  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);

  // Extraction runs off the request thread and the detail screen polls itself.
  await expect(page.getByText('READY', { exact: true })).toBeVisible({ timeout: 30_000 });

  // The source is on screen beside the figures — that pairing is the point of the screen.
  await expect(page.locator('iframe')).toBeVisible();

  // Everything the document says, including the figures nothing reports on. The kVARh row matters:
  // it is the one a reviewer must not read as consumption.
  await expect(page.getByText('WHAT THE DOCUMENT SAYS')).toBeVisible();
  await expect(page.getByText('Maklumat Meter')).toBeVisible();
  await expect(page.getByText('kVARh')).toBeVisible();
  await expect(page.getByText('RM276,397.88')).toBeVisible();

  await expect(page.getByText('Grid Electricity (Peninsular Malaysia)')).toBeVisible();
  await expect(page.getByText('Total Electricity Consumed')).toBeVisible();

  const accept = page.getByRole('button', { name: 'Accept' });
  await expect(accept).toHaveCount(2);
  await accept.first().click();
  await expect(page.getByText('ACCEPTED', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Accept' }).first().click();
  await expect(page.getByText('ACCEPTED', { exact: true })).toHaveCount(2, { timeout: 15_000 });

  // 1240 kWh x 0.585 / 1000 = 0.7254 tCO2e
  await page.goto('/activity');
  await expect(page.getByText('0.7254')).toBeVisible({ timeout: 15_000 });
});

test('a document reaches the Documents list, where it can be opened', async ({ page, request }) => {
  const email = uniqueEmail('extraction-list');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);

  // The list invites the first upload rather than only reporting that there is nothing.
  await page.goto('/documents');
  await expect(page.getByText('No documents yet')).toBeVisible();
  await page.getByRole('link', { name: 'Upload a document' }).click();
  await expect(page).toHaveURL(/\/extraction$/);

  await page.setInputFiles('input[type="file"]', FIXTURE);
  await expect(page.getByText('electricity-bill.pdf is being read')).toBeVisible({ timeout: 15_000 });

  await page.goto('/documents');
  const row = page.locator('[data-document="electricity-bill.pdf"]');
  await expect(row).toBeVisible();
  await expect(row.getByText('2 figures to review')).toBeVisible({ timeout: 30_000 });

  await row.click();
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);
  await expect(page.getByText('WHAT WAS READ')).toBeVisible();
});

test('a rejected proposal is not committed', async ({ page, request }) => {
  const email = uniqueEmail('extraction-reject');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);

  await page.goto('/extraction');
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await page.getByRole('link', { name: 'View document' }).click();
  await expect(page.getByText('READY', { exact: true })).toBeVisible({ timeout: 30_000 });

  // Scoped to the record block rather than .first(): under `ng serve` the app can bootstrap twice
  // and leave a stale duplicate render, and a click on a detached node fires no handler.
  const record = page.locator('[data-record="GRID_ELECTRICITY_MY"]').last();
  await record.getByRole('button', { name: 'Reject' }).click();
  await expect(record.getByText('REJECTED', { exact: true })).toBeVisible({ timeout: 15_000 });

  // Rejecting must not produce an activity entry.
  await page.goto('/activity');
  await expect(page.getByText('0.7254')).toHaveCount(0);
});
