import { ArrowRight, Cpu, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import { getMergedCatalogParts } from '../data/catalogAdapter';
import { PartCategoryKey, PricingCatalogResponse } from '../types/pc';
import { CatalogFilterSidebar, FilterGroup, FilterOption } from './CatalogFilterSidebar';
import { ProductImage } from './ProductImage';

interface CpusPageProps {
  pricingCatalog: PricingCatalogResponse | null;
  onBuildWithCpu: (cpuId: string) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onManageListings: (partId?: string) => void;
}

type SortOrder = 'name' | 'price-asc' | 'price-desc';

export function CpusPage({
  pricingCatalog,
  onInspectPart,
}: CpusPageProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSockets, setSelectedSockets] = useState<string[]>([]);
  const [selectedGenerations, setSelectedGenerations] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionMode, setConditionMode] = useState<'sifir' | 'ikinci-el'>('sifir');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(24);

  const allCpus = useMemo(
    () =>
      getMergedCatalogParts(pricingCatalog).cpus.filter(
        (c) => !c.isUnverifiedSpecSample
      ),
    [pricingCatalog]
  );

  const brandOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCpus) counts.set(c.brand, (counts.get(c.brand) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allCpus]);

  const socketOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCpus) counts.set(c.socket, (counts.get(c.socket) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allCpus]);

  const generationOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCpus) {
      if (c.generation) counts.set(c.generation, (counts.get(c.generation) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allCpus]);

  const toggleItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const normalizeText = (value: string) =>
    value
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const normalizedSearch = normalizeText(search);
  const parsedMin = minPrice.trim() !== '' ? Number(minPrice) : null;
  const parsedMax = maxPrice.trim() !== '' ? Number(maxPrice) : null;

  const cpus = useMemo(() => {
    const getPrice = (cpuId: string) => {
      const pricing = pricingCatalog?.partsPricing[cpuId];
      return conditionMode === 'ikinci-el'
        ? pricing?.usedPriceTry ?? 0
        : pricing?.newPriceTry ?? 0;
    };

    const filtered = allCpus.filter((c) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(c.brand)) return false;
      if (selectedSockets.length > 0 && !selectedSockets.includes(c.socket)) return false;
      if (
        selectedGenerations.length > 0 &&
        (!c.generation || !selectedGenerations.includes(c.generation))
      ) {
        return false;
      }
      if (normalizedSearch && !normalizeText(c.model).includes(normalizedSearch)) {
        return false;
      }

      const price = getPrice(c.id);
      if (parsedMin !== null && !Number.isNaN(parsedMin) && (price <= 0 || price < parsedMin)) {
        return false;
      }
      if (parsedMax !== null && !Number.isNaN(parsedMax) && (price <= 0 || price > parsedMax)) {
        return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'price-asc') return getPrice(a.id) - getPrice(b.id);
      if (sortOrder === 'price-desc') return getPrice(b.id) - getPrice(a.id);
      return a.model.localeCompare(b.model, 'tr');
    });
  }, [
    allCpus,
    conditionMode,
    normalizedSearch,
    parsedMax,
    parsedMin,
    pricingCatalog,
    selectedBrands,
    selectedGenerations,
    selectedSockets,
    sortOrder,
  ]);

  const activeFilterCount =
    selectedBrands.length +
    selectedSockets.length +
    selectedGenerations.length +
    (minPrice.trim() !== '' ? 1 : 0) +
    (maxPrice.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedSockets([]);
    setSelectedGenerations([]);
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
  };

  const featureGroups: FilterGroup[] = [
    {
      id: 'socket',
      title: 'Soket Tipi',
      options: socketOptions,
      selectedValues: selectedSockets,
      onToggle: (val) => toggleItem(setSelectedSockets, val),
    },
    {
      id: 'generation',
      title: 'İşlemci Nesli',
      options: generationOptions,
      selectedValues: selectedGenerations,
      onToggle: (val) => toggleItem(setSelectedGenerations, val),
    },
  ];

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-800 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
            İşlemci Kataloğu
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            İşlemciler
          </h1>
          <p className="mt-2 max-w-xl text-sm font-normal text-slate-400">
            AMD Ryzen ve Intel Core işlemcilerin güncel fiyatlarını karşılaştırın.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-700/70 bg-slate-800 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setConditionMode('sifir')}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              conditionMode === 'sifir'
                ? 'bg-[#FF7900] text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sıfır
          </button>
          <button
            type="button"
            onClick={() => setConditionMode('ikinci-el')}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              conditionMode === 'ikinci-el'
                ? 'bg-[#FF7900] text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            İkinci El
          </button>
        </div>
      </div>

      {/* Sidebar + Product Grid Layout */}
      <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <CatalogFilterSidebar
          brands={brandOptions}
          selectedBrands={selectedBrands}
          onToggleBrand={(brand) => toggleItem(setSelectedBrands, brand)}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onChangeMinPrice={setMinPrice}
          onChangeMaxPrice={setMaxPrice}
          featureGroups={featureGroups}
          activeFilterCount={activeFilterCount}
          resultCount={cpus.length}
          onResetFilters={handleResetFilters}
          mobileOpen={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        <div className="min-w-0 flex-1">
          {/* Top Search, Mobile Filter Trigger & Sort Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/75 p-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 text-xs font-bold text-slate-100 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#FF7900]" />
              <span>Filtreler</span>
              {activeFilterCount > 0 && (
                <span className="rounded bg-[#FF7900] px-1.5 py-0.5 font-mono text-[11px] text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İşlemci model ara: Ryzen 7 7800X3D, Core i7..."
              aria-label="İşlemci model ara"
              className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-50 placeholder:text-slate-400 outline-none focus:border-[#FF7900]"
            />

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label="Sıralama"
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-semibold text-slate-100"
            >
              <option value="name">Sıralama: İsim (A-Z)</option>
              <option value="price-asc">Fiyat: En Düşük</option>
              <option value="price-desc">Fiyat: En Yüksek</option>
            </select>

            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap sm:px-2">
              {cpus.length} ürün
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {cpus.slice(0, visibleLimit).map((cpu) => {
              const pricing = pricingCatalog?.partsPricing[cpu.id];
              const activePrice =
                conditionMode === 'ikinci-el'
                  ? pricing?.usedPriceTry ?? 0
                  : pricing?.newPriceTry ?? 0;

              return (
                <article
                  key={cpu.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/75 transition-all duration-200 hover:scale-[1.015] hover:border-[#FF7900]/70 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)]"
                >
                  <button
                    type="button"
                    onClick={() => onInspectPart('cpu', cpu.id)}
                    className="aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-900/80 text-left"
                  >
                    <ProductImage
                      imageUrl={pricingCatalog?.productImages?.[cpu.id]}
                      category="cpu"
                      model={cpu.model}
                      brand={cpu.brand}
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>

                  <div className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-7">
                    <h2 className="font-display text-lg font-bold leading-snug text-slate-50">
                      <button
                        type="button"
                        onClick={() => onInspectPart('cpu', cpu.id)}
                        className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#FF7900]"
                      >
                        {cpu.model}
                      </button>
                    </h2>

                    <div className="space-y-4">
                      <div>
                        {conditionMode === 'ikinci-el' &&
                          pricing?.newPriceTry &&
                          pricing.comparison.savingsPercent !== null && (
                            <span className="mb-0.5 block font-mono text-xs text-slate-400 line-through tabular-nums">
                              {formatTry(pricing.newPriceTry)}
                            </span>
                          )}
                        <span className="block font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#FF7900]">
                          {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Gör'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectPart('cpu', cpu.id)}
                        className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-[#FF8C24]"
                      >
                        <span>Ürünü İncele</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {cpus.length > visibleLimit && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 24)}
                className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-slate-100 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
              >
                Daha Fazla İşlemci Göster ({cpus.length - visibleLimit} ürün daha)
              </button>
            </div>
          )}

          {cpus.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/75 py-16 text-center">
              <Cpu className="h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm text-slate-400">
                Seçtiğiniz filtrelere uygun işlemci bulunamadı.
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 cursor-pointer rounded-xl bg-[#FF7900] px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-[#FF8C24]"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
