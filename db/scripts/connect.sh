#!/usr/bin/env bash
# Connect to PostgreSQL from WSL

# load env from project root (db/.env)
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
else
  echo "ERROR: .env file not found at $(dirname "$0")/../.env"
  exit 1
fi

# build connection URI
PG_CONN_URI="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"

# connect
psql "$PG_CONN_URI"

