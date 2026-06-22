#!/usr/bin/env bash
# Local → test server sync + fast deploy (skip npm ci)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE="${REMOTE:-root@150.158.85.220}"
APP_DIR="${APP_DIR:-/root/texas-poker-agents-test}"

cd "$ROOT"

rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude '.env*' \
  --exclude .cursor \
  ./ "${REMOTE}:${APP_DIR}/"

ssh "$REMOTE" "SKIP_NPM_CI=1 bash ${APP_DIR}/deploy/scripts/deploy-remote-test.sh"
ssh "$REMOTE" "bash ${APP_DIR}/deploy/scripts/verify-test.sh"

echo "Test deploy (fast) complete: https://aiagentswitcher.com/aipokerclubtest"
