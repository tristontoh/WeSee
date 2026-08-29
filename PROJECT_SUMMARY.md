# WeSee — Project Summary

*Generated 2026-08-25 from the state of `main` at `c83427a`.*

## What it is

WeSee is a **multi-tenant ESG / sustainability reporting platform for Malaysian companies**,
built around Bursa Malaysia's Common Sustainability Matters and the IFRS S1/S2 disclosure
standards, in anticipation of Malaysia's 2027 National Sustainability Reporting Framework (NSRF).

A company signs up, declares its sector and market classification, and then works through a
reporting cycle: pick material matters → record indicator values and emission activity →
disclose under IFRS S1/S2 → set performance targets → sign off → export a report. A document
can also be uploaded and read by the platform, which proposes the records it implies for a human
to confirm.

The stack is deliberately two-part: **React 19 SPA** on `:4210` and a **Java 21 / Spring Boot
3.3 monolith** on `:8080`, over **PostgreSQL**. There is no separate service layer, message
broker, or Python component (an earlier FastAPI gateway was removed — see commit `ec23e1c`).

## Repository layout

```
backend/    Java 21 / Spring Boot 3.3.5 — the entire API (347 source files, 30 controllers)
frontend/   React 19 + Vite SPA — the entire UI
infra/      docker-compose for local Postgres
docs/       design specs and implementation plans, one pair per milestone
data/       runtime upload storage (untracked)
Makefile    make infra | backend | frontend
```

## Architecture

```
React 19 + Vite (:4210)  ──JWT──►  Spring Boot (:8080, /api/v1)  ──►  PostgreSQL (Flyway V1–V68)
                                       │
                                       ├── DocumentExtractor (swappable; stub today)
                                       └── local filesystem uploads (./data/uploads)
```

### Backend

- **Package-by-feature** under `com.wesee.esg`: `auth`, `user`, `mfa`, `session`, `tenant`,
  `reference`, `indicators`, `climate`, `materiality`, `governance`, `targets`, `assurance`,
  `export`, `extraction`, `apiaccess`, `support`, `billing`, `platform`, `privacy`, `email`,
  `pdf`, plus `common`/`security`/`config`.
- **Schema is migration-owned.** 52 Flyway migrations in
  [backend/src/main/resources/db/migration/](backend/src/main/resources/db/migration/), with
  `ddl-auto: validate` — Hibernate never creates or alters tables. Reference data (sectors,
  Bursa matters, indicator definitions, emission factors) is seeded by migration too.
- **Tenant isolation is enforced at the ORM layer.** Every tenant-scoped entity extends
  [TenantOwnedEntity](backend/src/main/java/com/wesee/esg/common/TenantOwnedEntity.java), which
  declares a Hibernate `@Filter` (`companyFilter`) on `company_id`.
- **Two authentication paths**, both in
  [SecurityConfig](backend/src/main/java/com/wesee/esg/config/SecurityConfig.java): a JWT filter
  for the SPA and an API-token filter for machine callers hitting the external indicator API.
  Roles: `COMPANY_ADMIN`, `COMPANY_CONTRIBUTOR`, `CONSULTANT`, `PLATFORM_ADMIN`, `SUPERADMIN`.
  TOTP MFA, email verification, and server-side session listing are all implemented.
- **Plan gating is a first-class concern.** Three tiers (`STARTER` → `GROWTH` →
  `ISSUER_READY`); endpoints are annotated `@PreAuthorize("@planGate.check('feature-key')")` and
  [PlanGateService](backend/src/main/java/com/wesee/esg/reference/PlanGateService.java)
  re-reads the plan from the database rather than trusting a JWT claim, so a downgrade takes
  effect immediately. The frontend mirrors the same feature keys to hide or lock nav items.
- Report output is Thymeleaf → `openhtmltopdf`; CSV via `commons-csv`; OpenAPI/Swagger UI is
  exposed at `/swagger-ui.html`.

### Frontend

- React 19 on Vite 6, routed by a **BrowserRouter** ([App.tsx](frontend/src/App.tsx)) — every route
  lives behind `#`. Styling is Tailwind 4 driven by a token layer in
  [index.css](frontend/src/index.css); icons come from `lucide-react`.
- `api/` holds one typed client per backend domain over a shared `apiClient`
  ([client.ts](frontend/src/api/client.ts)) that attaches the JWT, normalizes error bodies, and
  handles multipart uploads and blob downloads.
