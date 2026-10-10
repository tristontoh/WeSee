# Deploying WeSee

Every environment variable the application reads, what happens if you leave it out, and the two
that must be set or the deploy is wrong.

This file exists because eight of these were documented nowhere, and the ones that fail silently
are worse than the ones that crash — a missing `SMTP_HOST` means every invitation and every
verification email is simply never sent, with nothing on screen to say so.

---

## Must be set

| Variable | Why | What happens if you don't |
|---|---|---|
| `JWT_SECRET` | Signs every session token. At least 48 bytes — HMAC-SHA384. | **The application refuses to start** outside a dev profile. That is deliberate: the default is published in this repository, so anyone could mint a token for any tenant. |
| `DB_PASSWORD` | Postgres. | **The application refuses to start.** There is no default outside the dev profile — a default here would let a deploy with a missing variable connect somewhere unintended. |
| `DB_HOST`, `DB_NAME`, `DB_USERNAME` | Which database, and as whom. | **The application refuses to start**, naming the variable. |
| `GEMINI_API_KEY` | Document extraction. | **The application refuses to start.** This is not an optional feature flag: `GeminiEmbedder` is constructed at boot and throws without a key. It was listed below as "silently off" until 2026-10-11, which is the opposite of what happens. |

Generate a signing secret with:

```bash
openssl rand -base64 48
```

Rotating it signs every user out, which is the intended behaviour — tokens issued under the old
key stop verifying.

---

## Set these or the feature is silently off

| Variable | Default | What is quietly broken without it |
|---|---|---|
| `SMTP_HOST` | *(empty)* | **No email is ever sent.** Invitations, email verification and password resets all fail with nothing on screen. The invite link is written to the log instead — see `EmailService`. |
| `SMTP_PORT` | `587` | Usually fine. |
| `SMTP_USERNAME` | *(empty)* | Authentication against your mail provider fails. |
| `SMTP_PASSWORD` | *(empty)* | As above. |
| `MAIL_FROM` | `no-reply@wesee.my` | Mail is sent from a domain you may not control, so it lands in spam or is rejected outright. |
| `APP_BASE_URL` | `http://localhost:4210` | **Every link in every email points at localhost.** Invitations and verification links are unusable, and nothing reports an error. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4210` | The browser blocks the client's API calls, which looks like the server being down. |

---

## Usually left alone

| Variable | Default | Notes |
|---|---|---|
| `DB_PORT` | `5432` | |
| `DB_HOST` | `db` under the `docker` profile only; **required** otherwise | `db` is the compose service name, which is safe to default because it is not a credential. |
| `GEMINI_MODEL` | `gemini-3.7-flash` | |
| `GEMINI_BASE_URL` | *(empty)* | Set only to point at a proxy. |
| `UPLOADS_DIR` | `./data/uploads` | **Must be on persistent storage.** On a container filesystem the evidence documents behind every figure vanish on restart, and the audit trail then points at files that no longer exist. |

---

## Profiles

| Profile | Use |
|---|---|
| *(none)* | Production. Everything is required and nothing is defaulted. |
| `docker` | Compose — also production. Defaults only `DB_HOST` to the compose service name. |
| `dev` | Local, against a Postgres on localhost. Defaults the database credentials. |
| `test`, `isolation-test` | Tests only. |

The JWT guard treats `dev`, `local`, `test` and `isolation-test` as development. Anything else —
including `docker` and including no profile at all — is production, and the development secret is
refused.

**`docker` counted as development until 2026-10-11.** Compose is how this is deployed to a
server, so that meant the obvious production setup accepted the signing key published in this
repository, and defaulted the database password to `wesee`. Both are fixed; a compose deploy now
requires `JWT_SECRET`, `DB_NAME`, `DB_USERNAME` and `DB_PASSWORD` like any other.

---

## Before the first deploy

```bash
# 1. Every variable the app reads must be either set or deliberately defaulted.
grep -ohE '\$\{[A-Z_]+' backend/src/main/resources/application*.yml | tr -d '${' | sort -u

# 2. The guard must actually stop a bad start. This should exit non-zero.
cd backend && mvn -q spring-boot:run -Dspring-boot.run.profiles=prod

# 3. Migrations run forward only. Take a dump first — see BACKUP.md.
```

## After every deploy

```bash
curl -fsS "$APP_BASE_URL/actuator/health" | grep -q '"status":"UP"' && echo ok

# Send yourself an invitation. If no email arrives, SMTP is not configured —
# the application will not tell you.
```


---

## Monitoring

`/actuator/health` is public — that is what a load balancer probes.

`/actuator/metrics` and `/actuator/prometheus` **require authentication**: they name every route,
its traffic and its error rate, which is a map for anyone probing. Scrape them with credentials,
or from inside the network.

```bash
curl -H "Authorization: Bearer $TOKEN" "$APP_BASE_URL/actuator/prometheus"
```

Worth alerting on, in this order:

| Metric | Alert when |
|---|---|
| `wesee_unhandled_exceptions_total` | it moves at all — every increment is a 500 somebody saw |
| `http_server_requests_seconds_count{status="5.."}` | the rate rises above its normal floor |
| `hikaricp_connections_pending` | above zero for more than a few seconds — the pool is exhausted |
| `jvm_memory_used_bytes{area="heap"}` | approaching the max for minutes rather than seconds |

**This gets you the data, not the alerting.** Nothing here pages anyone. Point Prometheus,
Grafana Cloud or your platform's scraper at that endpoint, and set the thresholds above. Until you
do, the first you hear of an outage is still the customer it happened to.

---

## Rolling back a bad release

Two separate things can be wrong, and they have different answers. Decide which one you have
before you touch anything.

### The code is wrong, the schema is fine

This is the common case and it is quick. Releases are tagged, so redeploy the previous one:

```bash
git tag -l                      # the releases you can go back to
git checkout v0.1.0             # or whichever was last good
# then your normal deploy for that checkout
```

Flyway is forward-only, so the newer migrations stay applied. That is usually harmless — an
unused column or table costs nothing — and it is why the old code still runs against the newer
schema. Check that assumption before you rely on it: if the bad release added a `NOT NULL`
column with no default, or dropped one the old code reads, the old code will not start. Then you
are in the next case.

### The migration is wrong

There are no down-migrations. Flyway community cannot undo one, and hand-writing the reverse of a
destructive migration under pressure is how data is lost. The answer is to restore:

```bash
./scripts/restore.sh <the dump taken before the deploy> <database>
```

Then redeploy the previous tag. This is why `BACKUP.md` says to take a dump immediately before
every deploy that carries a migration — that dump is the only rollback you have, and it has to
exist *before* you need it.

`V93` drops a column, so at least one migration in this history is genuinely irreversible.

### What to check afterwards

```bash
curl -fsS http://localhost:8080/actuator/health          # 200
psql -d <database> -c "select version, description, success
                       from flyway_schema_history order by installed_rank desc limit 5"
```

Every row must say `success = t`. A failed migration leaves Flyway refusing to start until it is
resolved, and the application will not come up until then.
