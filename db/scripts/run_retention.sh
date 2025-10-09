#!/usr/bin/env bash
# run_retention.sh — call retention functions in DB
cd "$(dirname "$0")/.."
export $(grep -v '^#' .env | xargs)

psql "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}" <<'SQL'
-- Move audit logs older than 90 days to archive
SELECT move_old_audit_logs(90);

-- Purge metrics older than 30 days
SELECT purge_old_metrics(30);

-- Remove expired ephemeral SSH keys
DELETE FROM ssh_keys WHERE ephemeral = true AND expires_at < now();
SQL
