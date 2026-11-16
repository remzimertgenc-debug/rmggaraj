# RMG TECH - Arama düzeltmesi

Bu güncelleme ana gezinme çubuğundaki genel arama alanını düzeltir.

## Düzeltilen davranış
- Arama metninde büyük/küçük harf farkı yok sayılır.
- Boşluk, tire ve noktalama farkları yok sayılır.
- Türkçe karakterler normalize edilir.
- `Ryzen 5 7500F`, `ryzen 5 7500f` ve `Ryzen 5 7500 F` aynı katalog kaydını bulabilir.
- CPU ve GPU sonuçları eşleşme gücüne göre sıralanır; CPU sonuçlarında ilk 8 eşleşme gösterilir.
- Mevcut ürün ID'leri ve katalog verileri değiştirilmemiştir.

## Değiştirilen dosyalar
- `src/components/Navbar.tsx` (aktif kök uygulama)
- `rmg_work/src/components/Navbar.tsx` (arşivdeki yinelenen proje kopyası; aynı arama davranışı burada da eşitlendi)

## Not
Bu değişiklik arama sonucunun görünmesini hedefler. Ürün seçimine tıklandığında hangi sayfanın açılacağı ayrı bir davranıştır ve bu güncellemede değiştirilmemiştir. Fiyat API'si de bu arama düzeltmesinin kapsamı dışındadır.
