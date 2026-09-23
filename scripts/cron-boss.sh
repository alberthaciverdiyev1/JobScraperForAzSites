#!/usr/bin/env bash
# boss.az'ı gün boyu yavaş süpürme (cron için). Log: logs/boss-cron.log
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
{
  echo "=== $(date -Is) boss tarama başlıyor ==="
  npm run scrape:boss -- --region all --write
  echo "=== $(date -Is) boss tarama bitti (exit $?) ==="
} >> logs/boss-cron.log 2>&1
