#!/usr/bin/env bash
# Diğer şehirler: hafta sonu 21:00 (cron tetikler).
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

mkdir -p logs
{ echo "=== $(date -Is) diğer şehirler (region=other) ==="; npm run scrape:other; } >> logs/other-cron.log 2>&1 || true

# Scraper durumunu Jobing admini icin DB ye yaz
npm run status:push >> logs/status.log 2>&1 || true

# Mükerrer ilanları sil (aynı URL veya şirket+başlık+şehir)
npm run dedupe:write >> logs/dedupe.log 2>&1 || true

# Varsayılan/placeholder logoları ayıkla ve yolları güncelle
npm run logos:sync:write >> logs/logos.log 2>&1 || true

# Yeni veri sonrası Jobing facet/listing cache ini tazele (ayarlıysa)
[ -n "${JOBING_ARTISAN:-}" ] && php "$JOBING_ARTISAN" facets:refresh --warm >> logs/facets.log 2>&1 || true

# Logoları canlı uygulamanın public/scraped-companies dizinine kopyala (ayarlıysa)
[ -n "${COMPANY_LOGO_PUBLISH_DIR:-}" ] && ./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" || true
