import {
  MarketplacePlatform,
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

export async function fetchPricingCatalog(): Promise<PricingCatalogResponse> {
  const response = await fetch('/api/pricing/catalog', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      errBody.error || `Fiyat veri sağlayıcısı hatası (HTTP ${response.status})`
    );
  }
  return (await response.json()) as PricingCatalogResponse;
}

export async function submitMarketplaceListing(
  payload: CreateListingPayload
): Promise<PricingCatalogResponse> {
  const response = await fetch('/api/pricing/listings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
  id: string
): Promise<PricingCatalogResponse> {
  const response = await fetch(`/api/pricing/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
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
