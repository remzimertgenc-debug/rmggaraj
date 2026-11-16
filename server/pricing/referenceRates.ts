/**
 * Sunucu tarafı referans bütçe planlama katsayıları (TL).
 * ÖNEMLİ: Bu değerler yalnızca gerçek ilan veya yetkili API verisi bulunmadığında
 * sistem bütçe planlaması için "Tahmini Referans" olarak kullanılır;
 * kesinlikle gerçek Sahibinden/Letgo/Facebook ilan fiyatı olarak sunulmaz.
 */

export interface ReferenceRateEntry {
  estimatedNewTry: number;
  estimatedUsedTry: number | null;
  category: 'cpu' | 'gpu' | 'motherboard' | 'ram' | 'ssd' | 'psu' | 'pcCase' | 'cooler';
}

export const REFERENCE_RATES: Record<string, ReferenceRateEntry> = {
  // CPUs
  'cpu-r5-5600g': { estimatedNewTry: 4600, estimatedUsedTry: 3100, category: 'cpu' },
  'cpu-i3-14100f': { estimatedNewTry: 4300, estimatedUsedTry: 2950, category: 'cpu' },
  'cpu-r5-5600': { estimatedNewTry: 4850, estimatedUsedTry: 3350, category: 'cpu' },
  'cpu-i5-13400f': { estimatedNewTry: 6800, estimatedUsedTry: 4850, category: 'cpu' },
  'cpu-i5-14400f': { estimatedNewTry: 7400, estimatedUsedTry: 5400, category: 'cpu' },
  'cpu-r5-7500f': { estimatedNewTry: 6500, estimatedUsedTry: 4800, category: 'cpu' },
  'cpu-r7-7700x': { estimatedNewTry: 11200, estimatedUsedTry: 8200, category: 'cpu' },
  'cpu-i7-14700k': { estimatedNewTry: 14900, estimatedUsedTry: 10800, category: 'cpu' },
  'cpu-r7-7800x3d': { estimatedNewTry: 15800, estimatedUsedTry: 11900, category: 'cpu' },
  'cpu-r9-9950x': { estimatedNewTry: 24500, estimatedUsedTry: 19200, category: 'cpu' },

  // GPUs
  'gpu-apu-vega7': { estimatedNewTry: 0, estimatedUsedTry: 0, category: 'gpu' },
  'gpu-rx6600': { estimatedNewTry: 8900, estimatedUsedTry: 5600, category: 'gpu' },
  'gpu-rtx3060-12': { estimatedNewTry: 10900, estimatedUsedTry: 7200, category: 'gpu' },
  'gpu-rtx4060': { estimatedNewTry: 12800, estimatedUsedTry: 9400, category: 'gpu' },
  'gpu-rtx4060ti': { estimatedNewTry: 16900, estimatedUsedTry: 12400, category: 'gpu' },
  'gpu-rx7700xt': { estimatedNewTry: 18500, estimatedUsedTry: 13800, category: 'gpu' },
  'gpu-rx7800xt': { estimatedNewTry: 22900, estimatedUsedTry: 17500, category: 'gpu' },
  'gpu-rtx4070-super': { estimatedNewTry: 26800, estimatedUsedTry: 20500, category: 'gpu' },
  'gpu-rtx4070ti-super': { estimatedNewTry: 36500, estimatedUsedTry: 28500, category: 'gpu' },
  'gpu-rtx4080-super': { estimatedNewTry: 48900, estimatedUsedTry: 38500, category: 'gpu' },
  'gpu-rtx4090': { estimatedNewTry: 78500, estimatedUsedTry: 61000, category: 'gpu' },
  'gpu-oem-unverified': { estimatedNewTry: 23500, estimatedUsedTry: 17900, category: 'gpu' },

  // Motherboards
  'mb-a520m': { estimatedNewTry: 2600, estimatedUsedTry: 1750, category: 'motherboard' },
  'mb-b450m-bios': { estimatedNewTry: 2350, estimatedUsedTry: 1500, category: 'motherboard' },
  'mb-b550m': { estimatedNewTry: 4100, estimatedUsedTry: 2800, category: 'motherboard' },
  'mb-h610m-d4': { estimatedNewTry: 3100, estimatedUsedTry: 2100, category: 'motherboard' },
  'mb-b760m-d4': { estimatedNewTry: 4300, estimatedUsedTry: 2950, category: 'motherboard' },
  'mb-b760-d5': { estimatedNewTry: 6900, estimatedUsedTry: 4900, category: 'motherboard' },
  'mb-z790-d5': { estimatedNewTry: 11200, estimatedUsedTry: 8400, category: 'motherboard' },
  'mb-b650m-k': { estimatedNewTry: 5400, estimatedUsedTry: 3900, category: 'motherboard' },
  'mb-b650-atx': { estimatedNewTry: 7800, estimatedUsedTry: 5700, category: 'motherboard' },
  'mb-x870e-atx': { estimatedNewTry: 13800, estimatedUsedTry: 10500, category: 'motherboard' },

  // RAM
  'ram-16-d4': { estimatedNewTry: 1650, estimatedUsedTry: 1050, category: 'ram' },
  'ram-32-d4': { estimatedNewTry: 3100, estimatedUsedTry: 2050, category: 'ram' },
  'ram-16-d5': { estimatedNewTry: 2650, estimatedUsedTry: 1850, category: 'ram' },
  'ram-32-d5': { estimatedNewTry: 4850, estimatedUsedTry: 3450, category: 'ram' },
  'ram-64-d5': { estimatedNewTry: 9400, estimatedUsedTry: 6900, category: 'ram' },
  'ram-4x16-d5': { estimatedNewTry: 10200, estimatedUsedTry: 7400, category: 'ram' },

  // SSD
  'ssd-500-gen3': { estimatedNewTry: 1450, estimatedUsedTry: 950, category: 'ssd' },
  'ssd-1tb-gen4': { estimatedNewTry: 2650, estimatedUsedTry: 1850, category: 'ssd' },
  'ssd-1tb-pro': { estimatedNewTry: 4100, estimatedUsedTry: 2950, category: 'ssd' },
  'ssd-2tb-pro': { estimatedNewTry: 7200, estimatedUsedTry: 5300, category: 'ssd' },
  'ssd-2tb-gen5': { estimatedNewTry: 10900, estimatedUsedTry: 8200, category: 'ssd' },

  // PSU
  'psu-500-bronze': { estimatedNewTry: 1750, estimatedUsedTry: 1150, category: 'psu' },
  'psu-550-bronze': { estimatedNewTry: 2350, estimatedUsedTry: 1550, category: 'psu' },
  'psu-650-bronze': { estimatedNewTry: 2950, estimatedUsedTry: 1950, category: 'psu' },
  'psu-750-gold': { estimatedNewTry: 4650, estimatedUsedTry: 3300, category: 'psu' },
  'psu-850-gold': { estimatedNewTry: 5900, estimatedUsedTry: 4200, category: 'psu' },
  'psu-1000-plat': { estimatedNewTry: 9800, estimatedUsedTry: 7200, category: 'psu' },

  // Cases
  'case-matx-compact': { estimatedNewTry: 2950, estimatedUsedTry: 1950, category: 'pcCase' },
  'case-matx-tight': { estimatedNewTry: 2350, estimatedUsedTry: 1550, category: 'pcCase' },
  'case-atx-flow': { estimatedNewTry: 3950, estimatedUsedTry: 2700, category: 'pcCase' },
  'case-atx-xl': { estimatedNewTry: 6400, estimatedUsedTry: 4700, category: 'pcCase' },
  'case-no-spec': { estimatedNewTry: 2600, estimatedUsedTry: 1800, category: 'pcCase' },

  // CPU Coolers
  'cooler-stock-wraith': { estimatedNewTry: 0, estimatedUsedTry: 0, category: 'cooler' },
  'cooler-ak400': { estimatedNewTry: 1350, estimatedUsedTry: 850, category: 'cooler' },
  'cooler-pa120': { estimatedNewTry: 2150, estimatedUsedTry: 1450, category: 'cooler' },
  'cooler-aio-240': { estimatedNewTry: 3650, estimatedUsedTry: 2450, category: 'cooler' },
  'cooler-aio-360': { estimatedNewTry: 4950, estimatedUsedTry: 3400, category: 'cooler' },
  'cooler-no-spec': { estimatedNewTry: 1650, estimatedUsedTry: 1100, category: 'cooler' },
};
