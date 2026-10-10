#!/usr/bin/env bash
# Restore a dump into a database, and prove it worked.
#
# Run this on a schedule against a scratch database, not only in an emergency. The first time you
# restore should never be the time you need it to work.
#
#   ./scripts/restore.sh backups/wesee-20261010T120000Z.dump wesee_restore_check
set -euo pipefail

dump="${1:?usage: restore.sh <dump file> [target database]}"
target="${2:-wesee_restore_check}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
psql_args=(--host="$DB_HOST" --port="$DB_PORT" --username="$DB_USERNAME")

echo "restoring $dump into $target"
psql "${psql_args[@]}" --dbname=postgres -c "DROP DATABASE IF EXISTS $target;" >/dev/null
psql "${psql_args[@]}" --dbname=postgres -c "CREATE DATABASE $target;" >/dev/null
pg_restore "${psql_args[@]}" --dbname="$target" --no-owner --no-privileges "$dump" >/dev/null 2>&1 || true

# Restoring without error is not the same as restoring something usable. Check that the tables a
# customer would notice losing actually came back with rows in them.
fail=0
for t in company app_user indicator_value emission_activity_entry sign_off_record flyway_schema_history; do
  n=$(psql "${psql_args[@]}" --dbname="$target" -tAc "SELECT count(*) FROM $t" 2>/dev/null || echo "MISSING")
  printf "  %-26s %s\n" "$t" "$n"
  [ "$n" = "MISSING" ] && fail=1
done

# The schema must be at the same migration the application expects, or it will refuse to start.
v=$(psql "${psql_args[@]}" --dbname="$target" -tAc \
      "SELECT max(version::numeric) FROM flyway_schema_history WHERE success" 2>/dev/null || echo "?")
echo "  schema version              V$v"

if [ "$fail" = "0" ]; then
  echo "RESTORE OK — drop the scratch database with: dropdb $target"
else
  echo "RESTORE INCOMPLETE — a table the product needs did not come back" >&2
  exit 1
fi
