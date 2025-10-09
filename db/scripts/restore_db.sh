#!/usr/bin/env bash
# scripts/restore_db.sh
# Usage: ./scripts/restore_db.sh /path/to/backup.sql
set -euo pipefail
BACKUP_FILE="${1:?backup file required}"
cd "$(dirname "$0")/.."
export $(grep -v '^#' .env | xargs)
echo "Restoring $BACKUP_FILE into $PGDATABASE"
psql "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}" -f "$BACKUP_FILE"
echo "Restore finished"
