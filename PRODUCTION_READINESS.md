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
| **Status** | **NOT READY** |
| Evidence | No backup is configured, no restore has ever been performed, and there is no documented procedure. |
| How to check | `grep -ri "pg_dump\|backup" *.md docs/` — and more importantly, actually restore a dump into a scratch database and log in. |
| What done looks like | A dump runs on a schedule, and you have restored one and signed in to the restored copy at least once. A backup you have never restored is a belief, not a backup. |

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
| **Status** | **PARTLY** |
| Evidence | The arithmetic that was most exposed is now pure and tested: `Ratios`, `Allocation`, `SignOffHash`, `BoardComposition`, `FigureValidator`, the thirteen derivations. A percentage outside 0–100 is refused and names its inputs rather than being clamped. |
| The gap | `climate` (47 files) computes the emission figures themselves and has no tests. |
| How to check | `ls backend/src/test/java/com/wesee/esg/climate/` |
| What done looks like | A test that takes a known bill quantity and factor and asserts the tCO2e, plus one that proves a signed year cannot be altered underneath its hash. |

Two real defects of this kind have already been found and fixed, which is the reason to take the
remaining gap seriously rather than as a formality: three ratio formulas were pointed at
indicators recorded in MYR and m³, and the sign-off hash could be forged by putting a `|` in the
signer's name.

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
| **Status** | **PARTLY** |
| Evidence | `JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD` and `GEMINI_API_KEY` are documented. A Dockerfile and `application-docker.yml` exist. |
| The gap | **Eight** of the twelve environment variables the app reads are documented nowhere: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, `APP_BASE_URL`, `DB_HOST`, `DB_NAME`. A deploy missing the mail ones silently sends no email, so every invitation and verification link fails with nothing on screen to say why. `APP_BASE_URL` missing means the links that do go out point at localhost. |
| How to check | `grep -oE '\$\{[A-Z_]+' backend/src/main/resources/application*.yml \| sort -u` — every name that comes out must appear in `RUNNING.md`. |
| What done looks like | That list and the documented list are the same list. |

---

## 6. Will you know when it breaks?

| | |
|---|---|
| **Status** | **NOT READY** |
| Evidence | No metrics, no error tracking, no alerting. `pom.xml` has no micrometer, prometheus or sentry dependency. `/actuator/health` is exposed and that is all. |
| How to check | `grep -cE "micrometer\|prometheus\|sentry" backend/pom.xml` |
| What done looks like | An unhandled exception reaches you without a customer telling you. Until then, the first you hear of an outage is an email from the customer it happened to. |

---

## 7. Can you undo a bad release?

| | |
|---|---|
| **Status** | **PARTLY** |
| Evidence | CI now runs the suite, the typecheck and a secret scan on every push and pull request, so a broken commit is caught before it merges. |
| The gap | No tagged releases, no staging environment, and no rollback procedure. Migrations are forward-only. |
| How to check | `git tag` — empty. |
| What done looks like | A tagged release you can redeploy, and a staging environment that has the same migrations applied before production does. |

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

Four rows are **not ready or partly ready for reasons that take weeks, not days**: backup,
tenant-isolation test coverage, emissions test coverage, and monitoring. Two rows — account
takeover and release safety — moved from "not ready" to "ready" or close to it in one session, so
the pace is not the problem. The problem is that nobody has yet done the slow part.

**The honest summary for a judge, an investor or a first customer:**

> It runs end to end and we have tested the parts where a wrong number would be most expensive.
> It is not operationally ready: no backups, no monitoring, and four packages that handle customer
> data have no tests. We know which ones and in what order.

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
