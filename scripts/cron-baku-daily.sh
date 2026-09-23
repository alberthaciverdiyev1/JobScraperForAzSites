#!/usr/bin/env bash
# Bakü: günde 3 kez, aralarında 4 saat, rastgele başlangıç 08:00-13:00
# (böylece 3 koşu da 08:00-21:00 aralığında kalır).
set -euo pipefail
cd "$(dirname "$0")/.."
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

mkdir -p logs
LOG=logs/baku-cron.log
# 08:00..13:00 arası rastgele başlangıç saati (0..5 offset)
start_h=$(( 8 + RANDOM % 6 ))
echo "=== $(date -Is) baku günlük: rastgele başlangıç ${start_h}:00 (koşular: ${start_h}, $((start_h+4)), $((start_h+8))) ===" >> "$LOG"
sleep $(( start_h * 3600 ))
for i in 1 2 3; do
  echo "--- $(date -Is) baku koşu $i/3 ---" >> "$LOG"
  npm run scrape:baku >> "$LOG" 2>&1 || true
  [ "$i" -lt 3 ] && sleep $((4 * 3600))
done

# Varsayılan/placeholder logoları ayıkla ve yolları güncelle
npm run logos:sync:write >> logs/logos.log 2>&1 || true

# Logoları canlı uygulamanın public/scraped-companies dizinine kopyala (ayarlıysa)
[ -n "${COMPANY_LOGO_PUBLISH_DIR:-}" ] && ./scripts/publish-logos.sh "$COMPANY_LOGO_PUBLISH_DIR" || true