- Navigation is **derived from role and plan**: `AuthenticatedLayout` in `App.tsx` filters the nav
  against `PlanContext` (feature gating) and [permissions.ts](frontend/src/permissions.ts) (role
  groups), with platform admins getting their own set.
- [capabilities.ts](frontend/src/capabilities.ts) is the switchboard for subsystems the frontend can
  render but a backend might not serve. All four — AI, custom roles, the activity log, password
  reset — are now **on**, since the backend serves them all; the file stays because it is where an
  entry point asks before rendering, rather than shipping a control that 404s.
- Per-company RBAC: a `custom_role` holds a delimited set of permission keys from the `permission`
  catalog, and controllers gate on `@PreAuthorize("@perm.check('module.action')")`
  ([PermissionGateService](backend/src/main/java/com/wesee/esg/permission/PermissionGateService.java)),
  which re-reads the database every request so a role edit takes effect without re-login.
  COMPANY_ADMIN passes implicitly and can never be gated out of its own company.

## Feature areas

| Area | State | Notes |
|---|---|---|
| Auth, registration, email verification, invites | Built | JWT, TOTP MFA, session management, password change |
| Company onboarding, profile, plan, team, group | Built | Sector/market pickers, subsidiaries, role management |
| Indicators | Built | Bursa-aligned definitions, monthly/annual entry modes, aggregation rules, audit trail, evidence attachments, approval flow |
| Emission activity & Emissions Dashboard | Built | Factor-based Scope 1/2/3 calculation; dashboard gated to `ISSUER_READY` |
| IFRS S1/S2 disclosures | Built | Business segments, risks/opportunities, cross-industry metrics, linked targets |
| Materiality | Built | Assessments, stakeholder snapshots, click-to-set scoring heat strip |
| Governance | Built | Three-step wizard, oversight levels, matter ownership, compliance policies |
| Performance targets | Built | Horizons, direction, baseline vs. target |
| Assurance sign-off | Built | Tamper-evident SHA-256 over indicator values, revocation, audit entries |
| Export Center | Built | Integrated + IFRS reports, PDF/CSV, sign-off gating, export history |
| Document extraction | Built, on Gemini | See below |
| Platform admin | Built | Tenants, support tickets with messages/notes, plan pricing, invoices, SMTP + platform settings, feature flags |
| API access | Built | Scoped API tokens and an external indicator ingest endpoint |

### Document extraction — the most recent work

The last 12 commits build a pipeline that inverts evidence handling: instead of attaching a file
after typing a value, the document comes first and the values follow from it.

- One upload can imply **two records through one pipeline** — an electricity bill yields both an
  `EmissionActivityEntry` (kWh × grid factor → tCO₂e, Scope 2) and an `IndicatorValue` — proposed
  and confirmed together.
- **Staging, not direct-to-draft.** Proposals land in `extracted_document` / `extracted_record`
  (migration `V52`) and reach the real tables only on human acceptance, so machine output can
  never enter the assurance hash unreviewed. A `SignOffGuard` blocks acceptance into a
  signed-off period.
- Extraction runs **asynchronously after commit** (`ExtractionRequestedEvent` → `ExtractionWorker`,
  fixed in `ff5d6f2`), and output is checked by `ProposalValidator` against the tenant's closed
  set of factors and indicators, with `UnitConverter` reconciling document units to indicator units.
- The engine sits behind a one-method `DocumentExtractor` interface, and **Gemini is the only
  implementation** (`gemini-3.7-flash` by default and configurable, since model names turn over
  faster than this code will). A missing key stops startup; there is nothing to fall back to.
- **Nothing fakes the extractor, anywhere.** A stand-in that supplied a fixed reading once lived in
  production code so the e2e suite could run offline; a later HTTP-level mock replaced it; both are
  gone. There is one backend and one Gemini. `modelUsed` therefore always records a real model, and
  extraction is covered by unit tests rather than end to end — see the trade-off below.
- Three decisions inside the Gemini path carry most of the weight:
  - The response schema **pins `targetId` to an enum of the tenant's own ids**, making an
    unresolvable proposal structurally impossible rather than merely rejected downstream. This
    demotes `ProposalValidator` from the only defense to the second one.
  - The prompt **forbids the model from converting units**. `UnitConverter` owns kWh→MWh; both
    converting would apply the conversion twice, and a value wrong by 1000× still reads as
    plausible. Verified end to end: a 3,847 kWh bill yields `unitAsRead: kWh` on both proposals,
    with 3847.0 on the activity and 3.847 on the MWh indicator.
  - The media type is **sniffed from the file's leading bytes**, not from the file name or the
    content type — the worker passes no content type at all, and the upload's file name is
    client-supplied, which is the same reason it is never used to build a path.

