import {
  ArrowRight,
  Cpu,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { formatTry } from '../data/builds';
import { CATEGORY_LABELS } from '../data/partMedia';
import type { PartCategoryKey, PricingCatalogResponse } from '../types/pc';
import { ProductImage } from './ProductImage';

export type CatalogSortOrder = 'name' | 'price-asc' | 'price-desc';
export type CatalogViewMode = 'grid' | 'list';

export interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface CatalogDisplayProduct {
  id: string;
  category: PartCategoryKey;
  brand: string;
  model: string;
  specSummary: string;
  imageUrl?: string | null;
}

interface CatalogProductSectionProps {
  items: CatalogDisplayProduct[];
  totalCount: number;
  pricingCatalog: PricingCatalogResponse | null;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sortOrder: CatalogSortOrder;
  onSortChange: (order: CatalogSortOrder) => void;
  activeFilterCount: number;
  activeFilterChips: ActiveFilterChip[];
  onResetFilters: () => void;
  onOpenMobileFilters: () => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onAddToBuild?: (partId: string) => void;
  visibleLimit: number;
  onLoadMore: () => void;
  loadMoreLabel: string;
  emptyMessage: string;
}

const SORT_OPTIONS: { id: CatalogSortOrder; label: string }[] = [
  { id: 'name', label: 'İsme Göre (A-Z)' },
  { id: 'price-asc', label: 'En Düşük Fiyat' },
  { id: 'price-desc', label: 'En Yüksek Fiyat' },
];

export function CatalogProductSection({
  items,
  totalCount,
  pricingCatalog,
  search,
  onSearchChange,
  searchPlaceholder,
  sortOrder,
  onSortChange,
  activeFilterCount,
  activeFilterChips,
  onResetFilters,
  onOpenMobileFilters,
  onInspectPart,
  onAddToBuild,
  visibleLimit,
  onLoadMore,
  loadMoreLabel,
  emptyMessage,
}: CatalogProductSectionProps) {
  const [viewMode, setViewMode] = useState<CatalogViewMode>('grid');
  const visibleItems = items.slice(0, visibleLimit);

  return (
    <div className="min-w-0 flex-1">
      {/* Top İtopya-Style Control Toolbar */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-800/80 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Search + Mobile Filter Trigger */}
          <div className="flex flex-1 items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenMobileFilters}
              className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3.5 text-xs font-bold text-slate-100 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#FF7900]" />
              <span>Filtrele</span>
              {activeFilterCount > 0 && (
                <span className="font-mono text-[11px] font-bold tabular-nums text-[#FF7900]">
                  ({activeFilterCount})
                </span>
              )}
            </button>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-8 text-sm text-slate-50 placeholder:text-slate-400 outline-none focus:border-[#FF7900]"
              />
              {search.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Aramayı temizle"
                  className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sort Tabs + View Switcher + Result Count */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 xl:justify-end">
            {/* Desktop Segmented Sort */}
            <div
              className="hidden items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900 p-1 md:inline-flex"
              role="group"
              aria-label="Sıralama seçenekleri"
            >
              {SORT_OPTIONS.map((opt) => {
                const active = sortOrder === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSortChange(opt.id)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#FF7900] text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile Sort Select */}
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as CatalogSortOrder)}
              aria-label="Sıralama"
              className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-100 md:hidden"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-400 whitespace-nowrap">
                {items.length} / {totalCount} ürün
              </span>

              {/* Grid / List View Mode Toggle */}
              <div
                className="inline-flex items-center rounded-lg border border-slate-700/80 bg-slate-900 p-0.5"
                role="group"
                aria-label="Görünüm modu"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Izgara görünümü"
                  aria-pressed={viewMode === 'grid'}
                  className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-slate-700 text-[#FF7900]'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="Liste görünümü"
                  aria-pressed={viewMode === 'list'}
                  className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-slate-700 text-[#FF7900]'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {(activeFilterChips.length > 0 || search.trim() !== '') && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-700/60 pt-3">
            <span className="text-[11px] font-semibold text-slate-400">
              Seçili Filtreler:
            </span>
            {search.trim() !== '' && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-100 transition-colors hover:border-[#FF7900]"
              >
                <span>Arama: &ldquo;{search.trim()}&rdquo;</span>
                <X className="h-3 w-3 text-[#FF7900]" />
              </button>
            )}
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-100 transition-colors hover:border-[#FF7900]"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3 text-[#FF7900]" />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetFilters}
              className="ml-auto cursor-pointer text-xs font-semibold text-[#FF7900] hover:underline"
            >
              Tümünü Temizle
            </button>
          </div>
        )}
      </div>

      {/* Product Grid or List */}
      {items.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {visibleItems.map((item) => {
              const pricing = pricingCatalog?.partsPricing[item.id];
              const activePrice = pricing?.newPriceTry ?? 0;
              const storeCount = pricing?.newStats?.listingCount ?? 0;
              const topStore = pricing?.newStats?.sources?.[0] ?? null;

              return (
                <article
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-slate-800/80 transition-transform duration-150 hover:-translate-y-0.5 hover:border-[#FF7900]/70"
                >
                  <button
                    type="button"
                    onClick={() => onInspectPart(item.category, item.id)}
                    className="aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-950/70 text-left"
                  >
                    <ProductImage
                      imageUrl={
                        item.imageUrl ?? pricingCatalog?.productImages?.[item.id]
                      }
                      category={item.category}
                      model={item.model}
                      brand={item.brand}
                      className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  </button>

                  <div className="flex flex-1 flex-col p-3 sm:p-5">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px]">
                      {item.brand} · {CATEGORY_LABELS[item.category]}
                    </p>

                    <h2 className="mt-1 font-display text-xs font-bold leading-snug text-slate-50 sm:mt-1.5 sm:text-[15px]">
                      <button
                        type="button"
                        onClick={() => onInspectPart(item.category, item.id)}
                        className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#FF7900]"
                      >
                        {item.model}
                      </button>
                    </h2>

                    <p
                      className="mt-1.5 hidden truncate text-xs text-slate-400 sm:mt-2 sm:block"
                      title={item.specSummary}
                    >
                      {item.specSummary}
                    </p>

                    <div className="mt-auto pt-2.5 sm:pt-4">
                      <div className="border-t border-slate-700/60 pt-2.5 sm:pt-3.5">
                        <p className="truncate text-[10px] text-slate-400 sm:text-[11px]">
                          {storeCount > 0 && topStore
                            ? `${storeCount} mağaza · ${topStore}`
                            : 'Sıfır (kapalı kutu)'}
                        </p>
                        <span className="mt-0.5 block font-mono text-base font-extrabold tracking-tight tabular-nums text-[#FF7900] sm:text-2xl">
                          {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Gör'}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-col gap-1.5 sm:mt-3.5 sm:flex-row sm:items-center sm:gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectPart(item.category, item.id)}
                          className="flex min-h-[36px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-[#FF7900] px-2.5 py-1.5 text-[11px] font-bold text-slate-950 transition-colors hover:bg-[#FF8C24] whitespace-nowrap sm:min-h-[42px] sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-xs"
                        >
                          <span>İncele</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        </button>
                        {onAddToBuild && (
                          <button
                            type="button"
                            onClick={() => onAddToBuild(item.id)}
                            title="Sistem Sihirbazına Ekle"
                            aria-label={`${item.model} parçasını Sistem Sihirbazına ekle`}
                            className="inline-flex min-h-[34px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] whitespace-nowrap sm:min-h-[42px] sm:px-3 sm:py-2 sm:text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Topla</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {visibleItems.map((item) => {
              const pricing = pricingCatalog?.partsPricing[item.id];
              const activePrice = pricing?.newPriceTry ?? 0;
              const storeCount = pricing?.newStats?.listingCount ?? 0;
              const topStore = pricing?.newStats?.sources?.[0] ?? null;

              return (
                <article
                  key={item.id}
                  className="group flex flex-col gap-4 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-800/80 p-4 transition-colors duration-150 hover:border-[#FF7900]/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <button
                      type="button"
                      onClick={() => onInspectPart(item.category, item.id)}
                      className="aspect-[4/3] w-28 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-slate-950/70 sm:w-36"
                    >
                      <ProductImage
                        compact
                        imageUrl={
                          item.imageUrl ?? pricingCatalog?.productImages?.[item.id]
                        }
                        category={item.category}
                        model={item.model}
                        brand={item.brand}
                        className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {item.brand} · {CATEGORY_LABELS[item.category]}
                      </p>
                      <h2 className="mt-1 font-display text-base font-bold leading-snug text-slate-50">
                        <button
                          type="button"
                          onClick={() => onInspectPart(item.category, item.id)}
                          className="line-clamp-1 cursor-pointer text-left transition-colors hover:text-[#FF7900]"
                        >
                          {item.model}
                        </button>
                      </h2>
                      <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">
                        {item.specSummary}
                      </p>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {storeCount > 0 && topStore
                          ? `${storeCount} mağazada · En uygun ${topStore}`
                          : 'Sıfır (kapalı kutu) piyasa fiyatı'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-slate-700/60 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <span className="font-mono text-2xl font-extrabold tracking-tight tabular-nums text-[#FF7900]">
                      {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Gör'}
                    </span>
                    <div className="flex items-center gap-2">
                      {onAddToBuild && (
                        <button
                          type="button"
                          onClick={() => onAddToBuild(item.id)}
                          className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] whitespace-nowrap"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Sisteme Ekle</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onInspectPart(item.category, item.id)}
                        className="inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#FF7900] px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8C24] whitespace-nowrap"
                      >
                        <span>Ürünü İncele</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/80 py-16 text-center">
          <Cpu className="h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm text-slate-300">{emptyMessage}</p>
          {(activeFilterCount > 0 || search.trim() !== '') && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 cursor-pointer rounded-lg bg-[#FF7900] px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-[#FF8C24]"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {items.length > visibleLimit && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-slate-100 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
          >
            {loadMoreLabel} ({items.length - visibleLimit} ürün daha)
          </button>
        </div>
      )}
    </div>
  );
}
