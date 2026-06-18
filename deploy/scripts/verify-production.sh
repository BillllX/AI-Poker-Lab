#!/usr/bin/env bash
# Post-deploy verification. Run on server or from laptop with curl.
set -euo pipefail

HOST_IP="${HOST_IP:-150.158.85.220}"
HOST_DOMAIN="${HOST_DOMAIN:-aiagentswitcher.com}"
BASE_PATH="${BASE_PATH:-/aipokerclub}"

fail=0
check() {
  local label="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -sS -m 12 -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    printf "OK  %-40s %s\n" "$label" "$code"
  else
    printf "FAIL %-40s got %s want %s\n" "$label" "$code" "$expect"
    fail=1
  fi
}

echo "=== Local (127.0.0.1) ==="
check "/" "http://127.0.0.1/"
check "${BASE_PATH}" "http://127.0.0.1${BASE_PATH}"
check "${BASE_PATH}/api/tables" "http://127.0.0.1${BASE_PATH}/api/tables"
check "legacy /api/tables" "http://127.0.0.1/api/tables"

echo "=== IP ${HOST_IP} ==="
check "ip ${BASE_PATH}" "http://${HOST_IP}${BASE_PATH}"

echo "=== HTTPS ${HOST_DOMAIN} ==="
check "https ${BASE_PATH}" "https://${HOST_DOMAIN}${BASE_PATH}"
check "https api" "https://${HOST_DOMAIN}${BASE_PATH}/api/tables"
check "http->https redirect" "http://${HOST_DOMAIN}${BASE_PATH}" "301"

echo "=== systemd ==="
if systemctl is-active --quiet texas-poker-agents 2>/dev/null; then
  echo "OK  texas-poker-agents active"
else
  echo "FAIL texas-poker-agents not active"
  fail=1
fi

if [[ -f /root/texas-poker-agents/.next/routes-manifest.json ]]; then
  if grep -q "\"basePath\": \"${BASE_PATH}\"" /root/texas-poker-agents/.next/routes-manifest.json; then
    echo "OK  build basePath=${BASE_PATH}"
  else
    echo "FAIL build basePath mismatch"
    fail=1
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  echo "Verification failed."
  exit 1
fi

echo "All checks passed."
