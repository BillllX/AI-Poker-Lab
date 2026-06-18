#!/usr/bin/env bash
# Run ON THE SERVER after code sync to /root/texas-poker-agents
set -euo pipefail

APP_DIR="${APP_DIR:-/root/texas-poker-agents}"
BASE_PATH="${BASE_PATH:-/aipokerclub}"
export PATH="/opt/node-v20.19.5-linux-x64/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"

cd "$APP_DIR"

touch .env.production
if grep -q '^NEXT_PUBLIC_BASE_PATH=' .env.production; then
  sed -i "s|^NEXT_PUBLIC_BASE_PATH=.*|NEXT_PUBLIC_BASE_PATH=${BASE_PATH}|" .env.production
else
  echo "NEXT_PUBLIC_BASE_PATH=${BASE_PATH}" >> .env.production
fi

npm ci
npm run prisma:generate
if [[ "${RUN_MIGRATE:-1}" == "1" ]]; then
  npm run prisma:migrate
fi

export NEXT_PUBLIC_BASE_PATH="${BASE_PATH}"
npm run build

grep -q "\"basePath\": \"${BASE_PATH}\"" .next/routes-manifest.json

systemctl daemon-reload
systemctl restart texas-poker-agents
systemctl is-active --quiet texas-poker-agents

echo "Deploy complete. Run verify-production.sh next."
