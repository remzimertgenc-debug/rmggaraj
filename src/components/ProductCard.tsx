import { ArrowRight } from 'lucide-react';
import { formatTry } from '../data/builds';
import type { DynamicCatalogProduct, PartCategoryKey, PartPricingInfo } from '../types/pc';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: DynamicCatalogProduct;
  pricing?: PartPricingInfo;
  onInspect: (category: PartCategoryKey, partId: string) => void;
  onManageListings?: (partId?: string) => void;
}

export function ProductCard({
  product,
  pricing,
  onInspect,
}: ProductCardProps) {
  const activePrice = pricing?.newPriceTry ?? pricing?.usedPriceTry ?? 0;

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

      <div className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-7">
        <h3 className="font-display text-lg font-bold leading-snug text-slate-50">
          <button
            type="button"
            onClick={() => onInspect(product.category, product.id)}
            className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#FF7900]"
          >
            {product.name}
          </button>
        </h3>

        <div className="space-y-4">
          <span className="block font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#FF7900]">
            {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Gör'}
          </span>

          <button
            type="button"
            onClick={() => onInspect(product.category, product.id)}
            className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-[#FF8C24]"
          >
            <span>Ürünü İncele</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    </article>
  );
}
