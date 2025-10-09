#!/usr/bin/env bash
# refresh monitoring materialized views (concurrent when possible)
set -euo pipefail
cd "$(dirname "$0")/.."
# uses ./scripts/connect.sh to get into psql
./scripts/connect.sh <<'PSQL'
SELECT refresh_monitoring_materialized_views();
\echo 'refreshed'
PSQL
