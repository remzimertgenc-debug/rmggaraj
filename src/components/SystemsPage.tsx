import { AlertTriangle, RefreshCw, Scale, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CONDITION_OPTIONS,
  CPU_BRAND_OPTIONS,
  formatTry,
  generateSampleBuilds,
  getShowcaseReadyBuilds,
  GPU_BRAND_OPTIONS,
  RESOLUTION_OPTIONS,
} from '../data/builds';
import {
  ComponentCondition,
  CpuBrandPreference,
  GpuBrandPreference,
  PcBuild,
  PricingCatalogResponse,
  TargetResolution,
} from '../types/pc';
import { BuildCard } from './BuildCard';

interface SystemsPageProps {
  pricingCatalog: PricingCatalogResponse | null;
  pricingLoading: boolean;
  pricingError: string | null;
  comparedBuilds: PcBuild[];
  onRetryPricing: () => void;
  onInspectBuild: (build: PcBuild) => void;
  onToggleCompare: (build: PcBuild) => void;
  onClearCompare: () => void;
  onCustomizeBuild: (build: PcBuild) => void;
}

type BudgetBandId = 'all' | 'under-35' | '35-60' | '60-90' | 'over-90';

const BUDGET_BANDS: { id: BudgetBandId; label: string; budgets: number[] }[] = [
  { id: 'all', label: 'Tüm Bütçeler', budgets: [30000, 50000, 75000, 120000] },
  { id: 'under-35', label: '35.000 TL Altı', budgets: [26000, 34000] },
  { id: '35-60', label: '35.000 – 60.000 TL', budgets: [45000, 58000] },
  { id: '60-90', label: '60.000 – 90.000 TL', budgets: [72000, 88000] },
  { id: 'over-90', label: '90.000 TL Üstü', budgets: [115000, 145000] },
];

