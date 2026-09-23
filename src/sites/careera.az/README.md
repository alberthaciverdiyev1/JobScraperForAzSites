# careera.az

`npm run scrape:careera -- [--region all|baku|other] [--limit N] [--write]`

careera.az ilan listesini HTML kartlarından okur. Server-render sayfa; JSON liste API'si yoktur.

## Kaynak
- `GET https://www.careera.az/?category=<slug>&page=<n>&sort=newest`: ilan listesi (12 kart/sayfa).
- Kategori seçenekleri ana sayfadaki `select[name="category"]` alanından okunur (32 benzersiz kategori, value=slug).

Kart alanları: `data-job-id`, `data-job-slug`, şirket adı/bağlantısı, şirket logosu, başlık, premium rozeti. İlan detayı `fetch('/jobs/ajax/<slug>')` ile yüklenir; **detay endpoint'i çağrılmaz.**

## Eşleme
- Kategori, taranan kategori filtresinden (`categories.json`) eşlenir; yabancı ID'den kategori uydurulmaz.
- İlan URL'si `https://www.careera.az/job/<slug>` (yalnızca bağlantı olarak üretilir, okunmaz).
- Liste kartı şehir/iş türü/çalışma yeri vermediği için bunlar **filtre sidebar'ından** ID üyeliğiyle tamamlanır (`enrich`). Detay endpoint'i çağrılmaz.

## Enrich (filtre sidebar'ı)
Kartlarda olmayan alanlar, `job-filters-form` filtrelerinin her seçeneği için liste taranıp eşleşen ilan ID'lerine yazılarak doldurulur:
- **`remote`** checkbox (`?remote=1`, örn. "Distant işlər") → çalışma yeri `Distant` → `workplace-types.json` ile `uzaktan`.
- **`job_type`** seçenekleri (`?job_type=...`) → iş türü etiketi → `job-types.json` (yalnızca "Təcrübə proqramları" → `staj`). Bu türlerde şu an 0 aktif ilan var.
- **Şehir:** `location` bir **select değil, serbest metin** arama olduğundan aranacak yer adları **elle** `locations.json` içine yazılır (76 Azerbaycan şehri). Her ad için `?location=<ad>` listesi ID üyeliğiyle taranır; eşleşenler `cities.json` ile yerel slug'a çevrilir.

## Kaynak verisi sınırları (önemli)
- **Liste kartında yayın tarihi yoktur.** 2026-09-15 yayın eşiği liste verisinden doğrulanamaz; tarih NULL bırakılır ve `finalizeVacancy` "Yayın tarihi eksik" uyarısı üretir. Tarih uydurulmaz.
- Şehir yalnızca `locations.json`'daki adlarla eşleşen ilanlarda dolar; eşleşmeyen/çok eşleşen ilanlarda NULL kalır (o zaman `--region baku|other` o kaydı atlar). Bu yüzden careera için güvenli seçim `--region all`'dur.
- Kıdem liste/filtre verisinde yoktur; başlıktan açık ifade varsa sezgisel kural devreye girer.
- Şehir taraması 76 yer adı için sayfalama yaptığından tam çalıştırma birkaç dakika sürer.

## Referans eşleme dosyaları

- `categories.json`: 30/32 eşlendi (Müsahibə/Könüllülük iş dışı → null).
- `cities.json`: 123 yer adı (Bakı ilçeleri → `baki`) → yerel slug (`locations.json` ile aynı). city ~%68; kalanlar il/ülke geneli (spesifik şehir yok).
- `workplace-types.json`: `Distant` → `uzaktan`.
- `job-types.json`: iş türü etiketleri (yalnızca "Təcrübə proqramları" → `staj`).
- `experience-levels.json`: boş (kıdem verisi yok).
