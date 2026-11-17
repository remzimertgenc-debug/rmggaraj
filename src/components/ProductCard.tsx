import { ArrowRight } from 'lucide-react';
import { formatTry } from '../data/builds';
import type { DynamicCatalogProduct, PartCategoryKey, PartPricingInfo } from '../types/pc';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: DynamicCatalogProduct;
  pricing?: PartPricingInfo;
  onInspect: (category: PartCategoryKey, partId: string) => void;
}

export function ProductCard({
  product,
  pricing,
  onInspect,
}: ProductCardProps) {
  const activePrice = pricing?.newPriceTry ?? 0;
  const storeCount = pricing?.newStats?.listingCount ?? 0;
  const topStore = pricing?.newStats?.sources?.[0] ?? null;
  const isRealStorePrice =
    pricing?.newSourceType === 'authorized_api' ||
    pricing?.newSourceType === 'store_feed' ||
    pricing?.newSourceType === 'user_listings';

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/75 transition-all duration-200 hover:scale-[1.015] hover:border-[#FF7900]/70 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)]">
      <button
        type="button"
        onClick={() => onInspect(product.category, product.id)}
        className="aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-900/80 text-left"
      >
        <ProductImage
          imageUrl={product.imageUrl}
          category={product.category}
          model={product.name}
          brand={product.brand}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3 sm:gap-6 sm:p-6">
        <h3 className="font-display text-xs font-bold leading-snug text-slate-50 sm:text-lg">
          <button
            type="button"
            onClick={() => onInspect(product.category, product.id)}
            className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#FF7900]"
          >
            {product.name}
          </button>
        </h3>

        <div className="space-y-2.5 sm:space-y-4">
          <div>
            <span className="block truncate text-[10px] text-slate-400 sm:text-[11px]">
              {isRealStorePrice && storeCount > 0 && topStore
                ? `${storeCount} mağaza · ${topStore}`
                : activePrice > 0
                  ? 'Referans tahmini fiyat'
                  : 'Canlı fiyat bekleniyor'}
            </span>
            <span className="mt-0.5 block font-mono text-base font-extrabold tracking-tight tabular-nums text-[#FF7900] sm:text-2xl lg:text-3xl">
              {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Gör'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onInspect(product.category, product.id)}
            className="flex min-h-[36px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#FF7900] px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8C24] sm:min-h-[46px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <span>İncele</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
