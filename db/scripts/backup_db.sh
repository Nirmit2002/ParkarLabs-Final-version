#!/usr/bin/env bash
# scripts/backup_db.sh
# Usage: ./scripts/backup_db.sh [full|schema|data] /path/to/output.sql
# Example: ./scripts/backup_db.sh full /root/ParkarLabs/db/backups/parkarlabs_full_$(date +%F).sql
set -euo pipefail

MODE="${1:-full}"
OUT="${2:-/root/ParkarLabs/db/q/backup_$(date +%F_%H%M%S).sql}"

# load env
cd "$(dirname "$0")/.."
export $(grep -v '^#' .env | xargs)

case "$MODE" in
  full)
    echo "Running full dump -> $OUT"
    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -F p -f "$OUT" "$PGDATABASE"
    ;;
  schema)
    echo "Dumping schema only -> $OUT"
    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -s -f "$OUT" "$PGDATABASE"
    ;;
  data)
    echo "Dumping data only -> $OUT"
    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -a -f "$OUT" "$PGDATABASE"
    ;;
  *)
    echo "Unknown mode: $MODE"
    exit 1
    ;;
esac

echo "Backup complete: $OUT"
