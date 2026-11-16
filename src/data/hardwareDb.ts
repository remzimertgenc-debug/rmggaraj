/**
 * Merkezi Donanım Veritabanı Yönlendirmesi
 * Tüm teknik özellikler shared/hardwareCatalog.ts içinde tek merkezden yönetilir.
 * Fiyatlar frontend içine sabitlenmez; backend /api/pricing/* katmanından alınır.
 */
export {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from '../../shared/hardwareCatalog.ts';
