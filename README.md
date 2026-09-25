# JobScraper

Express + TypeScript + Cheerio ile scraping API başlangıç projesi. Node.js 22.12+ gerekir.

## Çalıştırma

```sh
npm install
cp .env.example .env
npm run dev
```

## Endpoint'ler

- `GET /health`: API durumunu döndürür.

```sh
curl http://localhost:3000/health
```

## Core API (yalnızca GET)

### Cache

Sunucu başlamadan önce sekiz kaynağın tüm kayıtları PostgreSQL'den okunup bellekte saklanır. Liste, filtre, sayfalama ve detay yanıtları bu cache üzerinden hazırlanır; her API isteğinde veritabanı sorgulanmaz. `CORE_CACHE_REFRESH_MS=300000` ile varsayılan yenileme süresi 5 dakikadır.

Yenileme tüm kaynaklar başarıyla okunduğunda tek seferde uygulanır. Yenileme başarısızsa önceki verilerle hizmet devam eder; ilk yükleme başarısızsa sunucu açılmaz. Eşzamanlı yükleme istekleri tek sorgu akışında birleştirilir. Cache process belleğindedir; yeniden başlatmada veritabanından tekrar yüklenir ve birden fazla process kendi cache'ini tutar. Veritabanı değişiklikleri bir sonraki başarılı yenilemede görünür.

Kodlar `src/core/` altında bulunur. PostgreSQL bağlantısı `.env` içindeki `DB_*` ayarlarını kullanır ve varsayılan olarak salt okunurdur. `GET /api/core` kaynak listesini döndürür.

| Endpoint | Veri / filtre |
| --- | --- |
| `/api/core/categories` | Ana kategoriler (`parent_id IS NULL`) |
| `/api/core/subcategories` | Alt kategoriler; `parent_id` filtresi |
| `/api/core/cities` | Şehirler |
| `/api/core/job-types` | Çalışma türleri |
| `/api/core/workplace-types` | Çalışma yeri türleri |
| `/api/core/experience-levels` | Deneyim seviyeleri |
| `/api/core/skills` | Beceriler; `category_id` filtresi |
| `/api/core/companies` | Şirketlerin temel bilgileri; `city_id` filtresi |

Her kaynağın `/:id` detay endpoint'i vardır. Liste yanıtı `{ data, meta: { page, limit, total, totalPages } }`, detay yanıtı `{ data }` biçimindedir. ID'ler hassasiyet kaybını önlemek için string döner. Çok dilli JSON alanları veritabanındaki haliyle korunur.

Listeler `page` (varsayılan 1) ve `limit` (varsayılan 100, en fazla 500) destekler; tüm kayıtlar için `totalPages` boyunca sayfalayın. Kategori ve şirket dışındaki kaynaklar `active=true` veya `active=false` destekler; filtre verilmezse tüm durumlar döner.

```sh
curl 'http://localhost:3000/api/core/subcategories?parent_id=1'
curl 'http://localhost:3000/api/core/cities?active=true&limit=100&page=1'
curl 'http://localhost:3000/api/core/skills?category_id=1'
curl 'http://localhost:3000/api/core/categories/1'
```

Geçersiz parametreler 400, bulunamayan kaynak/kayıt 404, GET dışındaki yöntemler 405 döndürür. API yalnızca yukarıdaki kaynakları açar; kullanıcı, oturum ve başvuru gibi özel tabloları sunmaz. Kimlik doğrulaması yoktur; sunucu varsayılan olarak yerel arayüzde dinler.

