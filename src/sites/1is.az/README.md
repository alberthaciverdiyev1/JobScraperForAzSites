# 1is.az

`npm run scrape:1is -- [--file data/1is.az/...-source.json] [--region all|baku|other] [--write]`

21 kategorinin aktif ilan listesini tarar ve yalnızca `scraped_vacancies` tablosuna yazar. `--write` olmadan önizleme üretir.

## Kaynak
- `GET /allvacancy`: kategori ve filtre seçenekleri (şehir, iş rejimi, şirket).
- `GET /vsearch?category=<slug>&expired=on&sort_by=1&page=<n>`: HTML ilan listeleri.

Şehir ve çalışma rejimi filtreleri aynı liste endpoint'inden ilan ID üyeliğiyle doğrulanır. Premium kartlar filtreyle ilgisiz tekrarlandığı için filtre üyeliğinde kullanılmaz. Tamamen bilinen/tekrarlanan veya geçmiş sayfada kategori taraması durur. İlan/şirket detay sayfası okunmaz.

## Eşleme
- Kategori eşleştirmesi `categories.json` içindeki kategori eşlemesinden okunur (yoksa `mapper.ts` başlık kuralına düşülür); yeni referans yaratılmaz.
- Tam/natamam iş vaxtı → iş türü; sərbəst iş → serbest; uzaqdan → çalışma yeri. Qısaldılmış iş vaxtı için otomatik varsayım yapılmaz.
- Deneyim yılı kıdem seviyesine çevrilmez (bkz. `PROJECT_NOTES.md`).
- Liste kartındaki tarih yayın tarihidir; deadline üretilmez. Genel bina ikonu logo sayılmaz.

## Notlar
- Yayın tarihi 2026-09-15 öncesi ilanlar toplanmaz ve dosyadan içe aktarılmaz; tarihsiz kayıt için tarih uydurulmaz.
- Bu oturumda tarayıcı Network kayıtları sunulmadığından tam canlı ağ incelemesi doğrulanamadı; arama formu ve HTML cevapları incelendi.

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 20/21 · şehir: 71/72 · iş türü: 3/3 · çalışma yeri: 1/1 · deneyim: 0/0

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.
