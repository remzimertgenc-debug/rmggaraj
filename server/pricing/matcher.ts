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

const VARIANT_GUARD_TOKENS = [
  'super',
  'ti',
  'xt',
  'xtx',
  'gre',
  'x3d',
  'kf',
  'gt',
  '8gb',
  '10gb',
  '12gb',
  '16gb',
  '20gb',
  '24gb',
  '32gb',
  '240',
  '280',
  '360',
];

function toMatchAscii(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d+)\s+(gb|tb|w|mhz|mm)\b/g, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface CatalogMatchItem {
  id: string;
  isGpu: boolean;
  aliases: string[];
  normalizedAliases: { norm: string; compact: string; tokens: Set<string>; tokenList: string[] }[];
}

const RAW_ITEMS: { id: string; isGpu: boolean; aliases: string[] }[] = [
  ...CPU_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model, p.model.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')],
  })),
  ...GPU_DB.filter((g) => !g.isIntegrated && !g.isUnverifiedSpecSample).map((g) => {
    const cleanCore = g.model
      .replace(/^NVIDIA\s+GeForce\s+/i, '')
      .replace(/^AMD\s+Radeon\s+/i, '');
    return {
      id: g.id,
      isGpu: true,
      aliases: [g.model, cleanCore, `${g.shortTitle} ${g.vramGb ?? ''}GB`.trim()],
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
    aliases: [p.model],
  })),
  ...SSD_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model],
  })),
  ...PSU_DB.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
    id: p.id,
    isGpu: false,
    aliases: [p.model],
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

const EXACT_ALIAS_TO_ID = new Map<string, string>();
const ALL_CATALOG_ITEMS: CatalogMatchItem[] = RAW_ITEMS.map((item) => {
  const normalizedAliases = item.aliases
    .map((raw) => toMatchAscii(raw))
    .filter(Boolean)
    .map((norm) => {
      const tokenList = norm.split(' ').filter(Boolean);
      return {
        norm,
        compact: norm.replace(/\s+/g, ''),
        tokens: new Set(tokenList),
        tokenList: tokenList.filter((t) => t.length >= 2),
      };
    });

  // Full model exact lookup (first alias is always full model name)
  if (normalizedAliases[0]) {
    EXACT_ALIAS_TO_ID.set(normalizedAliases[0].norm, item.id);
  }

  return {
    ...item,
    normalizedAliases,
  };
});

/**
 * Mağazalardan veya yetkili API'lerden gelen ham ürün adını
 * shared/hardwareCatalog.ts (Tek Doğru Kaynak) kimliğiyle eşleştirir.
 */
export function findMatchingPartId(rawProductName: string): string | null {
  const normalized = toMatchAscii(rawProductName);
  if (!normalized) return null;

  const exactId = EXACT_ALIAS_TO_ID.get(normalized);
  if (exactId) return exactId;

  const inputTokens = new Set(normalized.split(' ').filter(Boolean));
  const paddedInput = ` ${normalized} `;
  const compactInput = normalized.replace(/\s+/g, '');
  let bestMatch: { id: string; score: number } | null = null;

  for (const item of ALL_CATALOG_ITEMS) {
    for (const alias of item.normalizedAliases) {
      const missingVariant = VARIANT_GUARD_TOKENS.some(
        (mod) => inputTokens.has(mod) && !alias.tokens.has(mod)
      );
      if (missingVariant) continue;

      if (item.isGpu) {
        // Also guard against matching a higher-tier card name onto a lower-tier card missing GPU mod
        const missingReverseVram = ['8gb', '10gb', '12gb', '16gb', '20gb', '24gb', '32gb'].some(
          (cap) => alias.tokens.has(cap) && !inputTokens.has(cap)
        );
        if (missingReverseVram) continue;
      }

      if (paddedInput.includes(` ${alias.norm} `)) {
        const score = alias.norm.length + 200;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: item.id, score };
        }
        continue;
      }

      if (alias.compact.length >= 6 && compactInput.includes(alias.compact)) {
        const score = alias.compact.length + 100;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: item.id, score };
        }
        continue;
      }

      if (alias.tokenList.length >= 2) {
        let allPresent = true;
        for (const t of alias.tokenList) {
          if (!normalized.includes(t)) {
            allPresent = false;
            break;
          }
        }
        if (allPresent) {
          const score = alias.compact.length;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { id: item.id, score };
          }
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
