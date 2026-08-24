# WeSee — AI-Powered ESG Intelligence for Sustainable Supply Chains

> "We See Your Sustainability." · MAIC Nexus Track T6 · Built for Malaysia 2027

WeSee is a B2B sustainability data exchange addressing the Scope 3 capital-friction standoff
created by Malaysia's 2027 National Sustainability Reporting Framework (NSRF). It is an
**ingestion-and-assurance layer** — it does *not* reinvent the carbon calculator.

What runs today is a **multi-tenant ESG reporting platform** built around Bursa Malaysia's Common
Sustainability Matters and the IFRS S1/S2 disclosure standards. A company declares its sector and
market, records indicator values and emission activity, discloses under IFRS S1/S2, sets targets,
signs off, and exports a report. See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for the full
architecture walkthrough.

## The two engines

- **Engine 01 — Carbon Intelligence** *(built, running on Gemini)*
  Upload a raw Malaysian bill (TNB invoice, fuel/logistics manifest, phone photo) → the platform
  reads it and proposes the records it implies → a human confirms → values land in emission
  activity **and** indicator values together. Proposals are validated against the tenant's own
  closed set of emission factors and indicators, with unit conversion, and staged in
  `extracted_document` / `extracted_record` so machine output never enters the assurance hash
  unreviewed.

  Reading is done by Gemini behind a one-method `DocumentExtractor` interface, so a different
  engine — or an on-premise one — is a contained swap. Two things are load-bearing in how it is
  asked:

  - The **response schema pins `targetId` to an enum of the tenant's own ids**, so naming a factor
    the company does not have is structurally impossible rather than merely validated against.
  - The **model is told not to convert units**. `UnitConverter` owns kWh→MWh; a model converting as
    well would have its work applied twice, giving a figure wrong by a factor of a thousand that
    still looks plausible.

  Only PDF, PNG and JPEG can be read, and the type is sniffed from the file's own leading bytes —
  the upload allowlist is wider (xlsx/csv/docx are accepted as evidence), so extraction can
  legitimately fail on a file the platform was right to store.

  Per-tenant BYO-token is not built: one platform key serves every tenant.

- **Engine 02 — Reasonable Assurance** *(planned)*
  A RAG engine that ties every written report claim back to its source-document image, flags
  greenwashing, and produces page-referenced proof trails for auditors. Not built.

  What *does* exist is the **sign-off module**: a tamper-evident SHA-256 over indicator values,
  revocation, and a sign-off audit trail — the integrity guarantee, not the proof trail.

## What else is built

Indicators (Bursa-aligned definitions, monthly/annual entry, aggregation rules, audit trail,
evidence attachments, approval flow) · Emission activity and the Emissions Dashboard (Scope 1/2/3
via emission factors) · IFRS S1/S2 disclosures · Materiality assessments · Governance ·
Performance targets · Assurance sign-off · Export Center (PDF/CSV) · Company onboarding, team,
group hierarchy · Auth with TOTP MFA, email verification and session management · Scoped API
tokens for external ingest · Platform admin (tenants, support tickets, plan pricing, invoices,
SMTP, feature flags).

## Architecture

```
Angular 19 (:4210)  ──JWT──►  Spring Boot (:8080, /api/v1)  ──►  PostgreSQL
                                        │
                                        ├── DocumentExtractor → Gemini (swappable)
                                        └── uploads on local disk (./data/uploads)
```

The **Java Spring Boot backend** (`backend/`) is the whole backend — auth, reporting, and document
extraction in one process on :8080. The **Angular** app (`frontend/`) is the whole UI on :4210.
A two-part, pure Java + Angular stack; no gateway, broker, or Python service.

Two things worth knowing before reading the code:

- **Tenant isolation is enforced in the ORM.** Every tenant-scoped entity extends
  `TenantOwnedEntity`, which declares a Hibernate `@Filter` on `company_id`; the JWT filter
  enables it per request. This relies on `spring.jpa.open-in-view: true`.
- **Plan gating re-reads the database**, not the JWT — `@PreAuthorize("@planGate.check('key')")`
  against the `feature_flag` table, so a plan change takes effect immediately rather than on next
  login.

