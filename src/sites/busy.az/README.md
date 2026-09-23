# Busy.az — tüm kategorilerde liste taraması

Yalnızca kategori ve ilan **liste** API'leri okunur; ilan detayları açılmaz. Kayıt hedefi yalnızca mevcut `scraped_vacancies` tablosudur. `vacancies` ve `companies` tablolarına yazılmaz, şema değiştirilmez.

```sh
# Tüm ana/alt kategorileri tara; kayıtlı veya tekrar eden tam sayfada dur:
npm run scrape:busy

# Sonuçları scraped_vacancies tablosuna ekle:
npm run scrape:busy -- --write

# Her kategori için ilk sayfayla sınırlı deneme:
npm run scrape:busy -- --limit 20

# Önceden çekilmiş liste dosyasını kullan:
npm run scrape:busy -- --file data/busy.az/list-batch.json --write
```

`--page` her kategori için başlangıç sayfasıdır (varsayılan 1). `--limit` isteğe bağlı, kategori başına 1–500 kayıtlık sınırdır; sayfa tamamlandığında uygulanır. Limit yoksa boş sayfa veya erken durdurma koşuluna kadar devam edilir.

## Sayfalama ve tekrar kontrolü

Her çalışmada Busy.az'ın ana ve alt kategori ID'leri alınır. Her biri `categories[]=ID` filtresiyle bağımsız taranır. Bir sayfanın tüm kaynak ID'leri `scraped_vacancies` içinde kayıtlıysa o kategorinin sonraki sayfasına geçilmez. Eski/yeni karışık sayfalarda devam edilir. Kaynak aynı kategori içinde tamamen aynı ilanları döndürürse de durulur.

Başka kategoride bu çalışmada görülmüş ilanlar erken durdurmayı tetiklemez. Sonuçlarda tek ilan olarak birleştirilir; filtre kategorileri `source_category_ids` içinde korunur. Kaynak ID, slug ve redirect_url ile kontrol edilerek yeniden ekleme önlenir. Silinmiş kayıtlar tekrar alınabilir; pasif ama mevcut kayıtlar bilinen ilan sayılır.

Kategori hataları raporlanır ve sıradakine geçilir. Başarılı kategoriler `--write` modunda kaydedilir; hata varsa CLI sıfırdan farklı çıkış kodu verir. Tamamen eski premium ilanlarla dolu sayfalar veya sonradan eski sayfalara eklenmiş ilanlar erken durdurma nedeniyle atlanabilir.

## Kaydedilen veriler

- `company_name`: listede gösterilen şirket adı; ayrı şirket kaydı oluşturulmaz.
- `redirect_url`: Busy.az orijinal ilan bağlantısı.
- Başlık, kaynak ID içeren slug, mevcut kategori, eşleşen tek şehir ve son başvuru tarihi.
- `description`: liste bilgilerinden kısa özet ve kaynak bağlantısı; tam iş tanımı değildir.
- Listede olmayan maaş, e-posta ve gereksinimler doldurulmaz. İş tipi, çalışma yeri ve deneyim düzeyi yalnızca listede/başlıkta açık bilgi varsa mevcut referans ID’leriyle eşleştirilir; karar nedenleri önizlemede lookupReasons içinde bulunur. Deneyim yılı otomatik kıdem düzeyine çevrilmez. Zorunlu para birimi AZN; maaş tutarları boş kalır. Logo aktarımı henüz yoktur.

Kategori önce başlık kurallarıyla, sonra mevcut uyarlama raporuyla seçilir. Alt kategori filtresi ana kategoriye tercih edilir; eşleştirilemeyen ilanlarda mevcut `Müxtəlif` ana kategorisi kullanılır. Birden fazla şehir açıklamada korunur, `city_id` boş bırakılır.

Kaynak/önizleme/sonuç raporları Git dışında `data/busy.az/` klasöründedir. Dosya modunda yalnızca `mode=list-only` kabul edilir ve alanlar tekrar liste alanlarıyla sınırlandırılır. Yazma işlemi tek transaction kullanır; hata durumunda geri alınır. Önceki sürümün diğer tablolara yazdığı kayıtlar otomatik silinmez veya taşınmaz.

