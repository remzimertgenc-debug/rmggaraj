# RMG TECH - Cimri Benzeri E-Ticaret Altyapısına Geçiş Adımları

Bu ZIP dosyası, projeyi `userListings.json` tabanlı ikinci el ilan sisteminden çıkarıp, PostgreSQL tabanlı e-ticaret fiyat takip sistemine (Cimri modeli) dönüştürmek için gereken **temel altyapı kodlarını** içerir.

## Dosya Yapısı ve Eklenenler
1. `prisma/schema.prisma` -> Veritabanı tablo yapıları (PostgreSQL için).
2. `server/pricing/matcher.ts` -> Mağazalardan gelen ürün isimlerini senin `hardwareCatalog.ts` ID'lerinle eşleştiren motor prototipi.
3. `src/components/PriceHistoryChart.tsx` -> Recharts kütüphanesi ile hazırlanmış fiyat geçmişi grafik bileşeni.

## Neler DEĞİŞECEK? (Sizin Yapmanız Gerekenler)

Bu dosyaları projeye aktardıktan sonra aşağıdaki adımları uygulamalısınız:

### 1. Terminal Komutları (Zorunlu Kurulumlar)
Proje ana dizininde şu komutları çalıştırın:
```bash
npm install prisma @prisma/client --save-dev
npm install recharts
```

### 2. .env Dosyası Güncellemesi
Mevcut `.env` dosyanıza Supabase veya Neon.tech'ten alacağınız PostgreSQL bağlantı linkini ekleyin:
```env
DATABASE_URL="postgresql://kullanici:sifre@host:5432/veritabani_adi"
```
Ardından terminalde tabloları oluşturun: `npx prisma db push`

### 3. server.ts ve providers.ts Değişiklikleri (Önemli!)
Şu an projede çalışan ve `server/data/userListings.json` dosyasına veri yazan eski kodlar, artık Prisma kullanılarak veritabanına yazacak şekilde değiştirilecektir.
- `server/pricing/providers.ts` dosyasındaki `fs.writeFileSync` ve `fs.readFileSync` gibi dosya okuma/yazma işlemleri kademeli olarak Prisma ORM metodlarıyla (Örn: `prisma.listing.create()`) değiştirilecektir.
- Eski ilan ekleme (`/api/pricing/listings`) uç noktaları (endpoint'leri) yeni veritabanı şemasına göre güncellenecektir.

### 4. Frontend (Ön Yüz) Değişikliği
`PriceHistoryChart.tsx` bileşenini ürün detaylarını gösterdiğiniz sayfaya (Örn: `SystemDetailPage.tsx` veya oluşturacağınız yeni bir sayfaya) import edip eklemelisiniz.

## Neler DEĞİŞMEYECEK?
- **Genel Proje Mimarisi:** React (Vite) ön yüzü ve Express arka yüzü (backend) yapısı aynı kalacaktır.
- **Katalog Sistemi:** `shared/hardwareCatalog.ts` içindeki CPU, GPU ve diğer donanım veritabanınız (Tek Doğru Kaynak) aynı şekilde kullanılmaya devam edecektir.
- **Tasarım Dili:** Sitenizin mevcut renk paleti (Turuncu/Mavi vurgular, koyu tema) ve TailwindCSS yapısı korunmuştur (Grafik bileşeni buna uygun tasarlanmıştır).
