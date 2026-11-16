import { Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useEffect } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

interface CatalogFilterSidebarProps {
  brands: FilterOption[];
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  minPrice: string;
  maxPrice: string;
  onChangeMinPrice: (value: string) => void;
  onChangeMaxPrice: (value: string) => void;
  featureGroups: FilterGroup[];
  activeFilterCount: number;
  resultCount: number;
  onResetFilters: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function CheckboxItem({
  checked,
  label,
  count,
  onChange,
}: {
  checked: boolean;
  label: string;
  count?: number;
  onChange: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-900/70">
      <span className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            checked
              ? 'border-[#FF7900] bg-[#FF7900] text-slate-950'
              : 'border-slate-600 bg-slate-900 text-transparent group-hover:border-slate-400'
          }`}
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
        <span
          className={`truncate text-sm transition-colors ${
            checked ? 'font-semibold text-slate-50' : 'font-normal text-slate-300 group-hover:text-slate-100'
          }`}
        >
          {label}
        </span>
      </span>
      {typeof count === 'number' && (
        <span className="shrink-0 font-mono text-[11px] font-medium text-slate-500">
          {count}
        </span>
      )}
    </label>
  );
}

export function CatalogFilterSidebar({
  brands,
  selectedBrands,
  onToggleBrand,
  minPrice,
  maxPrice,
  onChangeMinPrice,
  onChangeMaxPrice,
  featureGroups,
  activeFilterCount,
  resultCount,
  onResetFilters,
  mobileOpen,
  onCloseMobile,
}: CatalogFilterSidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const filterContent = (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Fiyat Aralığı (₺)
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="sr-only" htmlFor="filter-min-price">
              Minimum Fiyat
            </label>
            <input
              id="filter-min-price"
              type="number"
              min={0}
              step={500}
              value={minPrice}
              onChange={(e) => onChangeMinPrice(e.target.value)}
              placeholder="Min ₺"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-50 placeholder:text-slate-500 focus:border-[#FF7900] focus:outline-none"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="filter-max-price">
              Maksimum Fiyat
            </label>
            <input
              id="filter-max-price"
              type="number"
              min={0}
              step={500}
              value={maxPrice}
              onChange={(e) => onChangeMaxPrice(e.target.value)}
              placeholder="Max ₺"
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-50 placeholder:text-slate-500 focus:border-[#FF7900] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Brands Checkbox List */}
      {brands.length > 0 && (
        <div className="border-t border-slate-700/60 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Marka
          </h3>
          <div className="mt-2.5 max-h-56 space-y-0.5 overflow-y-auto pr-1">
            {brands.map((brand) => (
              <CheckboxItem
                key={brand.value}
                checked={selectedBrands.includes(brand.value)}
                label={brand.label}
                count={brand.count}
                onChange={() => onToggleBrand(brand.value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category-Specific Feature Groups */}
      {featureGroups
        .filter((group) => group.options.length > 0)
        .map((group) => (
          <div key={group.id} className="border-t border-slate-700/60 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {group.title}
            </h3>
            <div className="mt-2.5 max-h-56 space-y-0.5 overflow-y-auto pr-1">
              {group.options.map((opt) => (
                <CheckboxItem
                  key={opt.value}
                  checked={group.selectedValues.includes(opt.value)}
                  label={opt.label}
                  count={opt.count}
                  onChange={() => group.onToggle(opt.value)}
                />
              ))}
            </div>
          </div>
        ))}

      {/* Reset Filters Button */}
      <div className="border-t border-slate-700/60 pt-5">
        <button
          type="button"
          onClick={onResetFilters}
          disabled={activeFilterCount === 0}
          className={`flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
            activeFilterCount > 0
              ? 'cursor-pointer border-slate-600 bg-slate-900 text-slate-100 hover:border-[#FF7900] hover:text-[#FF7900]'
              : 'cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500'
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Filtreleri Temizle</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        aria-label="Ürün filtreleme paneli"
        className="hidden w-72 shrink-0 lg:block"
      >
        <div className="sticky top-24 rounded-2xl border border-slate-700/60 bg-slate-800/75 p-6">
          <div className="mb-5 flex items-center justify-between border-b border-slate-700/60 pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#FF7900]" />
              <h2 className="font-display text-base font-bold text-slate-50">
                Filtreler
              </h2>
              {activeFilterCount > 0 && (
                <span className="rounded-md bg-[#FF7900] px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="cursor-pointer text-xs font-semibold text-[#FF7900] hover:underline"
              >
                Temizle
              </button>
            )}
          </div>

          {filterContent}
        </div>
      </aside>

      {/* Mobile Slide-Over Filter Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 lg:hidden ${
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <aside
          aria-label="Mobil ürün filtreleri"
          className={`fixed inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#FF7900]" />
              <span className="font-display text-base font-bold text-slate-50">
                Filtreler
              </span>
              {activeFilterCount > 0 && (
                <span className="rounded-md bg-[#FF7900] px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Filtre panelini kapat"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">{filterContent}</div>

          <div className="border-t border-slate-800 bg-slate-900 p-4">
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-xl bg-[#FF7900] px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-[#FF8C24]"
            >
              Sonuçları Göster ({resultCount})
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