## Requirements

- **Java 21 + Maven** for the backend.
- **Node 18+** for the Angular frontend.
- **PostgreSQL** (local, or `make infra` for Docker).

## Quick start (dev)

```bash
make infra         # optional: Postgres on :5432, database wesee_esg
make backend       # cd backend && mvn spring-boot:run    → :8080
make backend-stub  # same, with the fixed extractor — no API key needed
make frontend      # cd frontend && npx ng serve --port 4210  → :4210
```

**`make backend` needs a Gemini key.** Document extraction defaults to `gemini`, and selecting it
without a key stops startup rather than starting a backend that fails on first upload — it will
never quietly fall back to the fixed extractor, whose invented figures a reviewer could not tell
from read ones. Either export `GEMINI_API_KEY`, or put the key in
`backend/src/main/resources/application-local.properties` (gitignored by `*-local.properties`, and
loaded because the `local` profile is active after `dev`):

```properties
wesee.extraction.gemini.api-key=…
```

One caveat with that file: Maven copies it into `target/classes`, so an artifact built from
`mvn package` would embed the key. Use the environment variable for anything deployed.

`make backend-stub` needs no key and is what the two extraction specs in the e2e suite require —
they assert on the fixed extractor's known 1,240 kWh reading, so they fail against a real model
(correctly: the fixture PDF they upload contains no figures at all).

Flyway runs migrations `V1`–`V52` on boot and seeds the reference data (sectors, Bursa matters,
indicator definitions, emission factors). Hibernate runs with `ddl-auto: validate` and never
creates or alters a table — **the schema belongs to the migrations**, and an entity that disagrees
with its table fails startup rather than silently altering the database.

Open http://localhost:4210. Migration `V14` seeds a `PLATFORM_ADMIN` login
(`platform.admin@wesee.my`, password in the migration file — change or delete that seed before
this schema is used outside a sandbox). Local company logins are listed in `ACCOUNTS-local.md`,
which is gitignored: this repo is public, so dev credentials live outside it.

Backend config: `backend/src/main/resources/application.yml`, with the datasource in
`application-dev.yml` (defaults to `postgres`/`root` on `localhost:5432/wesee_esg`). Overridable
via `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `UPLOADS_DIR`,
`EXTRACTION_PROVIDER` (`gemini` | `stub`), `GEMINI_API_KEY`, `GEMINI_MODEL`, and the `SMTP_*`
variables. API docs at http://localhost:8080/swagger-ui.html.

| Part | Port | Stack |
|---|---|---|
| frontend | 4210 | Angular 19 |
| backend | 8080 | Java Spring Boot (Java 21) |

## Testing

```bash
cd backend  && mvn test            # 58 unit tests
cd frontend && npx playwright test # ~84 e2e tests against a running backend (see make backend-stub)
```

No test reaches a model: `application-test.yml` pins the fixed extractor, and the Gemini bean is
conditional without `matchIfMissing`, so a suite cannot reach the network by forgetting to override
something. What the unit tests cover is the logic that is easiest to get quietly wrong — unit
conversion, proposal validation against the closed set, the sign-off guard, JWT, and for extraction:
the media-type sniff, exact decimal parsing, the closed-set enum in the response schema, and that a
missing key fails at construction rather than on first upload.

The balance is deliberate: behaviour is verified end-to-end through the real API, with unit tests
reserved for pure calculation. Note the backend has no `@SpringBootTest` — **a successful boot is
the only check on Spring Data derived query method names**, which `mvn compile` does not validate.

## Repository layout

```
backend/    Java Spring Boot — the backend (auth, reporting, extraction)
frontend/   Angular 19 — the UI (Workspace / Compliance Hub / Admin navs)
infra/      docker-compose (Postgres, optional)
docs/       design spec + implementation plan per milestone
data/       runtime uploads (gitignored — real bills never get committed)
```

Each milestone gets a design spec, then an implementation plan, then commits — and the specs
record the alternatives that were rejected and why, not just the decision.
