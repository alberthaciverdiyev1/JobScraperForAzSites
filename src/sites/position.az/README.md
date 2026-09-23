# position.az

`npm run scrape:position -- [--region all|baku|other] [--limit N] [--write]`

position.az ilan listesini JSON API'sinden okur; kategori haritası ve logo/premium HTML'den çıkarılır.

## Kaynak
- `GET https://www.position.az/az/vacancies?page=<n>`: JSON liste — `{total, lastPage, currentPage, vacancies:[{id, category_id, duration_from, duration_to, short_title, large_title, company_name, slug}]}`. Sayfa başına 10 kayıt; toplam ~92 aktif ilan.
- `GET https://www.position.az/az`: tüm ilanlar HTML tablo satırları halinde. Kategori `data-filter=".category-<id>"` → isim haritası, `tr[class*="category-"]` satırlarından logo ve premium rozeti buradan çıkarılır.

İlan detay sayfası (`/az/vacancy/<slug>`) hiçbir zaman çağrılmaz.

## Eşleme
- **Yayın tarihi** `duration_from`, **son başvuru** `duration_to` (mutlak tarih) → 2026-09-15 eşiği bu kaynakta **doğrulanabilir**.
- Kategori, `category_id` → isim (`categories.json`) ile eşlenir.
- Logo ve premium, HTML satırından ID eşleşmesiyle alınır; placeholder logolar `finalizeVacancy` içinde reddedilir.
- **Şehir ve iş türü**, satırların `data-city` / `data-work_graphic` değerlerinden ve filtre select'lerinin (`#city`, `#work_graphic`) id→etiket haritalarından alınır. `cities.json` 58/60, `job-types.json` (Tam ştat→tam-zamanli, Frilans→serbest) eşler.
- Not: sitede bu satır değerleri şu an **tüm ilanlarda varsayılan** (Bakı / Tam ştat); kaynak böyle veriyor. `data-experience` (tələb olunur/olunmur) kıdem düzeyi olmadığından NULL bırakılır; `education`/maaş/deadline yok.

## Notlar
- Liste yeni→eskiye sıralıdır; eşik öncesi sayfada tarama durur (bu yüzden 92 ilanın ~17'si eşiği geçer).
- Şehir/iş türü/kıdem verisi olmadığından `--region baku|other` tüm kayıtları atlar; position.az için `--region all` kullanın.

## Referans eşleme dosyaları
- `categories.json`: site kategori adı → yerel slug.
- `cities.json`: 58/60 şehir · `job-types.json`: iş qrafiki → iş türü. `workplace-types.json`, `experience-levels.json`: boş.
