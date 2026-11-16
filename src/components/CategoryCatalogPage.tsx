import { useEffect, useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import { getMergedCatalogParts } from '../data/catalogAdapter';
import { CATEGORY_LABELS } from '../data/partMedia';
import type { PartCategoryKey, PricingCatalogResponse } from '../types/pc';
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

interface CategoryCatalogPageProps {
  category: PartCategoryKey;
  pricingCatalog: PricingCatalogResponse | null;
  onSelectCategory: (category: PartCategoryKey) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onBuildWithPart: (category: PartCategoryKey, partId: string) => void;
}

interface CatalogDisplayItem extends CatalogDisplayProduct {
  features: Record<string, string[]>;
}

const SUB_CATALOG_TABS: { id: PartCategoryKey; label: string }[] = [
  { id: 'motherboard', label: 'Anakartlar' },
  { id: 'ram', label: "RAM'ler" },
  { id: 'ssd', label: "SSD'ler" },
  { id: 'psu', label: 'Güç Kaynakları' },
  { id: 'pcCase', label: 'Kasalar' },
  { id: 'cooler', label: 'Soğutucular' },
];

const PRICE_PRESETS_BY_CATEGORY: Partial<Record<PartCategoryKey, PricePreset[]>> = {
  motherboard: [
    { id: 'mb-under-4k', label: '4.000 ₺ Altı', min: '', max: '4000' },
    { id: 'mb-4k-8k', label: '4.000 - 8.000 ₺', min: '4000', max: '8000' },
    { id: 'mb-8k-14k', label: '8.000 - 14.000 ₺', min: '8000', max: '14000' },
    { id: 'mb-over-14k', label: '14.000 ₺ Üzeri', min: '14000', max: '' },
  ],
  ram: [
    { id: 'ram-under-2k', label: '2.000 ₺ Altı', min: '', max: '2000' },
    { id: 'ram-2k-4k', label: '2.000 - 4.000 ₺', min: '2000', max: '4000' },
    { id: 'ram-4k-7k', label: '4.000 - 7.000 ₺', min: '4000', max: '7000' },
    { id: 'ram-over-7k', label: '7.000 ₺ Üzeri', min: '7000', max: '' },
  ],
  ssd: [
    { id: 'ssd-under-2500', label: '2.500 ₺ Altı', min: '', max: '2500' },
    { id: 'ssd-2500-5k', label: '2.500 - 5.000 ₺', min: '2500', max: '5000' },
    { id: 'ssd-5k-10k', label: '5.000 - 10.000 ₺', min: '5000', max: '10000' },
    { id: 'ssd-over-10k', label: '10.000 ₺ Üzeri', min: '10000', max: '' },
  ],
  psu: [
    { id: 'psu-under-3k', label: '3.000 ₺ Altı', min: '', max: '3000' },
    { id: 'psu-3k-6k', label: '3.000 - 6.000 ₺', min: '3000', max: '6000' },
    { id: 'psu-6k-10k', label: '6.000 - 10.000 ₺', min: '6000', max: '10000' },
    { id: 'psu-over-10k', label: '10.000 ₺ Üzeri', min: '10000', max: '' },
  ],
  pcCase: [
    { id: 'case-under-3k', label: '3.000 ₺ Altı', min: '', max: '3000' },
    { id: 'case-3k-6k', label: '3.000 - 6.000 ₺', min: '3000', max: '6000' },
    { id: 'case-6k-10k', label: '6.000 - 10.000 ₺', min: '6000', max: '10000' },
    { id: 'case-over-10k', label: '10.000 ₺ Üzeri', min: '10000', max: '' },
  ],
  cooler: [
    { id: 'cool-under-2k', label: '2.000 ₺ Altı', min: '', max: '2000' },
    { id: 'cool-2k-4500', label: '2.000 - 4.500 ₺', min: '2000', max: '4500' },
    { id: 'cool-4500-8k', label: '4.500 - 8.000 ₺', min: '4500', max: '8000' },
    { id: 'cool-over-8k', label: '8.000 ₺ Üzeri', min: '8000', max: '' },
  ],
};

const KNOWN_CHIPSETS = [
  'X870E',
  'X870',
  'B850',
  'B650E',
  'B650',
  'B840',
  'A620',
  'Z890',
  'B860',
  'H810',
  'Z790',
  'B760',
  'H610',
  'X570',
  'B550',
  'B450',
  'A520',
];

function extractChipset(model: string, specSummary: string): string[] {
  const hay = `${model} ${specSummary}`.toUpperCase();
  for (const chipset of KNOWN_CHIPSETS) {
    if (new RegExp(`\\b${chipset}\\b`).test(hay)) {
      return [chipset];
    }
  }
  return [];
}

function getGpuSpaceBand(maxGpuLengthMm: number | null): string[] {
  if (maxGpuLengthMm === null) return [];
  if (maxGpuLengthMm < 340) return ['340 mm Altı'];
  if (maxGpuLengthMm < 400) return ['340–399 mm'];
  return ['400+ mm'];
}

function getCoolerRadiatorLabel(coolerType: string, radiatorMm: number | null): string[] {
  if (radiatorMm) return [`${radiatorMm} mm Radyatör`];
  if (coolerType === 'Hava Soğutma') return ['Hava Soğutma'];
  return [];
}

function extractDynamicFeatures(
  category: PartCategoryKey,
  name: string,
  specSummary: string
): Record<string, string[]> {
  const hay = `${name} ${specSummary}`.toUpperCase();
  if (category === 'motherboard') {
    const sockets = ['AM5', 'AM4', 'LGA1700', 'LGA1851'].filter((s) => hay.includes(s));
    const rams = ['DDR5', 'DDR4'].filter((r) => hay.includes(r));
    const chipset = extractChipset(name, specSummary);
    return { socket: sockets, chipset, ramType: rams };
  }
  if (category === 'ram') {
    const rams = ['DDR5', 'DDR4'].filter((r) => hay.includes(r));
    const capMatch = hay.match(/\b(16|32|48|64|96|128)\s*GB\b/);
    const mhzMatch = hay.match(/\b(3200|3600|4800|5200|5600|6000|6400|6800|7200|7600|8000)\s*MHZ\b/);
    return {
      ramType: rams,
      capacity: capMatch ? [`${capMatch[1]} GB`] : [],
      speed: mhzMatch ? [`${mhzMatch[1]} MHz`] : [],
    };
  }
  if (category === 'ssd') {
    const tbMatch = hay.match(/\b([1248])\s*TB\b/);
    const gbMatch = hay.match(/\b(500|512|256)\s*GB\b/);
    const cap = tbMatch ? [`${tbMatch[1]} TB`] : gbMatch ? [`${gbMatch[1]} GB`] : [];
    const iface = ['PCIE 5.0', 'PCIE 4.0', 'PCIE 3.0']
      .filter((i) => hay.includes(i))
      .map((i) => i.replace('PCIE', 'PCIe'));
    return { capacity: cap, interfaceType: iface };
  }
  if (category === 'psu') {
    const wattMatch = hay.match(/\b(500|550|600|650|700|750|800|850|1000|1200)\s*W\b/);
    const atxMatch = hay.match(/\bATX\s*(3\.1|3\.0|2\.4)\b/);
    return {
      wattage: wattMatch ? [`${wattMatch[1]}W`] : [],
      atxStandard: atxMatch ? [`ATX ${atxMatch[1]}`] : [],
    };
  }
  if (category === 'cooler') {
    const types: string[] = [];
    const rads: string[] = [];
    if (hay.includes('360')) rads.push('360 mm Radyatör');
    else if (hay.includes('280')) rads.push('280 mm Radyatör');
    else if (hay.includes('240')) rads.push('240 mm Radyatör');

    if (
      hay.includes('SIVI') ||
      hay.includes('LIQUID') ||
      hay.includes('360') ||
      hay.includes('240')
    ) {
      types.push('Sıvı Soğutma');
    } else if (hay.includes('HAVA') || hay.includes('KULE') || hay.includes('AIR')) {
      types.push('Hava Soğutma');
      rads.push('Hava Soğutma');
    }
    return { coolerType: types, radiatorSize: rads };
  }
  return {};
}

const GROUP_LABEL_MAP: Record<string, string> = {
  socket: 'Soket',
  chipset: 'Yonga Seti',
  ramType: 'Bellek',
  formFactor: 'Form',
  capacity: 'Kapasite',
  speed: 'Hız',
  interfaceType: 'Arabirim',
  wattage: 'Güç',
  efficiency: 'Verimlilik',
  atxStandard: 'Standart',
  airflow: 'Tasarım',
  gpuSpace: 'GPU Alanı',
  coolerType: 'Tip',
  radiatorSize: 'Boyut',
  store: 'Mağaza',
};

export function CategoryCatalogPage({
  category,
  pricingCatalog,
  onSelectCategory,
  onInspectPart,
  onBuildWithPart,
}: CategoryCatalogPageProps) {
  const [search, setSearch] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, string[]>>({});
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOrder, setSortOrder] = useState<CatalogSortOrder>('name');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(24);

  useEffect(() => {
    setSelectedBrands([]);
    setSelectedFeatures({});
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
    setVisibleLimit(24);
  }, [category]);

  useEffect(() => {
    setVisibleLimit(24);
  }, [selectedBrands, selectedFeatures, minPrice, maxPrice, search, sortOrder]);

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

  const rawItems = useMemo<CatalogDisplayItem[]>(() => {
    const merged = getMergedCatalogParts(pricingCatalog);
    let catalogList: CatalogDisplayItem[] = [];

    const withStores = (partId: string, baseFeatures: Record<string, string[]>) => {
      const partStores = storesByPartId.get(partId);
      return {
        ...baseFeatures,
        store: partStores ? Array.from(partStores) : [],
      };
    };

    if (category === 'motherboard') {
      catalogList = merged.motherboards
        .filter((p) => !p.isUnverifiedSpecSample)
        .map((p) => ({
          id: p.id,
          category: 'motherboard',
          brand: p.brand,
          model: p.model,
          specSummary: p.specSummary,
          imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
          features: withStores(p.id, {
            socket: [p.socket],
            chipset: extractChipset(p.model, p.specSummary),
            ramType: p.supportedRam ? [p.supportedRam] : [],
            formFactor: [p.formFactor],
          }),
        }));
    } else if (category === 'ram') {
      catalogList = merged.rams
        .filter((p) => !p.isUnverifiedSpecSample)
        .map((p) => ({
          id: p.id,
          category: 'ram',
          brand: p.brand,
          model: p.model,
          specSummary: p.specSummary,
          imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
          features: withStores(p.id, {
            ramType: p.generation ? [p.generation] : [],
            capacity: p.capacityGb ? [`${p.capacityGb} GB`] : [],
            speed: p.speedMhz ? [`${p.speedMhz} MHz`] : [],
          }),
        }));
    } else if (category === 'ssd') {
      catalogList = merged.ssds
        .filter((p) => !p.isUnverifiedSpecSample)
        .map((p) => ({
          id: p.id,
          category: 'ssd',
          brand: p.brand,
          model: p.model,
          specSummary: p.specSummary,
          imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
          features: withStores(p.id, {
            capacity: [
              p.capacityGb >= 1000 ? `${p.capacityGb / 1000} TB` : `${p.capacityGb} GB`,
            ],
            interfaceType: [p.interfaceType],
          }),
        }));
    } else if (category === 'psu') {
      catalogList = merged.psus
        .filter((p) => !p.isUnverifiedSpecSample)
        .map((p) => ({
          id: p.id,
          category: 'psu',
          brand: p.brand,
          model: p.model,
          specSummary: p.specSummary,
          imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
          features: withStores(p.id, {
            wattage: p.wattage ? [`${p.wattage}W`] : [],
            efficiency: [p.efficiency],
            atxStandard: [p.atxStandard],
          }),
        }));
    } else if (category === 'pcCase') {
      catalogList = merged.cases
        .filter((p) => !p.isUnverifiedSpecSample)
        .map((p) => ({
          id: p.id,
          category: 'pcCase',
          brand: p.brand,
          model: p.model,
          specSummary: p.specSummary,
          imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
          features: withStores(p.id, {
            formFactor: p.supportedFormFactors,
            airflow: [p.airflowType],
            gpuSpace: getGpuSpaceBand(p.maxGpuLengthMm),
          }),
        }));
    } else if (category === 'cooler') {
      catalogList = merged.coolers
        .filter((p) => !p.isUnverifiedSpecSample && p.id !== 'cooler-stock-wraith')
        .map((p) => ({
          id: p.id,
          category: 'cooler',
          brand: p.brand,
          model: p.model,
          specSummary: p.specSummary,
          imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
          features: withStores(p.id, {
            coolerType: [p.coolerType],
            radiatorSize: getCoolerRadiatorLabel(p.coolerType, p.radiatorMm),
            socket: p.supportedSockets,
          }),
        }));
    }

    const seenIds = new Set(catalogList.map((item) => item.id));
    const dynamicList: CatalogDisplayItem[] = (pricingCatalog?.dynamicProducts ?? [])
      .filter((d) => d.category === category && !seenIds.has(d.id))
      .map((d) => ({
        id: d.id,
        category,
        brand: d.brand,
        model: d.name,
        specSummary: d.specSummary,
        imageUrl: d.imageUrl ?? pricingCatalog?.productImages?.[d.id] ?? null,
        features: withStores(
          d.id,
          extractDynamicFeatures(category, d.name, d.specSummary)
        ),
      }));

    return [...dynamicList, ...catalogList];
  }, [category, pricingCatalog, storesByPartId]);

  const brandOptions = useMemo<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const item of rawItems) {
      counts.set(item.brand, (counts.get(item.brand) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [rawItems]);

  const featureGroups = useMemo<FilterGroup[]>(() => {
    const buildGroup = (
      id: string,
      title: string,
      opts?: { defaultOpen?: boolean; searchable?: boolean }
    ): FilterGroup => {
      const counts = new Map<string, number>();
      for (const item of rawItems) {
        for (const val of item.features[id] ?? []) {
          counts.set(val, (counts.get(val) ?? 0) + 1);
        }
      }
      const options: FilterOption[] = Array.from(counts.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'tr', { numeric: true }))
        .map(([value, count]) => ({ value, label: value, count }));
      return {
        id,
        title,
        options,
        selectedValues: selectedFeatures[id] ?? [],
        defaultOpen: opts?.defaultOpen,
        searchable: opts?.searchable,
        onToggle: (val) => {
          setSelectedFeatures((prev) => {
            const cur = prev[id] ?? [];
            const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
            return { ...prev, [id]: next };
          });
        },
      };
    };

    const storeGroup = buildGroup('store', 'Satıcı Mağaza', {
      defaultOpen: false,
      searchable: false,
    });

    if (category === 'motherboard') {
      return [
        buildGroup('socket', 'Soket Tipi', { defaultOpen: true }),
        buildGroup('chipset', 'Yonga Seti', { defaultOpen: true }),
        buildGroup('ramType', 'Bellek Desteği', { defaultOpen: true }),
        buildGroup('formFactor', 'Form Faktörü', { defaultOpen: false }),
        storeGroup,
      ];
    }
    if (category === 'ram') {
      return [
        buildGroup('ramType', 'Bellek Tipi', { defaultOpen: true }),
        buildGroup('capacity', 'Kapasite', { defaultOpen: true }),
        buildGroup('speed', 'Bellek Frekansı', { defaultOpen: true }),
        storeGroup,
      ];
    }
    if (category === 'ssd') {
      return [
        buildGroup('capacity', 'Depolama Kapasitesi', { defaultOpen: true }),
        buildGroup('interfaceType', 'Arabirim', { defaultOpen: true }),
        storeGroup,
      ];
    }
    if (category === 'psu') {
      return [
        buildGroup('wattage', 'Güç Kapasitesi', { defaultOpen: true }),
        buildGroup('efficiency', 'Verimlilik', { defaultOpen: true }),
        buildGroup('atxStandard', 'ATX Standardı', { defaultOpen: false }),
        storeGroup,
      ];
    }
    if (category === 'pcCase') {
      return [
        buildGroup('formFactor', 'Anakart Desteği', { defaultOpen: true }),
        buildGroup('airflow', 'Kasa Tasarımı', { defaultOpen: true }),
        buildGroup('gpuSpace', 'Maks. GPU Alanı', { defaultOpen: false }),
        storeGroup,
      ];
    }
    if (category === 'cooler') {
      return [
        buildGroup('coolerType', 'Soğutucu Tipi', { defaultOpen: true }),
        buildGroup('radiatorSize', 'Radyatör / Boyut', { defaultOpen: true }),
        buildGroup('socket', 'Soket Desteği', { defaultOpen: false }),
        storeGroup,
      ];
    }
    return [storeGroup];
  }, [category, rawItems, selectedFeatures]);

  const normalizedQuery = search.trim().toLocaleLowerCase('tr-TR');
  const parsedMin = minPrice.trim() !== '' ? Number(minPrice) : null;
  const parsedMax = maxPrice.trim() !== '' ? Number(maxPrice) : null;

  const filteredItems = useMemo(() => {
    const getPrice = (id: string) => pricingCatalog?.partsPricing[id]?.newPriceTry ?? 0;

    const filtered = rawItems.filter((item) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(item.brand)) return false;

      for (const [groupId, selectedVals] of Object.entries(selectedFeatures)) {
        if (selectedVals.length === 0) continue;
        const itemVals = item.features[groupId] ?? [];
        if (!selectedVals.some((val) => itemVals.includes(val))) return false;
      }

      if (normalizedQuery) {
        const match =
          item.model.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
          item.brand.toLocaleLowerCase('tr-TR').includes(normalizedQuery) ||
          item.specSummary.toLocaleLowerCase('tr-TR').includes(normalizedQuery);
        if (!match) return false;
      }

      const price = getPrice(item.id);
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
    normalizedQuery,
    parsedMax,
    parsedMin,
    pricingCatalog,
    rawItems,
    selectedBrands,
    selectedFeatures,
    sortOrder,
  ]);

  const activeFeatureCount = Object.values(selectedFeatures).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const activeFilterCount =
    selectedBrands.length +
    activeFeatureCount +
    (minPrice.trim() !== '' ? 1 : 0) +
    (maxPrice.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedFeatures({});
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
  };

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
        onRemove: () =>
          setSelectedBrands((prev) => prev.filter((b) => b !== brand)),
      });
    }

    for (const [groupId, vals] of Object.entries(selectedFeatures)) {
      const prefix = GROUP_LABEL_MAP[groupId] ?? groupId;
      for (const val of vals) {
        chips.push({
          key: `${groupId}-${val}`,
          label: `${prefix}: ${val}`,
          onRemove: () =>
            setSelectedFeatures((prev) => ({
              ...prev,
              [groupId]: (prev[groupId] ?? []).filter((v) => v !== val),
            })),
        });
      }
    }

    return chips;
  }, [maxPrice, minPrice, selectedBrands, selectedFeatures]);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-800 pb-8 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
            Donanım Kataloğu
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            {CATEGORY_LABELS[category]}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-normal text-slate-400">
            Güncel {CATEGORY_LABELS[category].toLowerCase()} modellerinin mağaza fiyatlarını
            karşılaştırın.
          </p>
        </div>
      </div>

      {/* Sub-Category Switcher */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/80 p-2">
        {SUB_CATALOG_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectCategory(tab.id)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              category === tab.id
                ? 'bg-[#FF7900] text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* İtopya-Style Left Accordion Sidebar + Right Product Grid/List */}
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <CatalogFilterSidebar
          brands={brandOptions}
          selectedBrands={selectedBrands}
          onToggleBrand={(brand) =>
            setSelectedBrands((prev) =>
              prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
            )
          }
          minPrice={minPrice}
          maxPrice={maxPrice}
          onChangeMinPrice={setMinPrice}
          onChangeMaxPrice={setMaxPrice}
          pricePresets={PRICE_PRESETS_BY_CATEGORY[category]}
          featureGroups={featureGroups}
          activeFilterCount={activeFilterCount}
          resultCount={filteredItems.length}
          onResetFilters={handleResetFilters}
          mobileOpen={mobileFilterOpen}
          onCloseMobile={() => setMobileFilterOpen(false)}
        />

        <CatalogProductSection
          items={filteredItems}
          totalCount={rawItems.length}
          pricingCatalog={pricingCatalog}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={`${CATEGORY_LABELS[category]} model veya marka ara...`}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          activeFilterCount={activeFilterCount}
          activeFilterChips={activeFilterChips}
          onResetFilters={handleResetFilters}
          onOpenMobileFilters={() => setMobileFilterOpen(true)}
          onInspectPart={onInspectPart}
          onAddToBuild={(partId) => onBuildWithPart(category, partId)}
          visibleLimit={visibleLimit}
          onLoadMore={() => setVisibleLimit((prev) => prev + 24)}
          loadMoreLabel="Daha Fazla Ürün Göster"
          emptyMessage="Seçtiğiniz filtrelere uygun ürün bulunamadı."
        />
      </div>
    </div>
  );
}
