#!/usr/bin/env bash
# Jobing (Laravel) storage/izinlerini onarir. Root ile calisan scraper/cron sonrasi
# cache dosyalari root sahipli kalirsa 500 (file_put_contents) olusur; bunu duzeltir.
set -euo pipefail
APP="${JOBING_APP:-/var/www/new-jobing}"
[ -d "$APP/storage" ] || exit 0
chown -R www-data:www-data "$APP/storage" "$APP/bootstrap/cache" 2>/dev/null || true
chmod -R ug+rwX "$APP/storage" "$APP/bootstrap/cache" 2>/dev/null || true
