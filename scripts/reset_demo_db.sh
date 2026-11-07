#!/usr/bin/env bash
# Reset the local SQLite demo database so the next API start re-seeds cleanly.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIR="$ROOT/backend"

if command -v lsof >/dev/null 2>&1 && lsof -ti tcp:8000 >/dev/null 2>&1; then
  echo "The API is still listening on port 8000. Stop it before resetting." >&2
  exit 1
fi

rm -f "$DB_DIR/bizflow.db" "$DB_DIR/bizflow.db-shm" "$DB_DIR/bizflow.db-wal"
echo "Removed local SQLite demo database."
echo "Start the API again to re-seed the Northwind demo workspace:"
echo "  cd backend && PYTHONPATH=. uvicorn app.main:app --port 8000"
