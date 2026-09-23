# jobu.az

`npm run scrape:jobu -- [--region all|baku|other] [--limit N] [--write]`

jobu.az (WordPress + WP REST) ilan listesini JSON API'sinden okur.

## Kaynak
- `GET https://jobu.az/wp-json/wp/v2/job_listing?per_page=100&page=<n>&_fields=id,date,link,title,metas,class_list`
  Sayfa başına 100 kayıt; toplam sayfa `X-WP-TotalPages` başlığından okunur (~1.232 ilan / 13 sayfa).

Her kayıtta `metas` alanı zengindir: `_job_employer_name` (şirket), `_job_logo`, `_job_type`, `_job_category`,
`_job_location`, `_job_application_deadline_date` (deadline), `_job_salary`, `_job_experience`, `_job_career_level`.

İlan detay sayfası (`/job/<slug>`) hiçbir zaman çağrılmaz.

## Eşleme
- **Yayın tarihi** `date` (WordPress), **son başvuru** `_job_application_deadline_date` → 2026-09-15 eşiği **doğrulanabilir**.
- Kategori `_job_category`, şehir `_job_location`, iş türü/çalışma yeri `_job_type` adlarından `references` dosyalarına göre çözülür.
- `_job_type` hem iş türü hem çalışma yeri türü içerir (örn. `Tam ştat`, `Hibrid`, `Remote`); etiketler hem `employment` hem `workplaces` alanına yazılır, dosyalar doğru boyutu seçer (`Hibrid` → `hibrit`, `Remote` → `uzaktan`).
- Maaş `_job_salary` (normalize), logo `_job_logo`/`_job_featured_image`, kıdem `_job_career_level`/`_job_experience`.
- Premium, `class_list`te `featured/premium` veya `_job_featured` ile işaretlenir.

## Referans eşleme dosyaları
- `categories.json`: 19/19 · `cities.json`: 70/74 · `job-types.json`: 4/7 · `workplace-types.json`: 2/7 · `experience-levels.json`: boş.

## Notlar
- WAF (hcdn) tam Chrome User-Agent'ını 429 ile engellediği için proje varsayılanı kısa tarayıcı UA'sıdır (`SCRAPE_USER_AGENT` ile değiştirilebilir).
- Yoğun ardışık isteklerde geçici 429 görülebilir; backoff devreye girer.
