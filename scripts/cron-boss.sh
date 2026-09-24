#!/usr/bin/env bash
# boss.az'ı gün boyu yavaş süpürme (cron için). Log: logs/boss-cron.log
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
{
  echo "=== $(date -Is) boss tarama başlıyor ==="
  npm run scrape:boss -- --region all --write
  echo "=== $(date -Is) boss tarama bitti (exit $?) ==="
} >> logs/boss-cron.log 2>&1

# Scraper durumunu Jobing admini icin DB ye yaz
npm run status:push >> logs/status.log 2>&1 || true

# Mükerrer ilanları sil (aynı URL veya şirket+başlık+şehir)
npm run dedupe:write >> logs/dedupe.log 2>&1 || true

# Varsayılan/placeholder logoları ayıkla ve yolları güncelle
npm run logos:sync:write >> logs/logos.log 2>&1 || true

# Yeni veri sonrası Jobing facet/listing cache ini tazele (ayarlıysa)
run_artisan facets:refresh --warm >> logs/facets.log 2>&1 || true

# Yeni logoları canlı uygulamanın public dizinine kopyala (kırık görselleri önler)
./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" >> logs/logos-publish.log 2>&1 || true

# Jobing storage izinlerini onar (root calisma sonrasi 500 onlenir) — en sonda calisir
./scripts/fix-jobing-perms.sh >> logs/perms.log 2>&1 || true
