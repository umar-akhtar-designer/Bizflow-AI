#!/usr/bin/env bash
# Start a temporary public HTTPS URL for the local demo.
#
# Cloudflare quick tunnels are ephemeral: Cloudflare can terminate them at any
# time, and the URL changes every run. Use this to record or share briefly.
# For a stable submission link, deploy to a Vultr VM or Render.
#
# Usage:  ./scripts/tunnel.sh
set -euo pipefail

PORT="${PORT:-8000}"
LOG="${TMPDIR:-/tmp}/bizflow-tunnel.log"

if ! curl -fsS --max-time 4 "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  echo "No app on 127.0.0.1:${PORT}. Start it first:" >&2
  echo "  cd backend && PYTHONPATH=. uvicorn app.main:app --port ${PORT}" >&2
  exit 1
fi

: > "$LOG"
cloudflared tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate > "$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

URL=""
for _ in $(seq 1 40); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Could not get a tunnel URL. Log:" >&2
  tail -20 "$LOG" >&2
  exit 1
fi

echo "Public URL: $URL"
echo "Press Ctrl+C to stop the tunnel."
wait "$PID"
