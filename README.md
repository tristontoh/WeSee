# WeSee — AI-Powered ESG Intelligence for Sustainable Supply Chains

> "We See Your Sustainability." · MAIC Nexus Track T6 · Built for Malaysia 2027

WeSee is a decentralized B2B sustainability data exchange that resolves the Scope 3
capital-friction standoff created by Malaysia's 2027 National Sustainability Reporting
Framework (NSRF). It is a lightweight **ingestion-and-assurance layer** around two AI engines,
feeding the free official **Bursa CSI Platform** — it does *not* reinvent the carbon calculator.

## The two engines

- **Engine 01 — Carbon Intelligence** (in the Java `backend/`)
  Vision-LLMs read raw Malaysian bills (TNB invoices, fuel/logistics manifests, phone photos)
  → extract activity data → apply localized grid emission factors → certified Scope 1–3 metrics.
  **BYO-Token**: each tenant plugs in their own low-cost AI key (Gemini).

- **Engine 02 — Reasonable Assurance** *(planned)*
  A RAG engine that ties every written report claim back to its source-document image,
  flags greenwashing, and produces page-referenced proof trails for auditors.
  *(The Angular UI has these screens; the Java backend implementation is not built yet.)*

## Architecture

```
Angular (apps/frontend :4210)  ──►  Java Spring Boot backend (backend/ :8000)  ──►  PostgreSQL
                                             │
                          Gemini (Engine 01, in-process)  ·  carbon ledger
```

The **Java Spring Boot backend** (`backend/`) is the whole backend — auth, dashboard, and
bill ingestion (Engine 01 / Gemini) in one process on :8000. The **Angular** app (`apps/frontend`)
is the whole UI on :4210. That's it — a two-part, pure Java + Angular stack.

## Requirements

- **Java 21 + Maven** for the backend.
- **Node 18+** for the Angular frontend.
- **PostgreSQL** (local, or `make infra` for Docker).

## Quick start (dev)

```bash
cd backend && mvn spring-boot:run              # backend on :8000 (auto-creates tables + seeds)
cd apps/frontend && npx ng serve --port 4210   # UI on :4210
```

Open http://localhost:4210 and log in as `sme@demo.my` / `demo1234`.
Backend config (DB + Gemini key): `backend/src/main/resources/application.properties`.

| Part | Port | Stack |
|---|---|---|
| frontend | 4210 | Angular 19 |
| backend | 8000 | Java Spring Boot (Java 21) |

## Repository layout

```
backend/         Java Spring Boot — the backend (auth, dashboard, Engine 01 ingest)
apps/frontend/   Angular 19 — the UI (SME/PLC/Admin, Command Center)
infra/           docker-compose (Postgres, optional)
```
