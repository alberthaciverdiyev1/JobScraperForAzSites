# Busy.az kategori karşılaştırması

Kontrol: 2026-09-22T12:55:04.045Z

Kaynak: [Busy.az kategori API](https://busy.az/api/bff/api/filter/categories), [kategori sayfası](https://busy.az/vacancies/categories).

Busy.az: **15 ana + 64 alt**. Jobing: **17 ana + 119 alt**.

Eşleştirmeler anlam ve meslek kapsamına göre öneridir; birebir otomatik mapping değildir. Busy.az çoğunlukla iş alanını, Jobing ise meslek/pozisyonu sınıflandırır. Veritabanına yazılmadı. ID'ler iki sistem arasında ortak değildir.

Durumlar: close = yakın karşılık; broader = yerel kategori daha geniş; role-dependent = ilan başlığı/içeriği gerekir; partial = kısmi karşılık; gap = özel alt kategori yok.

## Ana kategoriler

| Busy.az (ID) | Yerel adaylar (ID) |
| --- | --- |
| Satış, Pərakəndə və Müştəri xidmətləri (19) | Satış və müştəri xidməti (56) |
| Maliyyə, Bankçılıq və Sığorta (7) | Maliyyə və Mühasibatlıq (26); Satış və müştəri xidməti (56) |
| Mühəndislik və Texniki sahələr (116) | Sənaye, tikinti və istehsalat (132); Kənd təsərrüfatı (85) |
| Satınalma və Təchizat zənciri (18) | Satınalma və təchizat (144); Nəqliyyat, daşınma və logistika (126) |
| Biznes, İdarəetmə və İnsan Resursları (25) | İnzibati heyət (47) |
| İT, Proqram təminatı və Məlumat analitikası (12) | İnformasiya texnologiyaları (39) |
| Otel, İaşə və Turizm (23) | Turizm, otellər, restoranlar (109); İdman zalları, fitness, gözəllik salonları (119) |
| Təhsil və Təlim (20) | Təhsil və elm (79); İnzibati heyət (47) |
| Marketinq, Media və Kommunikasiyalar (16) | Marketinq, Reklam və PR (16); Müxtəlif (106) |
| Hüquq (13) | Hüquqşünaslıq (74); Maliyyə və Mühasibatlıq (26) |
| Əmlak və Təsərrüfat idarəçiliyi (9) | İnzibati heyət (47); Xidmət Personalı (91); Sənaye, tikinti və istehsalat (132); Kənd təsərrüfatı (85) |
| Sənaye və kənd təsərrüfatı (15) | Sənaye, tikinti və istehsalat (132); Kənd təsərrüfatı (85); Xidmət Personalı (91) |
| Dizayn, Yaradıcılıq və Media (5) | Dizayn (68); Marketinq, Reklam və PR (16); Müxtəlif (106) |
| Səhiyyə və Əczaçılıq (17) | Tibb və əczaçılıq (100) |
| Təhlükəsizlik və Mühafizə xidmətləri (21) | Xidmət Personalı (91) |

## Tüm alt kategoriler

### Satış, Pərakəndə və Müştəri xidmətləri

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Satışın idarəedilməsi (168) | Satış meneceri (58); Satış şöbəsinin rəhbəri (65) | role-dependent | Menecer ve bölüm rəhbəri ayrımı ilan başlığından yapılmalı. |
| Pərakəndə satış (110) | Satış üzrə mütəxəssis (57); Satış məsləhətçisi (59); Kassir-operator (64); Filial rəhbəri / Mağaza rəhbəri (66) | role-dependent | Satıcı, kassir ve mağaza rəhbəri farklı alt kategoriler. |
| Müştəri xidmətləri (37) | Müştəri meneceri (60); Çağrı mərkəzi operatoru (61); Çağrı mərkəzi operatoru, müştəri xidmətləri mütəxəssisi (98) | role-dependent | Müştəri meneceri ve çağrı mərkəzi ayrılmalı; 61 ve 98 benzer kapsamlı. |
| Biznesin İnkişafı (171) | — | gap | Biznesin inkişafı için özel alt kategori yok; satış otomatik seçilmemeli. |
| Daşınmaz əmlak satışı (73) | Daşınmaz əmlak agenti / makler (63) | close | Daşınmaz əmlak agenti / makler. |

### Maliyyə, Bankçılıq və Sığorta

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Maliyyə idarəetməsi və təhlili (31) | Maliyyə analitiki / İnvestisiya analitiki (30); Maliyyə meneceri (33); Maliyyə direktoru (CFO) (37) | role-dependent | Analitik, menecer ve CFO ayrılmalı. |
| Mühasibat uçotu (26) | Mühasib (29) | close | Mühasib. |
| Audit və Vergi (61) | Auditor (28); Mühasib (29) | partial | Auditor var; vergi uzmanı için özel kategori yok. |
| Bank əməliyyatları (64) | Kredit mütəxəssisi (27); Kassir (31); Digər (38) | partial | Kredi ve kassir var; bütün bankacılık operasyonlarını karşılamaz. |
| Sığorta (114) | Sığorta agenti (62) | partial | Sığorta agenti yalnızca satış rolünü karşılar. |

### Mühəndislik və Texniki sahələr

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Mülki və Tikinti mühəndisliyi (72) | Tikinti mühəndisliyi və ustalıq (134) | close | Tikinti mühəndisliyi. |
| Maşınqayırma (mexanika) mühəndisliyi (174) | Mühəndis (135) | broader | Genel mühendis kategorisi mekanik mühendisliğini kapsar. |
| Elektrik, Elektronika və Avtomatlaşdırma (122) | Avtomatlaşdırılmış idarəetmə (АСУ ТП) (133); Mühəndis (135); Elektrik (142) | role-dependent | Otomasyon, mühendis ve elektrik ustası ayrılmalı. |
| Sənaye, Kimya və Proses mühəndisliyi (177) | Mühəndis (135) | broader | Kimya/proses için ayrı alt kategori yok; genel mühendis var. |
| Neft-qaz və Geologiya (119) | Geologiya və ətraf mühit (87); Mühəndis (135) | partial | Jeoloji ve genel mühendislik var; neft-qaz özel kategorisi yok. |
| Ətraf mühit və Əməyin mühafizəsi (147) | Geologiya və ətraf mühit (87) | partial | Çevre kısmı var; HSE/iş güvenliği özel kategorisi yok. |
| İxtisaslı fəhlə və Texniki peşələr (142) | Avtomexanik, avtoçilingər (136); Suvaqçı, rəngsaz (137); Mexanik (138); Montajçı (139); Qaynaqçı (140); Çilingər, santexnik (141); Elektrik (142); Usta (143) | role-dependent | Ustalık dalı ilan içeriğinden seçilmeli. |
| Mühəndislik dəstəyi (180) | Mühəndis (135); Mexanik (138) | partial | Teknik destek rolüne göre değişir. |

### Satınalma və Təchizat zənciri

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Satınalma və Tədarük (150) | Tender mütəxəssisi (145); Satınalma meneceri (146); Bayer / Alıcı (148); Təchizat mütəxəssisi (149); Satınalma direktoru (151) | role-dependent | Satınalma, tender, alıcı, təchizat ve rəhbərlik ayrılmalı. |
| Təchizat zəncirinin planlaşdırılması (183) | Təchizat mütəxəssisi (149) | broader | Planlama için özel alt kategori yok; təchizat uzmanı en yakın. |
| Logistika və Nəqliyyat (132) | Logistika üzrə mütəxəssis / Menecer (131); Sürücü (127); Kuryer (130); İdxal mütəxəssisi (150) | role-dependent | Lojistik, sürücü, kuryer ve ithalat ayrılmalı. |
| Anbar əməliyyatları (94) | Anbardar (128); Anbardar (97); Yükvuran fəhlə (129) | role-dependent | Anbardar için 128/97 tekrarı var; yükleme işçisi farklı. |
| Sürücülük (40) | Sürücü (127) | close | Sürücü. |

### Biznes, İdarəetmə və İnsan Resursları

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| İnzibati İdarəetmə (186) | Menecment (49) | broader | Genel menecment. |
| Əməliyyatların idarə edilməsi (189) | Menecment (49) | broader | Operasyon yönetimi ayrı değil. |
| Layihə və Proqram idarəetməsi (109) | İT layihələrin idarə edilməsi (44); Menecment (49) | partial | 44 sadece IT projeleri; IT dışı proje yöneticiliği ayrı değil. |
| İnsan resursları və İşəqəbul (11) | Heyətin idarəolunması (52) | close | Heyətin idarəolunması. |
| Ofis inzibatçılığı (41) | İnzibati dəstək (48); Ofis meneceri (50); Katibə, resepşn, köməkçi (51); Administrator (53) | role-dependent | Ofis meneceri, katibə ve administrator ayrılmalı. |

### İT, Proqram təminatı və Məlumat analitikası

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Proqram təminatı (90) | Proqramlaşdırma (40) | close | Proqramlaşdırma. |
| Sistem inzibatçılığı (92) | Sistem idarəetməsi (41) | close | Sistem idarəetməsi. |
| IT Helpdesk (91) | İT mütəxəssisi / məsləhətçi (43); Texniki avadanlıq mütəxəssisi (45) | role-dependent | IT uzmanı ve donanım desteği ayrılmalı. |
| Məlumat analitikası (105) | — | gap | Məlumat analitikası/Data Analyst özel kategorisi yok; DBA ile aynı iş değil. |
| Kibertəhlükəsizlik (85) | — | gap | Kibertəhlükəsizlik özel kategorisi yok. |

### Otel, İaşə və Turizm

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Otel idarəetməsi (129) | Turizm və mehmanxana işi (111); Administrator (Otel / Restoran) (116) | role-dependent | Otel operasyonları ve administrator ayrılmalı. |
| İaşə və Qida Xidmətləri (95) | Restoran işi (110); Restoran meneceri (113); Ofisiant, barmen, barista (114); Aşpaz, çörəkçi, şirniyyatçı (115); Hostes (117) | role-dependent | Restoran meneceri, aşpaz, ofisiant ve hostes ayrılmalı. |
| Təmizlik və Xidmət personalı (housekeeping) (192) | Təmizlik üzrə xidmətçi, xadimə (Otel) (118) | close | Otel temizliği. |
| Turizm xidmətləri (128) | Turizm və mehmanxana işi (111); Turizm meneceri (112) | role-dependent | Turizm operasyonları ve meneceri. |
| Gözəllik, Fitness və Şəxsi qulluq (149) | SPA və gözəllik (120); Saç ustası, bərbər (121); Fitnes məşqçisi, idman zalı təlimatçısı (122); Dırnaq ustası (123); Masajçı (124); Kosmetoloq (125) | role-dependent | Sende ayrı ana kategori 119; mesleğe göre alt kategori. |

### Təhsil və Təlim

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Tədris (118) | Məktəb tədrisi (80); Universitet tədrisi (81); Repetitor (82) | role-dependent | Okul, üniversite ve özel ders ayrılmalı. |
| Korporativ təlim (195) | Xüsusi təhsil / Təlim (83) | close | Kurumsal eğitim mevcut birleşik alt kategoride. |
| Xarici dil tədrisi (113) | Məktəb tədrisi (80); Universitet tədrisi (81); Repetitor (82) | partial | Dil öğretimi ayrı alt kategori değil; eğitim düzeyine göre seçilmeli. |
| Tərcümə və Dilçilik (46) | Tərcüməçi (54) | close | Sende İnzibati heyət altında Tərcüməçi. |

### Marketinq, Media və Kommunikasiyalar

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Rəqəmsal marketinq (106) | Marketinq meneceri / Rəqəmsal marketoloq (17); SMM menecer / Kontent menecer (24) | role-dependent | Dijital marketinq ve SMM ayrılmalı. |
| Brend və Marketinq Strategiyası (98) | Marketinq meneceri / Rəqəmsal marketoloq (17); Marketinq və PR direktoru (CMO) (19); Marketinq analitiki (22) | role-dependent | Marka stratejisi için rol ve kıdem belirleyici. |
| Məzmunun (kontent) hazırlanması (104) | Kopirayter, mətn yazarı, redaktor (20); Kontent menecer (21); SMM menecer / Kontent menecer (24) | role-dependent | Yazar, kontent meneceri ve SMM ayrılmalı. |
| İctimaiyyətlə Əlaqələr (100) | PR menecer (18) | close | PR menecer. |

### Hüquq

Alt kategori yok. Hüquq → 74; compliance rolü varsa 26 → 34 ayrıca değerlendirilmeli.

### Əmlak və Təsərrüfat idarəçiliyi

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Obyekt və Təsərrüfat idarəetməsi (198) | Menecment (49); Administrator (53) | partial | Facility management için özel alt kategori yok. |
| Bina və Texniki baxım (112) | Mexanik (138); Çilingər, santexnik (141); Elektrik (142); Usta (143) | role-dependent | Bakım işinin uzmanlık alanına göre seçilmeli. |
| Təmizlik xidmətləri (38) | Xadimə (92) | close | Xadimə. |
| Ev xidmətləri (76) | Xadimə (92); Dayə (93); Bağban (89) | role-dependent | Temizlik, dayə ve bağban farklı ana kategorilerde. |

### Sənaye və kənd təsərrüfatı

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| İstehsalatın idarə edilməsi (117) | Menecment (49); Usta (143) | partial | İstehsalat rəhbəri için özel alt kategori yok. |
| Avadanlıq və dəzgah operatorları (201) | — | gap | Makine/CNC operatörü için özel alt kategori yok. |
| İstehsalat fəhlələri (152) | Fəhlə (94) | close | Sende Xidmət Personalı altında Fəhlə. |
| Keyfiyyətə nəzarət (204) | — | gap | Kalite kontrol için özel alt kategori yok. |

### Dizayn, Yaradıcılıq və Media

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Dizayn (56) | Qrafik dizayner (25); Veb-dizayn (UI/UX) (69); Geyim dizaynı (71); Rəssam / İllüstrator (72); Digər (73) | role-dependent | Grafik tasarım 16 altında; diğer tasarımlar 68 altında. |
| Memarlıq və İnteryer dizayn (127) | Memar / İnteryer dizaynı (70) | close | Memar / İnteryer dizaynı. |
| Jurnalistika (47) | Jurnalistika və Media (107) | close | Sende Müxtəlif altında Jurnalistika və Media. |
| Media istehsalı (prodakşn) (54) | Jurnalistika və Media (107); Kontent menecer (21) | partial | Medya üretimi/videograf ayrı değil. |
| Fotoqrafiya (51) | — | gap | Fotoqraf için özel alt kategori yok. |

### Səhiyyə və Əczaçılıq

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Həkimlər (165) | Həkim (101) | close | Həkim. |
| Kiçik və orta tibb personalı (137) | Tibbi personal (Tibb bacısı / Qardaşı) (102) | close | Tibbi personal. |
| Digər tibb mütəxəssisləri (133) | Laborant (104) | partial | Laborant mevcut; diğer sağlık mesleklerinin tamamını kapsamaz. |
| Əczaçılıq (108) | Tibbi nümayəndə / Əczaçı (103) | close | Tibbi nümayəndə / Əczaçı birleşik kategorisi. |

### Təhlükəsizlik və Mühafizə xidmətləri

| Busy.az (ID) | Yerel adaylar (ID) | Durum | Açıklama |
| --- | --- | --- | --- |
| Ümumi mühafizə (207) | Mühafizə xidməti (95) | close | Mühafizə xidməti. |

## Uygulama notları

- İlan başlığı ve meslek bilgisiyle son alt kategori seçilmeli; birden fazla adayı olan satırlar otomatik atanamaz.
- Özel karşılığı olmayanlarda ana kategori geçici aday olabilir; yanlış bir alt kategoriye zorla bağlanmamalı.
- Yerelde Anbardar (97/128), Kuryer (96/130) ve çağrı merkezi (61/98) benzer kapsamlı tekrarlar içeriyor; scraper için tek tercih politikası belirlenmeli.
- Busy.az ana grupları arasında Tarım ve Lojistik birleşik grupların içindedir; Güvenlik sende alt kategori, Grafik dizayner ise Marketinq altındadır.
