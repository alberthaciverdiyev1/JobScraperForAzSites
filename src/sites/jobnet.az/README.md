# jobnet.az

`npm run scrape:jobnet -- [--region all|baku|other] [--limit N] [--write]`

jobnet.az (Nuxt + Laravel API) ilan listesini JSON API'sinden okur.

## Kaynak
- `GET https://api.jobnet.az/api/v1/vacancies?page=<n>` → `{data:[{data:{current_page,last_page,per_page,total,data:[...]}}]}`.
  Kayıt başına: `id`, `job_title`, `slug`, `created_at` (yayın), `salary_min/max`, `isPremium`,
  `employer{name,logo,id}`, `city{name}`, `category{name,parent}`. Logo `https://api.jobnet.az/storage/...`.
- Şu an sitede az sayıda aktif ilan vardır (~7).

İlan detay sayfası (`/vacancies/<slug>`) hiçbir zaman çağrılmaz. Kaynakta iş türü/çalışma yeri/kıdem ve deadline alanı yoktur.

## Eşleme
- **Yayın tarihi** `created_at` → 2026-09-15 eşiği **doğrulanabilir**.
- Kategori `category.name`, şehir `city.name` üzerinden `references` dosyalarıyla yerel slug'a çevrilir.
- Şirket `employer.name`, logo `employer.logo` (api host'una göre mutlaklaştırılır).
- `isActive`/`status_label` alanı herkese açık listede `pending` döndüğü ve güvenilir olmadığı için ilanlar aktif kabul edilir.
- İş türü ve kıdem liste kaydında yoktur; **`/api/v1/vacancy-filters`** seçenekleri (`working_types`, `work_experience`) ve `working_type`/`work_experience` filtreleri ID üyeliğiyle taranarak tamamlanır (detay okunmaz). Çalışma yeri/maaş/deadline kaynakta yoktur; `--region all` önerilir.

## Referans eşleme dosyaları
- `job-types.json`: working_types → iş türü · `experience-levels.json`: work_experience → kıdem · `categories.json` 7/7 · `cities.json`: Bakı → `baki`.
