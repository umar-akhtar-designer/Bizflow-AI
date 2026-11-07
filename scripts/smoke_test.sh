#!/usr/bin/env bash
# Minimal API smoke test against a running instance.
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:8000}"
EMAIL="${DEMO_EMAIL:-demo@bizflow.ai}"
PASSWORD="${DEMO_PASSWORD:-demo1234}"

python3 - "$BASE" "$EMAIL" "$PASSWORD" <<'PY'
import json
import sys
import urllib.request

base, email, password = sys.argv[1:4]


def call(path, method="GET", body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base + path, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.status, json.loads(response.read() or b"{}")


status, health = call("/api/health")
assert status == 200 and health["database"] == "ok", health
print(f"health          ok  (ai mode: {health['ai']['mode']})")

status, auth = call(
    "/api/auth/login", "POST", {"email": email, "password": password}
)
assert status == 200, auth
token = auth["access_token"]
print(f"login           ok  ({auth['user']['email']})")

for path in ["/api/dashboard", "/api/workflows", "/api/approvals", "/api/invoices"]:
    status, payload = call(path, token=token)
    assert status == 200, (path, payload)
    print(f"{path:<15} ok")

status, workflows = call("/api/workflows?limit=5", token=token)
assert workflows["items"], "no workflows found; is the demo seeded?"
print(f"recent runs     {len(workflows['items'])}")
print("smoke test passed")
PY