`npm run test:integration` `.env` ile belirtilen gerçek veritabanında salt okunur API kontrollerini çalıştırır. PostgreSQL sürücüsü: [node-postgres](https://node-postgres.com/apis/pool).

## Komutlar

```sh
npm run typecheck
npm run build
npm start
npm run references:sync          # referans eşleme dosyalarını DB ile karşılaştır (kuru çalıştırma)
npm run references:sync:write    # geçersiz eşlemeleri düzelt / doldurulabilirleri yaz
npm run logos:sync               # şirket logolarını yerel indir/kayıt defteriyle eşle (kuru)
npm run logos:sync:write         # logoları indir ve company_logo alanını yerel yola çevir
npm run perms:fix                # Jobing (Laravel) storage izinlerini onar (root çalışma sonrası 500 önlenir)
```

`src/app.ts` Express uygulamasını, `src/server.ts` sunucuyu içerir. Siteye özel indirme ve HTML ayrıştırma kodları `src/sites/<alan-adı>/` altında bulunur. On üç kaynağın (busy.az, 1is.az, work.az, jobsearch.az, boss.az, hellojob.az, smartjob.az, careera.az, position.az, jobu.az, jobnet.az, azvak.az, easyjob.az) scraper'ı da uygulanmıştır; kaynağa özel kullanım ve sınırlamalar için ilgili klasördeki `README.md` dosyasına bakın.

`.env` üzerinden `PORT`, `HOST` ve `SCRAPE_TIMEOUT_MS` ayarlanabilir. Varsayılan olarak yalnızca yerel arayüzde dinler.

Busy.az liste scraper'ı `src/sites/busy.az/` altında bulunur. `npm run scrape:busy` tüm Busy.az kategorilerini tarayıp önizleme oluşturur; tamamen kayıtlı veya tekrarlanan sayfada ilgili kategorinin sayfalaması durur. `--limit 20` kategori başına ilk sayfayla sınırlar; `--write` eklenirse ilanlar şirket adı ve kaynak bağlantısıyla yalnızca `scraped_vacancies` tablosuna eklenir. Yalnızca liste endpoint'i okunur. Kullanım ve sınırlamalar için `src/sites/busy.az/README.md` dosyasına bakın.

Dokümantasyon: [Express](https://expressjs.com/en/starter/installing.html), [Cheerio](https://cheerio.js.org/docs/intro).

## 1is.az

`npm run scrape:1is -- --write` bütün 21 kategorinin aktif ilan listesini tarar ve yalnızca `scraped_vacancies` tablosuna yazar. `--write` olmadan önizleme oluşturur; `--file data/1is.az/...-source.json` liste yedeğini kullanır. Çıktılar `data/1is.az/` altında saklanır.

Kaynak: `GET /allvacancy` filtre seçenekleri; `GET /vsearch?category=...&expired=on&sort_by=1&page=...` HTML ilan listeleri. Şehir ve çalışma rejimi filtreleri de aynı liste endpointinden ilan ID üyeliğiyle doğrulanır. Premium kartlar filtreyle ilgisiz tekrarlandığı için filtre üyeliğinde kullanılmaz. Tamamen bilinen veya tekrarlanan sayfada kategori taraması durur. Şirket adı filtre seçeneklerinden tamamlanır; başlığın listede kısaltılmış olması raporda belirtilir. İlan/şirket detay sayfası okunmaz.

Kategori eşleştirmeleri `src/sites/1is.az/mapper.ts` içinde; mevcut başlık kuralları uygun alt kategoriyi seçer. Deneyim yılı kıdem seviyesine çevrilmez. Tam/natamam iş vaxtı ve sərbəst iş türüne; uzaqdan çalışma yerine eşleşir. Qısaldılmış iş vaxtı için otomatik iş türü varsayılmaz. Liste kartındaki tarih yayın tarihidir; deadline üretilmez. Şirket logoları için mevcut `company_logo` alanı kullanılır; 1is.az kartlarındaki genel bina ikonu logo sayılmaz.

Kalıcı kullanıcı kuralları: [PROJECT_NOTES.md](PROJECT_NOTES.md). Busy.az ve 1is.az yayın tarihi **2026-09-15 öncesi** ilanları toplamaz ve dosyadan içe aktarmaz. Tarihsiz kayıtlar için tarih uydurulmaz. Tarih sırasının güvenilir olmadığı sayfalarda eski kart atlanır, sonraki yeni kartlar kaybedilmez. Yeni sitelerde önce ağ/API keşfi yapılır; liste API’si varsa HTML'den önce tercih edilir. Bu oturumun tarayıcı aracı Network kayıtlarını sunmadığından 1is.az için tam canlı ağ incelemesi doğrulanamadı; arama formu ve HTML cevapları incelendi.

## Diğer kaynaklar

Aşağıdaki kaynaklar da liste taraması yapar; ortak sözleşme için `src/sites/README.md`, kaynağa özel notlar için ilgili `README.md` dosyasına bakın.

- `work.az`, `jobsearch.az`, `boss.az`, `hellojob.az`, `smartjob.az`, `careera.az`, `position.az`, `jobu.az`, `jobnet.az`, `azvak.az`, `easyjob.az`: `npm run scrape:<kaynak> -- [--region all|baku|other] [--limit N] [--write]`. `--limit` kategori başına toplanan ilan sayısını sınırlar (jobsearch.az ilk tam taramada yavaştır; careera.az listede tarih/şehir sunmadığı için yalnızca `--region all` ile anlamlıdır).

`--refresh` bilinen kayıtları yok sayıp tüm listeyi yeniden toplar (eksik alanları tazeler). `boss.az` yoğun istekte IP'yi kilitlediği için **gün boyu yavaş** taranır (`SCRAPE_INTERVAL_BOSS_MS`, varsayılan 60000 ms) ve `scrape:all` dışındadır; günde bir `npm run scrape:boss` ile çalıştırılır.

Bölgesel toplu çalıştırıcı `npm run scrape:all` (`scrape:baku` / `scrape:other` kısayolları) on üç kaynağı sırayla çalıştırır ve eşzamanlı çalışmaları advisory lock ile önler. Otomatik zamanlama (cron) henüz etkin değildir; `config/scrape-schedule.json` içinde kullanıcı saatleri beklenmektedir.

## Zamanlama (cron) ve izin onarımı

Cron girişleri `scripts/crontab.txt` içinde tanımlıdır (`crontab scripts/crontab.txt`). Scraper işleri
`scripts/cron-baku-daily.sh` (Bakü, günde 3), `scripts/cron-boss.sh` (boss.az, günde 1) ve
`scripts/cron-other-weekend.sh` (diğer şehirler, Cumartesi) ile çalışır.

Bu işler `root` kullanıcısıyla çalıştığı için `php artisan facets:refresh` gibi komutlar Jobing
(Laravel) uygulamasının `storage/framework/cache` alanında **root sahipli** dosya/dizinler bırakır.
Uygulama PHP-FPM ile `www-data` olarak çalıştığından bu yollara yazamaz ve ilgili sayfalar **HTTP 500**
döner:

```
production.ERROR: file_put_contents(.../storage/framework/cache/data/..):
Failed to open stream: Permission denied
```

Bunu önlemek için:

1. `scripts/fix-jobing-perms.sh` her tarama sonrası (baku/boss/other cron'larının en sonunda) çalışır;
   `storage`, `bootstrap/cache` ve `public/scraped-companies` ağacını `www-data:www-data` yapıp grup
   yazılabilir hâle getirir. Elle: `npm run perms:fix`.
   - `JOBING_APP` (varsayılan `/var/www/new-jobing`) ve `JOBING_OWNER` (varsayılan `www-data:www-data`) ile yapılandırılır.
2. Bu işlerdeki `artisan` çağrıları `sudo -u www-data php ...` ile uygulama sahibi olarak çalıştırılır;
   böylece root sahipli dosya hiç oluşmaz.
3. Cron'daki bağımsız `facets:refresh` satırı da `www-data` olarak çalışır; güvenlik ağı olarak ayrıca
   periyodik bir `fix-jobing-perms.sh` satırı bulunur.

## Şirket logoları (görsel akışı)

Logo dosyalarının canlıda görünmesi iki adıma bağlıdır:

1. `npm run logos:sync:write` logoları **kaynak** dizine indirir (`COMPANY_LOGO_DIR`, varsayılan
   `data/company-logos`) ve DB'de `company_logo = scraped-companies/<dosya>` yazar.
2. `scripts/publish-logos.sh` kaynaktaki dosyaları **web'e servis edilen** dizine kopyalar
   (`COMPANY_LOGO_PUBLISH_DIR`, varsayılan `<JOBING_APP>/storage/app/public/scraped-companies`;
   URL `/storage/scraped-companies/<dosya>`).

`COMPANY_LOGO_*` ayarları `.env` içinde tanımlıdır, ancak `.env`'i yalnızca node/dotenv okur.
Cron scriptleri saf-bash adımlarının bu değişkenleri görebilmesi için `scripts/lib-env.sh` ile
`.env`'i güvenli biçimde yükler. Bu yükleme olmadan `COMPANY_LOGO_PUBLISH_DIR` boş kalır,
`publish-logos.sh` sessizce atlanır ve yeni logolar canlıda **404** verir (görsel görünmez).

## Mükerrer (kopya) ilan politikası

Aynı ilanın birden çok sitede yayınlanması yaygındır. Mükerrer kontrolü artık **iki katmanlı**:

1. **Kaynak içi (import anında):** `importBatch`, `redirect_url` / `slug` / aynı kaynak slug öneki
   ile eşleşen kaydı "mükerrer" sayıp yeniden eklemez, yalnızca eksik referansları tamamlar.
2. **Kaynaklar arası (import anında):** Aynı **şirket + başlık + şehir** (büyük/küçük harf duyarsız)
   kombinasyonu zaten varsa yeni kayıt **eklenmez** (mevcut kayıt güncellenir). Böylece bir ilan
   başka siteden geldiğinde veritabanı yinelenmez.

`npm run dedupe` / `dedupe:write` aracı (var olan satırları silen toplu temizlik) **şimdilik cron'dan
çıkarıldı**; mükerrerlik artık ekleme anında engellendiği için gereksiz. Elle gerekirse çalıştırılabilir.

> Not: `dedupe` aracı, aynı grupta **en eski** kaydı tutup en yenisini siler; bu yüzden taze bir
> yeniden yayını kaybetme riski taşır. Cron'dan çıkarılmasının nedeni budur.
