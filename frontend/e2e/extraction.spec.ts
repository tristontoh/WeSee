import { expect, test } from '@playwright/test';
import { loginThroughUi, registerUser, uniqueEmail, verifyUser } from './fixtures';

/**
 * The stub extractor proposes a fixed 1,240 kWh electricity reading against GRID_ELECTRICITY_MY
 * and IND-ENG-01, so one upload exercises both destinations. A fresh company per test keeps the
 * accepted values from colliding with data another spec relies on.
 */
test('uploads a document, reviews the proposals, and commits them', async ({ page, request }) => {
  const email = uniqueEmail('extraction');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);

  await page.goto('/extraction');
  await expect(page.getByText('UPLOAD A SOURCE DOCUMENT')).toBeVisible();

  // Contents are irrelevant while the stub extractor is in place; only the type is checked.
  await page.setInputFiles('input[type="file"]', {
    name: 'electricity-bill.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nelectricity bill\n'),
  });

  // Extraction runs off the request thread and the queue polls itself.
  await expect(page.getByText('READY', { exact: true })).toBeVisible({ timeout: 30_000 });

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

test('a rejected proposal is not committed', async ({ page, request }) => {
  const email = uniqueEmail('extraction-reject');
  await registerUser(request, email);
  await verifyUser(email);
  await loginThroughUi(page, email);

  await page.goto('/extraction');
  await page.setInputFiles('input[type="file"]', {
    name: 'electricity-bill.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nelectricity bill\n'),
  });
  await expect(page.getByText('READY', { exact: true })).toBeVisible({ timeout: 30_000 });

  // Scoped to the record row rather than .first(): under `ng serve` the app can bootstrap twice
  // and leave a stale duplicate render, and a click on a detached node fires no handler.
  const row = page.locator('[data-record="GRID_ELECTRICITY_MY"]').last();
  await row.getByRole('button', { name: 'Reject' }).click();
  await expect(row.getByText('REJECTED', { exact: true })).toBeVisible({ timeout: 15_000 });

  // Rejecting must not produce an activity entry.
  await page.goto('/activity');
  await expect(page.getByText('0.7254')).toHaveCount(0);
});
