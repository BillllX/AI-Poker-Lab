#!/usr/bin/env bash
# Verify test environment after deploy (run on server or via ssh)
set -euo pipefail

BASE="/aipokerclubtest"
PORT=3001

check() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  echo "${label} -> ${code}"
  [[ "$code" == "200" || "$code" == "307" || "$code" == "308" ]]
}

echo "=== Direct app (port ${PORT}) ==="
check "app root" "http://127.0.0.1:${PORT}${BASE}"
check "app api" "http://127.0.0.1:${PORT}${BASE}/api/tables"

echo "=== nginx local ==="
check "nginx test root" "http://127.0.0.1${BASE}"
check "nginx test api" "http://127.0.0.1${BASE}/api/tables"

echo "=== HTTPS public ==="
check "https test root" "https://aiagentswitcher.com${BASE}"
check "https test api" "https://aiagentswitcher.com${BASE}/api/tables"

echo "All test checks passed."
