# WeSee — AI-Powered ESG Intelligence for Sustainable Supply Chains

> "We See Your Sustainability." · MAIC Nexus Track T6 · Built for Malaysia's NSRF

WeSee is a B2B sustainability data exchange addressing the Scope 3 capital-friction standoff
created by Malaysia's National Sustainability Reporting Framework (NSRF) — phased in from FY2025
for the largest Main Market issuers, and reaching every listed issuer and the largest private
companies by FY2027. It is an **ingestion-and-assurance layer** — it does *not* reinvent the
carbon calculator.

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
React 19 + Vite (:4210)  ──JWT──►  Spring Boot (:8080, /api/v1)  ──►  PostgreSQL
                                        │
                                        ├── DocumentExtractor → Gemini (swappable)
                                        └── uploads on local disk (./data/uploads)
```

The **Java Spring Boot backend** (`backend/`) is the whole backend — auth, reporting, and document
extraction in one process on :8080. The **React** app (`frontend/`) is the whole UI on :4210,
served by Vite. Routes are real paths, and the API can serve the built client from the same
origin — see `make bundle` and `make serve`.
A two-part, pure Java + React stack; no gateway, broker, or Python service.

Two things worth knowing before reading the code:

- **Tenant isolation is enforced in the ORM.** Every tenant-scoped entity extends
  `TenantOwnedEntity`, which declares a Hibernate `@Filter` on `company_id`; the JWT filter
  enables it per request. This relies on `spring.jpa.open-in-view: true`.
- **Plan gating re-reads the database**, not the JWT — `@PreAuthorize("@planGate.check('key')")`
  against the `feature_flag` table, so a plan change takes effect immediately rather than on next
  login.

## Requirements

- **Java 21 + Maven** for the backend.
- **Node 20+** for the React frontend (Vite 6).
- **PostgreSQL** (local, or `make infra` for Docker).

## Quick start (dev)

Step-by-step, including the traps: **[RUNNING.md](RUNNING.md)**.

```bash
make infra         # optional: Postgres on :5432, database wesee_esg
make backend       # cd backend && mvn spring-boot:run    → :8080
make frontend      # cd frontend && npm run dev -- --port 4210  → :4210
```

**`make backend` needs a Gemini key.** Startup stops without one rather than producing a backend
that fails on first upload. There is deliberately nothing to fall back to: a stand-in that invented
figures could have them accepted into the assurance hash, and a reviewer could not tell those from
figures that were read. Either export `GEMINI_API_KEY`, or put the key in
`backend/src/main/resources/application-local.properties` (gitignored by `*-local.properties`, and
loaded because the `local` profile is active after `dev`):

```properties
wesee.extraction.gemini.api-key=…
```

One caveat with that file: Maven copies it into `target/classes`, so an artifact built from
`mvn package` would embed the key. Use the environment variable for anything deployed.

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
`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_BASE_URL`, and the `SMTP_*`
variables. API docs at http://localhost:8080/swagger-ui/index.html.

| Part | Port | Stack |
|---|---|---|
| frontend | 4210 | React 19 + Vite 6 + Tailwind 4 |
| backend | 8080 | Java Spring Boot (Java 21) |

## Testing

```bash
cd backend  && mvn test            # 70 unit tests
cd frontend && npx playwright test # e2e against a running backend on :8080
```

**Extraction has no e2e coverage, by choice.** Exercising it end to end means calling the real
model, which costs money and answers differently each run — so there is one backend and no test
harness beside it. Extraction's logic is covered by unit tests instead: the prompt, the response
schema, the parsing, unit conversion and proposal validation are all tested directly, and those
are where it would go quietly wrong.

The unit tests cover the logic that is easiest to get quietly wrong — unit conversion, proposal
validation against the closed set, the sign-off guard, JWT, and for extraction: the media-type
sniff, exact decimal parsing, the closed-set enum in the response schema, and that a missing key
fails at construction rather than on first upload.

The balance is deliberate: behaviour is verified end-to-end through the real API, with unit tests
reserved for pure calculation. Note the backend has no `@SpringBootTest` — **a successful boot is
the only check on Spring Data derived query method names**, which `mvn compile` does not validate.

## Repository layout

```
backend/    Java Spring Boot — the backend (auth, reporting, extraction)
frontend/   React 19 + Vite — the UI (workspace, compliance, platform admin)
infra/      docker-compose (Postgres, optional)
docs/       design spec + implementation plan per milestone
data/       runtime uploads (gitignored — real bills never get committed)
```

Each milestone gets a design spec, then an implementation plan, then commits — and the specs
record the alternatives that were rejected and why, not just the decision.
