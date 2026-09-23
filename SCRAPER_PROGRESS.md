# Devam eden çalışma

- Ortak kurallar uygulandı: shared HTTP liste allowlist, lookup/category mapper, finalizeVacancy, SQL writer, pagination. Busy/1is/shared testleri geçti.
- İlk yedi kaynağın scraper'ı uygulandı ve uçtan uca çalıştırıldı (önizleme): busy.az, 1is.az, work.az, jobsearch.az, boss.az, hellojob.az, smartjob.az. `run-all.ts` artık on üç kaynağı sırayla çağırır.
- careera.az eklendi (HTML liste, `?category=&page=`). Kart tarih vermez → tarih eşiği doğrulanamaz. Filtre sidebar'ı enrich'e bağlandı: `remote` → çalışma yeri, `job_type` → iş türü, elle yazılan `locations.json` şehir adları → şehir (cities.json, 76 şehir). Bölge için `--region all` önerilir. `categories.json` 22/32 kategori eşler.
- Kaynak verisi sınırları (kod eksikliği değil): boss.az listesi iş türü/çalışma yeri/kıdem sunmaz; jobsearch.az çalışma yeri yalnızca job_type seçeneği belirtirse dolar. Yıl→kıdem çevirisi kural gereği yapılmaz. Bu alanlar NULL kalır.
- jobsearch.az ilk tam tarama yavaştır (~10–15 dk); DB'de `jobsearch-az-*` kaydı yokken erken duruş devreye girmez. Hızlı test için `--limit` kullanılır.
- Her kaynak için `src/sites/<kaynak>/README.md` eklendi.
- Her kaynak için boyut başına eşleme dosyaları eklendi (`categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json`). `shared/references.ts` yükler; scrape ve `--write` insert bunları kullanır (site değeri → yerel slug → insert'te yerel ID). `npm run test:integration` tüm slug'ları DB'ye karşı doğrular. Kapsam: work 13/13 kategori, boss 121/125 + 76/91 şehir, jobsearch 55/94 + 74/79 şehir, smartjob 37/84, hellojob 14/14, 1is 20/21, busy 48/48.
- boss.az deneyim yıl bandı kıdeme eşlendi (kullanıcı isteği, 23 Eylül 2026): Təcrübəsiz/1 ildən aşağı→baslangic, 1-3→orta, 3-5 ve 5+→yuksek. Deneyim liste kartında yok; `experienceIds` liste filtresiyle tamamlanır (`enrich`). boss.az şu an Cloudflare IP bloğunda (403), canlı doğrulama blok kalkınca yapılacak; eşleme testle sabitlendi.
- Zamanlama: Asia/Baku; Bakı günde 3, diğer şehirler cuma haftada 1. Kullanıcı önerilen 09/15/21 ve cuma03 saatlerini kabul etmedi, kendi saatlerini iletecek. Saatler gelmeden etkinleştirme.
- Yalnızca listeler. Yayın tarihi 2026-09-15 öncesi alınmaz. Şirket oluşturma, şema değiştirme; sadece scraped_vacancies.
- Şirketler arası ortak logo eşleme ileride; şimdi listede varsa gerçek logo kaydedilecek.
- position.az eklendi (JSON liste `/az/vacancies?page=`, kategori haritası + logo/premium HTML'den). Yayın/son tarih mutlak → 2026-09-15 eşiği doğrulanır. data-city/work/experience satırda sabit olduğundan bu alanlar NULL; `--region all` önerilir.
- jobu.az eklendi (WP REST `/wp-json/wp/v2/job_listing`, metas alanı zengin). Yayın/son tarih mutlak → eşik doğrulanır. WAF tam Chrome UA'sını 429 ile engellediğinden varsayılan UA kısaltıldı.
- jobnet.az eklendi (Laravel API `/api/v1/vacancies`). Yayın tarihi mutlak; iş türü/kıdem/deadline yok. position.az kategori eşlemesi 55/103 → 103/103 elle tamamlandı (şehir/iş türü sunucu filtresi olmadığı için NULL kalıyor).
- azvak.az eklendi (REST `rest.azvak.com.az/api`, department bazlı tarama). Yayın tarihi mutlak; şehir/tip/maaş/deadline yok → NULL. 15/15 department eşlendi.
- easyjob.az eklendi (HTML kart, `?category_id=` filtresi, tek sayfa). Tarih gg.aa (yıl yok) → cari yıl varsayılır. Şehir/tip/maaş yok → NULL. 15/15 kategori eşlendi.
