import { ArrowRight, Layers, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import { getMergedCatalogParts } from '../data/catalogAdapter';
import { CATEGORY_LABELS } from '../data/partMedia';
import type { PartCategoryKey, PricingCatalogResponse } from '../types/pc';
import { CatalogFilterSidebar, FilterGroup, FilterOption } from './CatalogFilterSidebar';
import { ProductImage } from './ProductImage';

interface CategoryCatalogPageProps {
  category: PartCategoryKey;
  pricingCatalog: PricingCatalogResponse | null;
  onSelectCategory: (category: PartCategoryKey) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onBuildWithPart: (category: PartCategoryKey, partId: string) => void;
  onManageListings: (partId?: string) => void;
}

interface CatalogDisplayItem {
  id: string;
  brand: string;
  model: string;
  specSummary: string;
  imageUrl: string | null;
  features: Record<string, string[]>;
}

type SortOrder = 'name' | 'price-asc' | 'price-desc';

const SUB_CATALOG_TABS: { id: PartCategoryKey; label: string }[] = [
  { id: 'motherboard', label: 'Anakartlar' },
  { id: 'ram', label: "RAM'ler" },
  { id: 'ssd', label: "SSD'ler" },
  { id: 'psu', label: 'Güç Kaynakları' },
  { id: 'pcCase', label: 'Kasalar' },
  { id: 'cooler', label: 'Soğutucular' },
];

function extractDynamicFeatures(
  category: PartCategoryKey,
  name: string,
  specSummary: string
): Record<string, string[]> {
  const hay = `${name} ${specSummary}`.toUpperCase();
  if (category === 'motherboard') {
    const sockets = ['AM5', 'AM4', 'LGA1700', 'LGA1851'].filter((s) => hay.includes(s));
    const rams = ['DDR5', 'DDR4'].filter((r) => hay.includes(r));
    return { socket: sockets, ramType: rams };
  }
  if (category === 'ram') {
    const rams = ['DDR5', 'DDR4'].filter((r) => hay.includes(r));
    const capMatch = hay.match(/\b(16|32|64|128)\s*GB\b/);
    return { ramType: rams, capacity: capMatch ? [`${capMatch[1]} GB`] : [] };
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
    const wattMatch = hay.match(/\b(550|600|650|700|750|850|1000|1200)\s*W\b/);
    return { wattage: wattMatch ? [`${wattMatch[1]}W`] : [] };
  }
  if (category === 'cooler') {
    const types: string[] = [];
    if (hay.includes('SIVI') || hay.includes('LIQUID') || hay.includes('360') || hay.includes('240')) {
      types.push('Sıvı Soğutma');
    } else if (hay.includes('HAVA') || hay.includes('KULE') || hay.includes('AIR')) {
      types.push('Hava Soğutma');
    }
    return { coolerType: types };
  }
  return {};
}

export function CategoryCatalogPage({
  category,
  pricingCatalog,
  onSelectCategory,
  onInspectPart,
}: CategoryCatalogPageProps) {
  const [search, setSearch] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, string[]>>({});
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [conditionMode, setConditionMode] = useState<'sifir' | 'ikinci-el'>('sifir');
  const [sortOrder, setSortOrder] = useState<SortOrder>('name');
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

  const rawItems = useMemo<CatalogDisplayItem[]>(() => {
    const merged = getMergedCatalogParts(pricingCatalog);
    let catalogList: CatalogDisplayItem[] = [];

    if (category === 'motherboard') {
      catalogList = merged.motherboards.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        specSummary: p.specSummary,
        imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
        features: {
          socket: [p.socket],
          ramType: p.supportedRam ? [p.supportedRam] : [],
          formFactor: [p.formFactor],
        },
      }));
    } else if (category === 'ram') {
      catalogList = merged.rams.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        specSummary: p.specSummary,
        imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
        features: {
          ramType: p.generation ? [p.generation] : [],
          capacity: p.capacityGb ? [`${p.capacityGb} GB`] : [],
        },
      }));
    } else if (category === 'ssd') {
      catalogList = merged.ssds.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        specSummary: p.specSummary,
        imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
        features: {
          capacity: [p.capacityGb >= 1000 ? `${p.capacityGb / 1000} TB` : `${p.capacityGb} GB`],
          interfaceType: [p.interfaceType],
        },
      }));
    } else if (category === 'psu') {
      catalogList = merged.psus.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        specSummary: p.specSummary,
        imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
        features: {
          wattage: p.wattage ? [`${p.wattage}W`] : [],
          efficiency: [p.efficiency],
        },
      }));
    } else if (category === 'pcCase') {
      catalogList = merged.cases.filter((p) => !p.isUnverifiedSpecSample).map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        specSummary: p.specSummary,
        imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
        features: {
          formFactor: p.supportedFormFactors,
        },
      }));
    } else if (category === 'cooler') {
      catalogList = merged.coolers.filter(
        (p) => !p.isUnverifiedSpecSample && p.id !== 'cooler-stock-wraith'
      ).map((p) => ({
        id: p.id,
        brand: p.brand,
        model: p.model,
        specSummary: p.specSummary,
        imageUrl: pricingCatalog?.productImages?.[p.id] ?? null,
        features: {
          coolerType: [p.coolerType],
        },
      }));
    }

    const seenIds = new Set(catalogList.map((item) => item.id));
    const dynamicList: CatalogDisplayItem[] = (pricingCatalog?.dynamicProducts ?? [])
      .filter((d) => d.category === category && !seenIds.has(d.id))
      .map((d) => ({
        id: d.id,
        brand: d.brand,
        model: d.name,
        specSummary: d.specSummary,
        imageUrl: d.imageUrl ?? pricingCatalog?.productImages?.[d.id] ?? null,
        features: extractDynamicFeatures(category, d.name, d.specSummary),
      }));

    return [...dynamicList, ...catalogList];
  }, [category, pricingCatalog]);

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
    const buildGroup = (id: string, title: string): FilterGroup => {
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
        onToggle: (val) => {
          setSelectedFeatures((prev) => {
            const cur = prev[id] ?? [];
            const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
            return { ...prev, [id]: next };
          });
        },
      };
    };

    if (category === 'motherboard') {
      return [
        buildGroup('socket', 'Soket Tipi'),
        buildGroup('ramType', 'Bellek Desteği'),
        buildGroup('formFactor', 'Form Faktörü'),
      ];
    }
    if (category === 'ram') {
      return [
        buildGroup('ramType', 'Bellek Tipi'),
        buildGroup('capacity', 'Kapasite'),
      ];
    }
    if (category === 'ssd') {
      return [
        buildGroup('capacity', 'Depolama Kapasitesi'),
        buildGroup('interfaceType', 'Arabirim'),
      ];
    }
    if (category === 'psu') {
      return [
        buildGroup('wattage', 'Güç Kapasitesi'),
        buildGroup('efficiency', 'Verimlilik'),
      ];
    }
    if (category === 'pcCase') {
      return [buildGroup('formFactor', 'Anakart Desteği')];
    }
    if (category === 'cooler') {
      return [buildGroup('coolerType', 'Soğutucu Tipi')];
    }
    return [];
  }, [category, rawItems, selectedFeatures]);

  const normalizedQuery = search.trim().toLocaleLowerCase('tr-TR');
  const parsedMin = minPrice.trim() !== '' ? Number(minPrice) : null;
  const parsedMax = maxPrice.trim() !== '' ? Number(maxPrice) : null;

  const filteredItems = useMemo(() => {
    const getPrice = (id: string) => {
      const pricing = pricingCatalog?.partsPricing[id];
      return conditionMode === 'ikinci-el'
        ? pricing?.usedPriceTry ?? 0
        : pricing?.newPriceTry ?? 0;
    };

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
    conditionMode,
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

        <div className="inline-flex rounded-xl border border-slate-700/70 bg-slate-800 p-1 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setConditionMode('sifir')}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
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
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              conditionMode === 'ikinci-el'
                ? 'bg-[#FF7900] text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            İkinci El
          </button>
        </div>
      </div>

      {/* Sub-Category Switcher */}
      <div className="mt-8 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/75 p-2">
        {SUB_CATALOG_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectCategory(tab.id)}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              category === tab.id
                ? 'bg-[#FF7900] text-slate-950 font-bold'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sidebar + Product Grid Layout */}
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
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
          featureGroups={featureGroups}
          activeFilterCount={activeFilterCount}
          resultCount={filteredItems.length}
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
              placeholder={`${CATEGORY_LABELS[category]} model veya marka ara...`}
              aria-label="Model ara"
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
              {filteredItems.length} ürün
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.slice(0, visibleLimit).map((item) => {
              const pricing = pricingCatalog?.partsPricing[item.id];
              const activePrice =
                conditionMode === 'ikinci-el'
                  ? pricing?.usedPriceTry ?? 0
                  : pricing?.newPriceTry ?? 0;

              return (
                <article
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/75 transition-all duration-200 hover:scale-[1.015] hover:border-[#FF7900]/70 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.65)]"
                >
                  <button
                    type="button"
                    onClick={() => onInspectPart(category, item.id)}
                    className="aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-900/80 text-left"
                  >
                    <ProductImage
                      imageUrl={item.imageUrl}
                      category={category}
                      model={item.model}
                      brand={item.brand}
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>

                  <div className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-7">
                    <h2 className="font-display text-lg font-bold leading-snug text-slate-50">
                      <button
                        type="button"
                        onClick={() => onInspectPart(category, item.id)}
                        className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#FF7900]"
                      >
                        {item.model}
                      </button>
                    </h2>

                    <div className="space-y-4">
                      <span className="block font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#FF7900]">
                        {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Gör'}
                      </span>

                      <button
                        type="button"
                        onClick={() => onInspectPart(category, item.id)}
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

          {filteredItems.length > visibleLimit && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 24)}
                className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-slate-100 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
              >
                Daha Fazla Göster ({filteredItems.length - visibleLimit} ürün daha)
              </button>
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/75 py-16 text-center">
              <Layers className="h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm text-slate-400">
                Seçtiğiniz filtrelere uygun ürün bulunamadı.
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
