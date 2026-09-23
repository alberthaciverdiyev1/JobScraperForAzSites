#!/usr/bin/env bash
# Diğer şehirler: hafta sonu 21:00 (cron tetikler).
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

mkdir -p logs
{ echo "=== $(date -Is) diğer şehirler (region=other) ==="; npm run scrape:other; } >> logs/other-cron.log 2>&1 || true

# Logoları canlı uygulamanın public/scraped-companies dizinine kopyala (ayarlıysa)
[ -n "${COMPANY_LOGO_PUBLISH_DIR:-}" ] && ./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" || true
