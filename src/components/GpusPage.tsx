import { useEffect, useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import { getMergedCatalogParts } from '../data/catalogAdapter';
import type { GpuPart, PartCategoryKey, PricingCatalogResponse } from '../types/pc';
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

interface GpusPageProps {
  pricingCatalog: PricingCatalogResponse | null;
  onBuildWithGpu: (gpuId: string) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
}

const GPU_PRICE_PRESETS: PricePreset[] = [
  { id: 'gpu-under-15k', label: '15.000 ₺ Altı', min: '', max: '15000' },
  { id: 'gpu-15k-25k', label: '15.000 - 25.000 ₺', min: '15000', max: '25000' },
  { id: 'gpu-25k-45k', label: '25.000 - 45.000 ₺', min: '25000', max: '45000' },
  { id: 'gpu-over-45k', label: '45.000 ₺ Üzeri', min: '45000', max: '' },
];

const CHIP_MAKER_ORDER = ['NVIDIA', 'AMD', 'Intel'];
const SERIES_ORDER = [
  'RTX 50 Serisi',
  'RTX 40 Serisi',
  'RTX 30 Serisi',
  'RX 9000 Serisi',
  'RX 7000 Serisi',
  'RX 6000 Serisi',
  'Intel Arc',
  'Diğer',
];
const LENGTH_BAND_ORDER = [
  'Kompakt (≤ 260 mm)',
  'Orta (261–300 mm)',
  'Büyük (301+ mm)',
];

function inferChipMaker(model: string): string {
  const up = model.toUpperCase();
  if (up.includes('GEFORCE') || up.includes('RTX') || up.includes('GTX')) return 'NVIDIA';
  if (up.includes('RADEON') || up.includes('RX ')) return 'AMD';
  if (up.includes('ARC')) return 'Intel';
  return 'Diğer';
}

function inferGpuSeries(model: string): string {
  const up = model.toUpperCase();
  if (up.includes('RTX 50')) return 'RTX 50 Serisi';
  if (up.includes('RTX 40')) return 'RTX 40 Serisi';
  if (up.includes('RTX 30')) return 'RTX 30 Serisi';
  if (up.includes('RX 90')) return 'RX 9000 Serisi';
  if (up.includes('RX 7')) return 'RX 7000 Serisi';
  if (up.includes('RX 6')) return 'RX 6000 Serisi';
  if (up.includes('ARC')) return 'Intel Arc';
  return 'Diğer';
}

function inferLengthBand(lengthMm: number | null): string | null {
  if (lengthMm === null) return null;
  if (lengthMm <= 260) return 'Kompakt (≤ 260 mm)';
  if (lengthMm <= 300) return 'Orta (261–300 mm)';
  return 'Büyük (301+ mm)';
}

export function GpusPage({
  pricingCatalog,
  onBuildWithGpu,
  onInspectPart,
}: GpusPageProps) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedChipMakers, setSelectedChipMakers] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [selectedVrams, setSelectedVrams] = useState<string[]>([]);
  const [selectedLengthBands, setSelectedLengthBands] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<CatalogSortOrder>('name');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(24);

  const allGpus = useMemo<GpuPart[]>(
    () =>
      getMergedCatalogParts(pricingCatalog).gpus.filter(
        (g) => !g.isIntegrated && !g.isUnverifiedSpecSample
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
    for (const g of allGpus) counts.set(g.brand, (counts.get(g.brand) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allGpus]);

  const chipMakerOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const g of allGpus) {
      const maker = inferChipMaker(g.model);
      counts.set(maker, (counts.get(maker) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => {
        const ia = CHIP_MAKER_ORDER.indexOf(a);
        const ib = CHIP_MAKER_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allGpus]);

  const seriesOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const g of allGpus) {
      const s = inferGpuSeries(g.model);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => SERIES_ORDER.indexOf(a) - SERIES_ORDER.indexOf(b))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allGpus]);

  const vramOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<number, number>();
    for (const g of allGpus) {
      if (g.vramGb !== null) counts.set(g.vramGb, (counts.get(g.vramGb) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a - b)
      .map(([vram, count]) => ({ value: String(vram), label: `${vram} GB VRAM`, count }));
  }, [allGpus]);

  const lengthBandOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const g of allGpus) {
      const band = inferLengthBand(g.lengthMm);
      if (band) counts.set(band, (counts.get(band) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => LENGTH_BAND_ORDER.indexOf(a) - LENGTH_BAND_ORDER.indexOf(b))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allGpus]);

  const storeOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const g of allGpus) {
      const stores = storesByPartId.get(g.id);
      if (!stores) continue;
      for (const store of stores) {
        counts.set(store, (counts.get(store) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [allGpus, storesByPartId]);

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
    selectedChipMakers,
    selectedSeries,
    selectedVrams,
    selectedLengthBands,
    selectedStores,
    minPrice,
    maxPrice,
    search,
    sortOrder,
  ]);

  const gpus = useMemo(() => {
    const getPrice = (gpuId: string) => pricingCatalog?.partsPricing[gpuId]?.newPriceTry ?? 0;

    const filtered = allGpus.filter((g) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(g.brand)) return false;
      if (
        selectedChipMakers.length > 0 &&
        !selectedChipMakers.includes(inferChipMaker(g.model))
      ) {
        return false;
      }
      if (selectedSeries.length > 0 && !selectedSeries.includes(inferGpuSeries(g.model))) {
        return false;
      }
      if (
        selectedVrams.length > 0 &&
        (g.vramGb === null || !selectedVrams.includes(String(g.vramGb)))
      ) {
        return false;
      }
      if (selectedLengthBands.length > 0) {
        const band = inferLengthBand(g.lengthMm);
        if (!band || !selectedLengthBands.includes(band)) return false;
      }
      if (selectedStores.length > 0) {
        const partStores = storesByPartId.get(g.id);
        if (!partStores || !selectedStores.some((s) => partStores.has(s))) return false;
      }
      if (
        normalizedSearch &&
        !normalizeText(`${g.brand} ${g.model} ${g.shortTitle} ${g.specSummary}`).includes(
          normalizedSearch
        )
      ) {
        return false;
      }

      const price = getPrice(g.id);
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
    allGpus,
    normalizedSearch,
    parsedMax,
    parsedMin,
    pricingCatalog,
    selectedBrands,
    selectedChipMakers,
    selectedLengthBands,
    selectedSeries,
    selectedStores,
    selectedVrams,
    sortOrder,
    storesByPartId,
  ]);

  const activeFilterCount =
    selectedBrands.length +
    selectedChipMakers.length +
    selectedSeries.length +
    selectedVrams.length +
    selectedLengthBands.length +
    selectedStores.length +
    (minPrice.trim() !== '' ? 1 : 0) +
    (maxPrice.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedChipMakers([]);
    setSelectedSeries([]);
    setSelectedVrams([]);
    setSelectedLengthBands([]);
    setSelectedStores([]);
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
  };

  const featureGroups: FilterGroup[] = [
    {
      id: 'chipMaker',
      title: 'Çip Üreticisi',
      options: chipMakerOptions,
      selectedValues: selectedChipMakers,
      onToggle: (val) => toggleItem(setSelectedChipMakers, val),
      defaultOpen: true,
    },
    {
      id: 'series',
      title: 'Grafik İşlemci Serisi',
      options: seriesOptions,
      selectedValues: selectedSeries,
      onToggle: (val) => toggleItem(setSelectedSeries, val),
      defaultOpen: true,
    },
    {
      id: 'vram',
      title: 'VRAM Kapasitesi',
      options: vramOptions,
      selectedValues: selectedVrams,
      onToggle: (val) => toggleItem(setSelectedVrams, val),
      defaultOpen: true,
    },
    {
      id: 'lengthBand',
      title: 'Kart Uzunluğu',
      options: lengthBandOptions,
      selectedValues: selectedLengthBands,
      onToggle: (val) => toggleItem(setSelectedLengthBands, val),
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
    for (const maker of selectedChipMakers) {
      chips.push({
        key: `maker-${maker}`,
        label: `Çip: ${maker}`,
        onRemove: () => toggleItem(setSelectedChipMakers, maker),
      });
    }
    for (const series of selectedSeries) {
      chips.push({
        key: `series-${series}`,
        label: series,
        onRemove: () => toggleItem(setSelectedSeries, series),
      });
    }
    for (const vram of selectedVrams) {
      chips.push({
        key: `vram-${vram}`,
        label: `${vram} GB VRAM`,
        onRemove: () => toggleItem(setSelectedVrams, vram),
      });
    }
    for (const band of selectedLengthBands) {
      chips.push({
        key: `len-${band}`,
        label: band,
        onRemove: () => toggleItem(setSelectedLengthBands, band),
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
    selectedChipMakers,
    selectedLengthBands,
    selectedSeries,
    selectedStores,
    selectedVrams,
  ]);

  const displayItems = useMemo<CatalogDisplayProduct[]>(
    () =>
      gpus.map((g) => ({
        id: g.id,
        category: 'gpu',
        brand: g.brand,
        model: g.model,
        specSummary: g.specSummary,
      })),
    [gpus]
  );

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-800 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
            Ekran Kartı Kataloğu
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Ekran Kartları
          </h1>
          <p className="mt-2 max-w-xl text-sm font-normal text-slate-400">
            NVIDIA GeForce, AMD Radeon ve Intel Arc ekran kartlarının güncel mağaza fiyatlarını
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
          pricePresets={GPU_PRICE_PRESETS}
          featureGroups={featureGroups}
          activeFilterCount={activeFilterCount}
          resultCount={gpus.length}
          onResetFilters={handleResetFilters}
          mobileOpen={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        <CatalogProductSection
          items={displayItems}
          totalCount={allGpus.length}
          pricingCatalog={pricingCatalog}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Model ara: RTX 5070, RX 9070 XT, Arc B580..."
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          activeFilterCount={activeFilterCount}
          activeFilterChips={activeFilterChips}
          onResetFilters={handleResetFilters}
          onOpenMobileFilters={() => setMobileFilterOpen(true)}
          onInspectPart={onInspectPart}
          onAddToBuild={onBuildWithGpu}
          visibleLimit={visibleLimit}
          onLoadMore={() => setVisibleLimit((prev) => prev + 24)}
          loadMoreLabel="Daha Fazla Ekran Kartı Göster"
          emptyMessage="Seçtiğiniz filtrelere uygun ekran kartı bulunamadı."
        />
      </div>
    </div>
  );
}
