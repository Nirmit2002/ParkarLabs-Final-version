#!/usr/bin/env bash
# usage: ./scripts/generate_usage_export_client.sh 2025-09-01 2025-09-30 [out_path]
START="${1:?start date YYYY-MM-DD}"
END="${2:?end date YYYY-MM-DD}"
OUT="${3:-$(pwd)/q/usage_export_${START}_to_${END}.csv}"
mkdir -p "$(dirname "$OUT")"

# Ensure we run from project root so ./scripts/connect.sh is found
cd "$(dirname "$0")/.." || { echo "cannot chdir"; exit 1; }

# Use client-side \copy so DB role privileges are not needed
./scripts/connect.sh <<PSQL
\\copy (SELECT * FROM usage_counters WHERE period_start BETWEEN '${START}' AND '${END}') TO '${OUT}' CSV HEADER
PSQL

echo "Wrote ${OUT}"
