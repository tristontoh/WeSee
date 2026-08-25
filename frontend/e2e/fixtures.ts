import { APIRequestContext, Page } from '@playwright/test';
import { Client } from 'pg';

export const API = 'http://localhost:8080/api/v1';

export const SEED_ADMIN = { email: 'platform.admin@wesee.my', password: 'PlatformAdmin#2026' };

/** Unique per run so repeated runs never collide on the unique email constraint. */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@wesee.my`;
}

export async function registerUser(
  request: APIRequestContext,
  email: string,
  password = 'E2ePassw0rd!',
): Promise<void> {
  // The company name deliberately excludes the email: embedding it makes every
  // getByText(email) assertion ambiguous across the company name and the member row.
  const suffix = email.split('@')[0].split('+')[1] ?? email.length;
  const res = await request.post(`${API}/auth/register`, {
    data: { name: 'E2E User', email, password, companyName: `E2E Co ${suffix}` },
  });
  if (!res.ok()) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
}

/**
 * Verifies a freshly registered user by reading its token straight from Postgres, because
 * development has no SMTP configured and the backend only logs the link.
 */
export async function verifyUser(email: string): Promise<void> {
  const db = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'wesee_esg',
  });
  await db.connect();
  const r = await db.query(
    `select t.token from email_verification_token t
       join app_user u on u.id = t.user_id
      where u.email = $1 order by t.created_at desc limit 1`,
    [email],
  );
  await db.end();
  if (!r.rows.length) throw new Error(`no verification token for ${email}`);

  const res = await fetch(`${API}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: r.rows[0].token }),
  });
  if (!res.ok) throw new Error(`verify-email failed: ${res.status}`);
}

/**
 * Upgrades the user's company to ISSUER_READY over the API. Call this *before* signing in
 * through the UI, so the session caches the new plan — nav derives from it.
 */
/** Logs in over the API and returns the bearer token, for assertions the UI cannot make. */
export async function loginForToken(email: string, password = 'E2ePassw0rd!'): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = (await res.json())?.auth?.token;
  if (!token) throw new Error(`could not log in ${email}`);
  return token;
}

export async function upgradePlan(
  email: string,
  plan: 'STARTER' | 'GROWTH' | 'ISSUER_READY',
  password = 'E2ePassw0rd!',
): Promise<void> {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = (await login.json())?.auth?.token;
  if (!token) throw new Error(`could not log in ${email} to upgrade plan`);

  const res = await fetch(`${API}/company/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(`plan upgrade failed: ${res.status}`);
}

/**
 * Marks a company's setup as done. Sign-in now lands a company that has not onboarded on
 * /onboarding, so any test asserting a different landing screen must complete this first.
 */
export async function completeOnboarding(email: string, password = 'E2ePassw0rd!'): Promise<void> {
  const token = await loginForToken(email, password);
  const res = await fetch(`${API}/auth/onboarding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ market: 'MAIN_MARKET', sectorCode: null, frameworks: [], priorities: [] }),
  });
  if (!res.ok) throw new Error(`completing onboarding failed: ${res.status}`);
}

export async function upgradeToIssuerReady(email: string, password = 'E2ePassw0rd!'): Promise<void> {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = (await login.json())?.auth?.token;
  if (!token) throw new Error(`could not log in ${email} to upgrade plan`);

  const res = await fetch(`${API}/company/plan`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan: 'ISSUER_READY' }),
  });
  if (!res.ok) throw new Error(`plan upgrade failed: ${res.status}`);
}

/**
 * Fills every applicable indicator for a fiscal year. Assurance sign-off is rejected below
 * 100% completeness, so any test that signs off must seed data first.
 */
export async function fillAllIndicators(
  email: string,
  fiscalYear: number,
  password = 'E2ePassw0rd!',
): Promise<void> {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = (await login.json())?.auth?.token;
  if (!token) throw new Error(`could not log in ${email}`);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const indicators = await (await fetch(`${API}/indicators`, { headers })).json();
  for (const ind of indicators) {
    // DIRECT_ANNUAL takes the annual endpoint; every other rule takes a month.
    const url =
      ind.aggregationRule === 'DIRECT_ANNUAL'
        ? `${API}/indicators/${ind.id}/values/${fiscalYear}`
        : `${API}/indicators/${ind.id}/monthly/${fiscalYear}/1`;
    const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ value: 10 }) });
    if (!res.ok) throw new Error(`seeding ${ind.id} failed: ${res.status} ${await res.text()}`);
  }
}

/** Signs a verified user in through the UI. */
export async function loginThroughUi(
  page: Page,
  email: string,
  password = 'E2ePassw0rd!',
): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Landing depends on plan: workspace tier goes to /indicators, ISSUER_READY to the
  // compliance-hub overview, since /dashboard reads ISSUER_READY-only data.
  await page.waitForURL(/\/(indicators|dashboard|onboarding|compliance-hub)/, { timeout: 15_000 });
}
