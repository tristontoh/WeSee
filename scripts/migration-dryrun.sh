#!/usr/bin/env bash
# Run the migrations you are about to deploy against a copy of real data, before they touch it.
#
# Flyway community is forward-only. There are no down-migrations, and V93 drops a column, so a
# migration that goes wrong in production is recovered by restoring a backup rather than by
# undoing anything. That makes the first run of every migration against customer data the
# dangerous one — and without a staging environment, that first run IS the production run.
#
# This narrows that gap without a staging environment: take last night's dump, restore it to a
# scratch database, and start the application you are about to ship against it. If it comes up,
# the migrations applied to real data and the code agrees with the schema they produced.
#
# It is not a replacement for staging. It exercises startup, not behaviour. What it does cover is
# the part that cannot be rolled back.
#
#   ./scripts/migration-dryrun.sh backups/wesee-20261010T120000Z.dump
#   JAR=backend/target/esg-backend-0.1.0.war ./scripts/migration-dryrun.sh <dump>
set -euo pipefail

dump="${1:?usage: migration-dryrun.sh <dump file> [scratch database]}"
scratch="${2:-wesee_migration_dryrun}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-root}"
PORT="${PORT:-8097}"
PROFILES="${SPRING_PROFILES_ACTIVE:-}"

[ -f "$dump" ] || { echo "no such dump: $dump" >&2; exit 1; }

psql_args=(--host="$DB_HOST" --port="$DB_PORT" --username="$DB_USERNAME")
log=$(mktemp -t wesee-dryrun)
app_pid=""

cleanup() {
  [ -n "$app_pid" ] && kill "$app_pid" 2>/dev/null || true
  # Leave the log on failure — it is the only account of what went wrong.
  [ "${keep_log:-0}" = "0" ] && rm -f "$log"
  psql "${psql_args[@]}" --dbname=postgres -c "DROP DATABASE IF EXISTS $scratch;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

version_of() {
  psql "${psql_args[@]}" --dbname="$1" -tAc \
    "SELECT coalesce(max(version::numeric)::text, 'none') FROM flyway_schema_history WHERE success" \
    2>/dev/null || echo "none"
}

echo "1. restoring $(basename "$dump") into $scratch"
psql "${psql_args[@]}" --dbname=postgres -c "DROP DATABASE IF EXISTS $scratch;" >/dev/null 2>&1
psql "${psql_args[@]}" --dbname=postgres -c "CREATE DATABASE $scratch;" >/dev/null
PGPASSWORD="$DB_PASSWORD" pg_restore "${psql_args[@]}" --dbname="$scratch" \
  --no-owner --no-privileges "$dump" >/dev/null 2>&1 || true

before=$(version_of "$scratch")
rows=$(psql "${psql_args[@]}" --dbname="$scratch" -tAc "SELECT count(*) FROM company" 2>/dev/null || echo 0)
echo "   schema V$before, $rows companies — this is the data the migrations will run against"

# The artifact under test is the one you are about to deploy.
#
# It is a .war, not a .jar — the pom declares war packaging so the application can also be
# dropped into an external servlet container. spring-boot-maven-plugin repackages it, so it is
# still executable with java -jar. Match both extensions rather than assuming: a build that
# quietly produces nothing this script recognises would otherwise look like a missing artifact.
find_artifact() {
  # || true throughout: one of the two globs always misses, and under `set -o pipefail` a
  # failing ls would end the script here rather than fall through to the build below.
  { ls backend/target/esg-backend-*.war backend/target/esg-backend-*.jar 2>/dev/null || true; } \
    | grep -v '\.original$' | head -1 || true
}
app="${JAR:-$(find_artifact)}"
if [ -z "$app" ] || [ ! -f "$app" ]; then
  echo "2. building (nothing in backend/target yet)"
  (cd backend && mvn -q -B -DskipTests package)
  app=$(find_artifact)
  [ -n "$app" ] || { echo "   the build produced no .war or .jar" >&2; exit 1; }
fi
echo "2. starting $(basename "$app") against $scratch"

# Passed as SPRING_DATASOURCE_* rather than DB_HOST so this works whatever profile is active —
# the profile's own datasource block, if it has one, is overridden.
#
# A throwaway signing secret, because a dry run must not need the production one, and because
# JwtSecretGuard refuses the published default outside a development profile. Generating one here
# means the guard is exercised rather than sidestepped.
# ddl-auto is forced to validate rather than inherited.
#
# This is the whole point of the run and it cannot be left to the profile. `validate` is set in
# application-dev.yml, application-docker.yml and application-test.yml, but NOT in
# application.yml — so a production start with no profile does no schema validation at all, and
# a migration that disagrees with the entities fails at the first query that touches the column
# instead of at startup. Found by deliberately dropping a mapped column and watching this script
# report success; without this line it would have.
SPRING_DATASOURCE_URL="jdbc:postgresql://$DB_HOST:$DB_PORT/$scratch" \
SPRING_DATASOURCE_USERNAME="$DB_USERNAME" \
SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD" \
SPRING_PROFILES_ACTIVE="$PROFILES" \
SPRING_JPA_HIBERNATE_DDL_AUTO="validate" \
JWT_SECRET="$(openssl rand -base64 48)" \
SERVER_PORT="$PORT" \
  java -jar "$app" > "$log" 2>&1 &
app_pid=$!

for _ in $(seq 1 120); do
  grep -qE "Started EsgBackendApplication|APPLICATION FAILED TO START|FlywayException|Caused by" "$log" 2>/dev/null && break
  kill -0 "$app_pid" 2>/dev/null || break
  sleep 1
done

after=$(version_of "$scratch")
applied=$(psql "${psql_args[@]}" --dbname="$scratch" -tAc \
  "SELECT count(*) FROM flyway_schema_history WHERE version::numeric > ${before/none/0}" 2>/dev/null || echo "?")

if grep -q "Started EsgBackendApplication" "$log" 2>/dev/null; then
  echo "3. applied $applied migration(s): V$before -> V$after"
  psql "${psql_args[@]}" --dbname="$scratch" -tAc \
    "SELECT '   V' || version || '  ' || description FROM flyway_schema_history
     WHERE version::numeric > ${before/none/0} ORDER BY installed_rank" 2>/dev/null || true
  echo
  echo "DRY RUN OK — the migrations applied to real data and the application started on the"
  echo "result under ddl-auto=validate, so the entities match the schema they produced and every"
  echo "Spring Data query name resolved. Behaviour is not covered; only startup is."
else
  keep_log=1
  echo "3. the application did NOT start on the migrated schema" >&2
  echo >&2
  grep -E "FlywayException|SchemaManagementException|PropertyReferenceException|missing column|wrong column type|Caused by|APPLICATION FAILED|Failed to (start|configure|determine)" \
    "$log" 2>/dev/null | head -12 | sed 's/^/   /' >&2
  echo >&2
  echo "DRY RUN FAILED — do not deploy. Full log: $log" >&2
  echo "Schema reached V$after. Nothing in production was touched." >&2
  exit 1
fi