## Testing

- **Backend:** 58 JUnit tests, targeting the logic that is easiest to get subtly wrong —
  `UnitConverter`, `ProposalValidator`, `SignOffGuard`, `JwtService`, annual-value computation, and
  for the Gemini path the media-type sniff, exact decimal parsing, the closed-set enum in the
  response schema, and construction-time refusal of a missing key. No test can reach a model: the
  test profile pins the fixed extractor and the Gemini bean carries no `matchIfMissing`.
- **Frontend:** 11 Playwright e2e specs (~84 tests) in [frontend/e2e/](frontend/e2e/) covering
  auth, onboarding, company/team/group, indicators, emissions, IFRS, ESG screens, assurance,
  account, admin, and extraction — plus 7 Karma/Jasmine unit specs.

The balance is deliberate: behaviour is verified end-to-end through the real API, with unit tests
reserved for pure calculation.

## Running it

```bash
make infra      # optional: Postgres on :5432, db wesee_esg
make backend    # mvn spring-boot:run  → :8080
make frontend   # npm run dev -- --port 4210 → :4210
```

Open http://localhost:4210. Migration `V14` seeds the `PLATFORM_ADMIN` account; local company
logins live in `ACCOUNTS-local.md`, which is gitignored because the repo is public.
Config: `backend/src/main/resources/application.yml` (+ `application-dev.yml` for the datasource,
which defaults to `postgres`/`root` on `localhost:5432/wesee_esg`).

On boot, Flyway runs `V1`–`V52` and seeds the reference data. Because `ddl-auto` is `validate`,
an entity that disagrees with its table fails startup instead of altering the database — and since
there is no `@SpringBootTest` in the repo, **a successful boot is the only check on Spring Data
derived query method names**, which `mvn compile` does not validate.

## Development conventions

Visible in `docs/superpowers/` and the commit history: each milestone gets a **design spec, then
an implementation plan, then commits** — and the specs record the alternatives that were rejected
and why, not just the decision. Commit subjects are lowercase, scoped, and describe behaviour
(`feat(extraction): read uploaded documents and propose the records they imply`). Code comments
follow the same habit: they explain the non-obvious *reason* for a choice — see the note on
`rec.unit` rather than `rec.unitAsRead` in the document detail screen, or why the Emissions
Dashboard appears in both nav sets in `nav.ts`.

## Open items

Known and deliberate, rather than forgotten:

- **Engine 02 is not built.** The RAG proof trail — tying a written report claim back to the
  source-document image, page-referenced, with greenwashing flags — does not exist. What ships is
  the sign-off module: a tamper-evident hash over indicator values. That is the integrity
  guarantee, not the proof trail, and the two should not be confused when describing the product.
- **One platform key, not BYO-token.** Per-tenant keys were considered and deferred: they need an
  encrypted column, an entry and validation UI, and a decision about what a tenant without a key
  sees. `SecretCryptoService` already exists, so the crypto is not the work — the product surface is.
- **Extraction is single-process.** If the instance dies mid-run a document stays `EXTRACTING` and
  needs a manual retry; the code says so where it happens. Scaling out means an outbox table and a
  poller rather than an in-process `@Async` listener.
- **`GET /company/users` is not permission-gated.** Every other route on `CompanyController` carries
  a `@perm.check`; this one is reachable by any authenticated member of the tenant, so a Contributor
  can list colleague names, emails and roles. It stays open because indicator entry uses it to fill
  an "Authorizing Officer" picker, and `team.view` is not granted to the default Member role. Gating
  it means giving that picker its own narrower endpoint first.
- **xlsx, csv and docx cannot be extracted**, only stored as evidence. They fail with a readable
  message rather than being parsed.
- **A packaged artifact would embed the local API key.** Maven copies
  `application-local.properties` into `target/classes`. Fine for local development, wrong for
  anything deployed — use `GEMINI_API_KEY` there.
- **Extraction is not covered end to end.** Doing so needs either a fake model — which is what the
  in-process stand-in was, and it had no business in production code — or real calls, which cost
  money and are not deterministic. A real bill as a fixture is also not committable to a public
  repo. So the boundary is unit-tested (prompt, schema, parsing, conversion, validation) and the
  upload-to-record path is checked by hand.
- **`gemini-3.7-flash` is on introductory pricing** that doubles on 2027-01-01. The model id is
  configurable for exactly this reason.
