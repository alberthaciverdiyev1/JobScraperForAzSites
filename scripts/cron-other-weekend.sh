#!/usr/bin/env bash
# Diğer şehirler: hafta sonu 21:00 (cron tetikler).
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

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
{ echo "=== $(date -Is) diğer şehirler (region=other) ==="; npm run scrape:other; } >> logs/other-cron.log 2>&1 || true

# Scraper durumunu Jobing admini icin DB ye yaz
npm run status:push >> logs/status.log 2>&1 || true

# Mükerrer ilanları sil (aynı URL veya şirket+başlık+şehir)
npm run dedupe:write >> logs/dedupe.log 2>&1 || true

# Varsayılan/placeholder logoları ayıkla ve yolları güncelle
npm run logos:sync:write >> logs/logos.log 2>&1 || true

# Yeni veri sonrası Jobing facet/listing cache ini tazele (ayarlıysa)
run_artisan facets:refresh --warm >> logs/facets.log 2>&1 || true

# Logoları canlı uygulamanın public/scraped-companies dizinine kopyala (ayarlıysa)
[ -n "${COMPANY_LOGO_PUBLISH_DIR:-}" ] && ./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" || true

# Jobing storage izinlerini onar (root calisma sonrasi 500 onlenir) — en sonda calisir
[ -n "${JOBING_APP:-/var/www/new-jobing}" ] && ./scripts/fix-jobing-perms.sh >> logs/perms.log 2>&1 || true
