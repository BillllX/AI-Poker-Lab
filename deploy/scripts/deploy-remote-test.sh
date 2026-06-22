#!/usr/bin/env bash
# Run ON THE SERVER after code sync to /root/texas-poker-agents-test
set -euo pipefail

APP_DIR="${APP_DIR:-/root/texas-poker-agents-test}"
BASE_PATH="${BASE_PATH:-/aipokerclubtest}"
SERVICE="${SERVICE:-texas-poker-agents-test}"
export PATH="/opt/node-v20.19.5-linux-x64/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"

cd "$APP_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  DATABASE_URL=$(grep -m1 '^Environment=DATABASE_URL=' "/etc/systemd/system/${SERVICE}.service" | sed 's/^Environment=DATABASE_URL=//')
  export DATABASE_URL
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not set and not found in systemd unit" >&2
  exit 1
fi

touch .env.production
SITE_ORIGIN="${SITE_ORIGIN:-https://aiagentswitcher.com${BASE_PATH}}"
if grep -q '^NEXT_PUBLIC_BASE_PATH=' .env.production; then
  sed -i "s|^NEXT_PUBLIC_BASE_PATH=.*|NEXT_PUBLIC_BASE_PATH=${BASE_PATH}|" .env.production
else
  echo "NEXT_PUBLIC_BASE_PATH=${BASE_PATH}" >> .env.production
fi
if grep -q '^NEXT_PUBLIC_SITE_ORIGIN=' .env.production; then
  sed -i "s|^NEXT_PUBLIC_SITE_ORIGIN=.*|NEXT_PUBLIC_SITE_ORIGIN=${SITE_ORIGIN}|" .env.production
else
  echo "NEXT_PUBLIC_SITE_ORIGIN=${SITE_ORIGIN}" >> .env.production
fi

if [[ "${SKIP_NPM_CI:-0}" == "1" ]]; then
  echo "Skipping npm ci (SKIP_NPM_CI=1)"
else
  npm ci
fi
npm run prisma:generate
if [[ "${RUN_MIGRATE:-1}" == "1" ]]; then
  npm run prisma:migrate
fi

export NEXT_PUBLIC_BASE_PATH="${BASE_PATH}"
export NEXT_PUBLIC_SITE_ORIGIN="${SITE_ORIGIN}"
npm run build

grep -q "\"basePath\": \"${BASE_PATH}\"" .next/routes-manifest.json

systemctl daemon-reload
systemctl restart "${SERVICE}"
systemctl is-active --quiet "${SERVICE}"

echo "Test deploy complete. Run verify-test.sh next."
