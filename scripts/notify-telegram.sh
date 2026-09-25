#!/usr/bin/env bash
# Jobing Telegram kanalına bildiriş gönderir (scrape cron'ları üçün).
# Token/chat_id Jobing tətbiqinin .env-indən (və ya mühitdən) oxunur.
set -euo pipefail
JOBING_ENV="${JOBING_ENV:-/var/www/new-jobing/.env}"
envval() { grep -E "^$1=" "$JOBING_ENV" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"//;s/"$//'; }
TOKEN="${TELEGRAM_BOT_TOKEN:-$(envval TELEGRAM_BOT_TOKEN)}"
CHAT="${TELEGRAM_CHAT_ID:-$(envval TELEGRAM_CHAT_ID)}"
MSG="${1:-$(cat)}"
if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  echo "notify-telegram: token/chat_id yoxdur ($JOBING_ENV)" >&2
  exit 0
fi
curl -s -o /dev/null --max-time 20 -X POST \
  "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${CHAT}" \
  --data-urlencode "text=${MSG}" \
  --data-urlencode "parse_mode=HTML" || true
