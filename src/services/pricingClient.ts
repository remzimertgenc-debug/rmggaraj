import { PriceHistoryPoint, PricingCatalogResponse } from '../types/pc';

export async function fetchPricingCatalog(
  idToken?: string | null
): Promise<PricingCatalogResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  const response = await fetch('/api/pricing/catalog', { headers });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      errBody.error || `Fiyat veri sağlayıcısı hatası (HTTP ${response.status})`
    );
  }
  return (await response.json()) as PricingCatalogResponse;
}

export async function fetchPartPriceHistory(
  partId: string
): Promise<PriceHistoryPoint[]> {
  const response = await fetch(
    `/api/pricing/history/${encodeURIComponent(partId)}?isNew=true`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) {
    return [];
  }
  const data = (await response.json().catch(() => ({}))) as {
    history?: PriceHistoryPoint[];
  };
  return Array.isArray(data.history) ? data.history : [];
}

