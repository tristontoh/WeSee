#!/usr/bin/env bash
# Take a backup of the WeSee database.
#
# A dump you have never restored is a belief, not a backup — so this script's companion,
# restore.sh, exists to be run on purpose, against a scratch database, before you need it.
#
#   ./scripts/backup.sh                  -> ./backups/wesee-<timestamp>.dump
#   BACKUP_DIR=/mnt/x ./scripts/backup.sh
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-wesee_esg}"
DB_USERNAME="${DB_USERNAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="$BACKUP_DIR/wesee-$stamp.dump"

# Custom format: compressed, and pg_restore can read it selectively.
pg_dump --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USERNAME" \
        --dbname="$DB_NAME" --format=custom --file="$out"

# A dump that cannot be listed is a dump that cannot be restored. Check now, not in a crisis.
pg_restore --list "$out" > /dev/null

size=$(du -h "$out" | cut -f1)
echo "$out  ($size)"

# Uploaded evidence lives outside the database. A database-only backup restores an audit trail
# whose documents are gone, which is worse than no backup because it looks complete.
uploads="${UPLOADS_DIR:-./data/uploads}"
if [ -d "$uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads-$stamp.tar.gz" -C "$(dirname "$uploads")" "$(basename "$uploads")"
  echo "$BACKUP_DIR/uploads-$stamp.tar.gz  ($(du -h "$BACKUP_DIR/uploads-$stamp.tar.gz" | cut -f1))"
else
  echo "WARNING: $uploads does not exist — evidence documents are NOT in this backup" >&2
fi

find "$BACKUP_DIR" -name 'wesee-*.dump' -mtime +"$RETAIN_DAYS" -delete
find "$BACKUP_DIR" -name 'uploads-*.tar.gz' -mtime +"$RETAIN_DAYS" -delete
