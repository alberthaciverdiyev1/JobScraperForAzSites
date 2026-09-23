# smartjob.az

`npm run scrape:smartjob -- [--region all|baku|other] [--limit N] [--write]`

smartjob.az ilan listesini JSON API'sinden okur; kategori listesi sayfanın RSC akışından ayıklanır.

## Kaynak
- `GET https://smartjob.az/vakansiyalar`: kategori listesi, gömülü `.rsc.push(...)` JSON akışından (`parseProps`) ayrıştırılır. Akış **JSON olarak** çözülür, asla çalıştırılmaz.
- `GET https://smartjob.az/api/jobs?page=<n>&limit=20[&category=<ad>]`: ilan listesi (`{jobs, total}`).

Yalnızca liste endpoint'leri; detay sayfası/endpoint'i okunmaz.

## Eşleme
- Kart alanları doğrudan JSON'dan: `employmentType` → iş türü, `workMode` → çalışma yeri, `positionLevel` → kıdem, `city/cities`, `categories/category`.
- `$undefined` gibi React placeholder değerleri boş bırakılır (değer uydurulmaz).
- Maaş yalnızca sayısal `salaryMin/Max` ise; deadline `expiresAt`. Premium `featured`.
- Logo `companyLogoUrl`; URL `smartjob.az/vakansiyalar/<slug>`.

## Notlar
- `enrich` yoktur; gerekli liste alanları API cevabında mevcuttur.
- Yayın tarihi `publishedAt`; 2026-09-15 öncesi alınmaz. Kıdem alanı yalnızca API verdiğinde dolar.

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 37/84 · şehir: 5/6 · iş türü: 4/5 · çalışma yeri: 3/3 · deneyim: 0/0

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.
