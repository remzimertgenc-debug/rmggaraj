const STORE_REF_TAGS: Record<string, string> = {
  vatan: 'rmggaraj_vatan',
  itopya: 'rmggaraj_itopya',
  sinerji: 'rmggaraj_sinerji',
  trendyol: 'rmggaraj_trendyol',
  incehesap: 'rmggaraj_incehesap',
  'gaming.gen.tr': 'rmggaraj_gaminggen',
  hepsiburada: 'rmggaraj_hepsiburada',
  'amazon tr': 'rmggaraj_amazontr',
  'yetkili saglayici': 'rmggaraj_partner',
};

function normalizeStoreKey(storeName?: string): string {
  if (!storeName) return '';
  return storeName
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Mağaza ve pazar yeri bağlantılarına satış ortaklığı (affiliate) referans parametrelerini ekler.
 */
export function buildAffiliateUrl(rawUrl: string, storeName?: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === '#') {
    return '#';
  }

  const normalizedStore = normalizeStoreKey(storeName);
  const refTag = STORE_REF_TAGS[normalizedStore] ?? 'rmggaraj_affiliate';
  const campaignSlug = normalizedStore
    ? normalizedStore.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    : 'direct';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '#';
    }
    if (!parsed.searchParams.has('ref')) {
      parsed.searchParams.set('ref', refTag);
    }
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', 'rmggaraj');
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', 'affiliate');
    }
    if (campaignSlug && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', campaignSlug);
    }
    return parsed.toString();
  } catch {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}ref=${encodeURIComponent(refTag)}&utm_source=rmggaraj&utm_medium=affiliate`;
  }
}
