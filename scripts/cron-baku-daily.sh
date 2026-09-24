#!/usr/bin/env bash
# Bakü taraması — cron ile günde 3 kez tetiklenir (09:00, 14:00, 19:00).
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

# .env'deki ayarları bash'e yükle (publish-logos ve artisan yolu için) ve varsayılanları belirle.
. "$(dirname "$0")/lib-env.sh"
load_env COMPANY_LOGO_DIR COMPANY_LOGO_URL_BASE COMPANY_LOGO_PUBLISH_DIR JOBING_APP JOBING_ARTISAN
: "${JOBING_APP:=/var/www/new-jobing}"
: "${COMPANY_LOGO_PUBLISH_DIR:=${JOBING_APP}/storage/app/public/scraped-companies}"
export JOBING_APP COMPANY_LOGO_DIR COMPANY_LOGO_URL_BASE COMPANY_LOGO_PUBLISH_DIR JOBING_ARTISAN

# artisan komutlarını uygulama sahibiyle (www-data) çalıştır. Root çalıştırılırsa
# storage altında root sahipli cache dosyaları oluşur ve sayfalar 500 verir.
run_artisan() {
  { [ -n "${JOBING_ARTISAN:-}" ] && [ -f "$JOBING_ARTISAN" ]; } || return 0
  if [ "$(id -u)" -eq 0 ]; then
    sudo -u www-data php "$JOBING_ARTISAN" "$@"
  else
    php "$JOBING_ARTISAN" "$@"
  fi
}

mkdir -p logs
LOG=logs/baku-cron.log
{
  echo "=== $(date -Is) baku tarama başlıyor ==="
  npm run scrape:baku
  npm run status:push
  npm run dedupe:write
  npm run logos:sync:write
  run_artisan facets:refresh --warm
  echo "=== $(date -Is) baku tarama bitti ==="
} >> "$LOG" 2>&1 || true

# Yeni logoları canlı uygulamanın public dizinine kopyala (kırık görselleri önler).
./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" >> logs/logos-publish.log 2>&1 || true

# Tarama sonrası Jobing storage izinlerini onar (root çalışma kaynaklı 500 önlenir).
./scripts/fix-jobing-perms.sh >> logs/perms.log 2>&1 || true
