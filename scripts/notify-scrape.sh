#!/usr/bin/env bash
# Scrape çıxışının xülasəsini Telegram-a gönderir: neçə ilan çəkildi / əlavə olundu.
# İstifadə: ./scripts/notify-scrape.sh "<etiket>" "<scrape çıxışı>"
set -euo pipefail
LABEL="${1:-tarama}"
OUT="${2:-}"
num() { printf '%s\n' "$OUT" | grep -oE "\"$1\":[0-9]+" | tail -1 | cut -d: -f2; }

fetched="$(num fetched)"; inserted="$(num inserted)"; ready="$(num ready)"
dup="$(num duplicates)"; skipped="$(num skipped)"; errors="$(num errors)"

if [ -z "$fetched" ]; then
  err="$(printf '%s\n' "$OUT" | grep -oE 'Error:[^"]{0,120}' | tail -1 || true)"
  msg="⚠️ <b>${LABEL}</b> bitdi, amma xülasə oxunmadı (xəta ola bilər)."
  [ -n "$err" ] && msg="${msg}
<code>${err}</code>"
else
  msg="🗒 <b>${LABEL} — bitdi</b>
📥 Çekilen ilan: <b>${fetched}</b>"
  [ -n "$ready" ] && msg="${msg}
✅ Hazır: ${ready}"
  msg="${msg}
🆕 Yeni əlavə: <b>${inserted:-0}</b>
♻️ Mükerrer: ${dup:-0}
⏭ Keçilən: ${skipped:-0}"
  if [ -n "$errors" ] && [ "$errors" != "0" ]; then msg="${msg}
⚠️ Xəta sayı: ${errors}"; fi
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
"$DIR/notify-telegram.sh" "$msg"
