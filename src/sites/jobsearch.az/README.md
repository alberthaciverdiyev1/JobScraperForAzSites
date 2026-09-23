# jobsearch.az

`npm run scrape:jobsearch -- [--region all|baku|other] [--limit N] [--write]`

jobsearch.az ilan listesini JSON API'sinden okur. `--limit` kategori başına toplanan ilan sayısını sınırlar (hızlı test için şiddetle önerilir).

## Kaynak
`https://unsu.jobsearch.az` origin'i altında:
- `GET /api-az/categories-az?hl=az`: ana + alt kategori listesi (`next` ile sayfalanır).
- `GET /api-az/vacancies-az?hl=az&ads=55,56&...`: ilan listesi.
- `GET /api-az/filters?hl=az`: `location` ve `job_type` filtre seçenekleri.

İstekler `X-Requested-With: XMLHttpRequest` başlığıyla gider. Detay endpoint'i çağrılmaz.

## Eşleme
- Kategori, tarandığı kategori filtresinden (`category.name`) etiketlenir; yabancı ID'den kategori/şehir uydurulmaz.
- `enrich`: her `location` seçeneği için ID üyeliğiyle şehir; her `job_type` seçeneği için iş türü/çalışma yeri (`Məsafədən`/`Hibrid` → çalışma yeri) tamamlanır.
- Maaş `salary` alanından normalize edilir. VIP kartlar `premium`.

## Notlar
- Yayın tarihi `created_at`; 2026-09-15 öncesi alınmaz.
- **İlk tam tarama yavaştır (yaklaşık 10–15 dk).** `scraped_vacancies`'te `jobsearch-az-*` kaydı yokken "all-known" erken duruşu hiç devreye girmez ve 94 kategori + 87 filtre değeri 150 ms istek aralığıyla taranır. Kayıtlar yazıldıkça sonraki taramalar hızlanır. Geliştirme sırasında `--limit` kullanın.
- Çalışma yeri yalnızca `job_type` seçeneği bunu belirtiyorsa dolar; aksi halde NULL (kaynak verisi sunmuyor).

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 55/94 · şehir: 74/79 · iş türü: 4/8 · çalışma yeri: 0/0 · deneyim: 0/0

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.
