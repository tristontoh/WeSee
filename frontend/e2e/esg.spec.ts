import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { API, loginForToken, loginThroughUi, registerUser, uniqueEmail, upgradePlan, verifyUser } from './fixtures';

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

// ---------- materiality (STARTER) ----------

test('materiality is available on STARTER and lists stakeholder groups', async ({ page, request }) => {
  await company(page, request, 'STARTER', 'mat');
  await page.goto('/materiality');
  await expect(page.getByText(/STAKEHOLDER GROUPS/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('SCORE MATTERS · 1–5')).toBeVisible();
});

test('a custom stakeholder group can be added and selected', async ({ page, request }) => {
  await company(page, request, 'STARTER', 'mat');
  await page.goto('/materiality');
  await expect(page.getByText(/STAKEHOLDER GROUPS/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Add a stakeholder group"]').fill('Local Community');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Local Community' })).toBeVisible({ timeout: 15_000 });
});

test('creating an assessment lists it as a draft and validates it', async ({ page, request }) => {
  await company(page, request, 'STARTER', 'mat');
  await page.goto('/materiality');
  await expect(page.getByText('SCORE MATTERS · 1–5')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Assessment name"]').fill('FY26 Materiality');
  await page.getByRole('button', { name: 'Create assessment' }).click();

  const row = page.locator('[data-assessment="FY26 Materiality"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText('Draft')).toBeVisible();

  await row.getByRole('button', { name: 'Validate' }).click();
  await expect(row.getByText('Validated')).toBeVisible({ timeout: 15_000 });
});

test('clicking a heat cell sets the score that gets saved', async ({ page, request }) => {
  // The scores used to come from <select> dropdowns; they are now a click-to-set heat strip,
  // so the value reaching the API no longer has a form control behind it.
  const email = await company(page, request, 'STARTER', 'mat');
  await page.goto('/materiality');
  await expect(page.getByText('SCORE MATTERS · 1–5')).toBeVisible({ timeout: 15_000 });

  const matter = 'Energy Consumption & GHG Footprint';
  await page.getByRole('button', { name: `Impact 5 for ${matter}` }).click();
  await page.getByRole('button', { name: `Influence 1 for ${matter}` }).click();

  await page.locator('input[placeholder="Assessment name"]').fill('Heat Strip FY26');
  await page.getByRole('button', { name: 'Create assessment' }).click();
  await expect(page.locator('[data-assessment="Heat Strip FY26"]')).toBeVisible({ timeout: 15_000 });

  // Assert against the persisted record, not the UI that produced it.
  const token = await loginForToken(email);
  const list = await (
    await request.get(`${API}/materiality/assessments`, { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  const created = list.find((a: { name: string }) => a.name === 'Heat Strip FY26');
  const detail = await (
    await request.get(`${API}/materiality/assessments/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();

  const saved = detail.scores.find((s: { matterName: string }) => s.matterName === matter);
  expect(saved.impact).toBe(5);
  expect(saved.influence).toBe(1);

  // Matters left untouched still submit the mid-scale default rather than dropping out.
  const untouched = detail.scores.find((s: { matterName: string }) => s.matterName !== matter);
  expect(untouched.impact).toBe(3);
});

// ---------- governance + targets (GROWTH) ----------

test('governance and targets show as locked on STARTER, not hidden', async ({ page, request }) => {
  await company(page, request, 'STARTER', 'gov');
  await page.goto('/indicators');
  await expect(page.getByText('Indicators').first()).toBeVisible({ timeout: 15_000 });

  // governance and targets are visibleOnlyAtMinPlan=false, so the backend intends them shown
  // but locked — unlike climate-module and ifrs-s1-s2, which are hidden outright.
  // Scoped to the sidebar: the indicators page also has a "Governance" category tab.
  const nav = page.locator('nav');
  const gov = nav.getByRole('button', { name: /Governance/ });
  await expect(gov).toBeVisible();
  await expect(gov).toHaveAttribute('data-locked', 'true');
  await expect(nav.getByRole('button', { name: /^Targets/ })).toHaveAttribute('data-locked', 'true');
  await expect(nav.getByRole('button', { name: 'Emissions Dashboard' })).toHaveCount(0);
});

test('opening a locked screen explains the plan requirement', async ({ page, request }) => {
  await company(page, request, 'STARTER', 'gov');
  await page.goto('/governance');
  await expect(page.getByText('Governance needs the Growth plan')).toBeVisible({ timeout: 15_000 });
});

test('governance and targets unlock on GROWTH', async ({ page, request }) => {
  await company(page, request, 'GROWTH', 'gov');
  await page.goto('/indicators');
  const gov = page.locator('nav').getByRole('button', { name: /Governance/ });
  await expect(gov).toBeVisible({ timeout: 15_000 });
  await expect(gov).not.toHaveAttribute('data-locked', 'true');
});

test('an oversight role can be set', async ({ page, request }) => {
  await company(page, request, 'GROWTH', 'gov');
  await page.goto('/governance');
  await expect(page.getByText('OVERSIGHT STRUCTURE')).toBeVisible({ timeout: 15_000 });

  const role = page.locator('input[placeholder="Role title"]').first();
  await role.fill('Board Sustainability Committee');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await expect(page.getByText('Oversight saved.')).toBeVisible({ timeout: 15_000 });
});

test('a compliance policy can be added and marked reviewed', async ({ page, request }) => {
  await company(page, request, 'GROWTH', 'gov');
  await page.goto('/governance');
  await expect(page.getByText(/COMPLIANCE POLICIES/)).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="Policy name"]').fill('Anti-Bribery Policy');
  await page.getByRole('button', { name: 'Add policy' }).click();

  const row = page.locator('[data-policy="Anti-Bribery Policy"]');
  await expect(row).toBeVisible({ timeout: 15_000 });

  await row.getByRole('button', { name: 'Mark reviewed' }).click();
  await expect(row.getByText('Current')).toBeVisible({ timeout: 15_000 });
});

test('a performance target can be added with a progress bar', async ({ page, request }) => {
  await company(page, request, 'GROWTH', 'tgt');
  await page.goto('/targets');
  await expect(page.getByText('ADD A TARGET')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="e.g. Cut Scope 2 by 40%"]').fill('Cut Scope 2 by 40%');
  await page.locator('input[placeholder="Target value"]').fill('40');
  await page.getByRole('button', { name: 'Add target' }).click();

  const row = page.locator('[data-target="Cut Scope 2 by 40%"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row.getByText(/target 40/)).toBeVisible();
});

test('a performance target can be deleted', async ({ page, request }) => {
  await company(page, request, 'GROWTH', 'tgt');
  await page.goto('/targets');
  await expect(page.getByText('ADD A TARGET')).toBeVisible({ timeout: 15_000 });

  await page.locator('input[placeholder="e.g. Cut Scope 2 by 40%"]').fill('Temporary Target');
  await page.locator('input[placeholder="Target value"]').fill('10');
  await page.getByRole('button', { name: 'Add target' }).click();

  const row = page.locator('[data-target="Temporary Target"]');
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0, { timeout: 15_000 });
});
