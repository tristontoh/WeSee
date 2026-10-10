# Backup and restore

A dump you have never restored is a belief, not a backup. This page exists so that the first time
you restore is not the time you need it to work.

## Taking one

```bash
./scripts/backup.sh
```

Writes `backups/wesee-<timestamp>.dump` and `backups/uploads-<timestamp>.tar.gz`, keeps 30 days,
and lists the dump's table of contents before declaring success — a dump `pg_restore --list`
cannot read is one you cannot restore.

**Both files matter.** Uploaded evidence lives on disk, not in the database, so a database-only
backup restores an audit trail whose documents are gone — which is worse than no backup, because
it looks complete. The script warns loudly when `UPLOADS_DIR` is missing.

Environment: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `UPLOADS_DIR`, `BACKUP_DIR`,
`RETAIN_DAYS`. Authenticate with `PGPASSWORD` or a `~/.pgpass` entry.

## Proving it works — do this monthly, not in an emergency

```bash
./scripts/restore.sh backups/wesee-<timestamp>.dump wesee_restore_check
```

It restores into a scratch database and then counts the rows in the tables a customer would notice
losing. Restoring without an error is not the same as restoring something usable, so it checks:

| | |
|---|---|
| `company`, `app_user` | the tenants and who can sign in |
| `indicator_value` | the disclosure figures |
| `emission_activity_entry` | the readings behind them |
| `sign_off_record` | the attestations |
| `flyway_schema_history` | the schema version the application will demand |

A `MISSING` on any row fails the script. Drop the scratch database afterwards with
`dropdb wesee_restore_check`.

### Last verified

Run on 2026-10-10 against the development database. Restored into a fresh database and read back
18 companies, 17 users, 16 indicator values, 6 activity entries, 1 sign-off record, schema at V94.

Replace that paragraph each time you run it. A date that has stopped moving is the signal.

## Before any migration

Migrations are forward-only — Flyway community has no down-migrations, and at least one migration
drops a column. Restoring is the rollback.

```bash
./scripts/backup.sh && cd backend && mvn -q flyway:info
```

## What this does not cover

- **Scheduling.** Put `backup.sh` on cron or your platform's scheduler. Nothing here does that for
  you, and an unscheduled backup script is the same as no backup.
- **Off-host storage.** A backup on the same disk as the database does not survive losing the
  disk. Copy it somewhere else.
- **Encryption at rest.** The dump contains every customer's commercial data in the clear.
