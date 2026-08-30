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

**Nothing to set up in the database.** Flyway runs all 78 migrations on boot and seeds the
reference data — sectors, Bursa matters, indicator definitions, emission factors. Hibernate runs
with `ddl-auto: validate` and never creates or alters a table: the schema belongs to the
migrations, and an entity that disagrees with its table fails startup rather than silently altering
the database.

### Logins

`platform.admin@wesee.my` is seeded by migration `V14` and **switched off again by `V80`**. V14
prints its own password in a comment, so leaving the account live would hand a working
`PLATFORM_ADMIN` login to anyone reading this repository while it is public for judging.

To use `/admin` locally, give it a password of your own and switch it back on:

```bash
# a bcrypt hash of whatever you want the password to be
htpasswd -bnBC 10 "" 'your-password-here' | tr -d ':\n' | sed 's/\$2y/\$2a/'
```

```sql
UPDATE app_user
SET password_hash = '<the hash above>', active = TRUE, token_version = token_version + 1
WHERE email = 'platform.admin@wesee.my';
```

Those two steps stay out of the migrations on purpose: no password that actually works should be
committed again.

Every other local login is in `ACCOUNTS-local.md`, which is gitignored: this repository is public,
so development credentials live outside it.

---

## Things that will confuse you otherwise

**The API can serve the client too.** `make bundle` builds it into
`backend/src/main/resources/static`, and `make serve` does that and then runs the API over it, so
`http://localhost:8080/documents` works as one origin. The bundle is a build artefact and is not
in git; without it the API is unaffected and :8080 simply answers 404.

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
make tidy
```

`tidy` removes a duplicate only when the file it copied still exists — it names anything it
leaves alone — so it cannot take a file
legitimately named `Scope 3.md` or `Phase 2.sql`. There is deliberately no `.gitignore` pattern for
these: a pattern broad enough to catch `LICENSE 2` also catches `Scope 3.md`, and a source file
silently missing from git is a worse problem than a duplicate you can see. Four of these did reach
a commit once — one of them a second copy of a Flyway migration, which Flyway would have refused to
run against.

**`mvn clean` breaks the build until you recreate one directory.** `backend/target` is a symlink
to `target.nosync`, and clean follows it: it deletes the real directory and leaves the symlink
pointing at nothing, so the next build stops with `Cannot create resource output directory`. The
same applies to `frontend/dist`.

```bash
mkdir -p backend/target.nosync    # after any mvn clean
mkdir -p frontend/dist.nosync     # after npm run clean
```

**`npm install` can replace the `node_modules` symlink with a real directory**, which quietly puts
several thousand files back inside the synced folder — the thing the `.nosync` scheme exists to
prevent. Check with `ls -ld frontend/node_modules`; if it is not a symlink, move it back:

```bash
rm -rf frontend/node_modules.nosync
mv frontend/node_modules frontend/node_modules.nosync
ln -s node_modules.nosync frontend/node_modules
```

The real fix is switching off **System Settings → Apple ID → iCloud → iCloud Drive → Desktop &
Documents Folders**, or keeping the project somewhere else.

---

## Checking a change

```bash
cd backend  && mvn test                 # 113 unit tests
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
