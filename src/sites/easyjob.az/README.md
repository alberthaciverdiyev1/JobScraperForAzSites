# easyjob.az

`npm run scrape:easyjob -- [--region all|baku|other] [--limit N] [--write]`

easyjob.az ilan listesini ana sayfadaki HTML kartlarından okur (sunucu-render).

## Kaynak
- `GET https://easyjob.az/?category_id=<id>`: ilan listesi. Filtreler ana sayfa formunda: `category_id` (15 kategori),
  `company_id`, `date` (one_day/three_days/one_week), `salary` (1/2/3), `search`. Sayfalama yoktur (tüm aktif ilanlar tek sayfada, ~65).
- Kart: `a.job-card-link` → `href` (ilan), `.job-title`, `.job-company`, `.company-logo-wrapper img` (yoksa baş harf → logo yok),
  `.job-meta-item` (ilk = tarih `gg.aa`, ikinci = görüntüleme), `.job-badge-premium`, `.job-badge-new`.

İlan detay sayfası (`/<slug>-<id>`) hiçbir zaman çağrılmaz.

## Eşleme
- Kategori, taranan `category_id` adından (`categories.json`, 15/15) eşlenir.
- **Yayın tarihi** kart tarihi `gg.aa` biçimindedir (yıl yok) → içinde bulunulan yıl varsayılır; tarih bugünden ileriyse bir önceki yıl (`cardDate`). `"Bu gün"`/`"Dünən"` de desteklenir.
- **Şehir, iş türü, çalışma yeri, kıdem, maaş ve deadline liste verisinde yoktur** → NULL kalır; `--region all` önerilir.
- İlan kimliği URL sonundaki sayıdır (`/<slug>-<id>`); logolar şirket logosu yoksa `null`.

## Referans eşleme dosyaları
- `categories.json`: 15/15 kategori → yerel slug. Diğer dosyalar boş.
