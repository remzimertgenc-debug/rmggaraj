import { useEffect, useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import { getMergedCatalogParts } from '../data/catalogAdapter';
import type { CpuPart, PartCategoryKey, PricingCatalogResponse } from '../types/pc';
import {
  CatalogFilterSidebar,
  type FilterGroup,
  type FilterOption,
  type PricePreset,
} from './CatalogFilterSidebar';
import {
  CatalogProductSection,
  type ActiveFilterChip,
  type CatalogDisplayProduct,
  type CatalogSortOrder,
} from './CatalogProductSection';

interface CpusPageProps {
  pricingCatalog: PricingCatalogResponse | null;
  onBuildWithCpu: (cpuId: string) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
}

const CPU_PRICE_PRESETS: PricePreset[] = [
  { id: 'cpu-under-5k', label: '5.000 ₺ Altı', min: '', max: '5000' },
  { id: 'cpu-5k-10k', label: '5.000 - 10.000 ₺', min: '5000', max: '10000' },
  { id: 'cpu-10k-18k', label: '10.000 - 18.000 ₺', min: '10000', max: '18000' },
  { id: 'cpu-over-18k', label: '18.000 ₺ Üzeri', min: '18000', max: '' },
];

const CORE_BAND_ORDER = [
  '4-6 Çekirdek',
  '8 Çekirdek',
  '10-16 Çekirdek',
  '20+ Çekirdek',
];

function getCpuCoreBand(cores: number): string {
  if (cores <= 6) return '4-6 Çekirdek';
  if (cores === 8) return '8 Çekirdek';
  if (cores <= 16) return '10-16 Çekirdek';
  return '20+ Çekirdek';
}

export function CpusPage({
  pricingCatalog,
  onBuildWithCpu,
  onInspectPart,
}: CpusPageProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSockets, setSelectedSockets] = useState<string[]>([]);
  const [selectedGenerations, setSelectedGenerations] = useState<string[]>([]);
  const [selectedCoreBands, setSelectedCoreBands] = useState<string[]>([]);
  const [selectedRamTypes, setSelectedRamTypes] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<CatalogSortOrder>('name');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(24);

  const allCpus = useMemo<CpuPart[]>(
    () =>
      getMergedCatalogParts(pricingCatalog).cpus.filter(
        (c) => !c.isUnverifiedSpecSample
      ),
    [pricingCatalog]
  );

  const storesByPartId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const listing of pricingCatalog?.listings ?? []) {
      if (listing.isSuspiciousOutlier) continue;
      let set = map.get(listing.partId);
      if (!set) {
        set = new Set<string>();
        map.set(listing.partId, set);
      }
      set.add(listing.platform);
    }
    return map;
  }, [pricingCatalog?.listings]);

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

  const coreBandOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCpus) {
      const band = getCpuCoreBand(c.cores);
      counts.set(band, (counts.get(band) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => CORE_BAND_ORDER.indexOf(a) - CORE_BAND_ORDER.indexOf(b))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allCpus]);

  const ramTypeOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCpus) {
      for (const ram of c.supportedRam) {
        counts.set(ram, (counts.get(ram) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allCpus]);

  const storeOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const c of allCpus) {
      const stores = storesByPartId.get(c.id);
      if (!stores) continue;
      for (const store of stores) {
        counts.set(store, (counts.get(store) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allCpus, storesByPartId]);

  const toggleItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
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

  useEffect(() => {
    setVisibleLimit(24);
  }, [
    selectedBrands,
    selectedSockets,
    selectedGenerations,
    selectedCoreBands,
    selectedRamTypes,
    selectedStores,
    minPrice,
    maxPrice,
    search,
    sortOrder,
  ]);

  const cpus = useMemo(() => {
    const getPrice = (cpuId: string) => pricingCatalog?.partsPricing[cpuId]?.newPriceTry ?? 0;

    const filtered = allCpus.filter((c) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(c.brand)) return false;
      if (selectedSockets.length > 0 && !selectedSockets.includes(c.socket)) return false;
      if (
        selectedGenerations.length > 0 &&
        (!c.generation || !selectedGenerations.includes(c.generation))
      ) {
        return false;
      }
      if (
        selectedCoreBands.length > 0 &&
        !selectedCoreBands.includes(getCpuCoreBand(c.cores))
      ) {
        return false;
      }
      if (
        selectedRamTypes.length > 0 &&
        !selectedRamTypes.some((ram) => c.supportedRam.includes(ram as 'DDR4' | 'DDR5'))
      ) {
        return false;
      }
      if (selectedStores.length > 0) {
        const partStores = storesByPartId.get(c.id);
        if (!partStores || !selectedStores.some((s) => partStores.has(s))) return false;
      }
      if (
        normalizedSearch &&
        !normalizeText(
          `${c.brand} ${c.model} ${c.socket} ${c.generation ?? ''} ${c.specSummary}`
        ).includes(normalizedSearch)
      ) {
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
    normalizedSearch,
    parsedMax,
    parsedMin,
    pricingCatalog,
    selectedBrands,
    selectedCoreBands,
    selectedGenerations,
    selectedRamTypes,
    selectedSockets,
    selectedStores,
    sortOrder,
    storesByPartId,
  ]);

  const activeFilterCount =
    selectedBrands.length +
    selectedSockets.length +
    selectedGenerations.length +
    selectedCoreBands.length +
    selectedRamTypes.length +
    selectedStores.length +
    (minPrice.trim() !== '' ? 1 : 0) +
    (maxPrice.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedSockets([]);
    setSelectedGenerations([]);
    setSelectedCoreBands([]);
    setSelectedRamTypes([]);
    setSelectedStores([]);
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
      defaultOpen: true,
    },
    {
      id: 'generation',
      title: 'İşlemci Nesli',
      options: generationOptions,
      selectedValues: selectedGenerations,
      onToggle: (val) => toggleItem(setSelectedGenerations, val),
      defaultOpen: true,
    },
    {
      id: 'coreBand',
      title: 'Çekirdek Sayısı',
      options: coreBandOptions,
      selectedValues: selectedCoreBands,
      onToggle: (val) => toggleItem(setSelectedCoreBands, val),
      defaultOpen: true,
    },
    {
      id: 'ramType',
      title: 'Bellek Desteği',
      options: ramTypeOptions,
      selectedValues: selectedRamTypes,
      onToggle: (val) => toggleItem(setSelectedRamTypes, val),
      defaultOpen: false,
    },
    {
      id: 'store',
      title: 'Satıcı Mağaza',
      options: storeOptions,
      selectedValues: selectedStores,
      onToggle: (val) => toggleItem(setSelectedStores, val),
      defaultOpen: false,
      searchable: false,
    },
  ];

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (minPrice.trim() !== '' || maxPrice.trim() !== '') {
      const minLabel = minPrice.trim() ? formatTry(Number(minPrice)) : '0 ₺';
      const maxLabel = maxPrice.trim() ? formatTry(Number(maxPrice)) : 'Sınırsız';
      chips.push({
        key: 'price-range',
        label: `Fiyat: ${minLabel} - ${maxLabel}`,
        onRemove: () => {
          setMinPrice('');
          setMaxPrice('');
        },
      });
    }

    for (const brand of selectedBrands) {
      chips.push({
        key: `brand-${brand}`,
        label: `Marka: ${brand}`,
        onRemove: () => toggleItem(setSelectedBrands, brand),
      });
    }
    for (const socket of selectedSockets) {
      chips.push({
        key: `socket-${socket}`,
        label: `Soket: ${socket}`,
        onRemove: () => toggleItem(setSelectedSockets, socket),
      });
    }
    for (const gen of selectedGenerations) {
      chips.push({
        key: `gen-${gen}`,
        label: gen,
        onRemove: () => toggleItem(setSelectedGenerations, gen),
      });
    }
    for (const band of selectedCoreBands) {
      chips.push({
        key: `core-${band}`,
        label: band,
        onRemove: () => toggleItem(setSelectedCoreBands, band),
      });
    }
    for (const ram of selectedRamTypes) {
      chips.push({
        key: `ram-${ram}`,
        label: `RAM: ${ram}`,
        onRemove: () => toggleItem(setSelectedRamTypes, ram),
      });
    }
    for (const store of selectedStores) {
      chips.push({
        key: `store-${store}`,
        label: `Mağaza: ${store}`,
        onRemove: () => toggleItem(setSelectedStores, store),
      });
    }

    return chips;
  }, [
    maxPrice,
    minPrice,
    selectedBrands,
    selectedCoreBands,
    selectedGenerations,
    selectedRamTypes,
    selectedSockets,
    selectedStores,
  ]);

  const displayItems = useMemo<CatalogDisplayProduct[]>(
    () =>
      cpus.map((c) => ({
        id: c.id,
        category: 'cpu',
        brand: c.brand,
        model: c.model,
        specSummary: c.specSummary,
      })),
    [cpus]
  );

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
            AMD Ryzen, Intel Core ve Core Ultra işlemcilerin güncel mağaza fiyatlarını
            karşılaştırın.
          </p>
        </div>
      </div>

      {/* İtopya-Style Left Accordion Sidebar + Right Product Grid/List */}
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <CatalogFilterSidebar
          brands={brandOptions}
          selectedBrands={selectedBrands}
          onToggleBrand={(brand) => toggleItem(setSelectedBrands, brand)}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onChangeMinPrice={setMinPrice}
          onChangeMaxPrice={setMaxPrice}
          pricePresets={CPU_PRICE_PRESETS}
          featureGroups={featureGroups}
          activeFilterCount={activeFilterCount}
          resultCount={cpus.length}
          onResetFilters={handleResetFilters}
          mobileOpen={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        <CatalogProductSection
          items={displayItems}
          totalCount={allCpus.length}
          pricingCatalog={pricingCatalog}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="İşlemci model ara: Ryzen 7 9800X3D, Core Ultra 7..."
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          activeFilterCount={activeFilterCount}
          activeFilterChips={activeFilterChips}
          onResetFilters={handleResetFilters}
          onOpenMobileFilters={() => setMobileFilterOpen(true)}
          onInspectPart={onInspectPart}
          onAddToBuild={onBuildWithCpu}
          visibleLimit={visibleLimit}
          onLoadMore={() => setVisibleLimit((prev) => prev + 24)}
          loadMoreLabel="Daha Fazla İşlemci Göster"
          emptyMessage="Seçtiğiniz filtrelere uygun işlemci bulunamadı."
        />
      </div>
    </div>
  );
}
