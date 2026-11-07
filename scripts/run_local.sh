#!/usr/bin/env bash
# Start the production build locally (FastAPI serves frontend/dist).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  echo "Building frontend..."
  (cd "$ROOT/frontend" && npm ci && npm run build)
fi

cd "$ROOT/backend"
export PYTHONPATH=.
exec "$PYTHON_BIN" -m uvicorn app.main:app \
  --host "${HOST:-127.0.0.1}" \
  --port "${PORT:-8000}" \
  "$@"
