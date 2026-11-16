import type { PartCategoryKey } from '../../src/types/pc.ts';

/**
 * Sunucu tarafı referans bütçe planlama katsayıları (TL).
 * Yalnızca sıfır (kapalı kutu) Türkiye perakende piyasa referans değerlerini içerir.
 */

export interface ReferenceRateEntry {
  estimatedNewTry: number;
  category: PartCategoryKey;
}

export const REFERENCE_RATES: Record<string, ReferenceRateEntry> = {
  // CPUs
  'cpu-r5-5600g': { estimatedNewTry: 4600, category: 'cpu' },
  'cpu-i3-14100f': { estimatedNewTry: 4300, category: 'cpu' },
  'cpu-r5-5600': { estimatedNewTry: 4850, category: 'cpu' },
  'cpu-i5-13400f': { estimatedNewTry: 6800, category: 'cpu' },
  'cpu-i5-14400f': { estimatedNewTry: 7400, category: 'cpu' },
  'cpu-r5-7500f': { estimatedNewTry: 6500, category: 'cpu' },
  'cpu-r7-7700x': { estimatedNewTry: 11200, category: 'cpu' },
  'cpu-i7-14700k': { estimatedNewTry: 14900, category: 'cpu' },
  'cpu-r7-7800x3d': { estimatedNewTry: 15800, category: 'cpu' },
  'cpu-r9-9950x': { estimatedNewTry: 24500, category: 'cpu' },

  // GPUs
  'gpu-apu-vega7': { estimatedNewTry: 0, category: 'gpu' },
  'gpu-rx6600': { estimatedNewTry: 8900, category: 'gpu' },
  'gpu-rtx3060-12': { estimatedNewTry: 10900, category: 'gpu' },
  'gpu-rtx4060': { estimatedNewTry: 12800, category: 'gpu' },
  'gpu-rtx4060ti': { estimatedNewTry: 16900, category: 'gpu' },
  'gpu-rx7700xt': { estimatedNewTry: 18500, category: 'gpu' },
  'gpu-rx7800xt': { estimatedNewTry: 22900, category: 'gpu' },
  'gpu-rtx4070-super': { estimatedNewTry: 26800, category: 'gpu' },
  'gpu-rtx4070ti-super': { estimatedNewTry: 36500, category: 'gpu' },
  'gpu-rtx4080-super': { estimatedNewTry: 48900, category: 'gpu' },
  'gpu-rtx4090': { estimatedNewTry: 78500, category: 'gpu' },
  'gpu-oem-unverified': { estimatedNewTry: 23500, category: 'gpu' },

  // Motherboards
  'mb-a520m': { estimatedNewTry: 2600, category: 'motherboard' },
  'mb-b450m-bios': { estimatedNewTry: 2450, category: 'motherboard' },
  'mb-b550m': { estimatedNewTry: 4100, category: 'motherboard' },
  'mb-h610m-d4': { estimatedNewTry: 3100, category: 'motherboard' },
  'mb-b760m-d4': { estimatedNewTry: 4300, category: 'motherboard' },
  'mb-b760-d5': { estimatedNewTry: 6900, category: 'motherboard' },
  'mb-z790-d5': { estimatedNewTry: 11200, category: 'motherboard' },
  'mb-b650m-k': { estimatedNewTry: 5400, category: 'motherboard' },
  'mb-b650-atx': { estimatedNewTry: 7800, category: 'motherboard' },
  'mb-x870e-atx': { estimatedNewTry: 13800, category: 'motherboard' },

  // RAM
  'ram-16-d4': { estimatedNewTry: 1650, category: 'ram' },
  'ram-32-d4': { estimatedNewTry: 3100, category: 'ram' },
  'ram-16-d5': { estimatedNewTry: 2650, category: 'ram' },
  'ram-32-d5': { estimatedNewTry: 4850, category: 'ram' },
  'ram-64-d5': { estimatedNewTry: 9400, category: 'ram' },
  'ram-4x16-d5': { estimatedNewTry: 10200, category: 'ram' },

  // SSD
  'ssd-500-gen3': { estimatedNewTry: 1450, category: 'ssd' },
  'ssd-1tb-gen4': { estimatedNewTry: 2650, category: 'ssd' },
  'ssd-1tb-pro': { estimatedNewTry: 4100, category: 'ssd' },
  'ssd-2tb-pro': { estimatedNewTry: 7200, category: 'ssd' },
  'ssd-2tb-gen5': { estimatedNewTry: 10900, category: 'ssd' },

  // PSU
  'psu-500-bronze': { estimatedNewTry: 1750, category: 'psu' },
  'psu-550-bronze': { estimatedNewTry: 2350, category: 'psu' },
  'psu-650-bronze': { estimatedNewTry: 2950, category: 'psu' },
  'psu-750-gold': { estimatedNewTry: 4650, category: 'psu' },
  'psu-850-gold': { estimatedNewTry: 5900, category: 'psu' },
  'psu-1000-plat': { estimatedNewTry: 9800, category: 'psu' },

  // Cases
  'case-matx-compact': { estimatedNewTry: 2950, category: 'pcCase' },
  'case-matx-tight': { estimatedNewTry: 2350, category: 'pcCase' },
  'case-atx-flow': { estimatedNewTry: 3950, category: 'pcCase' },
  'case-atx-xl': { estimatedNewTry: 6400, category: 'pcCase' },
  'case-no-spec': { estimatedNewTry: 2600, category: 'pcCase' },

  // CPU Coolers
  'cooler-stock-wraith': { estimatedNewTry: 0, category: 'cooler' },
  'cooler-ak400': { estimatedNewTry: 1350, category: 'cooler' },
  'cooler-pa120': { estimatedNewTry: 2150, category: 'cooler' },
  'cooler-aio-240': { estimatedNewTry: 3650, category: 'cooler' },
  'cooler-aio-360': { estimatedNewTry: 4950, category: 'cooler' },
  'cooler-no-spec': { estimatedNewTry: 1650, category: 'cooler' },
};