export function SystemsPage({
  pricingCatalog,
  pricingLoading,
  pricingError,
  comparedBuilds,
  onRetryPricing,
  onInspectBuild,
  onToggleCompare,
  onClearCompare,
  onCustomizeBuild,
}: SystemsPageProps) {
  const [budgetBand, setBudgetBand] = useState<BudgetBandId>('all');
  const [gpuBrand, setGpuBrand] = useState<GpuBrandPreference>('farketmez');
  const [cpuBrand, setCpuBrand] = useState<CpuBrandPreference>('farketmez');
  const [resolution, setResolution] = useState<TargetResolution>('1440p');
  const [condition, setCondition] = useState<ComponentCondition>('sifir');
  const [showCompareTable, setShowCompareTable] = useState(false);

  const builds = useMemo(() => {
    const showcaseBuilds = getShowcaseReadyBuilds(pricingCatalog)
      .map((item) => item.build)
      .filter((b) => {
        if (cpuBrand === 'amd' && !b.cpu.model.toLowerCase().includes('amd')) return false;
        if (cpuBrand === 'intel' && !b.cpu.model.toLowerCase().includes('intel')) return false;
        if (gpuBrand === 'nvidia' && !b.gpu.model.toLowerCase().includes('nvidia')) return false;
        if (gpuBrand === 'amd' && !b.gpu.model.toLowerCase().includes('amd')) return false;
        return true;
      });

    if (!pricingCatalog) {
      return showcaseBuilds;
    }

    const band = BUDGET_BANDS.find((b) => b.id === budgetBand) ?? BUDGET_BANDS[0];
    const collected: PcBuild[] = [...showcaseBuilds];
    const seenPairs = new Set<string>(
      showcaseBuilds.map(
        (b) => `${b.selectedIds.cpuId}::${b.selectedIds.gpuId}::${b.tier}`
      )
    );

    for (const budget of band.budgets) {
      const batch = generateSampleBuilds(
        {
          budget,
          purpose: 'oyun',
          favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
          resolution,
          condition,
          cpuBrandPref: cpuBrand,
          gpuBrandPref: gpuBrand,
        },
        pricingCatalog
      );
      for (const b of batch) {
        const key = `${b.selectedIds.cpuId}::${b.selectedIds.gpuId}::${b.tier}`;
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          collected.push(b);
        }
      }
    }

    const filteredByBand = collected.filter((b) => {
      if (budgetBand === 'under-35') return b.samplePriceTry < 35000;
      if (budgetBand === '35-60')
        return b.samplePriceTry >= 35000 && b.samplePriceTry <= 60000;
      if (budgetBand === '60-90')
        return b.samplePriceTry >= 60000 && b.samplePriceTry <= 90000;
      if (budgetBand === 'over-90') return b.samplePriceTry > 90000;
      return true;
    });

    const list = filteredByBand.length > 0 ? filteredByBand : collected;
    return list.sort((a, b) => a.samplePriceTry - b.samplePriceTry).slice(0, 9);
  }, [pricingCatalog, budgetBand, gpuBrand, cpuBrand, resolution, condition]);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Header */}
      <div className="border-b border-slate-800 pb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
          RMG Garaj Mağaza
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
          Hazır Sistemler
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-normal text-slate-400">
          Tüm bileşenleri 10 maddeli uyumluluk kontrolünden geçmiş, oyuna ve bütçeye hazır
          bilgisayar sistemleri.
        </p>
      </div>

      {/* Top Filter Bar */}
      <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-700/60 bg-slate-800/75 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">
            Bütçe Aralığı
          </span>
          <select
            value={budgetBand}
            onChange={(e) => setBudgetBand(e.target.value as BudgetBandId)}
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-medium text-slate-50 focus:border-[#FF7900] focus:outline-none"
          >
            {BUDGET_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">
            Ekran Kartı (NVIDIA / AMD)
          </span>
          <select
            value={gpuBrand}
            onChange={(e) => setGpuBrand(e.target.value as GpuBrandPreference)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs font-medium text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
          >
            {GPU_BRAND_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">
            İşlemci (Intel / AMD)
          </span>
          <select
            value={cpuBrand}
            onChange={(e) => setCpuBrand(e.target.value as CpuBrandPreference)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs font-medium text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
          >
            {CPU_BRAND_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">
            Hedef Çözünürlük
          </span>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as TargetResolution)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs font-medium text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
          >
            {RESOLUTION_OPTIONS.map((res) => (
              <option key={res.id} value={res.id}>
                {res.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#94A3B8]">
            Parça Durumu
          </span>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as ComponentCondition)}
            className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs font-medium text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
          >
            {CONDITION_OPTIONS.map((cond) => (
              <option key={cond.id} value={cond.id}>
                {cond.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Comparison Tray */}
      {comparedBuilds.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#FF7900]/50 bg-[#111827] px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#FF7900]">
              <Scale className="h-4 w-4" />
              <span>Karşılaştırma Listesi ({comparedBuilds.length}/3):</span>
            </span>
            {comparedBuilds.map((cb) => (
              <button
                key={cb.id}
                type="button"
                onClick={() => onToggleCompare(cb)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-slate-700 bg-[#080B12] px-2.5 py-1 text-[#F5F7FA] hover:border-red-500/60"
              >
                <span>{cb.systemName}</span>
                <X className="h-3 w-3 text-[#94A3B8]" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCompareTable((p) => !p)}
              className="cursor-pointer rounded-lg bg-[#246BFD] px-4 py-2 text-xs font-semibold text-[#F5F7FA] hover:bg-[#3B7CFE]"
            >
              {showCompareTable ? 'Karşılaştırmayı Gizle' : 'Yan Yana Karşılaştır'}
            </button>
            <button
              type="button"
              onClick={onClearCompare}
              className="cursor-pointer rounded-lg border border-slate-700 bg-[#080B12] px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F5F7FA]"
            >
              Temizle
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Drawer Table */}
      {showCompareTable && comparedBuilds.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-[#111827]">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-[#080B12]">
                <th className="px-5 py-4 text-xs font-semibold text-[#94A3B8]">
                  Özellik / Bileşen
                </th>
                {comparedBuilds.map((b) => (
                  <th key={b.id} className="px-5 py-4">
                    <span className="block font-display text-base font-bold text-[#F5F7FA]">
                      {b.systemName}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#FF7900]">
                      {formatTry(b.samplePriceTry)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(
                [
                  ['İşlemci (CPU)', 'cpu'],
                  ['Ekran Kartı (GPU)', 'gpu'],
                  ['Anakart', 'motherboard'],
                  ['Bellek (RAM)', 'ram'],
                  ['Depolama (SSD)', 'ssd'],
                  ['Güç Kaynağı (PSU)', 'psu'],
                  ['Kasa', 'pcCase'],
                  ['Soğutucu', 'cooler'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <td className="px-5 py-3 text-xs font-medium text-[#94A3B8]">
                    {label}
                  </td>
                  {comparedBuilds.map((b) => (
                    <td key={b.id} className="px-5 py-3 text-xs font-semibold text-[#F5F7FA]">
                      {b[key].model}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-5 py-3.5 text-xs font-medium text-[#94A3B8]">İşlem</td>
                {comparedBuilds.map((b) => (
                  <td key={b.id} className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => onCustomizeBuild(b)}
                      className="cursor-pointer rounded-lg bg-[#246BFD] px-3 py-1.5 text-xs font-semibold text-[#F5F7FA] hover:bg-[#3B7CFE]"
                    >
                      Özelleştir
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Provider Error */}
      {pricingError && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/50 bg-red-950/25 p-4 text-sm text-red-200"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span>Fiyat verisi yüklenemedi: {pricingError}</span>
          </span>
          <button
            type="button"
            onClick={onRetryPricing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-400/50 bg-[#111827] px-3 py-1.5 text-xs font-semibold text-[#F5F7FA]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Yeniden Dene</span>
          </button>
        </div>
      )}

      {/* 3-Column E-Commerce Product Grid */}
      {pricingLoading && !pricingCatalog ? (
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="h-[500px] animate-pulse rounded-xl border border-slate-800 bg-[#111827]"
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => (
            <BuildCard
              key={build.id}
              build={build}
              variant="detailed"
              isCompared={comparedBuilds.some((cb) => cb.id === build.id)}
              onInspect={onInspectBuild}
              onToggleCompare={onToggleCompare}
              onCustomize={onCustomizeBuild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
