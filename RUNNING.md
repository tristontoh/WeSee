# Running WeSee locally

Three processes, in this order: a database, the API, the web app. Each wants its own terminal.

---

## Before the first run

| | |
|---|---|
| **Java 21 + Maven** | the backend targets 21 exactly |
| **Node 20+** | the client is Vite 6 / React 19 |
| **PostgreSQL 16** | local, or `make infra` for the Docker one |
| **A Gemini API key** | see below — the backend refuses to start without it |

### The Gemini key is not optional

Startup stops with an `IllegalStateException` rather than producing a backend that fails on the
first upload. There is deliberately nothing to fall back to: a stand-in that invented figures could
have them accepted into the assurance hash, and a reviewer could not tell those from figures that
were actually read.

Either export it:

```bash
export GEMINI_API_KEY=…
```

or put it in `backend/src/main/resources/application-local.properties`, which is gitignored and
loaded automatically because the `local` profile is active after `dev`:

```properties
wesee.extraction.gemini.api-key=…
```

One caveat with the file: Maven copies it into `target/classes`, so anything built with
`mvn package` embeds the key. Use the environment variable for anything deployed.

---

## Starting up

```bash
# 1 — database
make infra                              # Postgres on :5432, database wesee_esg
                                        # or use a local Postgres; see the note below

# 2 — API                    (its own terminal)
cd backend && mvn spring-boot:run       # :8080

# 3 — web app                (its own terminal)
cd frontend && npm run dev              # :4210
```

Then open **http://localhost:4210**.

`npm run dev` starts the client and nothing else. It calls `http://localhost:8080`, so the backend
has to be up or every screen loads empty.

**Database credentials** default to `postgres` / `root` against `localhost:5432/wesee_esg`.
Override with `DB_USERNAME` / `DB_PASSWORD` if your local Postgres differs.

**Nothing to set up in the database.** Flyway runs all 67 migrations on boot and seeds the
reference data — sectors, Bursa matters, indicator definitions, emission factors. Hibernate runs
with `ddl-auto: validate` and never creates or alters a table: the schema belongs to the
migrations, and an entity that disagrees with its table fails startup rather than silently altering
the database.

### Logins

`platform.admin@wesee.my` is seeded by migration `V14` (password in the migration file — change or
delete that seed before this schema is used outside a sandbox).

Every other local login is in `ACCOUNTS-local.md`, which is gitignored: this repository is public,
so development credentials live outside it.

---

## Things that will confuse you otherwise

**Routes live behind a `#`.** The client uses a HashRouter, so it is `/#/documents`, not
`/documents`. A link without the hash lands on the index and looks like a routing bug.

**403 is normal.** Features are gated by subscription plan, and the backend answers a
plan-gated route with 403 rather than hiding it. On a Starter workspace the climate module, IFRS
S1/S2 and the assurance workspace are all out of reach by design.

**iCloud will break the build if `~/Desktop` is synced.** It duplicates files into `Xxx 2.class`
and `Xxx 2.java` copies, and Maven then refuses to start:

```
Unable to find a single main class from the following candidates
[com.wesee.esg.EsgBackendApplication, com.wesee.esg.EsgBackendApplication 10, …]
```

`backend/target`, `frontend/node_modules` and `frontend/dist` are symlinks to `.nosync`
directories, which iCloud skips — that keeps build output safe, but **source files are not
protected**. If compilation suddenly fails on a duplicate class, clear the copies:

```bash
find . -name "* [0-9]*" -not -path "./.git/*" -delete
```

The real fix is switching off **System Settings → Apple ID → iCloud → iCloud Drive → Desktop &
Documents Folders**, or keeping the project somewhere else.

---

## Checking a change

```bash
cd backend  && mvn test                 # 96 unit tests
cd frontend && npm run lint             # tsc --noEmit
cd frontend && npx playwright test      # e2e against a running backend
```

The e2e suite needs the backend and the client both up; it registers throwaway `E2E Co …` tenants
as it runs, which are safe to delete afterwards.

Extraction has **no** end-to-end coverage, deliberately: exercising it means calling the real model,
which costs money and is not deterministic, and a real bill as a fixture cannot go in a public
repository. Its logic — the prompt, the response schema, the parsing, unit conversion, proposal
validation — is unit-tested instead.

---

## Ports

| Port | What |
|---|---|
| 4210 | React client (Vite) |
| 8080 | Spring Boot API, routes under `/api/v1` |
| 5432 | PostgreSQL, database `wesee_esg` |

API docs while the backend is up: **http://localhost:8080/swagger-ui/index.html**
