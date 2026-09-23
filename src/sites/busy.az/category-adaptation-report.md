# Busy.az → Jobing mevcut kategori uyarlama raporu

## Kapsam

Kaynak veri kontrolü: 2026-09-22T12:55:04.045Z. Rapor: 2026-09-22T13:00:19.834Z.

[Busy.az kategori kaynağı](https://busy.az/api/bff/api/filter/categories) üzerinden çıkarılan **15 ana kategori ve 64 alt kategori**, Jobing'deki **17 ana kategori ve 119 alt kategoriye** uyarlanmıştır. Yeni kategori eklenmesi önerilmez; mevcut geniş kategoriler ve “Digər” alt kategorileri kullanılır. Bu dosya sınıflandırma önerisidir; scraper henüz bu kuralları uygulamıyor.

## Seçim kuralları

1. Busy.az kategori ID'sini yerel ID olarak kullanma.
2. İlanın başlığı ve görevleri mesleği netleştiriyorsa uygun mevcut alt kategoriyi seç; Busy.az ana grubu tek başına belirleyici değildir.
3. Tabloda tek alt kategori önerilmişse bu öneriyi ilan içeriğiyle doğrula. Geniş alanlar birebir meslek eşleşmesi değildir.
4. Alt kategori belirsizse tabloda belirtilen ana kategoriyi koru ve alt kategori ID'sini boş bırak. “Digər” varsa uygun olduğu alanlarda kullan.
5. Yerel şemada ayrı subcategory_id yoktur: ana ve alt kategoriler categories tablosunda parent_id ile bağlıdır. vacancies.category_id alanına seçilen alt kategorinin ID'si; alt kategori seçilmediyse ana kategorinin ID'si gider. Bu rapor veritabanına hiçbir kayıt yazmaz.

## Ana kategori yönlendirmesi

| Busy.az ana kategorisi / ID | İlk yerel yönlendirme | İçeriğe göre diğer mevcut gruplar |
| --- | --- | --- |
| Satış, Pərakəndə və Müştəri xidmətləri [19] | Satış və müştəri xidməti [56] | — |
| Maliyyə, Bankçılıq və Sığorta [7] | Maliyyə və Mühasibatlıq [26] | Satış və müştəri xidməti [56] |
| Mühəndislik və Texniki sahələr [116] | Sənaye, tikinti və istehsalat [132] | Kənd təsərrüfatı [85] |
| Satınalma və Təchizat zənciri [18] | Satınalma və təchizat [144] | Nəqliyyat, daşınma və logistika [126] |
| Biznes, İdarəetmə və İnsan Resursları [25] | İnzibati heyət [47] | — |
| İT, Proqram təminatı və Məlumat analitikası [12] | İnformasiya texnologiyaları [39] | — |
| Otel, İaşə və Turizm [23] | Turizm, otellər, restoranlar [109] | İdman zalları, fitness, gözəllik salonları [119] |
| Təhsil və Təlim [20] | Təhsil və elm [79] | İnzibati heyət [47] |
| Marketinq, Media və Kommunikasiyalar [16] | Marketinq, Reklam və PR [16] | Müxtəlif [106] |
| Hüquq [13] | Hüquqşünaslıq [74] | Maliyyə və Mühasibatlıq [26] |
| Əmlak və Təsərrüfat idarəçiliyi [9] | İnzibati heyət [47] | Xidmət Personalı [91]; Sənaye, tikinti və istehsalat [132]; Kənd təsərrüfatı [85] |
| Sənaye və kənd təsərrüfatı [15] | Sənaye, tikinti və istehsalat [132] | Kənd təsərrüfatı [85]; Xidmət Personalı [91] |
| Dizayn, Yaradıcılıq və Media [5] | Dizayn [68] | Marketinq, Reklam və PR [16]; Müxtəlif [106] |
| Səhiyyə və Əczaçılıq [17] | Tibb və əczaçılıq [100] | — |
| Təhlükəsizlik və Mühafizə xidmətləri [21] | Xidmət Personalı [91] | — |

## Tüm alt kategorilerin uyarlanması

“Rol ile seçim” satırlarında belirtilen ana kategori başlangıç tercihidir; yan sütunlarda mesleğe göre geçilecek mevcut alt kategoriler bulunur.

### Satış, Pərakəndə və Müştəri xidmətləri [19]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Satışın idarəedilməsi [168] | Satış və müştəri xidməti [56] (rol ile seçim) | Satış və müştəri xidməti [56] → Satış meneceri [58]; Satış və müştəri xidməti [56] → Satış şöbəsinin rəhbəri [65] | Menecer ve bölüm rəhbəri ayrımı ilan başlığından yapılmalı. |
| Pərakəndə satış [110] | Satış və müştəri xidməti [56] (rol ile seçim) | Satış və müştəri xidməti [56] → Satış üzrə mütəxəssis [57]; Satış və müştəri xidməti [56] → Satış məsləhətçisi [59]; Satış və müştəri xidməti [56] → Kassir-operator [64]; Satış və müştəri xidməti [56] → Filial rəhbəri / Mağaza rəhbəri [66] | Satıcı, kassir ve mağaza rəhbəri farklı alt kategoriler. |
| Müştəri xidmətləri [37] | Satış və müştəri xidməti [56] (rol ile seçim) | Satış və müştəri xidməti [56] → Müştəri meneceri [60]; Satış və müştəri xidməti [56] → Çağrı mərkəzi operatoru [61]; Xidmət Personalı [91] → Çağrı mərkəzi operatoru, müştəri xidmətləri mütəxəssisi [98] | Çağrı merkezi operatörü → 61; müşteri portföyü/account yönetimi → 60; genel müşteri desteği → 91 / 98. |
| Biznesin İnkişafı [171] | Satış və müştəri xidməti [56] (rol ile seçim) | Açıklamadaki kural | Satış odaklı iş geliştirme uzmanı → 57, menecer → 58; stratejik yönetim → 47 / 49. Rol belirsizse 56 ana kategorisinde tut. |
| Daşınmaz əmlak satışı [73] | Satış və müştəri xidməti [56] → Daşınmaz əmlak agenti / makler [63] | Satış və müştəri xidməti [56] → Daşınmaz əmlak agenti / makler [63] | Daşınmaz əmlak agenti / makler. |

### Maliyyə, Bankçılıq və Sığorta [7]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Maliyyə idarəetməsi və təhlili [31] | Maliyyə və Mühasibatlıq [26] (rol ile seçim) | Maliyyə və Mühasibatlıq [26] → Maliyyə analitiki / İnvestisiya analitiki [30]; Maliyyə və Mühasibatlıq [26] → Maliyyə meneceri [33]; Maliyyə və Mühasibatlıq [26] → Maliyyə direktoru (CFO) [37] | Analitik, menecer ve CFO ayrılmalı. |
| Mühasibat uçotu [26] | Maliyyə və Mühasibatlıq [26] → Mühasib [29] | Maliyyə və Mühasibatlıq [26] → Mühasib [29] | Mühasib. |
| Audit və Vergi [61] | Maliyyə və Mühasibatlıq [26] → Digər [38] | Maliyyə və Mühasibatlıq [26] → Auditor [28]; Maliyyə və Mühasibatlıq [26] → Mühasib [29] | Denetim → 28, vergi muhasebesi → 29; bu görevler net değilse Maliyyə / Digər (38). |
| Bank əməliyyatları [64] | Maliyyə və Mühasibatlıq [26] → Digər [38] | Maliyyə və Mühasibatlıq [26] → Kredit mütəxəssisi [27]; Maliyyə və Mühasibatlıq [26] → Kassir [31]; Maliyyə və Mühasibatlıq [26] → Digər [38] | Kredi görevi → 27, banka kassiri → 31, diğer banka operasyonları → 38. |
| Sığorta [114] | Maliyyə və Mühasibatlıq [26] → Digər [38] | Satış və müştəri xidməti [56] → Sığorta agenti [62] | Sığorta operasyonlarını Maliyyə / Digər ile karşıla; satış/acentelik ilanıysa 56 / 62. |

### Mühəndislik və Texniki sahələr [116]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Mülki və Tikinti mühəndisliyi [72] | Sənaye, tikinti və istehsalat [132] → Tikinti mühəndisliyi və ustalıq [134] | Sənaye, tikinti və istehsalat [132] → Tikinti mühəndisliyi və ustalıq [134] | Tikinti mühəndisliyi. |
| Maşınqayırma (mexanika) mühəndisliyi [174] | Sənaye, tikinti və istehsalat [132] → Mühəndis [135] | Sənaye, tikinti və istehsalat [132] → Mühəndis [135] | Makine mühendisini genel Mühəndis (135) altında karşıla; tamir/bakım teknisyeniyle karıştırma. |
| Elektrik, Elektronika və Avtomatlaşdırma [122] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Sənaye, tikinti və istehsalat [132] → Avtomatlaşdırılmış idarəetmə (АСУ ТП) [133]; Sənaye, tikinti və istehsalat [132] → Mühəndis [135]; Sənaye, tikinti və istehsalat [132] → Elektrik [142] | Otomasyon, mühendis ve elektrik ustası ayrılmalı. |
| Sənaye, Kimya və Proses mühəndisliyi [177] | Sənaye, tikinti və istehsalat [132] → Mühəndis [135] | Sənaye, tikinti və istehsalat [132] → Mühəndis [135] | Kimya ve proses mühendislerini genel Mühəndis (135) altında karşıla. |
| Neft-qaz və Geologiya [119] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Kənd təsərrüfatı [85] → Geologiya və ətraf mühit [87]; Sənaye, tikinti və istehsalat [132] → Mühəndis [135] | Neft-qaz mühendisliği → 135; jeoloji/çevre → 85 / 87. Belirsizse 132. |
| Ətraf mühit və Əməyin mühafizəsi [147] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Kənd təsərrüfatı [85] → Geologiya və ətraf mühit [87] | İş güvenliği/HSE için 132 ana kategorisi; çevre/ekoloji görevleri belirginse 85 / 87. Fiziksel güvenlik kategorisi 95 ile karıştırma. |
| İxtisaslı fəhlə və Texniki peşələr [142] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Sənaye, tikinti və istehsalat [132] → Avtomexanik, avtoçilingər [136]; Sənaye, tikinti və istehsalat [132] → Suvaqçı, rəngsaz [137]; Sənaye, tikinti və istehsalat [132] → Mexanik [138]; Sənaye, tikinti və istehsalat [132] → Montajçı [139]; Sənaye, tikinti və istehsalat [132] → Qaynaqçı [140]; Sənaye, tikinti və istehsalat [132] → Çilingər, santexnik [141]; Sənaye, tikinti və istehsalat [132] → Elektrik [142]; Sənaye, tikinti və istehsalat [132] → Usta [143] | Ustalık dalı ilan içeriğinden seçilmeli. |
| Mühəndislik dəstəyi [180] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Sənaye, tikinti və istehsalat [132] → Mühəndis [135]; Sənaye, tikinti və istehsalat [132] → Mexanik [138] | Mühendis desteği görevine göre mühendis → 135 veya teknisyen → 138; belirsizse 132. |

### Satınalma və Təchizat zənciri [18]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Satınalma və Tədarük [150] | Satınalma və təchizat [144] (rol ile seçim) | Satınalma və təchizat [144] → Tender mütəxəssisi [145]; Satınalma və təchizat [144] → Satınalma meneceri [146]; Satınalma və təchizat [144] → Bayer / Alıcı [148]; Satınalma və təchizat [144] → Təchizat mütəxəssisi [149]; Satınalma və təchizat [144] → Satınalma direktoru [151] | Satınalma, tender, alıcı, təchizat ve rəhbərlik ayrılmalı. |
| Təchizat zəncirinin planlaşdırılması [183] | Satınalma və təchizat [144] → Təchizat mütəxəssisi [149] | Satınalma və təchizat [144] → Təchizat mütəxəssisi [149] | Tedarik planlamasını Təchizat mütəxəssisi (149) ile karşıla. |
| Logistika və Nəqliyyat [132] | Nəqliyyat, daşınma və logistika [126] (rol ile seçim) | Nəqliyyat, daşınma və logistika [126] → Logistika üzrə mütəxəssis / Menecer [131]; Nəqliyyat, daşınma və logistika [126] → Sürücü [127]; Nəqliyyat, daşınma və logistika [126] → Kuryer [130]; Satınalma və təchizat [144] → İdxal mütəxəssisi [150] | Lojistik uzmanı → 131, sürücü → 127, kurye → 130, ithalat görevi → 144 / 150. |
| Anbar əməliyyatları [94] | Nəqliyyat, daşınma və logistika [126] (rol ile seçim) | Nəqliyyat, daşınma və logistika [126] → Anbardar [128]; Xidmət Personalı [91] → Anbardar [97]; Nəqliyyat, daşınma və logistika [126] → Yükvuran fəhlə [129] | Anbardar için 128 tercih et; yükvuran fəhlə → 129. Aynı işi ikinci kez 91 / 97 altında sınıflandırma. |
| Sürücülük [40] | Nəqliyyat, daşınma və logistika [126] → Sürücü [127] | Nəqliyyat, daşınma və logistika [126] → Sürücü [127] | Sürücü. |

### Biznes, İdarəetmə və İnsan Resursları [25]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| İnzibati İdarəetmə [186] | İnzibati heyət [47] → Menecment [49] | İnzibati heyət [47] → Menecment [49] | İnzibati yönetimi mevcut Menecment (49) ile karşıla. |
| Əməliyyatların idarə edilməsi [189] | İnzibati heyət [47] → Menecment [49] | İnzibati heyət [47] → Menecment [49] | Operasyon yönetimini mevcut Menecment (49) ile karşıla. |
| Layihə və Proqram idarəetməsi [109] | İnzibati heyət [47] → Menecment [49] | İnformasiya texnologiyaları [39] → İT layihələrin idarə edilməsi [44]; İnzibati heyət [47] → Menecment [49] | Genel proje/program yönetimi → Menecment (49); yalnızca IT projesi ise 39 / 44. |
| İnsan resursları və İşəqəbul [11] | İnzibati heyət [47] → Heyətin idarəolunması [52] | İnzibati heyət [47] → Heyətin idarəolunması [52] | Heyətin idarəolunması. |
| Ofis inzibatçılığı [41] | İnzibati heyət [47] (rol ile seçim) | İnzibati heyət [47] → İnzibati dəstək [48]; İnzibati heyət [47] → Ofis meneceri [50]; İnzibati heyət [47] → Katibə, resepşn, köməkçi [51]; İnzibati heyət [47] → Administrator [53] | Ofis meneceri, katibə ve administrator ayrılmalı. |

### İT, Proqram təminatı və Məlumat analitikası [12]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Proqram təminatı [90] | İnformasiya texnologiyaları [39] → Proqramlaşdırma [40] | İnformasiya texnologiyaları [39] → Proqramlaşdırma [40] | Proqramlaşdırma. |
| Sistem inzibatçılığı [92] | İnformasiya texnologiyaları [39] → Sistem idarəetməsi [41] | İnformasiya texnologiyaları [39] → Sistem idarəetməsi [41] | Sistem idarəetməsi. |
| IT Helpdesk [91] | İnformasiya texnologiyaları [39] (rol ile seçim) | İnformasiya texnologiyaları [39] → İT mütəxəssisi / məsləhətçi [43]; İnformasiya texnologiyaları [39] → Texniki avadanlıq mütəxəssisi [45] | IT uzmanı ve donanım desteği ayrılmalı. |
| Məlumat analitikası [105] | İnformasiya texnologiyaları [39] → Digər [46] | Açıklamadaki kural | Veri analitiğini IT / Digər altında karşıla. Finansal analiz açıkça belirtilirse 26 / 30 seç; DBA (42) yalnızca veritabanı yönetimi görevleri için. |
| Kibertəhlükəsizlik [85] | İnformasiya texnologiyaları [39] → Digər [46] | Açıklamadaki kural | Kibertəhlükəsizlik için IT / Digər kullan; fiziksel mühafizə (95) seçme. |

### Otel, İaşə və Turizm [23]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Otel idarəetməsi [129] | Turizm, otellər, restoranlar [109] (rol ile seçim) | Turizm, otellər, restoranlar [109] → Turizm və mehmanxana işi [111]; Turizm, otellər, restoranlar [109] → Administrator (Otel / Restoran) [116] | Otel operasyonları ve administrator ayrılmalı. |
| İaşə və Qida Xidmətləri [95] | Turizm, otellər, restoranlar [109] (rol ile seçim) | Turizm, otellər, restoranlar [109] → Restoran işi [110]; Turizm, otellər, restoranlar [109] → Restoran meneceri [113]; Turizm, otellər, restoranlar [109] → Ofisiant, barmen, barista [114]; Turizm, otellər, restoranlar [109] → Aşpaz, çörəkçi, şirniyyatçı [115]; Turizm, otellər, restoranlar [109] → Hostes [117] | Restoran meneceri, aşpaz, ofisiant ve hostes ayrılmalı. |
| Təmizlik və Xidmət personalı (housekeeping) [192] | Turizm, otellər, restoranlar [109] → Təmizlik üzrə xidmətçi, xadimə (Otel) [118] | Turizm, otellər, restoranlar [109] → Təmizlik üzrə xidmətçi, xadimə (Otel) [118] | Otel temizliği. |
| Turizm xidmətləri [128] | Turizm, otellər, restoranlar [109] (rol ile seçim) | Turizm, otellər, restoranlar [109] → Turizm və mehmanxana işi [111]; Turizm, otellər, restoranlar [109] → Turizm meneceri [112] | Turizm operasyonları ve meneceri. |
| Gözəllik, Fitness və Şəxsi qulluq [149] | İdman zalları, fitness, gözəllik salonları [119] (rol ile seçim) | İdman zalları, fitness, gözəllik salonları [119] → SPA və gözəllik [120]; İdman zalları, fitness, gözəllik salonları [119] → Saç ustası, bərbər [121]; İdman zalları, fitness, gözəllik salonları [119] → Fitnes məşqçisi, idman zalı təlimatçısı [122]; İdman zalları, fitness, gözəllik salonları [119] → Dırnaq ustası [123]; İdman zalları, fitness, gözəllik salonları [119] → Masajçı [124]; İdman zalları, fitness, gözəllik salonları [119] → Kosmetoloq [125] | SPA → 120, saç/bərbər → 121, fitness → 122, dırnaq → 123, masaj → 124, kosmetoloq → 125. |

### Təhsil və Təlim [20]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Tədris [118] | Təhsil və elm [79] (rol ile seçim) | Təhsil və elm [79] → Məktəb tədrisi [80]; Təhsil və elm [79] → Universitet tədrisi [81]; Təhsil və elm [79] → Repetitor [82] | Okul, üniversite ve özel ders ayrılmalı. |
| Korporativ təlim [195] | Təhsil və elm [79] → Xüsusi təhsil / Təlim [83] | Təhsil və elm [79] → Xüsusi təhsil / Təlim [83] | Kurumsal eğitim mevcut birleşik alt kategoride. |
| Xarici dil tədrisi [113] | Təhsil və elm [79] (rol ile seçim) | Təhsil və elm [79] → Məktəb tədrisi [80]; Təhsil və elm [79] → Universitet tədrisi [81]; Təhsil və elm [79] → Repetitor [82] | Dil öğretimi ayrı alt kategori değil; eğitim düzeyine göre seçilmeli. |
| Tərcümə və Dilçilik [46] | İnzibati heyət [47] → Tərcüməçi [54] | İnzibati heyət [47] → Tərcüməçi [54] | Tercüme ilanlarını kaynak eğitim grubunda olsa da İnzibati heyət / Tərcüməçi (54) olarak eşleştir. |

### Marketinq, Media və Kommunikasiyalar [16]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Rəqəmsal marketinq [106] | Marketinq, Reklam və PR [16] (rol ile seçim) | Marketinq, Reklam və PR [16] → Marketinq meneceri / Rəqəmsal marketoloq [17]; Marketinq, Reklam və PR [16] → SMM menecer / Kontent menecer [24] | Dijital marketinq ve SMM ayrılmalı. |
| Brend və Marketinq Strategiyası [98] | Marketinq, Reklam və PR [16] (rol ile seçim) | Marketinq, Reklam və PR [16] → Marketinq meneceri / Rəqəmsal marketoloq [17]; Marketinq, Reklam və PR [16] → Marketinq və PR direktoru (CMO) [19]; Marketinq, Reklam və PR [16] → Marketinq analitiki [22] | Marka stratejisi için rol ve kıdem belirleyici. |
| Məzmunun (kontent) hazırlanması [104] | Marketinq, Reklam və PR [16] (rol ile seçim) | Marketinq, Reklam və PR [16] → Kopirayter, mətn yazarı, redaktor [20]; Marketinq, Reklam və PR [16] → Kontent menecer [21]; Marketinq, Reklam və PR [16] → SMM menecer / Kontent menecer [24] | Yazar, kontent meneceri ve SMM ayrılmalı. |
| İctimaiyyətlə Əlaqələr [100] | Marketinq, Reklam və PR [16] → PR menecer [18] | Marketinq, Reklam və PR [16] → PR menecer [18] | PR menecer. |

### Hüquq [13]

Busy.az alt kategori sunmuyor. Hüquqşünas → **74 / 75**, vəkil → **74 / 76**, ceza hukuku uzmanı → **74 / 77**, diğer hukuk işleri → **74 / 78**. Compliance görevi açıkça belirtilirse **26 / 34**.

### Əmlak və Təsərrüfat idarəçiliyi [9]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Obyekt və Təsərrüfat idarəetməsi [198] | İnzibati heyət [47] → Menecment [49] | İnzibati heyət [47] → Menecment [49]; İnzibati heyət [47] → Administrator [53] | Tesis/təsərrüfat yönetimini Menecment (49) ile karşıla; bakım uygulayan personeli teknik mesleğine göre sınıflandır. |
| Bina və Texniki baxım [112] | İnzibati heyət [47] (rol ile seçim) | Sənaye, tikinti və istehsalat [132] → Mexanik [138]; Sənaye, tikinti və istehsalat [132] → Çilingər, santexnik [141]; Sənaye, tikinti və istehsalat [132] → Elektrik [142]; Sənaye, tikinti və istehsalat [132] → Usta [143] | Bakım işinin uzmanlık alanına göre seçilmeli. |
| Təmizlik xidmətləri [38] | Xidmət Personalı [91] → Xadimə [92] | Xidmət Personalı [91] → Xadimə [92] | Xadimə. |
| Ev xidmətləri [76] | İnzibati heyət [47] (rol ile seçim) | Xidmət Personalı [91] → Xadimə [92]; Xidmət Personalı [91] → Dayə [93]; Kənd təsərrüfatı [85] → Bağban [89] | Temizlik, dayə ve bağban farklı ana kategorilerde. |

### Sənaye və kənd təsərrüfatı [15]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| İstehsalatın idarə edilməsi [117] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | İnzibati heyət [47] → Menecment [49]; Sənaye, tikinti və istehsalat [132] → Usta [143] | Üretim yöneticisi için 132; genel işletme yönetimi açıkça belirtilirse 47 / 49, usta/formen ise 143. |
| Avadanlıq və dəzgah operatorları [201] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Açıklamadaki kural | Makine ve üretim operatörlerini 132 ana kategorisinde tut. Bakım/tamir teknisyeni ise 138; genel üretim işçisi ise 91 / 94. |
| İstehsalat fəhlələri [152] | Xidmət Personalı [91] → Fəhlə [94] | Xidmət Personalı [91] → Fəhlə [94] | Üretim işçisini mevcut Xidmət Personalı / Fəhlə (94) ile karşıla. |
| Keyfiyyətə nəzarət [204] | Sənaye, tikinti və istehsalat [132] (rol ile seçim) | Açıklamadaki kural | Üretim kalite kontrolünü 132 altında tut; açık mühendis rolü varsa 135. Yazılım QA için 39 / 46; laboratuvar rolü için görevleri doğrula. |

### Dizayn, Yaradıcılıq və Media [5]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Dizayn [56] | Dizayn [68] (rol ile seçim) | Marketinq, Reklam və PR [16] → Qrafik dizayner [25]; Dizayn [68] → Veb-dizayn (UI/UX) [69]; Dizayn [68] → Geyim dizaynı [71]; Dizayn [68] → Rəssam / İllüstrator [72]; Dizayn [68] → Digər [73] | Grafik tasarım 16 altında; diğer tasarımlar 68 altında. |
| Memarlıq və İnteryer dizayn [127] | Dizayn [68] → Memar / İnteryer dizaynı [70] | Dizayn [68] → Memar / İnteryer dizaynı [70] | Memar / İnteryer dizaynı. |
| Jurnalistika [47] | Müxtəlif [106] → Jurnalistika və Media [107] | Müxtəlif [106] → Jurnalistika və Media [107] | Sende Müxtəlif altında Jurnalistika və Media. |
| Media istehsalı (prodakşn) [54] | Müxtəlif [106] → Jurnalistika və Media [107] | Müxtəlif [106] → Jurnalistika və Media [107]; Marketinq, Reklam və PR [16] → Kontent menecer [21] | Video/medya prodüksiyonunu Jurnalistika və Media (107) ile karşıla; kontent yönetimi ağırlıklıysa 16 / 21. |
| Fotoqrafiya [51] | Dizayn [68] → Digər [73] | Açıklamadaki kural | Fotoğrafçılığı mevcut Dizayn / Digər ile karşıla. Gazetecilik/fotomühabirlik açıkça belirtilirse 106 / 107. |

### Səhiyyə və Əczaçılıq [17]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Həkimlər [165] | Tibb və əczaçılıq [100] → Həkim [101] | Tibb və əczaçılıq [100] → Həkim [101] | Həkim. |
| Kiçik və orta tibb personalı [137] | Tibb və əczaçılıq [100] → Tibbi personal (Tibb bacısı / Qardaşı) [102] | Tibb və əczaçılıq [100] → Tibbi personal (Tibb bacısı / Qardaşı) [102] | Tibbi personal. |
| Digər tibb mütəxəssisləri [133] | Tibb və əczaçılıq [100] (rol ile seçim) | Tibb və əczaçılıq [100] → Laborant [104] | Laboratuvar görevi → 104; doktor → 101; hemşire/personel → 102. Diğer sağlık rollerini 100 ana kategorisinde tut. |
| Əczaçılıq [108] | Tibb və əczaçılıq [100] → Tibbi nümayəndə / Əczaçı [103] | Tibb və əczaçılıq [100] → Tibbi nümayəndə / Əczaçı [103] | Tibbi nümayəndə / Əczaçı birleşik kategorisi. |

### Təhlükəsizlik və Mühafizə xidmətləri [21]

| Busy.az alt kategorisi / ID | Önerilen mevcut hedef | İçeriğe göre adaylar | Seçim açıklaması |
| --- | --- | --- | --- |
| Ümumi mühafizə [207] | Xidmət Personalı [91] → Mühafizə xidməti [95] | Xidmət Personalı [91] → Mühafizə xidməti [95] | Mühafizə xidməti. |

## Tutarlı seçim için ortak tercihler

- Anbardar → **126 / 128**; kurye → **126 / 130**. Genel hizmet personeli altındaki benzer kayıtları otomatik ikinci eşleşme olarak kullanma.
- Çağrı merkezi operatörü → **56 / 61**; genel müşteri destek uzmanı → **91 / 98**; müşteri meneceri → **56 / 60**.
- Grafik dizayner → **16 / 25**; UI/UX → **68 / 69**; fotoğraf → **68 / 73**.
- Otel temizliği → **109 / 118**; genel temizlik → **91 / 92**.
- Tarım içerikli ilanlarda Busy.az birleşik sanayi grubunu izlemek yerine **85** ve uygun alt kategorisini seç.
- Tələbə/təcrübəçi ilanlarında yalnızca deneyimsizlik nedeniyle **106 / 108** seçme; meslek belliyse ilgili alanı koru. Alanı belirtilmeyen genel staj ilanlarında 108 değerlendirilebilir.

## Sonuç

Tüm 64 kaynak alt kategori için mevcut yapı içinde bir yönlendirme vardır. Birebir alt kategori bulunmayan alanlar geniş kategori/“Digər” ile karşılanır; bu, aynı adlı özel bir kategori var olduğu anlamına gelmez. Nihai meslek seçimi ilan içeriğine bağlıdır.
