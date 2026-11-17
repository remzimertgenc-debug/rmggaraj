import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { formatTry } from '../data/builds';
import { CATEGORY_LABELS, getAllCatalogEntries } from '../data/partMedia';
import { PartCategoryKey, PricingCatalogResponse } from '../types/pc';
import { ProductImage } from './ProductImage';

interface DealsShowcaseProps {
  pricingCatalog: PricingCatalogResponse | null;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
}

interface DealItem {
  id: string;
  category: PartCategoryKey;
  brand: string;
  name: string;
  imageUrl: string | null;
  oldPriceTry: number;
  dealPriceTry: number;
  discountPercent: number;
  sourceLabel: string;
}

const REAL_LISTING_SOURCE_TYPES = new Set([
  'authorized_api',
  'store_feed',
  'user_listings',
]);

export function DealsShowcase({ pricingCatalog, onInspectPart }: DealsShowcaseProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const dealItems = useMemo<DealItem[]>(() => {
    const entries = getAllCatalogEntries();
    const partsPricing = pricingCatalog?.partsPricing ?? {};
    const productImages = pricingCatalog?.productImages ?? {};
    const items: DealItem[] = [];
    const seen = new Set<string>();

    // 1) Katalogdaki gerçek mağaza ilanlarında çoklu mağaza fiyat farkı sunan tekil donanımlar
    for (const entry of entries) {
      const { category, part } = entry;
      const pricing = partsPricing[part.id];
      if (!pricing || !REAL_LISTING_SOURCE_TYPES.has(pricing.newSourceType)) {
        continue;
      }

      const listingCount = pricing.newStats?.listingCount ?? 0;
      const minStorePrice = pricing.newStats?.minPriceTry ?? null;
      const avgStorePrice = pricing.newStats?.averagePriceTry ?? null;
      if (
        listingCount >= 2 &&
        minStorePrice &&
        avgStorePrice &&
        avgStorePrice > minStorePrice &&
        minStorePrice > 0
      ) {
        const pct = Math.round(((avgStorePrice - minStorePrice) / avgStorePrice) * 100);
        if (pct >= 4) {
          seen.add(part.id);
          items.push({
            id: part.id,
            category,
            brand: part.brand,
            name: part.model,
            imageUrl: productImages[part.id] ?? null,
            oldPriceTry: avgStorePrice,
            dealPriceTry: minStorePrice,
            discountPercent: pct,
            sourceLabel: 'Mağaza Ort. Altında',
          });
        }
      }
    }

    // 2) Dinamik mağaza ürünlerinde gerçek çoklu mağaza fiyat farkı varsa ekle (yapay indirim üretilmez)
    for (const dyn of pricingCatalog?.dynamicProducts ?? []) {
      if (items.length >= 10) break;
      if (seen.has(dyn.id)) continue;
      const pricing = partsPricing[dyn.id];
      if (!pricing || !REAL_LISTING_SOURCE_TYPES.has(pricing.newSourceType)) {
        continue;
      }

      const listingCount = pricing.newStats?.listingCount ?? 0;
      const minStorePrice = pricing.newStats?.minPriceTry ?? null;
      const avgStorePrice = pricing.newStats?.averagePriceTry ?? null;
      if (
        listingCount >= 2 &&
        minStorePrice &&
        avgStorePrice &&
        avgStorePrice > minStorePrice &&
        minStorePrice > 0
      ) {
        const pct = Math.round(((avgStorePrice - minStorePrice) / avgStorePrice) * 100);
        if (pct >= 4) {
          seen.add(dyn.id);
          items.push({
            id: dyn.id,
            category: dyn.category,
            brand: dyn.brand,
            name: dyn.name,
            imageUrl: dyn.imageUrl ?? productImages[dyn.id] ?? null,
            oldPriceTry: avgStorePrice,
            dealPriceTry: minStorePrice,
            discountPercent: pct,
            sourceLabel: dyn.sourceStore ?? 'Mağaza Ort. Altında',
          });
        }
      }
    }

    return items.sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 10);
  }, [pricingCatalog]);

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = direction === 'left' ? -340 : 340;
    el.scrollBy({ left: distance, behavior: 'smooth' });
  };

  if (dealItems.length === 0) return null;

  return (
    <section className="border-t border-slate-800/80 mx-auto max-w-[1320px] px-4 pt-10 pb-12 sm:px-6 lg:px-8 lg:pb-14">
      <div className="flex flex-col justify-between gap-4 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
            Gerçek Mağaza Karşılaştırması
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
            Fırsat Donanımları
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Canlı mağaza verilerinde mağaza ortalamasının altında fiyat sunan tekil bileşenler.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => scrollByCard('left')}
            aria-label="Fırsat donanımlarını sola kaydır"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800 text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard('right')}
            aria-label="Fırsat donanımlarını sağa kaydır"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800 text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Hardware Deals Showcase */}
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scroll-smooth [scrollbar-color:#334155_transparent] [scrollbar-width:thin] sm:gap-6"
      >
        {dealItems.map((item) => (
          <article
            key={item.id}
            onClick={() => onInspectPart(item.category, item.id)}
            className="group flex w-[calc(50%-6px)] min-w-[160px] shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/75 transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-500/80 sm:w-[295px]"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900/90">
              <ProductImage
                imageUrl={item.imageUrl}
                category={item.category}
                model={item.name}
                brand={item.brand}
                className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
              <div>
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-medium text-slate-400 sm:gap-2 sm:text-xs">
                  <span className="truncate">
                    {CATEGORY_LABELS[item.category]} · {item.brand}
                  </span>
                  <span className="font-mono font-bold text-[#FF7900] shrink-0">
                    -%{item.discountPercent}
                  </span>
                </div>

                <h3 className="mt-1.5 line-clamp-2 font-display text-xs font-bold leading-snug text-slate-50 sm:mt-2 sm:text-base">
                  {item.name}
                </h3>
              </div>

              <div className="mt-3 sm:mt-5">
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2.5">
                  <span className="font-mono text-base font-extrabold tracking-tight text-[#FF7900] tabular-nums sm:text-2xl">
                    {formatTry(item.dealPriceTry)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 line-through tabular-nums sm:text-xs">
                    {formatTry(item.oldPriceTry)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectPart(item.category, item.id);
                  }}
                  className="mt-2.5 inline-flex min-h-[36px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#FF7900] px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8C24] sm:mt-4 sm:min-h-[42px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <span>İncele</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
