import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from '../../shared/hardwareCatalog.ts';

interface MatchRule {
  partId: string;
  requiredKeywords: string[];
  excludeKeywords: string[];
}

const MANUAL_RULES: MatchRule[] = [
  {
    partId: 'cpu-r5-7500f',
    requiredKeywords: ['ryzen', '5', '7500f'],
    excludeKeywords: ['kasa', 'sistem', 'hazir'],
  },
  {
    partId: 'gpu-rtx4060',
    requiredKeywords: ['rtx', '4060'],
    excludeKeywords: ['ti', 'laptop', 'notebook', 'sistem'],
  },
];

const GPU_VARIANT_MODIFIERS = ['super', 'ti', 'xt', 'gre', 'xtx'];

function toMatchAscii(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ALL_CATALOG_ITEMS: {
  id: string;
  isGpu: boolean;
  aliases: string[];
}[] = [
  ...CPU_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model, p.model.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')],
  })),
  ...GPU_DB.filter((g) => !g.isIntegrated && !g.isUnverifiedSpecSample).map((g) => {
    const cleanCore = g.model
      .replace(/^NVIDIA\s+GeForce\s+/i, '')
      .replace(/^AMD\s+Radeon\s+/i, '')
      .replace(/\s+\d+\s*GB$/i, '');
    return {
      id: g.id,
      isGpu: true,
      aliases: [cleanCore, g.shortTitle, g.model],
    };
  }),
  ...MOTHERBOARD_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model, p.model.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')],
  })),
  ...RAM_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model, p.model.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')],
  })),
  ...SSD_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model, p.model.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')],
  })),
  ...PSU_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model, p.model.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')],
  })),
  ...CASE_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model],
  })),
  ...CPU_COOLER_DB.filter(
    (c) => c.id !== 'cooler-stock-wraith' && !c.isUnverifiedSpecSample
  ).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model],
  })),
];

/**
 * Mağazalardan veya yetkili API'lerden gelen ham ürün adını
 * shared/hardwareCatalog.ts (Tek Doğru Kaynak) kimliğiyle eşleştirir.
 */
export function findMatchingPartId(rawProductName: string): string | null {
  const normalized = toMatchAscii(rawProductName);
  if (!normalized) return null;

  const inputTokens = new Set(normalized.split(' ').filter(Boolean));
  const paddedInput = ` ${normalized} `;
  const compactInput = normalized.replace(/\s+/g, '');
  let bestMatch: { id: string; score: number } | null = null;

  for (const item of ALL_CATALOG_ITEMS) {
    for (const rawAlias of item.aliases) {
      const aliasNorm = toMatchAscii(rawAlias);
      if (!aliasNorm) continue;

      if (item.isGpu) {
        const aliasTokens = new Set(aliasNorm.split(' ').filter(Boolean));
        const missingVariant = GPU_VARIANT_MODIFIERS.some(
          (mod) => inputTokens.has(mod) && !aliasTokens.has(mod)
        );
        if (missingVariant) continue;
      }

      if (paddedInput.includes(` ${aliasNorm} `)) {
        const score = aliasNorm.length + 200;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: item.id, score };
        }
        continue;
      }

      const aliasCompact = aliasNorm.replace(/\s+/g, '');
      if (aliasCompact.length >= 6 && compactInput.includes(aliasCompact)) {
        const score = aliasCompact.length + 100;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: item.id, score };
        }
        continue;
      }

      const tokens = aliasNorm.split(' ').filter((t) => t.length >= 2);
      const matchedTokens = tokens.filter((t) => normalized.includes(t));
      if (tokens.length >= 2 && matchedTokens.length === tokens.length) {
        const score = tokens.join('').length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: item.id, score };
        }
      }
    }
  }

  if (bestMatch) return bestMatch.id;

  for (const rule of MANUAL_RULES) {
    const hasAll = rule.requiredKeywords.every((kw) => normalized.includes(kw));
    const hasExcluded = rule.excludeKeywords.some((kw) => normalized.includes(kw));
    if (hasAll && !hasExcluded) {
      return rule.partId;
    }
  }

  return null;
}
