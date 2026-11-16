import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  defaultOpen?: boolean;
  searchable?: boolean;
}

export interface PricePreset {
  id: string;
  label: string;
  min: string;
  max: string;
}

const DEFAULT_PRICE_PRESETS: PricePreset[] = [
  { id: 'under-5k', label: '5.000 ₺ Altı', min: '', max: '5000' },
  { id: '5k-15k', label: '5.000 - 15.000 ₺', min: '5000', max: '15000' },
  { id: '15k-30k', label: '15.000 - 30.000 ₺', min: '15000', max: '30000' },
  { id: 'over-30k', label: '30.000 ₺ Üzeri', min: '30000', max: '' },
];

interface CatalogFilterSidebarProps {
  brands?: FilterOption[];
  selectedBrands?: string[];
  onToggleBrand?: (brand: string) => void;
  minPrice?: string;
  maxPrice?: string;
  onChangeMinPrice?: (value: string) => void;
  onChangeMaxPrice?: (value: string) => void;
  pricePresets?: PricePreset[];
  hidePriceFilter?: boolean;
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
    <label className="group flex cursor-pointer items-center justify-between gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-900/70">
      <span className="flex min-w-0 items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
            checked
              ? 'border-[#FF7900] bg-[#FF7900] text-slate-950'
              : 'border-slate-600 bg-slate-900 text-transparent group-hover:border-slate-400'
          }`}
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
        <span
          className={`truncate text-[13px] transition-colors ${
            checked
              ? 'font-semibold text-slate-50'
              : 'font-normal text-slate-300 group-hover:text-slate-100'
          }`}
        >
          {label}
        </span>
      </span>
      {typeof count === 'number' && (
        <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-slate-500">
          ({count})
        </span>
      )}
    </label>
  );
}

function AccordionSection({
  title,
  selectedCount,
  defaultOpen = true,
  children,
}: {
  title: string;
  selectedCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-700/60 py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 py-1 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-bold tracking-tight text-slate-100">
            {title}
          </span>
          {typeof selectedCount === 'number' && selectedCount > 0 && (
            <span className="font-mono text-[11px] font-bold tabular-nums text-[#FF7900]">
              ({selectedCount})
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

export function CatalogFilterSidebar({
  brands = [],
  selectedBrands = [],
  onToggleBrand,
  minPrice = '',
  maxPrice = '',
  onChangeMinPrice,
  onChangeMaxPrice,
  pricePresets = DEFAULT_PRICE_PRESETS,
  hidePriceFilter = false,
  featureGroups,
  activeFilterCount,
  resultCount,
  onResetFilters,
  mobileOpen,
  onCloseMobile,
}: CatalogFilterSidebarProps) {
  const [brandQuery, setBrandQuery] = useState('');
  const [groupQueries, setGroupQueries] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const normalizedBrandQuery = brandQuery.trim().toLocaleLowerCase('tr-TR');
  const filteredBrands = normalizedBrandQuery
    ? brands.filter((b) =>
        b.label.toLocaleLowerCase('tr-TR').includes(normalizedBrandQuery)
      )
    : brands;

  const handleSelectPricePreset = (preset: PricePreset) => {
    if (!onChangeMinPrice || !onChangeMaxPrice) return;
    const isAlreadyActive = minPrice === preset.min && maxPrice === preset.max;
    if (isAlreadyActive) {
      onChangeMinPrice('');
      onChangeMaxPrice('');
    } else {
      onChangeMinPrice(preset.min);
      onChangeMaxPrice(preset.max);
    }
  };

  const priceActiveCount =
    (minPrice.trim() !== '' ? 1 : 0) + (maxPrice.trim() !== '' ? 1 : 0) > 0 ? 1 : 0;

  const filterContent = (
    <div className="divide-y divide-slate-700/60">
      {/* Price Range */}
      {!hidePriceFilter && onChangeMinPrice && onChangeMaxPrice && (
        <AccordionSection title="Fiyat Aralığı" selectedCount={priceActiveCount} defaultOpen>
          <div className="grid grid-cols-2 gap-2">
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
                placeholder="En az ₺"
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium tabular-nums text-slate-50 placeholder:text-slate-500 focus:border-[#FF7900] focus:outline-none"
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
                placeholder="En çok ₺"
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-medium tabular-nums text-slate-50 placeholder:text-slate-500 focus:border-[#FF7900] focus:outline-none"
              />
            </div>
          </div>

          {pricePresets.length > 0 && (
            <div className="mt-2.5 space-y-1">
              {pricePresets.map((preset) => {
                const isSelected = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPricePreset(preset)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#FF7900]/15 font-semibold text-[#FF7900]'
                        : 'text-slate-300 hover:bg-slate-900/70 hover:text-slate-100'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </AccordionSection>
      )}

      {/* Brands Checkbox List with Search */}
      {brands.length > 0 && onToggleBrand && (
        <AccordionSection
          title="Marka"
          selectedCount={selectedBrands.length}
          defaultOpen
        >
          {brands.length > 6 && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Marka ara..."
                aria-label="Markalar içinde ara"
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#FF7900] focus:outline-none"
              />
            </div>
          )}
          <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            {filteredBrands.map((brand) => (
              <CheckboxItem
                key={brand.value}
                checked={selectedBrands.includes(brand.value)}
                label={brand.label}
                count={brand.count}
                onChange={() => onToggleBrand(brand.value)}
              />
            ))}
            {filteredBrands.length === 0 && (
              <p className="px-2 py-2 text-xs text-slate-500">Marka bulunamadı.</p>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Category-Specific Feature Accordion Groups */}
      {featureGroups
        .filter((group) => group.options.length > 0)
        .map((group, idx) => {
          const query = (groupQueries[group.id] ?? '').trim().toLocaleLowerCase('tr-TR');
          const visibleOptions = query
            ? group.options.filter((opt) =>
                opt.label.toLocaleLowerCase('tr-TR').includes(query)
              )
            : group.options;
          const showSearch = group.searchable ?? group.options.length > 8;

          return (
            <AccordionSection
              key={group.id}
              title={group.title}
              selectedCount={group.selectedValues.length}
              defaultOpen={group.defaultOpen ?? idx < 4}
            >
              {showSearch && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={groupQueries[group.id] ?? ''}
                    onChange={(e) =>
                      setGroupQueries((prev) => ({
                        ...prev,
                        [group.id]: e.target.value,
                      }))
                    }
                    placeholder={`${group.title} ara...`}
                    aria-label={`${group.title} içinde ara`}
                    className="h-8 w-full rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-[#FF7900] focus:outline-none"
                  />
                </div>
              )}
              <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
                {visibleOptions.map((opt) => (
                  <CheckboxItem
                    key={opt.value}
                    checked={group.selectedValues.includes(opt.value)}
                    label={opt.label}
                    count={opt.count}
                    onChange={() => group.onToggle(opt.value)}
                  />
                ))}
                {visibleOptions.length === 0 && (
                  <p className="px-2 py-2 text-xs text-slate-500">Seçenek bulunamadı.</p>
                )}
              </div>
            </AccordionSection>
          );
        })}

      {/* Reset Filters Button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onResetFilters}
          disabled={activeFilterCount === 0}
          className={`flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
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
      {/* Desktop Sticky Accordion Sidebar */}
      <aside
        aria-label="Ürün filtreleme paneli"
        className="hidden w-[272px] shrink-0 lg:block"
      >
        <div className="sticky top-24 rounded-xl border border-slate-700/70 bg-slate-800/80 p-5">
          <div className="mb-1 flex items-center justify-between border-b border-slate-700/70 pb-3.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#FF7900]" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate-50">
                Filtreler
              </h2>
              {activeFilterCount > 0 && (
                <span className="font-mono text-xs font-bold tabular-nums text-[#FF7900]">
                  ({activeFilterCount})
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
              <span className="font-display text-sm font-bold uppercase tracking-wide text-slate-50">
                Filtreler
              </span>
              {activeFilterCount > 0 && (
                <span className="font-mono text-xs font-bold tabular-nums text-[#FF7900]">
                  ({activeFilterCount})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Filtre panelini kapat"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">{filterContent}</div>

          <div className="border-t border-slate-800 bg-slate-900 p-4">
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-lg bg-[#FF7900] px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-[#FF8C24]"
            >
              Sonuçları Göster ({resultCount})
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
