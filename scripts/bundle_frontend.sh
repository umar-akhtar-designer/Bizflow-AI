#!/usr/bin/env bash
# Build the React SPA and copy it into the Python package.
#
# Single-process hosts (FastAPI Cloud, a bare VM) then serve the UI from
# backend/app/static, which travels with the backend source. This avoids
# guessing where the host puts frontend/dist.
#
# Usage: ./scripts/bundle_frontend.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Building frontend..."
npm --prefix frontend ci
npm --prefix frontend run build

echo "Bundling into backend/app/static..."
rm -rf backend/app/static
mkdir -p backend/app/static
cp -R frontend/dist/. backend/app/static/

echo "Bundled $(find backend/app/static -type f | wc -l | tr -d ' ') files."
