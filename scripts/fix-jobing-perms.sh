#!/usr/bin/env bash
# Jobing (Laravel) storage izinlerini onarir.
#
# Neden gerekli: scraper/cron root (uid 0) ile calisinca `artisan facets:refresh`,
# logo kopyalama vb. islemler storage/framework/cache altinda ROOT sahipli dosya/dizin
# olusturur. Uygulama PHP-FPM ile www-data olarak calistigi icin bu yollara yazamaz ve
# sayfalar 500 dondurur:
#   file_put_contents(.../storage/framework/cache/data/..): Failed to open stream: Permission denied
#
# Bu script her tarama sonrasi cagrilir; storage agacini www-data:www-data yapip grup
# tarafindan yazilabilir kilar, boylece 500 tekrarlamaz. Idempotenttir.
#
# Kullanim:  ./scripts/fix-jobing-perms.sh
# Ortam:
#   JOBING_APP    uygulama koku        (varsayilan: /var/www/new-jobing)
#   JOBING_OWNER  sahip:grup           (varsayilan: www-data:www-data)
set -euo pipefail

APP="${JOBING_APP:-/var/www/new-jobing}"
OWNER="${JOBING_OWNER:-www-data:www-data}"

if [ ! -d "$APP" ]; then
  echo "fix-jobing-perms: uygulama dizini yok, atlandi: $APP" >&2
  exit 0
fi

# Onarilacak hedefler (yalnizca var olanlar). storage Laravel'in yazma alani;
# bootstrap/cache derlenmis config/route cache'i; public/scraped-companies logo hedefi.
targets=()
for rel in storage bootstrap/cache public/scraped-companies; do
  [ -d "$APP/$rel" ] && targets+=("$APP/$rel")
done

if [ "${#targets[@]}" -eq 0 ]; then
  echo "fix-jobing-perms: onarilacak dizin bulunamadi: $APP" >&2
  exit 0
fi

# Sahiplik (yalnizca root chown yapabilir; degilsek sessizce atla).
if [ "$(id -u)" -eq 0 ]; then
  chown -R "$OWNER" "${targets[@]}" 2>/dev/null || true
fi

# Grup yazma + mevcut calistirma bitleri (ug+rwX); ardindan dizinlere setgid ekle ki
# yeni olusan dosyalar dogru grubu devralsin. Root sahipli 0644 dosya ve 2755 dizinler
# boylece 0664 / 2775 olur ve www-data yazabilir.
chmod -R ug+rwX "${targets[@]}" 2>/dev/null || true
find "${targets[@]}" -type d -exec chmod g+s {} + 2>/dev/null || true

echo "fix-jobing-perms: izinler onarildi -> ${targets[*]} (owner=${OWNER})"
