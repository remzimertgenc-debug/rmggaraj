import {
  MarketplacePlatform,
  PriceHistoryPoint,
  PricingCatalogResponse,
  ProductConditionGrade,
} from '../types/pc';

export interface CreateListingPayload {
  partId: string;
  productName?: string;
  brandModel?: string;
  listingPriceTry: number;
  platform: MarketplacePlatform;
  listingUrl: string;
  listingDate: string;
  conditionGrade: ProductConditionGrade;
  isNew: boolean;
}

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
  partId: string,
  isNew?: boolean
): Promise<PriceHistoryPoint[]> {
  const qs = isNew === undefined ? '' : `?isNew=${isNew ? 'true' : 'false'}`;
  const response = await fetch(
    `/api/pricing/history/${encodeURIComponent(partId)}${qs}`,
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

export async function submitMarketplaceListing(
  payload: CreateListingPayload,
  idToken: string | null
): Promise<PricingCatalogResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch('/api/pricing/listings', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    catalog?: PricingCatalogResponse;
  };

  if (!response.ok || !data.catalog) {
    throw new Error(data.error || 'İlan kaydı eklenemedi.');
  }
  return data.catalog;
}

export async function removeMarketplaceListing(
  id: string,
  idToken: string | null
): Promise<PricingCatalogResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(`/api/pricing/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    catalog?: PricingCatalogResponse;
  };

  if (!response.ok || !data.catalog) {
    throw new Error(data.error || 'İlan kaydı silinemedi.');
  }
  return data.catalog;
}
