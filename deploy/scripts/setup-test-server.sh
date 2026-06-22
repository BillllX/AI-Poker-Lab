#!/usr/bin/env bash
# One-time test stack bootstrap ON THE SERVER (idempotent where possible)
set -euo pipefail

APP_DIR="/root/texas-poker-agents-test"
SERVICE="texas-poker-agents-test"
BASE_PATH="/aipokerclubtest"
PORT=3001
DB_NAME="texas_poker_test"
DB_USER="texas_poker_test"
ENV_DIR="/etc/systemd/system/${SERVICE}.service.d"
NGINX_CONF="/etc/nginx/conf.d/ai-assistant.conf"
SNIPPET_MARK="# aipokerclubtest test mount"

if [[ ! -f "${APP_DIR}/deploy/scripts/deploy-remote-test.sh" ]]; then
  echo "Missing ${APP_DIR}; rsync code first." >&2
  exit 1
fi

# --- PostgreSQL (separate DB/user) ---
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  TEST_DB_PASS=$(openssl rand -hex 16)
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${TEST_DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
  echo "${TEST_DB_PASS}" > "/root/.texas-poker-test-db-pass"
  chmod 600 "/root/.texas-poker-test-db-pass"
else
  TEST_DB_PASS=$(cat /root/.texas-poker-test-db-pass)
fi

DATABASE_URL="postgresql://${DB_USER}:${TEST_DB_PASS}@127.0.0.1:5432/${DB_NAME}"

# --- systemd ---
install -m 644 "${APP_DIR}/deploy/systemd/texas-poker-agents-test.service.example" \
  "/etc/systemd/system/${SERVICE}.service"
sed -i "s|CHANGE_ME|${TEST_DB_PASS}|" "/etc/systemd/system/${SERVICE}.service"

mkdir -p "${ENV_DIR}"
install -m 644 "${APP_DIR}/deploy/systemd/basepath-test.conf.example" "${ENV_DIR}/basepath.conf"

if [[ -f /etc/systemd/system/texas-poker-agents.service.d/hosted-agent.conf ]]; then
  install -m 600 /etc/systemd/system/texas-poker-agents.service.d/hosted-agent.conf "${ENV_DIR}/hosted-agent.conf"
fi

# --- nginx ---
if ! grep -q "${SNIPPET_MARK}" "${NGINX_CONF}"; then
  cp "${NGINX_CONF}" "${NGINX_CONF}.bak.test.$(date +%Y%m%d%H%M%S)"
  awk -v mark="${SNIPPET_MARK}" '
    /location \^~ \/aipokerclub \{/ {
      print "    " mark
      print "    location ^~ /aipokerclubtest {"
      print "        proxy_pass http://127.0.0.1:3001;"
      print "        proxy_http_version 1.1;"
      print "        proxy_set_header Host $host;"
      print "        proxy_set_header X-Real-IP $remote_addr;"
      print "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
      print "        proxy_set_header X-Forwarded-Proto $scheme;"
      print "        proxy_set_header Upgrade $http_upgrade;"
      print "        proxy_set_header Connection upgrade;"
      print "        proxy_read_timeout 86400;"
      print "        proxy_redirect off;"
      print "    }"
      print ""
    }
    { print }
  ' "${NGINX_CONF}" > "${NGINX_CONF}.tmp" && mv "${NGINX_CONF}.tmp" "${NGINX_CONF}"
  nginx -t
  systemctl reload nginx
fi

systemctl daemon-reload
systemctl enable "${SERVICE}"

chmod +x "${APP_DIR}/deploy/scripts/deploy-remote-test.sh"
chmod +x "${APP_DIR}/deploy/scripts/verify-test.sh"

echo "Test server bootstrap done. DATABASE_URL uses ${DB_NAME} on :5432, app on :${PORT}."
