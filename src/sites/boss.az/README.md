# boss.az

`npm run scrape:boss -- [--region all|baku|other] [--limit N] [--write]`

boss.az ilan listesini GraphQL API'sinden okur.

## Kaynak
- `POST https://boss.az/graphql`, `query ScraperPage($filter: AdFilter, $after: String)`: `vacancies(filter, first:100, after, sortBy:DATE)`.
- `query ScraperFilters`: `categories` (+children) ve `regions`.

Yalnızca liste sorgusu; `mutation`, `subscription` ve `vacancy(id)` (detay) `shared/http.ts` allowlist'i tarafından reddedilir.

## Eşleme
- `categories()` bölge ve kategori (ana + alt) listesini bir kez yükler; kategori eşlemesi `categoryId`, şehir `regionId` (yoksa `location`) üzerinden.
- Yayın tarihi `createdAt`, yoksa `bumpedAt`. Maaş `salaryFrom`/`salaryTo`. Premium `isFeatured`. Aktiflik `status==='approved'`.
- İlan URL'si `https://boss.az/vacancies/<id>`.

## Deneyim (kıdem) alanı
- Liste kartında (`vacancyCardFields`) `experience`/`experienceId` **yoktur**; bu yüzden deneyim, `experienceIds` **liste filtresi üyeliğiyle** tamamlanır (`enrich`) — kategori ID doğrulamasındaki gibi. Detay endpoint'i çağrılmaz.
- Boss'un verdiği deneyim **yıl bandıdır**; kullanıcı isteğiyle (23 Eylül 2026) bizim kıdem seviyelerine eşlenir (`experience-levels.json`):
  - `Təcrübəsiz`, `1 ildən aşağı` → `baslangic`
  - `1 ildən 3 ilə qədər` → `orta`
  - `3 ildən 5 ilə qədər`, `5 ildən artıq` → `yuksek`
- `experienceIds` alanı doğrulanmazsa (şema değişirse) enrich hata döndürür ve deneyim NULL kalır; değer uydurulmaz.

## Kaynak verisi sınırları (kod eksikliği değildir)
- boss.az liste/kart kanalı **iş türü ve çalışma yeri** sunmaz; filtre panelinde yalnızca İxtisas (kategori), Şəhər, Təcrübə, Təhsil vardır. Bu nedenle `job_type_id` ve `workplace_type_id` NULL kalır; değer uydurulmaz.

## Notlar
- Yayın tarihi 2026-09-15 öncesi ilanlar alınmaz.

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 121/125 · şehir: 76/91 · iş türü: 0/0 · çalışma yeri: 0/0 · deneyim: 0/5

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.

## Yavaş (gün boyu) tarama

boss.az yoğun istekte IP'yi kilitler; istekler `SCRAPE_INTERVAL_BOSS_MS` (varsayılan 60000 ms) aralığıyla **güne yayılır**. 403 alınınca **`SCRAPE_RETRY_BASE_BOSS_MS` (varsayılan 300000 ms) üstel backoff** ile `SCRAPE_MAX_RETRIES_BOSS` (varsayılan 8) kez tekrar denenir → blok açılana kadar gün boyu denenir (proxy gerekmez). `run-all` içinden çıkarıldı; günde bir kez `npm run scrape:boss` ile yavaş süpürme çalıştırılır. Kayıtlar zaten biliniyorsa kategori erken durur, böylece sonraki çalışmalar kısa sürer.
