#!/usr/bin/env bash
# Usage: ./generate_usage_export.sh 2025-09-01 2025-09-30 [user_id]
set -euo pipefail
START_DATE="${1:-}"
END_DATE="${2:-}"
USER_ID="${3:-NULL}"

if [ -z "$START_DATE" ] || [ -z "$END_DATE" ]; then
  echo "Usage: $0 <start_date> <end_date> [user_id]"
  exit 2
fi

cd "$(dirname "$0")/.."

# call the generate_usage_export function (function inserts record and writes CSV to q/)
if [ "$USER_ID" = "NULL" ]; then
  ./scripts/connect.sh <<PSQL
SELECT generate_usage_export('${START_DATE}'::date, '${END_DATE}'::date, NULL::integer) AS export_id;
\q
PSQL
else
  ./scripts/connect.sh <<PSQL
SELECT generate_usage_export('${START_DATE}'::date, '${END_DATE}'::date, ${USER_ID}::integer) AS export_id;
\q
PSQL
fi
