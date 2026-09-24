#!/usr/bin/env bash
# Ortak yardımcı: .env'deki (gizli olmayan) ayarları cron scriptlerinin bash ortamına yükler.
#
# Neden: .env'i yalnızca node/dotenv okur. Cron scriptlerindeki saf-bash adımlar
# (publish-logos.sh, artisan yolu vb.) aynı değişkenlere ihtiyaç duyar; aksi halde örn.
# COMPANY_LOGO_PUBLISH_DIR boş kalır ve logo kopyalama sessizce atlanır (kırık görseller).
#
# .env'i olduğu gibi "source" etmek yerine yalnızca istenen anahtarlar güvenli biçimde
# okunur; parola/özel karakter içeren satırlar sorun çıkarmaz.

# .env'den tek bir anahtarın değerini döndürür (yoksa boş).
env_value() {
  [ -f .env ] || return 0
  local line
  line="$(grep -E "^[[:space:]]*$1[[:space:]]*=" .env 2>/dev/null | tail -n1)" || return 0
  [ -n "$line" ] || return 0
  line="${line#*=}"
  line="${line%$'\r'}"
  case "$line" in
    \"*\") line="${line#\"}"; line="${line%\"}" ;;
    \'*\') line="${line#\'}"; line="${line%\'}" ;;
  esac
  printf '%s' "$line"
}

# Verilen anahtarları, ortamda yoksa .env'den yükleyip export eder.
load_env() {
  local key value
  for key in "$@"; do
    [ -n "${!key:-}" ] && continue
    value="$(env_value "$key")"
    [ -n "$value" ] && export "$key=$value"
  done
}
