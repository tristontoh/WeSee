# M1 — Foundation & Auth

**Date:** 2026-08-08
**Status:** Approved, ready for implementation planning
**Milestone:** 1 of 6 (see [Milestone context](#milestone-context))

## Problem

The Angular frontend (`frontend/`) was built against a FastAPI gateway on `:8000` that no longer
exists. The backend is now a Spring Boot ESG platform (`com.wesee.esg`) on `:8080` serving 154
endpoints under `/api/v1`. Nothing connects.

Verified in a real browser via Playwright on 2026-08-08:

```
POST http://localhost:8000/auth/login — net::ERR_CONNECTION_REFUSED
```

The user sees *"Could not reach the server. Is the gateway running on :8000?"*. Zero requests reach
`:8080`.

The Angular app itself is healthy — it builds, serves on `:4210`, and renders the login screen
correctly. Only the API layer is dead.

## Deliverable

Register a company, verify by email, log in (with MFA when enabled), hold a real backend session,
and land on a navigation derived from actual role and subscription plan.

Explicitly **not** in M1: wiring screen data. The 16 mock-driven screens keep their mocks.

## Milestone context

The full frontend rebuild is decomposed into six milestones. M1 must come first — every later
milestone depends on its interceptor, session model, and plan gate.

| # | Milestone | Backend modules | ~Endpoints |
|---|---|---|---|
| **M1** | **Foundation & auth** | `auth`, `mfa` + HTTP plumbing | 18 |
| M2 | Company & reference data | `tenant`, `reference` | 34 |
| M3 | Indicators & climate | `indicators`, `climate` | 30 |
| M4 | Disclosure modules | `materiality`, `governance`, `targets` | 23 |
| M5 | Assurance & outputs | `assurance`, `export`, `pdf` | 14 |
| M6 | Admin & account | `platform`, `support`, `user`, `session`, `apiaccess`, `privacy`, `billing` | 32 |

`session` (`/users/me/sessions` — list, revoke, revoke-others) is session-*management* UI and belongs
to M6, not M1. M1 only needs the session that login implicitly creates.

## Architecture

```
frontend/src/app/core/
├── http/
│   ├── api-base.ts            API_BASE = 'http://localhost:8080/api/v1'
│   ├── auth.interceptor.ts    attach Bearer; disambiguate auth failures
│   └── api-error.ts           normalize Spring errors → {status, message, fieldErrors}
├── auth/
│   ├── auth-api.service.ts    login, verifyMfa, register, verifyEmail, resend, me
│   └── session.service.ts     signals: token, email, role, companyId, plan
└── plan/
    └── plan-gate.service.ts   feature-flag matrix → visible | locked | hidden
```

Registered via `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` in
`app.config.ts` — currently `provideHttpClient(withFetch())` with no interceptors.

### Files removed

`core/api.service.ts` — shaped for FastAPI's form-encoded OAuth2 password flow. Nothing survives:
`login()` posts `application/x-www-form-urlencoded` where the backend wants JSON; `getCarbon()` and
`ingestBill()` hit `/dashboard/carbon` and `/carbon/ingest`, which have no counterpart in the new
backend. The dashboard falls back to mocks until M3.

### Files rewritten

`core/auth.service.ts` → `core/auth/session.service.ts`. Blast radius is small: five files import
it (`api.service.ts`, `auth.guard.ts`, `app-state.service.ts`, `shell.component.ts`,
`login.component.ts`), and `orgType` has **zero consumers outside `auth.service.ts` itself** —
tenant switching is driven by URL prefix in `app-state.service.ts`, not by the stored org type.

## Auth flows

```
register ──→ 200 {email} ──→ "check your email" ──→ /verify-email?token=… ──→ 204 ──→ login

login ──┬─→ emailVerificationRequired: true ──→ resend prompt
        ├─→ mfaRequired: true + mfaToken ────→ MFA challenge ──→ /login/verify-mfa
        └─→ auth.token ──────────────────────→ session established
```

`LoginResponse` is `{mfaRequired, mfaToken, emailVerificationRequired, auth}` where `auth` is
`AuthResponse{token, user: MeResponse}`. All three branches must be handled; the token is nested,
not top-level.

### Login screen changes

- **Remove** the Google and Apple buttons. The backend has no social auth and adding it is not
  scoped work. Leaving dead buttons on a login screen is worse than removing them.
- **Wire** "Create an account" (currently `href="#"`) to a real register form, a "check your email"
  state, and a `/verify-email` landing route.

### Dev signup path

With no SMTP configured, `EmailService` logs the verification link rather than failing:

```
No SMTP configured for company {} or the platform — skipping verification email to {}; verify link: {}
```

Developers copy the link from the backend console. No bypass or auto-verify is needed, and none
should be added — it would diverge dev from production.

## Session and navigation

Login already returns everything the session needs. `AuthResponse.user` is a `MeResponse`:

```
MeResponse {
  userId, name, email, role,
  companyId, companyName, sectorCode, market,
  plan,                    ← subscription plan, no extra call needed
  onboardingCompleted, mfaSetupRequired,
  frameworks, priorities, phone, dateOfBirth, address, bio, hasAvatar
}
```

So session hydration is:

| Trigger | Source |
|---|---|
| Login / MFA verify | `AuthResponse.user` from the response body |
| Page reload with a stored token | `GET /api/v1/auth/me` |

No call to `GET /api/v1/company` is needed for the session — `plan` arrives with the user. That
endpoint belongs to M2, for the company *profile* screen.

`companyId` is null for platform admins (they have no company), so any company-scoped logic must
null-check it. The JWT carries `role`, `email`, and conditionally `companyId`, but `MeResponse` is
the authoritative source and should be preferred over decoding the token.

`mfaSetupRequired` is surfaced on the session so a later milestone can prompt enrollment; M1 only
stores it.

### Nav derivation

| Condition | Nav |
|---|---|
| `role = PLATFORM_ADMIN` | admin |
| `COMPANY_ADMIN` + plan `ISSUER_READY` | compliance-hub |
| `COMPANY_ADMIN` otherwise | workspace |

This replaces the fabricated `org_type` the old gateway returned. The backend has no tenant-type
concept — it has roles and one company type whose features unlock by plan. The three existing nav
sets are preserved, but now derive from real state.

Accepted consequence: a company upgrading to `ISSUER_READY` changes navigation with no explicit
transition UI. Confirmed as intended.

## Plan gating

`plan-gate.service.ts` loads `GET /api/v1/reference/feature-flags` once per session and exposes
`state(featureKey)`:

| Condition | State |
|---|---|
| plan ≥ `minPlan` | **visible** |
| plan < `minPlan`, `visibleOnlyAtMinPlan = false` | **locked** — shown with lock + upgrade hint |
| plan < `minPlan`, `visibleOnlyAtMinPlan = true` | **hidden** |

This mirrors `PlanGateService` so the UI never offers what the API will refuse.

`visibleOnlyAtMinPlan` is stored and exposed but **never read by backend logic** — `PlanGateService`
checks only `minPlan`. It exists purely as a frontend display hint, which is why the client must
honor it.

Seeded matrix (13 flags): `dashboard`, `materiality`, `indicators`, `reports`, `team`, `billing`,
`settings` at `STARTER`; `governance`, `targets` at `GROWTH`; `ifrs-s1-s2`, `climate-module`,
`assurance-workspace`, `csi-export` at `ISSUER_READY`.

## Error handling

**The backend returns `403` — never `401` — for every authentication and authorization failure.**
Measured against the running server:

| Request | Status |
|---|---|
| `GET /auth/me`, no token | **403** |
| `GET /auth/me`, expired/garbage token | **403** |
| `GET /indicators`, valid token, insufficient role | **403** |
| `GET /auth/me`, valid token | 200 |

All three failures are indistinguishable by status code. An earlier draft of this spec proposed
disambiguating on *whether a token was sent* — that is wrong, and E2E testing caught it: an expired
token **is** sent, so it looked identical to a plan refusal and the session was never cleared.

The working discriminator is the **endpoint**. `/auth/me` is gated on authentication alone — no
role, no plan — so a 403 from it can only mean "not authenticated":

| Case | Meaning | Action |
|---|---|---|
| 401, any endpoint | session dead | clear session, redirect `/login` |
| 403 from `/auth/me` | session dead (missing, expired, or tampered token) | clear session, redirect `/login` |
| 403, no token attached | session dead | clear session, redirect `/login` |
| 403 with token, any other endpoint | authorization or plan refusal | surface to the calling screen |

Handling only `401` would mean the logged-out redirect never fires at all.

`api-error.ts` normalizes Spring's error body into `{status, message, fieldErrors}` so forms can
render per-field validation from `@Valid` failures (e.g. `RegisterRequest.password` requires ≥8
characters).

## Backend configuration

Two changes required, both currently pointing at `:3000` — the port of the abandoned React SPA.

| Setting | Current | Required |
|---|---|---|
| `wesee.cors.allowed-origins` | `http://localhost:3000` | `http://localhost:4210` |
| `APP_BASE_URL` (verification links) | `http://localhost:3000` | `http://localhost:4210` |

## Testing

### Playwright (primary)

`@playwright/test` as a frontend devDependency; config uses `webServer` to auto-start `ng serve` on
4210. Specs:

- login success → lands on the correct role/plan nav
- bad password → error message, stays on login
- unverified email → resend prompt
- MFA challenge → verify → session established
- register → "check your email" state
- expired/invalid token → redirect to `/login`
- plan-gated nav → hidden vs locked per the matrix

Fixtures seed users through the API (`register`, then read the verification token from Postgres) so
specs are self-contained and repeatable.

### Jasmine (pure logic only)

- interceptor 403 disambiguation
- session decoding, including the platform-admin case with no `companyId`
- plan-gate three-way state

The frontend has Karma/Jasmine configured with zero specs; M1 adds the first.

## Out of scope

- All 16 mock-driven screens keep their mocks
- Session-management UI, password change, privacy screens → M6
- Social auth — no backend support exists
- The backend's bundled React SPA. It is unreachable by construction: `/`, `/index.html`, and
  `/assets/*.js` all return **403** because `SecurityConfig` ends with `.anyRequest().authenticated()`
  and an SPA cannot authenticate before its own JavaScript loads. Only `/swagger-ui/**`,
  `/v3/api-docs/**`, and `/actuator/health/**` are reachable. Making it work would require a backend
  security change and is not part of this milestone.
