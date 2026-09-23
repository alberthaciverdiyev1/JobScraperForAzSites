# hellojob.az

`npm run scrape:hellojob -- [--region all|baku|other] [--limit N] [--write]`

hellojob.az ilan listesini HTML kartlarından okur (JSON sarmalayıcı içinde).

## Kaynak
- `GET https://www.hellojob.az/`: filtre seçenekleri (`categories[]`, `city`, `work_modes[]` `<select>` alanlarından).
- `GET /vakansiyalar?<filtreler>&page=<n>`: `{content:<html>}` döner; kartlar `.vacancies__item` içinde ayrıştırılır.

Yalnızca liste sayfası; ilan detay sayfası okunmaz.

## Eşleme
- Kart kimliği `[add-to-wishlist]`, tarih takvim ikonlu `li`, maaş `.vacancies__price`, logo `.vacancies__logo img`, premium `.premium`.
- `enrich`: her `city` ve `work_modes[]` seçeneği için ID üyeliğiyle şehir/çalışma yeri/iş türü tamamlanır (`Uzaqdan` → çalışma yeri).
- İlan URL'si karttaki `a.vacancies__body` bağlantısıdır.

## Notlar
- Yayın tarihi kartdaki tarih; 2026-09-15 öncesi alınmaz.
- Şehir ve deneyim seviyesi yalnızca filtre/kart verdiğinde dolar; veri yoksa NULL.

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 14/14 · şehir: 69/74 · iş türü: 4/6 · çalışma yeri: 1/6 · deneyim: 0/0

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.
