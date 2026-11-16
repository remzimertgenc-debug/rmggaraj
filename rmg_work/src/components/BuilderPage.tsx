import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  LockOpen,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  assembleBuildFromIds,
  CONDITION_OPTIONS,
  CPU_BRAND_OPTIONS,
  formatTry,
  generateSampleBuilds,
  GPU_BRAND_OPTIONS,
  PURPOSE_OPTIONS,
  RESOLUTION_OPTIONS,
} from '../data/builds';
import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from '../data/hardwareDb';
import {
  BasePartSpec,
  BuilderPreferences,
  ComponentCondition,
  CpuBrandPreference,
  GpuBrandPreference,
  PcBuild,
  PricingCatalogResponse,
  SelectedPartIds,
  TargetResolution,
  UsagePurpose,
} from '../types/pc';
import { evaluateCompatibility } from '../utils/compatibility';

interface BuilderPageProps {
  preferences: BuilderPreferences;
  selectedIds: SelectedPartIds;
  pricingCatalog: PricingCatalogResponse | null;
  pricingError: string | null;
  onRetryPricing: () => void;
  onChangePreferences: (next: BuilderPreferences) => void;
  onChangeSelectedIds: (next: SelectedPartIds) => void;
  onResetAll: () => void;
  onInspectBuild: (build: PcBuild) => void;
  onManageListings: (partId?: string) => void;
}

type CategorySectionMeta = {
  index: string;
  title: string;
  field: keyof SelectedPartIds;
  items: BasePartSpec[];
};

const CATEGORY_SECTIONS: CategorySectionMeta[] = [
  { index: '01', title: 'İşlemci', field: 'cpuId', items: CPU_DB },
  { index: '02', title: 'Anakart', field: 'motherboardId', items: MOTHERBOARD_DB },
  {
    index: '03',
    title: 'Ekran Kartı',
    field: 'gpuId',
    items: GPU_DB.filter((g) => !g.isUnverifiedSpecSample),
  },
  {
    index: '04',
    title: 'RAM',
    field: 'ramId',
    items: RAM_DB.filter((r) => !r.isUnverifiedSpecSample),
  },
  { index: '05', title: 'SSD', field: 'ssdId', items: SSD_DB },
  { index: '06', title: 'PSU', field: 'psuId', items: PSU_DB },
  {
    index: '07',
    title: 'Kasa',
    field: 'caseId',
    items: CASE_DB.filter((c) => !c.isUnverifiedSpecSample),
  },
  {
    index: '08',
    title: 'İşlemci Soğutucu',
    field: 'coolerId',
    items: CPU_COOLER_DB.filter((cl) => !cl.isUnverifiedSpecSample),
  },
];

function getPartPriceForCondition(
  partId: string,
  field: keyof SelectedPartIds,
  condition: ComponentCondition,
  catalog: PricingCatalogResponse | null
): number {
  const info = catalog?.partsPricing[partId];
  if (!info) return 0;
  const useUsed =
    condition === 'ikinci-el'
      ? true
      : condition === 'karma'
        ? field === 'cpuId' || field === 'gpuId'
        : false;
  if (useUsed && info.usedPriceTry !== null) return info.usedPriceTry;
  return info.newPriceTry ?? 0;
}

