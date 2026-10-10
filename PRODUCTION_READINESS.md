# Production readiness — how you tell, without asking anyone

"Production ready" is not a feeling and it is not a status somebody grants you. It is a set of
questions with evidence behind each one. This is that set, written for *this* product, with where
it actually stands as of the last check. Re-run the checks yourself; every one of them is a
command, not an opinion.

The organising question is not "is the code good". It is: **what happens to a customer if this is
wrong?** The rows are ordered by that.

---

## 1. Can it lose a customer's data?

| | |
|---|---|
| **Status** | **READY — once you schedule it** |
| Evidence | `scripts/backup.sh` dumps the database and the uploads directory and verifies the dump reads back with `pg_restore --list`. `scripts/restore.sh` restores one and counts the rows it recovered. A restore has actually been performed: a 924K dump went into a fresh database and read back 18 companies, 17 users, 16 indicator values, 6 activity entries, 1 sign-off and schema V94. `BACKUP.md` documents both. |
| How to check | `./scripts/backup.sh` then `./scripts/restore.sh <dump> <scratch-db>` — and read the counts it prints. |
| **Still yours to do** | Put `backup.sh` on a schedule (cron or your host's job runner) and send the output somewhere off this machine. A backup that only exists on the server it backs up is not a backup. |

Flyway community is forward-only: there are no down-migrations. One migration contains destructive
DDL (`V93` drops a column). A bad migration is recovered by restoring, which returns you to the
row above.

---

## 2. Can one customer see another's data?

| | |
|---|---|
| **Status** | **READY** |
| Evidence | `TenantScopingInvariantTest` enforces two rules over every repository by reflection: no repository over tenant-owned data may offer a finder that names no company, and no raw `findById` on one may sit in a method that never mentions the tenant. Deliberate exceptions are listed by name with their reason. `TenantFilterCoverageTest` pins down what the `companyFilter` does and does not cover, against a real database. `SupplyChainIsolationTest` covers the three tables that sit outside the filter on purpose. All three were mutation-checked — breaking the guard makes them fail. |
| How to check | `cd backend && mvn test -Dtest='Tenant*Test,SupplyChainIsolationTest'` |
| What a failure means | The message names the repository and method. Either add the company id to the signature, bind it in `@Query`, or add the name to `DELIBERATE_EXCEPTIONS` with a comment saying why it is safe. |

**This row found a real hole.** A Hibernate `@Filter` is applied when Hibernate builds a query; a
load by primary key does not build one. So `findById` was never filtered, and three tenant-facing
support endpoints — read messages, post a message, edit the note — resolved a ticket id from the
URL with `findById` alone. Any signed-in user with a ticket id could read another company's support
thread, post into it, and overwrite its note. Fixed in `ffb7b11` with `TicketAccessGuard`; the
invariant test is what stops the next one.

---

## 3. Can it put a wrong number in front of a regulator?

| | |
|---|---|
| **Status** | **READY** |
| Evidence | The arithmetic is pure and tested: `Ratios`, `Allocation`, `SignOffHash`, `BoardComposition`, `FigureValidator`, the eleven derivations, and now `EmissionMath` — quantity × factor, the entered-vs-derived rule, and the reporting relief window. The cases are the demo's own electricity bill, checked by hand against the factor table rather than against the implementation. A percentage outside 0–100 is refused and names its inputs rather than being clamped. `SignOffLock` closes a signed year to change on every write path. |
| How to check | `cd backend && mvn test -Dtest='EmissionMathTest,SignOffLockTest,SignOffHashTest,DerivationCatalogueUnitsTest'` |
| What a failure means | A reported figure changed. Nothing here is a style preference — every case is a number a regulator could be shown. |

**Four real defects of this kind have been found and fixed**, which is why this row was worth the
effort rather than a formality:

- Three ratio formulas were pointed at indicators that V40 had repurposed to MYR and m³, so the
  platform would have printed "Municipal Fresh Water Intake: 75 m³" where 75 was a percentage.
- The sign-off hash could be forged by putting a `|` in the signer's name.
- A signed year could still be edited through five write paths, putting the assurance hash over
  figures nobody signed.
- Revoking a sign-off never reopened the year for extracted records — and the error message told
  the user to revoke it.

The last two were found by this row and fixed in `53fbd8a`.

---

## 4. Can someone take over an account?

| | |
|---|---|
| **Status** | **READY, with one caveat** |
| Evidence | The app refuses to start with the development JWT secret outside a dev profile — verified by booting with `--spring.profiles.active=prod` and getting exit 1. Login locks an address after five failures in fifteen minutes — verified live. MFA exists. Swagger is no longer public. |
| Caveat | The throttle is in memory and per instance. Behind two instances an attacker gets five attempts each, and a restart clears the counts. `LoginThrottle`'s own comment says so. |
| How to check | `mvn spring-boot:run -Dspring-boot.run.profiles=prod` must fail. Then POST six wrong passwords to `/api/v1/auth/login`. |
| What done looks like | The above, plus the throttle moved to a shared store once there is more than one instance. |

---

## 5. Can somebody other than you deploy it?

| | |
|---|---|
| **Status** | **READY** |
| Evidence | The container builds, and the application starts in a real container against real data under both production profiles — `docker` and no profile at all. Every variable is required rather than defaulted, so a missing one stops the deploy by name instead of connecting somewhere unintended. Verified in both directions: with `JWT_SECRET` unset under `docker` it refuses and says why, and with a deliberately dropped column it refuses with `Schema-validation: missing column`. |
| How to check | `docker build -t wesee backend/`, then run it with the variables `DEPLOYING.md` lists. Or `./scripts/migration-dryrun.sh <a dump>`, which does the equivalent against a copy of real data. |

**This row was marked READY on 2026-10-10 and that was wrong.** It was judged on
environment-variable documentation, which was the only gap the row happened to name. Writing
`migration-dryrun.sh` required knowing which profile production runs, and the answer was that
none of them worked. All five are fixed as of 2026-10-11; the table is kept because the shape of
the mistake is worth remembering:

| | What is wrong | Effect |
|---|---|---|
| 1 | `pom.xml` declares `<packaging>war</packaging>`; `backend/Dockerfile` copies `target/esg-backend-*.jar` | The build **succeeds** — BuildKit's `COPY` accepts a glob matching no file — and produces an image with an empty `/app` that dies at startup with "Unable to access jarfile". Tagged, pushed and deployed before anything notices. |
| 2 | No profile (what `DEPLOYING.md` calls production) has no `datasource` block — only `application-dev.yml` and `application-docker.yml` define one | The application cannot start at all. `DB_HOST` and `DB_NAME` are documented but read by nothing. |
| 3 | `ddl-auto: validate` is in the dev, docker and test profiles but not in `application.yml` | Production does **no** schema validation. A migration that disagrees with the entities fails at the first query that touches the column instead of at startup. |
| 4 | `JwtSecretGuard` counts `docker` as a development profile | Deploying with compose — the obvious way to deploy this — accepts the signing key that is published in this repository. |
| 5 | `GEMINI_API_KEY` is listed under "set these or the feature is silently off" | It is a hard startup requirement. Without it the application refuses to boot, with a clear message, but not the one the documentation led you to expect. |

Numbers 3 and 5 were found by running the dry-run script. Numbers 1, 2 and 4 were found looking
for which profile it should run under. **None of them would appear in local development**, because
local development uses the `dev` profile, where all five were already configured correctly — which
is exactly why a row about deploying cannot be answered by reading the code.

Number 1 is worth a second look. The first version of this entry said `docker build` fails at
that line. It does not: BuildKit accepts a `COPY` glob that matches no file, so the image built
clean, contained nothing, and died at startup. That was found by deliberately putting the broken
line back and building it — the claim had been reasoned, not run.

---

## 6. Will you know when it breaks?

| | |
|---|---|
| **Status** | **PARTLY — the numbers exist, nothing watches them** |
| Evidence | `micrometer-registry-prometheus` is wired in. `/actuator/prometheus` and `/actuator/metrics` serve 102 metrics over 233 lines and require authentication; `/actuator/health` stays open so a load balancer can reach it. Every unhandled exception increments a counter, so 500s are countable rather than anecdotal. Verified live: health 200 unauthenticated, prometheus and metrics 403 unauthenticated, both 200 with credentials. |
| **Still yours to do** | Point something at `/actuator/prometheus` — Prometheus, Grafana Cloud, your host's metrics agent — and set one alert on the 500 counter. Until a thing is scraping and a thing is alerting, the first you hear of an outage is still an email from the customer it happened to. This needs a destination to send to, which is an account decision rather than a code one. |

---

## 7. Can you undo a bad release?

| | |
|---|---|
| **Status** | **PARTLY — you can roll back, you cannot rehearse** |
| Evidence | CI runs the suite, the typecheck and a secret scan on every push and pull request. `v0.1.0` is tagged, so there is a release to go back to. `DEPLOYING.md` has the rollback procedure, and it separates the two cases that need different answers: bad code (redeploy the previous tag) and a bad migration (restore, because Flyway is forward-only and `V93` drops a column). |
| How to check | `git tag -l` lists a release; `grep -A5 "Rolling back" DEPLOYING.md` |
| **Still yours to do** | A staging environment that gets the same migrations before production does. Without one, every migration's first run anywhere is its run against customer data — and the rollback above is a restore, not an undo. This needs somewhere to run, which is a hosting decision rather than a code one. |

---

## 8. Are you allowed to hold this data?

| | |
|---|---|
| **Status** | **UNANSWERED — and not a code question** |
| What it covers | Malaysia's PDPA: consent, retention, the right to erasure, and a data-processing agreement with every subprocessor. Document content is sent to Google's Gemini API, which makes Google a subprocessor of your customers' commercial data. |
| Evidence | A `privacy` package exists (6 files, no tests). Whether the policy behind it is sufficient is a legal judgement, not something that can be read off the code. |
| How to check | Ask a lawyer. Seriously — this is the one row on this page that no amount of engineering closes. |

Six log statements write a customer's email address into the log. That is ordinary, and it is also
personal data under the PDPA, so it belongs in the retention policy rather than in a code review.

---

## Where that leaves it

**Five of the eight rows are READY.** The three that remain are not blocked on code:

| Row | What is left | Who can do it |
|---|---|---|
| 1. Backup | Put `backup.sh` on a schedule and ship the output off the machine | You — it needs a host and a cron |
| 6. Monitoring | Point a scraper at `/actuator/prometheus` and set one alert | You — it needs an account to send to |
| 7. Rollback | A staging environment (the tag, the procedure and `migration-dryrun.sh` now exist) | You — staging needs somewhere to run |
| 8. PDPA | A lawyer's reading of consent, retention and the Gemini subprocessor | A lawyer, not an engineer |

Everything a test or a guard can settle is settled. What remains needs a server, an account, or a
professional opinion.

**Writing these rows found four real defects**, which is the argument for the exercise over a
checklist: three ratio formulas printing percentages as cubic metres, a forgeable sign-off hash,
three support endpoints serving any company's tickets to any signed-in user, and a sign-off that
could be edited underneath while its revocation never reopened the year. None of them would have
shown up in a demo. All four are fixed, each with a test that fails if it comes back.

**The honest summary for a judge, an investor or a first customer:**

> It runs end to end. The places where a wrong number or a leaked row would be most expensive are
> tested, and writing those tests found four defects we have since fixed. What is left is
> operational — a backup schedule, a metrics destination, a staging environment — and a PDPA
> review that is a legal question rather than an engineering one.

That sentence is stronger than "yes it's production ready", because it is checkable, and because
the person hearing it will check.

---

## How to use this page

Do not trust it because it is written down. Each row has a command. Run them. When a row's
evidence changes, change the row — and if you ever cannot answer one of these eight questions with
a command, that is the thing to fix next.

The day every row says READY and you have personally run the checks is the day you can say the
product is production ready. Nobody else can say it for you, because nobody else carries the
consequence when it is wrong.
