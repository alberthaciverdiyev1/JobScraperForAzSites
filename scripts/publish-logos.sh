#!/usr/bin/env bash
# Şirket logolarını yerel depodan hedef public dizine kopyalar.
# Sunucuda: ./scripts/publish-logos.sh /var/www/<JobingApp>/public/scraped-companies
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${COMPANY_LOGO_DIR:-data/company-logos}"
DST="${1:?hedef public dizin gerekli (ör. /var/www/Jobing.az/public/scraped-companies)}"
mkdir -p "$DST"
find "$SRC" -maxdepth 1 -type f ! -name 'registry.json' -exec cp -f {} "$DST"/ \;
echo "publish-logos: $SRC -> $DST ($(find "$DST" -maxdepth 1 -type f | wc -l) dosya)"