export function BuilderPage({
  preferences,
  selectedIds,
  pricingCatalog,
  pricingError,
  onRetryPricing,
  onChangePreferences,
  onChangeSelectedIds,
  onResetAll,
  onInspectBuild,
  onManageListings,
}: BuilderPageProps) {
  const [compatLock, setCompatLock] = useState<boolean>(true);
  const [showAutoAdvisor, setShowAutoAdvisor] = useState<boolean>(false);
  const [showSummaryTech, setShowSummaryTech] = useState<boolean>(false);
  const [expandedPartTech, setExpandedPartTech] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);

  const recommendedBuilds = useMemo(() => {
    if (!pricingCatalog) return [];
    return generateSampleBuilds(preferences, pricingCatalog);
  }, [preferences, pricingCatalog]);

  const currentBuild = useMemo(
    () =>
      assembleBuildFromIds(
        'fiyat-performans',
        selectedIds,
        preferences,
        pricingCatalog,
        true
      ),
    [selectedIds, preferences, pricingCatalog]
  );

  // Mevcut seçime göre her aday parçanın uyumluluk durumunu kontrol et
  const checkCandidateCompatibility = (
    field: keyof SelectedPartIds,
    candidateId: string
  ): { isIncompatible: boolean; reason: string | null } => {
    if (candidateId === selectedIds[field]) {
      return { isIncompatible: false, reason: null };
    }
    const testIds: SelectedPartIds = { ...selectedIds, [field]: candidateId };
    const cpu = CPU_DB.find((p) => p.id === testIds.cpuId);
    const gpu = GPU_DB.find((p) => p.id === testIds.gpuId);
    const motherboard = MOTHERBOARD_DB.find((p) => p.id === testIds.motherboardId);
    const ram = RAM_DB.find((p) => p.id === testIds.ramId);
    const psu = PSU_DB.find((p) => p.id === testIds.psuId);
    const pcCase = CASE_DB.find((p) => p.id === testIds.caseId);
    const cooler = CPU_COOLER_DB.find((p) => p.id === testIds.coolerId);

    // Eğer işlemci değişiyorsa eski anakart/RAM yüzünden kilitlenmesin; diğer alanlar tam kontrol edilir
    if (field === 'cpuId') {
      return { isIncompatible: false, reason: null };
    }

    const report = evaluateCompatibility({
      cpu,
      gpu,
      motherboard,
      ram,
      psu,
      pcCase,
      cooler,
    });

    if (field === 'motherboardId') {
      const relevant = report.checks.find(
        (c) =>
          (c.id === 'socket' || c.id === 'vrm' || c.id === 'bios') &&
          c.status === 'incompatible'
      );
      if (relevant) return { isIncompatible: true, reason: relevant.message };
    }
    if (field === 'ramId') {
      const relevant = report.checks.find(
        (c) =>
          (c.id === 'ram_gen' || c.id === 'ram_spec') &&
          c.status === 'incompatible'
      );
      if (relevant) return { isIncompatible: true, reason: relevant.message };
    }
    if (field === 'gpuId') {
      if (gpu?.isIntegrated && (!cpu?.hasIntegratedGraphics || gpu.brand !== cpu?.brand)) {
        return {
          isIncompatible: true,
          reason: 'Seçili işlemci bu dahili grafik birimini desteklemiyor.',
        };
      }
      const relevant = report.checks.find(
        (c) =>
          (c.id === 'gpu_case' || c.id === 'psu_watt' || c.id === 'psu_connectors') &&
          c.status === 'incompatible'
      );
      if (relevant) return { isIncompatible: true, reason: relevant.message };
    }
    if (field === 'psuId') {
      const relevant = report.checks.find(
        (c) =>
          (c.id === 'psu_watt' || c.id === 'psu_connectors') &&
          c.status === 'incompatible'
      );
      if (relevant) return { isIncompatible: true, reason: relevant.message };
    }
    if (field === 'caseId') {
      const relevant = report.checks.find(
        (c) =>
          (c.id === 'gpu_case' || c.id === 'cooler_case') &&
          c.status === 'incompatible'
      );
      if (relevant) return { isIncompatible: true, reason: relevant.message };
    }
    if (field === 'coolerId') {
      const relevant = report.checks.find(
        (c) =>
          (c.id === 'cooler_req' || c.id === 'cooler_case') &&
          c.status === 'incompatible'
      );
      if (relevant) return { isIncompatible: true, reason: relevant.message };
    }
    return { isIncompatible: false, reason: null };
  };

  // İşlemci seçilince uyumsuz anakart/RAM/soğutucu varsa uyumlu olana otomatik geçiş yap (kilit açıkken)
  const handleSelectPart = (field: keyof SelectedPartIds, partId: string) => {
    if (field === 'cpuId' && compatLock) {
      const nextCpu = CPU_DB.find((c) => c.id === partId);
      if (nextCpu) {
        const nextMb =
          MOTHERBOARD_DB.find(
            (m) =>
              m.socket === nextCpu.socket &&
              nextCpu.generation !== null &&
              m.nativeCpuGenerations.includes(nextCpu.generation) &&
              (nextCpu.maxPowerWatts ?? 0) <= (m.vrmMaxCpuWatts ?? 999)
          ) ??
          MOTHERBOARD_DB.find((m) => m.socket === nextCpu.socket) ??
          MOTHERBOARD_DB[0];

        const currentRam = RAM_DB.find((r) => r.id === selectedIds.ramId);
        const nextRam =
          currentRam && currentRam.generation === nextMb.supportedRam
            ? currentRam
            : RAM_DB.find((r) => r.generation === nextMb.supportedRam) ?? RAM_DB[0];

        const currentCooler = CPU_COOLER_DB.find((cl) => cl.id === selectedIds.coolerId);
        const nextCooler =
          currentCooler &&
          currentCooler.supportedSockets.includes(nextCpu.socket) &&
          (currentCooler.maxTdpCapacityWatts ?? 0) >= (nextCpu.maxPowerWatts ?? 0) &&
          (!nextCpu.requiresDedicatedCooler || currentCooler.coolerType !== 'Stok / Giriş')
            ? currentCooler
            : CPU_COOLER_DB.find(
                (cl) =>
                  cl.supportedSockets.includes(nextCpu.socket) &&
                  (cl.maxTdpCapacityWatts ?? 0) >= (nextCpu.maxPowerWatts ?? 0) &&
                  (!nextCpu.requiresDedicatedCooler || cl.coolerType !== 'Stok / Giriş')
              ) ?? CPU_COOLER_DB[1];

        onChangeSelectedIds({
          ...selectedIds,
          cpuId: partId,
          motherboardId: nextMb.id,
          ramId: nextRam.id,
          coolerId: nextCooler.id,
        });
        return;
      }
    }

    if (field === 'motherboardId' && compatLock) {
      const nextMb = MOTHERBOARD_DB.find((m) => m.id === partId);
      if (nextMb) {
        const currentRam = RAM_DB.find((r) => r.id === selectedIds.ramId);
        const nextRam =
          currentRam &&
          !currentRam.isUnverifiedSpecSample &&
          currentRam.generation === nextMb.supportedRam &&
          (currentRam.modulesCount ?? 2) <= (nextMb.ramSlots ?? 2) &&
          (currentRam.capacityGb ?? 0) <= (nextMb.maxRamGb ?? 64)
            ? currentRam
            : RAM_DB.find(
                (r) =>
                  !r.isUnverifiedSpecSample &&
                  r.generation === nextMb.supportedRam &&
                  (r.modulesCount ?? 2) <= (nextMb.ramSlots ?? 2) &&
                  (r.capacityGb ?? 0) <= (nextMb.maxRamGb ?? 64)
              ) ?? RAM_DB[0];

        const currentCase = CASE_DB.find((c) => c.id === selectedIds.caseId);
        const currentGpu = GPU_DB.find((g) => g.id === selectedIds.gpuId);
        const caseValid =
          currentCase &&
          !currentCase.isUnverifiedSpecSample &&
          currentCase.supportedFormFactors.includes(nextMb.formFactor);
        const nextCase = caseValid
          ? currentCase
          : CASE_DB.find(
              (c) =>
                !c.isUnverifiedSpecSample &&
                c.supportedFormFactors.includes(nextMb.formFactor) &&
                (currentGpu?.lengthMm === null ||
                  currentGpu?.lengthMm === undefined ||
                  (c.maxGpuLengthMm ?? 0) >= currentGpu.lengthMm)
            ) ?? CASE_DB.find((c) => c.id === 'case-atx-flow')!;

        onChangeSelectedIds({
          ...selectedIds,
          motherboardId: partId,
          ramId: nextRam.id,
          caseId: nextCase.id,
        });
        return;
      }
    }

    onChangeSelectedIds({
      ...selectedIds,
      [field]: partId,
    });
  };

  const handleCopyList = async () => {
    const parts = [
      currentBuild.cpu,
      currentBuild.motherboard,
      currentBuild.gpu,
      currentBuild.ram,
      currentBuild.ssd,
      currentBuild.psu,
      currentBuild.pcCase,
      currentBuild.cooler,
    ];
    const text = [
      `RMG TECH — Özel Sistem Toplama`,
      `Toplam: ${formatTry(currentBuild.samplePriceTry)}`,
      '',
      ...parts.map((p) => `- ${p.label}: ${p.model} (${formatTry(p.priceTry)})`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Pano erişimi engellendiyse sessiz geç
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const summaryParts = [
    currentBuild.cpu,
    currentBuild.motherboard,
    currentBuild.gpu,
    currentBuild.ram,
    currentBuild.ssd,
    currentBuild.psu,
    currentBuild.pcCase,
    currentBuild.cooler,
  ];

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/90 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
            RMG TECH Sistem Sihirbazı
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-[#F5F7FA] sm:text-4xl">
            Bilgisayar Topla
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#94A3B8]">
            8 bileşeni tek tek seçin veya bütçenize göre hazır önerilerden başlayıp parçaları
            özelleştirin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAutoAdvisor((p) => !p)}
            className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-[#246BFD] bg-[#111827] px-4 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:bg-[#246BFD]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showAutoAdvisor ? 'Otomatik Önericiyi Gizle' : 'Bütçeye Göre Otomatik Öner'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCompatLock((p) => !p)}
            className={`inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
              compatLock
                ? 'border-slate-700 bg-[#111827] text-[#F5F7FA]'
                : 'border-[#FF7900] bg-[#111827] text-[#FF7900]'
            }`}
            title="Uyumsuz bileşen seçimini engelle veya serbest uyumluluk testine aç"
          >
            {compatLock ? <Lock className="h-3.5 w-3.5 text-[#246BFD]" /> : <LockOpen className="h-3.5 w-3.5" />}
            <span>{compatLock ? 'Uyumluluk Kilidi: Açık' : 'Uyumluluk Kilidi: Kapalı'}</span>
          </button>

          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-[#111827] px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F5F7FA]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Sıfırla</span>
          </button>
        </div>
      </div>

      {/* Quick Auto-Recommender Panel (Preserves full preference algorithm) */}
      {showAutoAdvisor && (
        <section
          aria-label="Otomatik sistem önerici"
          className="mt-6 rounded-xl border border-[#246BFD]/50 bg-[#111827] p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="block lg:col-span-2">
              <span className="mb-1 flex justify-between text-xs font-semibold text-[#94A3B8]">
                <span>Hedef Bütçe</span>
                <span className="font-mono text-[#FF7900]">{formatTry(preferences.budget)}</span>
              </span>
              <input
                type="range"
                min={18000}
                max={160000}
                step={1000}
                value={preferences.budget}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    budget: Number(e.target.value),
                  })
                }
                className="rmg-slider mt-2 w-full"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#94A3B8]">
                Amaç
              </span>
              <select
                value={preferences.purpose}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    purpose: e.target.value as UsagePurpose,
                  })
                }
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA]"
              >
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#94A3B8]">
                Çözünürlük
              </span>
              <select
                value={preferences.resolution}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    resolution: e.target.value as TargetResolution,
                  })
                }
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA]"
              >
                {RESOLUTION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#94A3B8]">
                İşlemci / GPU
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={preferences.cpuBrandPref}
                  onChange={(e) =>
                    onChangePreferences({
                      ...preferences,
                      cpuBrandPref: e.target.value as CpuBrandPreference,
                    })
                  }
                  aria-label="İşlemci markası"
                  className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-2 text-xs text-[#F5F7FA]"
                >
                  {CPU_BRAND_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      CPU: {c.title.split(' ')[0]}
                    </option>
                  ))}
                </select>
                <select
                  value={preferences.gpuBrandPref}
                  onChange={(e) =>
                    onChangePreferences({
                      ...preferences,
                      gpuBrandPref: e.target.value as GpuBrandPreference,
                    })
                  }
                  aria-label="Ekran kartı markası"
                  className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-2 text-xs text-[#F5F7FA]"
                >
                  {GPU_BRAND_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      GPU: {g.title.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#94A3B8]">
                Parça Durumu
              </span>
              <select
                value={preferences.condition}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    condition: e.target.value as ComponentCondition,
                  })
                }
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA]"
              >
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {recommendedBuilds.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-3">
              {recommendedBuilds.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onChangeSelectedIds(rec.selectedIds)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700 bg-[#080B12] px-4 py-3 text-left transition-colors hover:border-[#246BFD]"
                >
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold text-[#246BFD]">
                      {rec.tierTitle}
                    </span>
                    <span className="block truncate text-sm font-bold text-[#F5F7FA]">
                      {rec.systemName}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#FF7900] shrink-0">
                    {formatTry(rec.samplePriceTry)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Provider Error */}
      {pricingError && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/50 bg-red-950/25 p-4 text-sm text-red-200"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span>Fiyat veri kaynağı hatası: {pricingError}</span>
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

      {/* Main 2-Column Configurator: Left 8 Component Sections, Right Sticky Summary */}
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left: 8 Separate Component Category Sections */}
        <div className="space-y-10 lg:col-span-8">
          {/* Quick Category Jump Bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#111827] p-3">
            {CATEGORY_SECTIONS.map((sec) => (
              <a
                key={sec.field}
                href={`#section-${sec.field}`}
                className="rounded-lg bg-[#080B12] px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition-colors hover:text-[#F5F7FA] whitespace-nowrap"
              >
                {sec.index}. {sec.title}
              </a>
            ))}
          </div>

          {CATEGORY_SECTIONS.map((section) => (
            <section
              key={section.field}
              id={`section-${section.field}`}
              className="scroll-mt-24"
            >
              <div className="mb-4 flex items-baseline justify-between border-b border-slate-800/80 pb-3">
                <h2 className="font-display text-xl font-bold text-[#F5F7FA] sm:text-2xl">
                  <span className="mr-2 font-mono text-base text-[#FF7900]">
                    {section.index}.
                  </span>
                  {section.title}
                </h2>
                <span className="text-xs text-[#94A3B8]">
                  {section.items.length} seçenek
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {section.items.map((item) => {
                  const isSelected = selectedIds[section.field] === item.id;
                  const price = getPartPriceForCondition(
                    item.id,
                    section.field,
                    preferences.condition,
                    pricingCatalog
                  );
                  const { isIncompatible, reason } = checkCandidateCompatibility(
                    section.field,
                    item.id
                  );
                  const blocked = compatLock && isIncompatible;
                  const techOpen = Boolean(expandedPartTech[item.id]);

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
                        isSelected
                          ? 'border-[#246BFD] bg-[#111827]'
                          : blocked
                            ? 'border-slate-800/60 bg-[#0D111A] opacity-65'
                            : isIncompatible
                              ? 'border-red-500/60 bg-[#111827]'
                              : 'border-slate-800 bg-[#111827] hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="block text-xs font-medium text-[#94A3B8]">
                              {item.brand}
                            </span>
                            <h3 className="mt-0.5 font-display text-base font-bold text-[#F5F7FA]">
                              {item.model}
                            </h3>
                          </div>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#246BFD] px-2 py-0.5 text-[11px] font-semibold text-[#F5F7FA] shrink-0">
                              <Check className="h-3 w-3" />
                              <span>Seçili</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-baseline justify-between gap-2">
                          <span className="font-mono text-xl font-bold tabular-nums text-[#FF7900]">
                            {price === 0 ? 'Dahili' : formatTry(price)}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPartTech((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#246BFD] hover:underline"
                          >
                            <span>
                              {techOpen
                                ? 'Teknik Özellikleri Gizle'
                                : 'Teknik Özellikleri Gör'}
                            </span>
                            {techOpen ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {techOpen && (
                          <div className="mt-3 rounded-lg bg-[#080B12] p-3 text-xs text-[#94A3B8]">
                            <p>{item.specSummary}</p>
                          </div>
                        )}

                        {isIncompatible && reason && (
                          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-red-500/40 bg-red-950/25 px-3 py-2 text-xs text-red-200">
                            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                            <span>{reason}</span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={blocked || isSelected}
                        onClick={() => handleSelectPart(section.field, item.id)}
                        className={`mt-4 flex min-h-[42px] w-full items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'cursor-default bg-[#080B12] text-[#246BFD] border border-[#246BFD]/50'
                            : blocked
                              ? 'cursor-not-allowed bg-[#080B12] text-[#94A3B8] border border-slate-800'
                              : 'cursor-pointer bg-[#246BFD] text-[#F5F7FA] hover:bg-[#3B7CFE]'
                        }`}
                      >
                        {isSelected
                          ? 'Sistemde Seçili'
                          : blocked
                            ? 'Uyumsuz (Seçim Engellendi)'
                            : 'Bu Parçayı Seç'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Right: Sticky System Summary Sidebar */}
        <aside
          aria-label="Sabit sistem özeti"
          className="lg:sticky lg:top-24 lg:col-span-4"
        >
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
                  Sistem Özeti
                </p>
                <h2 className="mt-0.5 font-display text-lg font-bold text-[#F5F7FA]">
                  {currentBuild.systemName}
                </h2>
              </div>
              <select
                value={preferences.condition}
                onChange={(e) =>
                  onChangePreferences({
                    ...preferences,
                    condition: e.target.value as ComponentCondition,
                  })
                }
                aria-label="Fiyatlandırma koşulu"
                className="h-9 rounded-lg border border-slate-700 bg-[#080B12] px-2.5 text-xs font-medium text-[#F5F7FA]"
              >
                <option value="sifir">Sıfır</option>
                <option value="karma">Karma</option>
                <option value="ikinci-el">İkinci El</option>
              </select>
            </div>

            {/* Big Total Price */}
            <div className="border-b border-slate-800 py-4">
              {currentBuild.zeroVsUsedSavingsTry > 0 && (
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-mono text-[#94A3B8] line-through tabular-nums">
                    {formatTry(currentBuild.allNewTotalTry)}
                  </span>
                  <span className="font-mono font-semibold text-[#FF7900]">
                    -%{currentBuild.zeroVsUsedSavingsPercent} Tasarruf
                  </span>
                </div>
              )}
              <span className="block font-mono text-3xl font-bold tabular-nums text-[#FF7900]">
                {formatTry(currentBuild.samplePriceTry)}
              </span>
            </div>

            {/* Live Compatibility Indicator */}
            <div
              className={`mt-4 rounded-lg border p-3.5 text-xs ${
                currentBuild.compatibility.overallStatus === 'verified'
                  ? 'border-[#246BFD]/40 bg-[#080B12] text-[#F5F7FA]'
                  : currentBuild.compatibility.overallStatus === 'needs_verification'
                    ? 'border-amber-500/40 bg-amber-950/20 text-amber-100'
                    : 'border-red-500/50 bg-red-950/30 text-red-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-2">
                  {currentBuild.compatibility.overallStatus === 'verified' && (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#246BFD]" />
                  )}
                  {currentBuild.compatibility.overallStatus === 'needs_verification' && (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  {currentBuild.compatibility.overallStatus === 'incompatible' && (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <span>
                    {currentBuild.compatibility.overallStatus === 'verified'
                      ? `Uyumluluk Doğrulandı (${currentBuild.compatibility.verifiedCount}/10)`
                      : currentBuild.compatibility.overallStatus === 'needs_verification'
                        ? `Doğrulama Gerekli (${currentBuild.compatibility.needsVerificationCount})`
                        : `Uyumsuzluk Tespit Edildi (${currentBuild.compatibility.incompatibleCount})`}
                  </span>
                </span>
              </div>

              {currentBuild.compatibility.warnings.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] opacity-90">
                  {currentBuild.compatibility.warnings.slice(0, 2).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setShowSummaryTech((p) => !p)}
                className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#246BFD] hover:underline"
              >
                <span>
                  {showSummaryTech
                    ? 'Teknik Özellikleri Gizle'
                    : 'Teknik Özellikleri Gör (10 Kontrol)'}
                </span>
                {showSummaryTech ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {showSummaryTech && (
                <div className="mt-2.5 space-y-1.5 border-t border-slate-800 pt-2.5 text-[11px]">
                  <p className="font-mono text-[#FF7900]">
                    Tepe Güç: ~{currentBuild.estimatedWattage ?? '?'}W · Önerilen PSU:{' '}
                    {currentBuild.recommendedPsuWatts ?? '?'}W
                  </p>
                  {currentBuild.compatibility.checks.map((c) => (
                    <div key={c.id} className="flex justify-between gap-2">
                      <span className="text-[#94A3B8]">{c.title}</span>
                      <span
                        className={
                          c.status === 'verified'
                            ? 'text-[#246BFD]'
                            : c.status === 'needs_verification'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {c.status === 'verified'
                          ? 'Tamam'
                          : c.status === 'needs_verification'
                            ? 'Kontrol'
                            : 'Hata'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 8 Selected Components Compact List */}
            <dl className="mt-4 divide-y divide-slate-800/70 text-xs">
              {summaryParts.map((part) => (
                <div
                  key={part.category}
                  className="flex items-baseline justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <dt className="text-[11px] text-[#94A3B8]">{part.label}</dt>
                    <dd className="truncate font-semibold text-[#F5F7FA]">
                      {part.model}
                    </dd>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-[#FF7900] shrink-0">
                    {part.priceTry === 0 ? 'Dahili' : formatTry(part.priceTry)}
                  </span>
                </div>
              ))}
            </dl>

            {/* Summary Actions */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => onInspectBuild(currentBuild)}
                className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-4 py-2.5 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
              >
                <span>Sistem Detayını İncele</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyList}
                  className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#080B12] px-3 py-2 text-xs font-medium text-[#F5F7FA] hover:border-slate-500"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#246BFD]" />
                      <span>Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#94A3B8]" />
                      <span>Listeyi Kopyala</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onManageListings()}
                  className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#080B12] px-3 py-2 text-xs font-medium text-[#FF7900] hover:border-[#FF7900]"
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>İlan Fiyatları</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
