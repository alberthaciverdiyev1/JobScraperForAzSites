#!/usr/bin/env bash
# Scrape çıxışının xülasəsini Telegram-a göndərir: neçə elan çəkildi / əlavə olundu.
# İstifadə: ./scripts/notify-scrape.sh "<etiket>" "<scrape çıxışı>"
set -euo pipefail
LABEL="${1:-tarama}"
OUT="${2:-}"
# Diqqət: sahə olmaya bilər (məs. run-all-da "ready" yoxdur) — hər halda 0 qaytar.
num() { printf '%s\n' "$OUT" | grep -oE "\"$1\":[0-9]+" 2>/dev/null | tail -1 | cut -d: -f2 || true; }

fetched="$(num fetched || true)"; inserted="$(num inserted || true)"; ready="$(num ready || true)"
dup="$(num duplicates || true)"; skipped="$(num skipped || true)"; errors="$(num errors || true)"

if [ -z "$fetched" ]; then
  err="$(printf '%s\n' "$OUT" | grep -oE 'Error:[^"]{0,120}' 2>/dev/null | tail -1 || true)"
  msg="⚠️ <b>${LABEL}</b> bitdi, amma xülasə oxunmadı (xəta ola bilər)."
  [ -n "$err" ] && msg="${msg}
<code>${err}</code>"
else
  msg="🗒 <b>${LABEL} — bitdi</b>
📥 Çəkilən elan: <b>${fetched}</b>"
  [ -n "$ready" ] && msg="${msg}
✅ Hazır: ${ready}"
  msg="${msg}
🆕 Yeni əlavə: <b>${inserted:-0}</b>
♻️ Təkrar: ${dup:-0}
⏭ Keçilən: ${skipped:-0}"
  if [ -n "$errors" ] && [ "$errors" != "0" ]; then msg="${msg}
⚠️ Xəta sayı: ${errors}"; fi
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
"$DIR/notify-telegram.sh" "$msg"
