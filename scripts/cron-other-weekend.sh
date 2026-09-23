#!/usr/bin/env bash
# Diğer şehirler: hafta sonu 21:00 (cron tetikler).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
{ echo "=== $(date -Is) diğer şehirler (region=other) ==="; npm run scrape:other; } >> logs/other-cron.log 2>&1 || true
