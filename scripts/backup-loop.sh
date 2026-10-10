#!/bin/sh
# Runs backup.sh on a loop, for the compose stack's backup service.
#
# A loop rather than cron: cron in a container means a second process supervisor, a crontab whose
# syntax errors are silent, and logs that go somewhere other than `docker compose logs`. The cost
# is that the schedule drifts by however long a backup takes and resets when the container
# restarts. For daily backups that does not matter; if it ever does, this is the file to replace.
set -eu

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"

echo "backup: every ${INTERVAL_HOURS}h into ${BACKUP_DIR}, keeping ${RETAIN_DAYS:-30} days"
[ -n "${BACKUP_UPLOAD_CMD:-}" ] || echo "backup: WARNING — BACKUP_UPLOAD_CMD is not set, so nothing leaves this machine. A backup that only exists on the server it backs up does not survive the server." >&2

while true; do
  started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  # Never let one failure end the loop — tomorrow's backup should still be attempted.
  if out=$(/scripts/backup.sh 2>&1); then
    echo "$started  ok"
    echo "$out" | sed 's/^/    /'

    if [ -n "${BACKUP_UPLOAD_CMD:-}" ]; then
      newest=$(ls -t "$BACKUP_DIR"/wesee-*.dump 2>/dev/null | head -1)
      if [ -n "$newest" ] && sh -c "$BACKUP_UPLOAD_CMD" _ "$newest"; then
        echo "    uploaded $(basename "$newest")"
      else
        echo "    UPLOAD FAILED — the backup exists only on this machine" >&2
      fi
    fi
  else
    echo "$started  BACKUP FAILED" >&2
    echo "$out" | sed 's/^/    /' >&2
  fi
  sleep $((INTERVAL_HOURS * 3600))
done
