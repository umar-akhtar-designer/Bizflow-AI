#!/bin/sh
set -eu

# Apply schema migrations before starting the API. Startup also calls
# Base.metadata.create_all, which keeps fresh SQLite demos working without
# Alembic, but PostgreSQL deployments should be driven by migrations.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations..."
  alembic upgrade head
fi

exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers \
  --forwarded-allow-ips="${FORWARDED_ALLOW_IPS:-*}"