Kontrol: `npm run build && node --test tests/busy.test.mjs`.

Gerçek kaynak filtreleriyle karşılaştırma: [field-comparison.md](field-comparison.md).


## Şehir, çalışma türü, çalışma yeri ve kıdem

Canlı taramada toplanan her yeni ilan için iki ek **liste** sorgusu yapılır: `vacancy_id=ID&employment_type[]=1` ve `vacancy_id=ID&employment_type[]=2`. Yalnızca bir filtre sonucu ilan ID'sini içeriyorsa yerel `tam-zamanli` veya `yari-zamanli` kaydının ID'si kullanılır. Her iki filtre eşleşirse boş bırakılır; hiçbirinde eşleşmezse açık başlık bilgisi değerlendirilir. Sayısal kaynak ID doğrudan yerel ID olarak kaydedilmez. Bu kontrol ana kategori sayfalamasından bağımsızdır ve ilan detaylarına istek yapmaz.

`city_id` listede bulunan şehir adının yerel çok dilli adıyla eşleşmesinden gelir. Aynı şehir birden fazla kez yazılmışsa tekilleştirilir. Birleşik Abşeron/Xırdalan veya birden fazla farklı şehir tek şehre zorlanmaz.

`workplace_type_id` açık remote/hybrid/on-site ifadesinden veya listede açıkça dönen çalışma yeri bilgisinden seçilir; şehir bulunması ya da remote=false olması ofiste çalışma kanıtı değildir.

`experience_level_id` açık Junior/Middle/Senior/Rəhbər gibi kıdem bilgisinden seçilir. Busy.az deneyim yılı filtresi kıdem düzeyiyle aynı şeyi ifade etmediğinden yıl → kıdem dönüşümü yapılmaz. Kaynakta olmayan bilgiler boş kalır.

Karar gerekçeleri önizleme JSON'unda `lookupReasons` alanındadır. Dosyadan çalıştırma yeni HTTP sorgusu yapmaz; dosyada saklanmış filtre doğrulamaları ve başlıklar kullanılır. Aynı kaynak dosyası yeniden işlendiğinde mevcut kayıtlardaki yalnızca boş şehir, çalışma türü, çalışma yeri ve kıdem alanları tamamlanır; dolu alanlar değiştirilmez.

Tamamen süresi dolmuş ilanlardan oluşan sayfada kategori taraması durur (`all-expired`). Süresi dolmuş ilanlar çalışma türü doğrulamasına gönderilmez. Boş kaynak slug için ID filtreli Busy.az liste bağlantısı kullanılır. Geçici HTTP/ağ hatalarında istek en fazla üç kez denenir.

## Referans eşleme dosyaları

`src/sites/<kaynak>/` altında boyut başına bir eşleme dosyası: `categories.json`, `cities.json`, `job-types.json`, `workplace-types.json`, `experience-levels.json` (`reference` = eşlenen/toplam):

- kategori: 48/48 · şehir: 0/0 · iş türü: 2/2 · çalışma yeri: 0/0 · deneyim: 0/0

Bu dosyalar `scrape` sırasında ve `--write` insert aşamasında eşleme için okunur; geçerli eşlemeler sezgisel kuralların önüne geçer, eşlenmeyen/eksik alanlarda yerel referans bulunamazsa alan NULL kalır. Yeni kategori/şehir oluşturulmaz; slug'ların geçerliliği `npm run test:integration` ile DB'ye karşı doğrulanır.

## Gelişmiş arama filtreleri (`/search/vacancy/advanced`)

- **Təcrübə** (`experiences[]`, yıl bandı) → kıdem enrich (yıl→baslangic/orta/yuksek).
- **Bölgə** (`cities[]`) → şehir enrich (eksik şehirler tamamlanır).
- **Məşğulluq növü** (`employment_type[]`) → iş türü (mevcut).
- **Kateqoriyalar** → kategori taraması. **İxtisaslar** (profession) yerelde karşılıksız; **Maaş** liste kartında yok.
- Liste yeni→eski sıralı olduğundan eşik-öncesi sayfada durulur.
