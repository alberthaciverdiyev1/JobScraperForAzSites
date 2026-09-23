# azvak.az

`npm run scrape:azvak -- [--region all|baku|other] [--limit N] [--write]`

azvak.az (Nuxt) ilan listesini JSON API'sinden okur.

## Kaynak
- API tabanı: `https://rest.azvak.com.az/api` (Nuxt config `public.apiUrl`).
- `GET /api/departments` → kategoriler (`{id, name, slug, count}`), 15 adet.
- `GET /api/vacancies?department=<id>&page=<n>` → ilan listesi (15/sayfa; `meta.current_page/last_page`).
  Kayıt: `id`, `title`, `company{id,name,logo}`, `position[{name,slug}]`, `created` (gg.aa.yyyy), `premium`, `views`.

İlan detay sayfası (`/vakansiyalar/<slug>/<id>`) hiçbir zaman çağrılmaz.

## Eşleme
- **Yayın tarihi** `created` (gg.aa.yyyy) → 2026-09-15 eşiği **doğrulanabilir**.
- Kategori, tarandığı **department** adından (`categories.json`) eşlenir; `position` alt kategorisi URL için kullanılır.
- Şirket `company.name`, logo `company.logo`, premium `premium` alanından.
- **Şehir**, `/api/locations` (77 konum) + `?location=<id>` filtresi ID üyeliğiyle taranarak tamamlanır; en özel konum seçilir. `cities.json` 71/77 eşler.
- İş türü, çalışma yeri, kıdem, maaş ve deadline liste verisinde yoktur → NULL kalır.

## Referans eşleme dosyaları
- `categories.json`: 15/15 department · `cities.json`: 71/77 konum → yerel slug. Diğer dosyalar boş.