function hashCode(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function roundTo50(value: number): number {
  return Math.max(450, Math.round(value / 50) * 50);
}

export interface RateEstimationInput {
  id: string;
  category: PartCategoryKey;
  name: string;
  specSummary: string;
  ramType?: string | null;
  wattage?: number | null;
}

export function estimateReferenceRateForPart(product: RateEstimationInput): {
  estimatedNewTry: number;
} {
  const fixed = REFERENCE_RATES[product.id];
  if (fixed) {
    return { estimatedNewTry: fixed.estimatedNewTry };
  }

  const hay = `${product.name} ${product.specSummary}`.toUpperCase();
  const jitter = 0.96 + (hashCode(product.id) % 9) * 0.01; // 0.96 .. 1.04
  let baseNew = 4500;

  switch (product.category) {
    case 'cpu': {
      if (hay.includes('9950X3D')) baseNew = 31500;
      else if (hay.includes('9950X') || hay.includes('7950X3D') || hay.includes('285K')) baseNew = 25900;
      else if (hay.includes('9900X3D')) baseNew = 24900;
      else if (hay.includes('14900')) baseNew = 21900;
      else if (hay.includes('9800X3D')) baseNew = 21500;
      else if (hay.includes('7950X') || hay.includes('13900')) baseNew = 19800;
      else if (hay.includes('9900X') || hay.includes('7900X3D') || hay.includes('265K')) baseNew = 17900;
      else if (hay.includes('7800X3D') || hay.includes('7900X') || hay.includes('7900')) baseNew = 15800;
      else if (hay.includes('14700') || hay.includes('13700')) baseNew = 14800;
      else if (hay.includes('9700X') || hay.includes('245K') || hay.includes('12900')) baseNew = 12800;
      else if (hay.includes('7700X') || hay.includes('14600') || hay.includes('13600') || hay.includes('5950X')) baseNew = 11200;
      else if (hay.includes('7700') || hay.includes('5800X3D') || hay.includes('12700')) baseNew = 10400;
      else if (hay.includes('9600X') || hay.includes('8700G') || hay.includes('225F') || hay.includes('5900X')) baseNew = 9200;
      else if (hay.includes('7600X') || hay.includes('5700X3D') || hay.includes('14500')) baseNew = 8200;
      else if (hay.includes('7600') || hay.includes('8600G') || hay.includes('12600')) baseNew = 7400;
      else if (hay.includes('14400') || hay.includes('13400') || hay.includes('5800X')) baseNew = 6900;
      else if (hay.includes('7500F') || hay.includes('8500G') || hay.includes('5700X') || hay.includes('12400')) baseNew = 5900;
      else if (hay.includes('8400F') || hay.includes('5600X') || hay.includes('5600GT') || hay.includes('5600G')) baseNew = 4900;
      else if (hay.includes('5600') || hay.includes('14100') || hay.includes('13100')) baseNew = 4450;
      else if (hay.includes('5500') || hay.includes('12100')) baseNew = 3550;
      else baseNew = 2950;
      break;
    }

    case 'gpu': {
      if (hay.includes('5090')) baseNew = 108500;
      else if (hay.includes('4090')) baseNew = 81500;
      else if (hay.includes('5080')) baseNew = 54500;
      else if (hay.includes('4080')) baseNew = 48500;
      else if (hay.includes('7900 XTX')) baseNew = 41500;
      else if (hay.includes('5070 TI') || hay.includes('4070 TI')) baseNew = 37500;
      else if (hay.includes('7900 XT')) baseNew = 32900;
      else if (hay.includes('9070 XT')) baseNew = 31900;
      else if (hay.includes('5070')) baseNew = 29500;
      else if (hay.includes('9070') || hay.includes('4070 SUPER') || hay.includes('7900 GRE')) baseNew = 26400;
      else if (hay.includes('4070')) baseNew = 23900;
      else if (hay.includes('7800 XT')) baseNew = 22500;
      else if (hay.includes('5060 TI') && hay.includes('16')) baseNew = 21500;
      else if (hay.includes('4060 TI') && hay.includes('16')) baseNew = 19400;
      else if (hay.includes('9060 XT') && hay.includes('16')) baseNew = 18500;
      else if (hay.includes('7700 XT')) baseNew = 18500;
      else if (hay.includes('5060 TI')) baseNew = 17900;
      else if (hay.includes('4060 TI')) baseNew = 16900;
      else if (hay.includes('5060')) baseNew = 15200;
      else if (hay.includes('9060 XT')) baseNew = 14900;
      else if (hay.includes('9060') || hay.includes('7600 XT') || hay.includes('B580')) baseNew = 13200;
      else if (hay.includes('4060')) baseNew = 12800;
      else if (hay.includes('5050') || hay.includes('B570') || hay.includes('7600')) baseNew = 11400;
      else if (hay.includes('3060')) baseNew = 10900;
      else if (hay.includes('A750') || hay.includes('6650 XT')) baseNew = 9600;
      else if (hay.includes('6600') || hay.includes('3050')) baseNew = 8900;
      else baseNew = 11900;

      if (
        hay.includes('ROG STRIX') ||
        hay.includes('AORUS') ||
        hay.includes('NITRO+') ||
        hay.includes('RED DEVIL') ||
        hay.includes('ICHILL') ||
        hay.includes('MERCURY')
      ) {
        baseNew *= 1.11;
      } else if (
        hay.includes('TUF') ||
        hay.includes('GAMING X') ||
        hay.includes('GAMING TRIO') ||
        hay.includes('HELLHOUND') ||
        hay.includes('JETSTREAM') ||
        hay.includes('STEEL LEGEND')
      ) {
        baseNew *= 1.05;
      }
      break;
    }

    case 'motherboard': {
      if (hay.includes('X870E') || hay.includes('Z890') || hay.includes('X670E')) baseNew = 14900;
      else if (hay.includes('X870') || hay.includes('Z790') || hay.includes('X670') || hay.includes('B650E')) baseNew = 10800;
      else if (hay.includes('Z690') || hay.includes('X570')) baseNew = 8900;
      else if (hay.includes('B850') || hay.includes('B860')) baseNew = 7400;
      else if (hay.includes('B650') || hay.includes('B760')) baseNew = 6100;
      else if (hay.includes('B550') || hay.includes('B840') || hay.includes('A620') || hay.includes('H810')) baseNew = 4350;
      else if (hay.includes('B450') || hay.includes('H610')) baseNew = 3150;
      else baseNew = 2650;

      if (hay.includes('ROG') || hay.includes('TAICHI') || hay.includes('CARBON') || hay.includes('AORUS')) baseNew *= 1.2;
      else if (hay.includes('TUF') || hay.includes('TOMAHAWK') || hay.includes('MORTAR') || hay.includes('STEEL LEGEND')) baseNew *= 1.1;
      if (hay.includes('DDR5') && (hay.includes('B760') || hay.includes('H610'))) baseNew *= 1.08;
      break;
    }

    case 'ram': {
      const capMatch = hay.match(/\b(16|32|48|64|96|128)\s*GB\b/);
      const gb = capMatch ? Number(capMatch[1]) : 32;
      const isDdr5 = (product.ramType ?? hay).includes('DDR5');
      const perGb = isDdr5 ? 148 : 94;
      baseNew = gb * perGb;
      if (hay.includes('RGB')) baseNew *= 1.1;
      if (hay.includes('7200') || hay.includes('6800') || hay.includes('6400')) baseNew *= 1.12;
      if (hay.includes('DOMINATOR') || hay.includes('TRIDENT Z5') || hay.includes('RENEGADE')) baseNew *= 1.12;
      break;
    }

    case 'ssd': {
      const tbMatch = hay.match(/\b([1248])\s*TB\b/);
      const tb = tbMatch ? Number(tbMatch[1]) : 0.5;
      const isGen5 = hay.includes('PCIE 5.0');
      const isGen4 = hay.includes('PCIE 4.0');
      baseNew = tb * (isGen5 ? 4700 : isGen4 ? 2750 : 2100);
      if (hay.includes('990 PRO') || hay.includes('SN850X') || hay.includes('KC3000') || hay.includes('FURY RENEGADE')) {
        baseNew *= 1.25;
      }
      break;
    }

    case 'psu': {
      const wattMatch = hay.match(/\b(500|550|600|650|700|750|800|850|1000|1200|1300)\s*W\b/);
      const watts = product.wattage ?? (wattMatch ? Number(wattMatch[1]) : 650);
      baseNew = watts * 6.0;
      if (hay.includes('PLATINUM')) baseNew *= 1.32;
      else if (hay.includes('GOLD')) baseNew *= 1.16;
      if (hay.includes('ATX 3.1')) baseNew *= 1.07;
      if (hay.includes('TAM MOD')) baseNew *= 1.08;
      break;
    }

    case 'pcCase': {
      if (hay.includes('FULL-TOWER') || hay.includes('XL') || hay.includes('7000D') || hay.includes('MESHIFY 2')) baseNew = 6400;
      else if (hay.includes('AKVARYUM') || hay.includes('PANORAM') || hay.includes('O11') || hay.includes('NV5')) baseNew = 5150;
      else if (hay.includes('AIRFLOW') || hay.includes('FLOW') || hay.includes('LANCOOL')) baseNew = 3950;
      else if (hay.includes('MICRO-ATX') || hay.includes('MINI-ITX') || hay.includes('CH370')) baseNew = 2850;
      else baseNew = 3250;
      if (hay.includes('BEYAZ')) baseNew *= 1.05;
      break;
    }

    case 'cooler': {
      if (hay.includes('360')) baseNew = 4950;
      else if (hay.includes('280')) baseNew = 4250;
      else if (hay.includes('240')) baseNew = 3450;
      else if (hay.includes('ÇİFT KULE') || hay.includes('CIFT KULE') || hay.includes('NH-D15') || hay.includes('DARK ROCK')) baseNew = 2350;
      else baseNew = 1350;
      if (hay.includes('NOCTUA') || hay.includes('CORSAIR') || hay.includes('NZXT') || hay.includes('LIAN LI') || hay.includes('ROG')) {
        baseNew *= 1.2;
      }
      break;
    }
  }

  return { estimatedNewTry: roundTo50(baseNew * jitter) };
}
