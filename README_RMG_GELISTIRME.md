# RMG TECH – Genişletilmiş katalog paketi

Bu paket, Google AI Studio'daki mevcut React + TypeScript projesinin üzerine uygulanmak üzere hazırlanmıştır.

## Bu sürümde yapılanlar

- Mevcut proje yapısı ve mevcut sistem toplama akışı korunmuştur.
- Merkezi `shared/hardwareCatalog.ts` veritabanına ek AMD Ryzen, Intel Core/Core Ultra ve NVIDIA/AMD/Intel Arc GPU referans modelleri eklenmiştir.
- Ekran kartı sayfasına model arama, Intel marka filtresi, minimum VRAM filtresi ve sonuç sayısı eklenmiştir.
- İşlemci sayfasına model arama, nesil filtresi, LGA1851 filtresi ve sonuç sayısı eklenmiştir.
- Katalog kartlarının hover vurgusu turuncuya çekilmiştir; arayüzdeki mavi marka rengiyle turuncu vurgu birlikte korunmuştur.
- Bazı eksik fiziksel bilgiler tahmin edilmemiştir. Partner ekran kartlarının uzunluğu ve güç konektörleri model varyantına göre değiştiğinden bu alanlar `null` bırakılır ve uyumluluk motorunun doğrulama istemesine izin verilir.

## Önemli veri doğruluğu notu

Bu eklemeler referans GPU/CPU model kataloğudur; bütün üreticilerin tüm özel kart varyantları değildir. GPU performans skorları ürün sıralamasında kullanılabilecek yaklaşık göreli puanlardır; bağımsız benchmark sonucu gibi sunulmamalıdır. Özellikle özel kartın uzunluğu, slot kalınlığı ve konektörü ürünün tam marka/model SKU'su üzerinden doğrulanmalıdır.

İkinci el fiyatları bu kod değişikliğiyle otomatik olarak Sahibinden/Letgo/Facebook'tan çekilmeye başlamaz. Projede mevcut fiyat servisleri ve kullanıcı ilanı girişi korunur. Canlı pazar yeri fiyatı ancak ilgili platformun izin verdiği API/iş ortaklığı/veri erişimi sağlanırsa kullanılmalıdır. Aksi durumda ilan fiyatı kullanıcı tarafından girilen veri veya açıkça etiketlenmiş referans tahmin olarak gösterilmelidir.

## Google AI Studio'ya aktarma

1. Önce AI Studio projesinin mevcut halini yedekleyin.
2. ZIP'i açın.
3. İçindeki proje dosyalarını mevcut projenin üzerine aktarın; `node_modules` klasörünü taşımayın.
4. AI Studio önizlemesini yeniden başlatın.
5. `npm run build` komutunun başarılı olduğunu kontrol edin.

## Bilinen sınırlar

- Katalog, her üreticinin her AIB/board-partner SKU'sunu kapsamıyor; mimari genişletilebilir şekilde bırakıldı.
- Yeni işlemci soketleri için yalnızca işlemci kataloğu desteği eklemek yeterli değildir. İlgili anakart veritabanı ve uyumluluk kuralları da eklenmeden o işlemciyi sistem toplama işleminde seçilebilir yapmak doğru olmaz.
- Pazar yerlerinin otomatik taranması için scraping yerine izinli API/iş ortağı erişimi tercih edilmelidir.
