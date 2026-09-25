#!/usr/bin/env bash
# Diğer şehirler: hafta sonu 21:00 (cron tetikler).
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

. "$(dirname "$0")/lib-env.sh"
load_env COMPANY_LOGO_DIR COMPANY_LOGO_URL_BASE COMPANY_LOGO_PUBLISH_DIR JOBING_APP JOBING_ARTISAN
: "${JOBING_APP:=/var/www/new-jobing}"
: "${COMPANY_LOGO_PUBLISH_DIR:=${JOBING_APP}/storage/app/public/scraped-companies}"
export JOBING_APP COMPANY_LOGO_DIR COMPANY_LOGO_URL_BASE COMPANY_LOGO_PUBLISH_DIR JOBING_ARTISAN

run_artisan() {
  { [ -n "${JOBING_ARTISAN:-}" ] && [ -f "$JOBING_ARTISAN" ]; } || return 0
  if [ "$(id -u)" -eq 0 ]; then
    sudo -u www-data php "$JOBING_ARTISAN" "$@"
  else
    php "$JOBING_ARTISAN" "$@"
  fi
}

mkdir -p logs
{
  echo "=== $(date -Is) diğer şehirler (region=other) ==="
  npm run scrape:other
} >> logs/other-cron.log 2>&1 || true


npm run status:push >> logs/status.log 2>&1 || true
npm run logos:sync:write >> logs/logos.log 2>&1 || true
run_artisan facets:refresh --warm >> logs/facets.log 2>&1 || true
./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" >> logs/logos-publish.log 2>&1 || true
./scripts/fix-jobing-perms.sh >> logs/perms.log 2>&1 || true
