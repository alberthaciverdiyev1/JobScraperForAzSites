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
