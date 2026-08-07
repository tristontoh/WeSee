# WeSee ESG Backend

Java 21 + Spring Boot 3 + PostgreSQL backend for the WeSee ESG reporting platform. Implements the
multi-tenant data model, JWT auth, and REST API described in the project's BRD/PRD/SRS documents,
covering all three subscription tiers (`STARTER`, `GROWTH`, `ISSUER_READY`).

The React frontend in `../frontend/` is fully wired to this API (no mocked data) — see the root
[`README.md`](../README.md) for how the two run together.

## Requirements

- Java 21 (Temurin recommended)
- Maven 3.9+
- PostgreSQL 15+ (a local Homebrew install works fine — Docker is not required for local dev)

## Local setup

```bash
createdb wesee_esg          # one-time
createdb wesee_esg_test     # only needed if you add Testcontainers-free integration tests

cd backend
mvn spring-boot:run           # runs with the 'dev' profile by default, http://localhost:8080
```

Override `DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET` / `CORS_ALLOWED_ORIGINS` as environment
variables if your local Postgres isn't peer-auth with your OS user, or before deploying anywhere
that isn't localhost. `application-dev.yml` defaults to connecting as the current OS user with no
password, matching a typical Homebrew Postgres install.

Flyway migrations run automatically on startup (`src/main/resources/db/migration`). Nothing needs
to be seeded manually — reference data (sustainability matters, indicator definitions, feature
flags) ships in `V4__reference_seed_data.sql`.

### Default login

`V14__seed_platform_admin.sql` seeds the only way in to `/admin` (there's no invite/role-assignment
flow yet — self-registration always creates `COMPANY_ADMIN`):

```
email:    platform.admin@wesee.my
password: PlatformAdmin#2026
role:     PLATFORM_ADMIN
```

Sandbox credentials only — change the password (or delete the seed) before this schema is used
anywhere reachable outside local dev.

## API docs

Once running: Swagger UI at `http://localhost:8080/swagger-ui.html`, raw OpenAPI JSON at
`/v3/api-docs`. Authenticate with the "Authorize" button using a JWT from `POST /api/v1/auth/login`.

## Docker (optional, for later deployment)

```bash
docker compose up --build
```

Runs Postgres + the backend together via `docker-compose.yml` / `Dockerfile`. Not required or
exercised for local development — this machine doesn't have Docker installed, so these files are
unverified; sanity-check them before relying on them in production.

## Architecture

Package root `com.wesee.esg`. See the plan/design notes for the full rationale; the short version:

- **`common`** — `BaseEntity` (UUID PK + audit timestamps), `TenantOwnedEntity` (adds `companyId`
  + a Hibernate `@Filter` enabled per-request as a tenant-isolation safety net), exceptions, global
  error handling.
- **`security`** / **`auth`** — stateless JWT (HMAC, `io.jsonwebtoken`), `tokenVersion` column for
  cheap session invalidation, BCrypt passwords. Plan is never embedded in the JWT — every
  plan-gated endpoint re-reads `Company.subscriptionPlan` fresh from the DB via `PlanGateService`
  (`@PreAuthorize("@planGate.check('feature-key')")`), so a downgrade takes effect immediately.
  `emailverification` (registration tokens), `mfa` (TOTP enrollment + backup codes), and `session`
  (active-session list/revocation under `/api/v1/sessions`) round out the login flow.
- **`tenant`** / **`user`** — `Company` (the tenant), `AppUser`, `Sector`.
- **`reference`** — `SustainabilityMatter`, `IndicatorDefinition`, `FeatureFlag`, `MatterSetRule`,
  `TransitionReliefRule` — all seeded, configurable data (not hard-coded logic), so SEDG/Bursa
  framework changes don't require a redeploy. Also home to `MatterSetResolverService`, which
  decides which matter set (SEDG / BURSA_MAIN / BURSA_ACE / SECTOR) applies to a given company
  from its plan + market classification.
- **`indicators`** — per-company indicator values, target overrides, and an append-only audit
  trail (who/when/source per FR-5.5).
- **`materiality`** — versioned assessment snapshots (never mutated after creation) plus a
  separately-editable stakeholder list.
- **`governance`** — the 3 fixed oversight levels + per-matter ownership assignment.
- **`targets`** — standalone strategic targets, distinct from per-indicator targets.
- **`climate`** — IFRS S1 (business segments + risk/opportunity register) and IFRS S2 (governance/
  strategy/risk-management/metrics narrative + Scope 1/2/3 GHG ledger). Scope 3 transition-relief
  status is computed server-side from a seeded rule table + the company's market classification,
  never stored as an editable flag (SRS FR-6.3/6.4).
- **`assurance`** — fiscal-year sign-off workflow gated on 100% indicator completion, with its own
  audit trail mirroring the indicators module's pattern.
- **`export`** — raw indicator CSV, a CSI-compatible CSV (readiness aid only, never a real
  submission to Bursa's CSI platform), a server-rendered Integrated ESG Disclosure PDF
  (Thymeleaf + OpenHTMLtoPDF), and an export history log. Materiality and Governance modules each
  render their own PDF report the same way.
- **`email`** — best-effort transactional email (team invites, SMTP test-send). Resolves a
  per-company SMTP configuration first, falling back to a platform-wide default; SMTP passwords
  are AES/GCM-encrypted at rest.
- **`platform`** — the singleton `platform_settings` row: platform name/support email/app base
  URL, the default SMTP sender above, the platform-wide "require 2FA" toggle, and Stripe API keys
  for subscription billing. Secrets (SMTP password, Stripe secret key, Stripe webhook secret) are
  AES/GCM-encrypted at rest and only ever exposed to the client as a `*Set` boolean, never in
  plaintext; the Stripe publishable key is the one field returned as-is, since it's meant to ship
  to a client anyway. Admin-only (`PLATFORM_ADMIN` / `SUPERADMIN`) via `/api/v1/admin/platform-settings`.
- **`billing`** — per-company `Invoice` records and the admin view over them
  (`InvoiceAdminController`). Not yet wired to a payment processor — the Stripe keys in `platform`
  are configured but no charge/webhook flow calls them yet.
- **`apiaccess`** — long-lived API tokens (`ApiToken`, scoped via `ApiScope`) that let a company
  pull its own indicator data externally through `ExternalIndicatorController`, separate from the
  user-facing JWT auth used by the frontend.
- **`privacy`** — GDPR-style self-service: consent tracking, a company data export, and account
  closure.
- **`support`** — in-app support tickets (`SupportTicket` + threaded `TicketMessage`), with
  separate tenant-facing (`SupportTicketController`) and admin (`SupportTicketAdminController`)
  endpoints for status/priority/notes.

## Known simplifications (documented, not accidental)

- No refresh tokens — a bumped `tokenVersion` invalidates all of a user's existing tokens instead.
- No Word (.docx) export generation — PDF (via Thymeleaf) and CSV are covered; Word export is
  client-side plain text today.
- Consultant multi-tenant access is not built — one `AppUser` belongs to exactly one `Company`.
- No Testcontainers — dev/manual testing runs against a real local Postgres; the `test` Spring
  profile uses H2 in PostgreSQL-compatibility mode for any future slice tests.
