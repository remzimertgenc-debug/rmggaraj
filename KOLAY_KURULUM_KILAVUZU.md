# RMG TECH - Cimri Benzeri Altyapı (Kolay Kurulum - SQLite)

Bu ZIP dosyası, projeni statik bir `.json` dosyasından kurtarıp, **kendi içinde çalışan otomatik bir veritabanına (SQLite)** bağlamak için gereken her şeyi içerir. 
İnternetten link almana, bir yere üye olmana veya şifre ayarlamana **gerek yoktur.** Veritabanı doğrudan kendi bilgisayarında, proje klasörünün içinde `dev.db` adında küçük bir dosya olarak çalışacaktır.

## Bu ZIP'i Projene Nasıl Ekleyeceksin? (Çok Basit 3 Adım)

### Adım 1: Dosyaları Kopyala
ZIP dosyasından çıkan tüm klasörleri (`prisma`, `server`, `src`) ve `.env` dosyasını kendi projenin ana dizinine (yani `package.json`'ın olduğu yere) kopyala. Üzerine yazdırılsın mı diye sorarsa **Evet** de.

### Adım 2: Gerekli Paketleri (Kütüphaneleri) İndir
VS Code'u (veya hangi kod editörünü kullanıyorsan onu) aç. Projenin ana klasöründe bir Terminal aç ve tam olarak şu komutu kopyalayıp yapıştır, sonra Enter'a bas:
```bash
npm install prisma @prisma/client recharts
```
*(Bu işlem kodların çalışması için gereken paketleri bilgisayarına indirecek. Bittiğinde altta yeşil veya mavi yazılar çıkar.)*

### Adım 3: Veritabanını Otomatik Oluştur
Terminalde tam olarak şu komutu kopyalayıp yapıştır ve Enter'a bas:
```bash
npx prisma db push
```
*(Bu komut, projenin içine `prisma/dev.db` adında bir veritabanı dosyası oluşturacak ve tabloları ayarlayacak. Supabase falan uğraşmana gerek kalmadı!)*

---

Tebrikler! Altyapı hazır. Artık grafiğimizi görmek için tek yapman gereken şey:
`src/components/SystemDetailPage.tsx` (ya da hangi sayfada ürünü gösteriyorsan) dosyasını açıp en üste şu kodu eklemek:
```javascript
import { PriceHistoryChart } from './PriceHistoryChart';
```

Sonra sayfanın içine (mesela fiyatların altına) şu kodu koyup test edebilirsin:
```javascript
<PriceHistoryChart 
  productName="AMD Ryzen 5 7500F" 
  data={[
    { date: '10 Kas', price: 6500 },
    { date: '11 Kas', price: 6450 },
    { date: '12 Kas', price: 6600 },
    { date: '13 Kas', price: 6200 },
    { date: '14 Kas', price: 6200 },
  ]} 
/>
```

Sorun yaşarsan sadece "Adım 2'de hata verdi" gibi bana yazman yeterli!
