# work.az

`npm run scrape:work -- [--region all|baku|other] [--limit N] [--write]`

work.az ilan listesini JSON API'sinden okur. `--limit` kategori başına toplanan ilan sayısını sınırlar (hızlı test için).

## Kaynak
- `POST https://api.work.az/v1/vacancies` (gövde: `{type:'VACANCY',count:100,...}`): ilan listesi.
- `GET https://api.work.az/v1/list-of-values?type=CATEGORY|CITY` : kategori ve şehir filtreleri.

Yalnızca kayıtlı liste endpoint'leri; detay endpoint'i çağrılmaz.

## Eşleme
- Kategori filtresi (`categoryIds`) ile sayfalanır; `hasNext` bitince durur.
- İstihdam etiketi `EMPLOYMENT_TYPE` filtresinden alınır. `Distant`/`Hibrid` → çalışma yeri; kalanlar iş türü. Kıdem `RANK_OF_DUTY` filtresinden.
- Şehirler her şehir filtresi için liste üzerinden ID üyeliğiyle tamamlanır (`enrich`).
- `salaryByAgreement` true ise maaş boş bırakılır; aksi halde `salaryMin/Max`.
- Logo `profileImageUrl` üzerinden S3 bucket tabanına çözülür; aktiflik `status==='ACTIVE'`.

## Notlar
- Yayın tarihi `postDate`; 2026-09-15 öncesi alınmaz.
- Şehir doluluğu yüksek, deneyim seviyesi yalnızca kart/filtre sağladığında doldurulur; veri yoksa NULL.

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 13/13 · şehir: 70/78 · iş türü: 4/10 · çalışma yeri: 2/2 · deneyim: 7/9

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.
