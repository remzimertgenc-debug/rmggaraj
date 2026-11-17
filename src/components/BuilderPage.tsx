import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Gamepad2,
  Layers,
  Lock,
  LockOpen,
  Monitor,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  assembleBuildFromIds,
  CPU_BRAND_OPTIONS,
  formatTry,
  generateCompatibleCatalogBuilds,
  GPU_BRAND_OPTIONS,
  POPULAR_GAMES,
  PURPOSE_OPTIONS,
  RESOLUTION_OPTIONS,
} from '../data/builds';
import { BuildCard } from './BuildCard';
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
import { CATEGORY_LABELS } from '../data/partMedia';
import { ProductImage } from './ProductImage';
import {
  BasePartSpec,
  BuilderPreferences,
  CpuBrandPreference,
  GpuBrandPreference,
  PartCategoryKey,
  PcBuild,
  PricingCatalogResponse,
  SelectedPartIds,
} from '../types/pc';
import { evaluateCompatibility } from '../utils/compatibility';

interface BuilderPageProps {
  preferences: BuilderPreferences;
  selectedIds: SelectedPartIds;
  pricingCatalog: PricingCatalogResponse | null;
  pricingError: string | null;
  initialStepField?: keyof SelectedPartIds | null;
  onRetryPricing: () => void;
  onChangePreferences: (next: BuilderPreferences) => void;
  onChangeSelectedIds: (next: SelectedPartIds) => void;
  onResetAll: () => void;
  onInspectBuild: (build: PcBuild) => void;
  onInspectPart?: (category: PartCategoryKey, partId: string) => void;
}

type CategorySectionMeta = {
  index: string;
  shortTitle: string;
  title: string;
  guidance: string;
  field: keyof SelectedPartIds;
  items: BasePartSpec[];
};

const FIELD_TO_CATEGORY: Record<keyof SelectedPartIds, PartCategoryKey> = {
  cpuId: 'cpu',
  motherboardId: 'motherboard',
  gpuId: 'gpu',
  ramId: 'ram',
  ssdId: 'ssd',
  psuId: 'psu',
  caseId: 'pcCase',
  coolerId: 'cooler',
};

function normalizeBuilderSearch(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const SUPPORTED_BUILDER_SOCKETS = new Set(MOTHERBOARD_DB.map((m) => m.socket));

const CATEGORY_SECTIONS: CategorySectionMeta[] = [
  {
    index: '01',
    shortTitle: 'İşlemci',
    title: 'İşlemci',
    guidance:
      'Sistemin temel hızını belirler. Seçtiğiniz işlemci soketi bir sonraki adımda uyumlu anakartları filtreler.',
    field: 'cpuId',
    items: CPU_DB.filter((c) => SUPPORTED_BUILDER_SOCKETS.has(c.socket)),
  },
  {
    index: '02',
    shortTitle: 'Anakart',
    title: 'Anakart',
    guidance:
      'İşlemcinizin soketine, BIOS nesline ve VRM güç beslemesine uygun anakartı seçin.',
    field: 'motherboardId',
    items: MOTHERBOARD_DB,
  },
  {
    index: '03',
    shortTitle: 'Ekran Kartı',
    title: 'Ekran Kartı',
    guidance:
      'Oyun ve grafik performansının ana belirleyicisidir. Önerilen PSU ve kasa uzunluğu canlı kontrol edilir.',
    field: 'gpuId',
    items: GPU_DB.filter((g) => !g.isUnverifiedSpecSample),
  },
  {
    index: '04',
    shortTitle: 'RAM',
    title: 'RAM Bellek',
    guidance:
      'Anakartınızın desteklediği DDR4 veya DDR5 nesline uygun çift kanal bellek kiti seçin.',
    field: 'ramId',
    items: RAM_DB.filter((r) => !r.isUnverifiedSpecSample),
  },
  {
    index: '05',
    shortTitle: 'SSD',
    title: 'SSD Depolama',
    guidance:
      'Sistem açılışı ve oyun yükleme süreleri için PCIe NVMe M.2 kapasitesini belirleyin.',
    field: 'ssdId',
    items: SSD_DB,
  },
  {
    index: '06',
    shortTitle: 'PSU',
    title: 'Güç Kaynağı',
    guidance:
      'Ekran kartı ve işlemci tepe tüketimini karşılayan yeterli Watt ve güç konektörüne sahip PSU seçin.',
    field: 'psuId',
    items: PSU_DB,
  },
  {
    index: '07',
    shortTitle: 'Kasa',
    title: 'Bilgisayar Kasası',
    guidance:
      'Anakart boyutunu (ATX/mATX) ve ekran kartı uzunluğunu rahatça sığdıran kasayı seçin.',
    field: 'caseId',
    items: CASE_DB.filter((c) => !c.isUnverifiedSpecSample),
  },
  {
    index: '08',
    shortTitle: 'Soğutucu',
    title: 'İşlemci Soğutucu',
    guidance:
      'İşlemcinizin maksimum TDP ısısını sessiz ve serin tutacak kule tipi veya sıvı soğutucuyu seçin.',
    field: 'coolerId',
    items: CPU_COOLER_DB.filter((cl) => !cl.isUnverifiedSpecSample),
  },
];

function getPartPrice(
  partId: string,
  catalog: PricingCatalogResponse | null
): number {
  return catalog?.partsPricing[partId]?.newPriceTry ?? 0;
}

type BuilderMode = 'wizard' | 'catalog';
type CatalogSortOrder = 'recommended' | 'price-asc' | 'price-desc';

const BUDGET_PRESETS = [25000, 38000, 55000, 80000, 115000];

export function BuilderPage({
  preferences,
  selectedIds,
  pricingCatalog,
  pricingError,
  initialStepField,
  onRetryPricing,
  onChangePreferences,
  onChangeSelectedIds,
  onResetAll,
  onInspectBuild,
  onInspectPart,
}: BuilderPageProps) {
  const [builderMode, setBuilderMode] = useState<BuilderMode>('wizard');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(() => {
    if (!initialStepField) return 0;
    const idx = CATEGORY_SECTIONS.findIndex((s) => s.field === initialStepField);
    return idx >= 0 ? idx : 0;
  });
  const [compatLock, setCompatLock] = useState<boolean>(true);
  const [hideIncompatible, setHideIncompatible] = useState<boolean>(true);
  const [stepBrandFilter, setStepBrandFilter] = useState<string>('Tümü');
  const [draftCatalogPrefs, setDraftCatalogPrefs] = useState<BuilderPreferences>(preferences);
  const [appliedCatalogPrefs, setAppliedCatalogPrefs] = useState<BuilderPreferences>(preferences);
  const [catalogSort, setCatalogSort] = useState<CatalogSortOrder>('recommended');
  const [showAdvancedPrefs, setShowAdvancedPrefs] = useState<boolean>(false);
  const [showSummaryTech, setShowSummaryTech] = useState<boolean>(false);
  const [expandedPartTech, setExpandedPartTech] = useState<Record<string, boolean>>({});
  const [sectionQueries, setSectionQueries] = useState<Partial<Record<keyof SelectedPartIds, string>>>({});
  const [openSearchField, setOpenSearchField] = useState<keyof SelectedPartIds | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const searchBlurTimers = useRef<Partial<Record<keyof SelectedPartIds, number>>>({});
  const workspaceTopRef = useRef<HTMLDivElement | null>(null);
  const catalogResultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialStepField) return;
    const idx = CATEGORY_SECTIONS.findIndex((s) => s.field === initialStepField);
    if (idx >= 0) {
      setBuilderMode('wizard');
      setActiveStepIndex(idx);
      setStepBrandFilter('Tümü');
    }
  }, [initialStepField]);

  const activeSection = CATEGORY_SECTIONS[activeStepIndex] ?? CATEGORY_SECTIONS[0];
  const activeCategoryKey = FIELD_TO_CATEGORY[activeSection.field];

  const catalogResult = useMemo(() => {
    if (!pricingCatalog) {
      return {
        builds: [],
        totalVerifiedPoolCount: 0,
        usedBudgetFallback: false,
      };
    }
    return generateCompatibleCatalogBuilds(appliedCatalogPrefs, pricingCatalog, 12);
  }, [appliedCatalogPrefs, pricingCatalog]);

  const sortedCatalogBuilds = useMemo(() => {
    const list = [...catalogResult.builds];
    if (catalogSort === 'price-asc') {
      return list.sort((a, b) => a.samplePriceTry - b.samplePriceTry);
    }
    if (catalogSort === 'price-desc') {
      return list.sort((a, b) => b.samplePriceTry - a.samplePriceTry);
    }
    return list;
  }, [catalogResult.builds, catalogSort]);

  const handleToggleCatalogGame = (game: string) => {
    setDraftCatalogPrefs((prev) => {
      const exists = prev.favoriteGames.includes(game);
      return {
        ...prev,
        favoriteGames: exists
          ? prev.favoriteGames.filter((g) => g !== game)
          : [...prev.favoriteGames, game],
      };
    });
  };

  const handleSearchCatalogSystems = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const clampedBudget = Math.min(200000, Math.max(15000, draftCatalogPrefs.budget || 50000));
    const nextPrefs: BuilderPreferences = {
      ...draftCatalogPrefs,
      budget: clampedBudget,
    };
    setDraftCatalogPrefs(nextPrefs);
    setAppliedCatalogPrefs(nextPrefs);
    onChangePreferences(nextPrefs);
    window.setTimeout(() => {
      catalogResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleCustomizeFromCatalog = (build: PcBuild) => {
    onChangeSelectedIds(build.selectedIds);
    onChangePreferences({
      ...appliedCatalogPrefs,
      budget: Math.min(200000, Math.max(18000, build.samplePriceTry)),
      resolution: build.targetResolution,
      purpose: build.suitedPurposes[0] ?? appliedCatalogPrefs.purpose,
    });
    setBuilderMode('wizard');
    setActiveStepIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    candidateId: string,
    includeSelectedCheck = true
  ): { isIncompatible: boolean; reason: string | null } => {
    if (includeSelectedCheck && candidateId === selectedIds[field]) {
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

  // Kullanıcı bir bileşen seçtiğinde yalnızca o bileşen güncellenir; sayfa değişmez.
  const handleSelectPart = (field: keyof SelectedPartIds, partId: string) => {
    onChangeSelectedIds({
      ...selectedIds,
      [field]: partId,
    });
  };

  const goToStep = (index: number) => {
    const clamped = Math.max(0, Math.min(CATEGORY_SECTIONS.length - 1, index));
    setActiveStepIndex(clamped);
    setStepBrandFilter('Tümü');
    setOpenSearchField(null);
    workspaceTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      `RMG Garaj — Özel Sistem Toplama`,
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

  // Aktif adım marka seçenekleri
  const stepBrands = useMemo(() => {
    const unique = Array.from(new Set(activeSection.items.map((it) => it.brand)));
    return unique.length > 1 ? ['Tümü', ...unique] : [];
  }, [activeSection]);

  const activeQuery = (sectionQueries[activeSection.field] ?? '').trim();
  const normalizedActiveQuery = normalizeBuilderSearch(activeQuery);

  const selectedActiveItem = activeSection.items.find(
    (it) => it.id === selectedIds[activeSection.field]
  );

  // Dropdown arama sonuçları (tüm adımla eşleşenler)
  const searchMatches = useMemo(() => {
    if (normalizedActiveQuery.length === 0) return activeSection.items;
    return activeSection.items.filter(
      (it) =>
        normalizeBuilderSearch(it.model).includes(normalizedActiveQuery) ||
        normalizeBuilderSearch(it.brand).includes(normalizedActiveQuery) ||
        normalizeBuilderSearch(it.specSummary).includes(normalizedActiveQuery)
    );
  }, [activeSection.items, normalizedActiveQuery]);

  // Gridde gösterilecek kartlar (marka ve uyumluluk filtresi uygulanmış)
  const { visibleItems, hiddenIncompatCount } = useMemo(() => {
    let incompatCount = 0;
    const filtered = activeSection.items.filter((item) => {
      if (stepBrandFilter !== 'Tümü' && item.brand !== stepBrandFilter) {
        return false;
      }
      if (
        normalizedActiveQuery.length > 0 &&
        !normalizeBuilderSearch(item.model).includes(normalizedActiveQuery) &&
        !normalizeBuilderSearch(item.brand).includes(normalizedActiveQuery) &&
        !normalizeBuilderSearch(item.specSummary).includes(normalizedActiveQuery)
      ) {
        return false;
      }
      const { isIncompatible } = checkCandidateCompatibility(
        activeSection.field,
        item.id
      );
      if (isIncompatible) {
        incompatCount += 1;
        if (compatLock && hideIncompatible && item.id !== selectedIds[activeSection.field]) {
          return false;
        }
      }
      return true;
    });
    return { visibleItems: filtered, hiddenIncompatCount: incompatCount };
  }, [
    activeSection,
    stepBrandFilter,
    normalizedActiveQuery,
    compatLock,
    hideIncompatible,
    selectedIds,
  ]);

  const selectedCurrentCompat = selectedActiveItem
    ? checkCandidateCompatibility(activeSection.field, selectedActiveItem.id, false)
    : { isIncompatible: false, reason: null };

  const progressPercent = Math.round(
    ((activeStepIndex + 1) / CATEGORY_SECTIONS.length) * 100
  );

  const prevSection = activeStepIndex > 0 ? CATEGORY_SECTIONS[activeStepIndex - 1] : null;
  const nextSection =
    activeStepIndex < CATEGORY_SECTIONS.length - 1
      ? CATEGORY_SECTIONS[activeStepIndex + 1]
      : null;

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Clean Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/90 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
            {builderMode === 'wizard'
              ? 'Adım Adım Sistem Sihirbazı'
              : 'Bütçe ve Tercih Odaklı Sistem Arama'}
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-[#F5F7FA] sm:text-4xl">
            Bilgisayar Topla
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#94A3B8]">
            {builderMode === 'wizard'
              ? '8 adımı sırayla tamamlayın veya sağdaki özetten dilediğiniz parçaya atlayın; uyumluluk ve toplam bütçe anlık hesaplansın.'
              : 'Bütçenizi, kullanım amacınızı, oynayacağınız oyunları ve çözünürlük hedefini seçin; %100 uyumlu parçalardan oluşan sistemleri katalog halinde listeleyin.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {builderMode === 'wizard' && (
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
              {compatLock ? (
                <Lock className="h-3.5 w-3.5 text-[#246BFD]" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
              <span>{compatLock ? 'Uyumluluk Kilidi: Açık' : 'Uyumluluk Kilidi: Kapalı'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onResetAll();
              setActiveStepIndex(0);
              setStepBrandFilter('Tümü');
              const defaultReset: BuilderPreferences = {
                budget: 58000,
                purpose: 'oyun',
                favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
                resolution: '1440p',
                cpuBrandPref: 'farketmez',
                gpuBrandPref: 'farketmez',
              };
              setDraftCatalogPrefs(defaultReset);
              setAppliedCatalogPrefs(defaultReset);
            }}
            className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 bg-[#111827] px-3.5 py-2 text-xs font-medium text-[#94A3B8] hover:text-[#F5F7FA]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Sıfırla</span>
          </button>
        </div>
      </div>

      {/* 2-Mode Selector Cards */}
      <div
        role="tablist"
        aria-label="Bilgisayar toplama yöntemi"
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={builderMode === 'wizard'}
          onClick={() => setBuilderMode('wizard')}
          className={`flex cursor-pointer items-start gap-4 rounded-xl border p-5 text-left transition-colors ${
            builderMode === 'wizard'
              ? 'border-[#246BFD] bg-[#111827]'
              : 'border-slate-800 bg-[#111827]/60 hover:border-slate-600'
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
              builderMode === 'wizard'
                ? 'border-[#246BFD] bg-[#246BFD] text-[#F5F7FA]'
                : 'border-slate-700 bg-[#080B12] text-[#94A3B8]'
            }`}
          >
            <Wrench className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold text-[#F5F7FA]">
                Kendin Topla — Sistem Sihirbazı
              </span>
              {builderMode === 'wizard' && (
                <span className="text-xs font-semibold text-[#246BFD]">Aktif Mod</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
              İşlemci, anakart, ekran kartı, RAM ve diğer tüm parçaları 8 adımda tek tek
              kendiniz seçin.
            </p>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={builderMode === 'catalog'}
          onClick={() => setBuilderMode('catalog')}
          className={`flex cursor-pointer items-start gap-4 rounded-xl border p-5 text-left transition-colors ${
            builderMode === 'catalog'
              ? 'border-[#FF7900] bg-[#111827]'
              : 'border-slate-800 bg-[#111827]/60 hover:border-slate-600'
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
              builderMode === 'catalog'
                ? 'border-[#FF7900] bg-[#FF7900] text-[#080B12]'
                : 'border-slate-700 bg-[#080B12] text-[#94A3B8]'
            }`}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-bold text-[#F5F7FA]">
                Bütçeye Göre Sistem Bul — Akıllı Katalog
              </span>
              {builderMode === 'catalog' && (
                <span className="text-xs font-semibold text-[#FF7900]">Aktif Mod</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
              Sadece bütçe, kullanım amacı, oyun ve görüntü seçeneklerini girin; uyumlu
              parçalardan oluşan sistemleri katalog halinde listeleyin.
            </p>
          </div>
        </button>
      </div>

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

      {/* MODE 2: BUDGET / PURPOSE / GAMES / RESOLUTION COMPATIBLE CATALOG */}
      {builderMode === 'catalog' && (
        <div className="mt-6 space-y-8">
          <form
            onSubmit={handleSearchCatalogSystems}
            className="rounded-xl border border-slate-800 bg-[#111827] p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* 1. Bütçe Belirleme */}
              <div className="lg:col-span-5">
                <div className="flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="catalog-budget-input"
                    className="font-display text-lg font-bold text-[#F5F7FA]"
                  >
                    1. Bütçeni Belirle
                  </label>
                  <span className="font-mono text-2xl font-bold tabular-nums text-[#FF7900]">
                    {formatTry(draftCatalogPrefs.budget)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  Belirlediğiniz üst bütçeye kadar tam uyumlu sistemler listelenir.
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      id="catalog-budget-input"
                      type="number"
                      min={15000}
                      max={200000}
                      step={500}
                      value={draftCatalogPrefs.budget}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        setDraftCatalogPrefs((prev) => ({
                          ...prev,
                          budget: Number.isFinite(raw) ? raw : 15000,
                        }));
                      }}
                      className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3.5 pr-10 font-mono text-sm font-semibold text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#94A3B8]">
                      TL
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={18000}
                  max={160000}
                  step={1000}
                  aria-label="Hedef bütçe kaydırıcısı"
                  value={Math.min(160000, Math.max(18000, draftCatalogPrefs.budget))}
                  onChange={(e) =>
                    setDraftCatalogPrefs((prev) => ({
                      ...prev,
                      budget: Number(e.target.value),
                    }))
                  }
                  className="rmg-slider mt-4 w-full"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setDraftCatalogPrefs((prev) => ({
                          ...prev,
                          budget: preset,
                        }))
                      }
                      className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                        draftCatalogPrefs.budget === preset
                          ? 'border-[#FF7900] bg-[#080B12] text-[#FF7900]'
                          : 'border-slate-800 bg-[#080B12] text-[#94A3B8] hover:border-slate-600 hover:text-[#F5F7FA]'
                      }`}
                    >
                      {formatTry(preset)}
                    </button>
                  ))}
                </div>

                {/* 3. Görüntü Seçenekleri (Çözünürlük) */}
                <div className="mt-8">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-[#246BFD]" />
                    <span className="font-display text-lg font-bold text-[#F5F7FA]">
                      3. Görüntü Seçenekleri
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Hedeflediğiniz monitör çözünürlüğünü seçin.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {RESOLUTION_OPTIONS.map((res) => {
                      const active = draftCatalogPrefs.resolution === res.id;
                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() =>
                            setDraftCatalogPrefs((prev) => ({
                              ...prev,
                              resolution: res.id,
                            }))
                          }
                          className={`cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                            active
                              ? 'border-[#246BFD] bg-[#080B12]'
                              : 'border-slate-800 bg-[#080B12]/70 hover:border-slate-600'
                          }`}
                        >
                          <span
                            className={`block font-display text-sm font-bold ${
                              active ? 'text-[#246BFD]' : 'text-[#F5F7FA]'
                            }`}
                          >
                            {res.title}
                          </span>
                          <span className="mt-1 block text-[11px] leading-snug text-[#94A3B8]">
                            {res.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Kullanım Amacı + 4. Oyun Seçenekleri */}
              <div className="space-y-8 lg:col-span-7">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#FF7900]" />
                    <span className="font-display text-lg font-bold text-[#F5F7FA]">
                      2. Kullanım Amacı
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    İşlemci, ekran kartı VRAM ve bellek dağılımı kullanım amacınıza göre optimize
                    edilir.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PURPOSE_OPTIONS.map((purpose) => {
                      const active = draftCatalogPrefs.purpose === purpose.id;
                      return (
                        <button
                          key={purpose.id}
                          type="button"
                          onClick={() =>
                            setDraftCatalogPrefs((prev) => ({
                              ...prev,
                              purpose: purpose.id,
                            }))
                          }
                          className={`cursor-pointer rounded-lg border p-3.5 text-left transition-colors ${
                            active
                              ? 'border-[#246BFD] bg-[#080B12]'
                              : 'border-slate-800 bg-[#080B12]/70 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-display text-sm font-bold ${
                                active ? 'text-[#246BFD]' : 'text-[#F5F7FA]'
                              }`}
                            >
                              {purpose.title}
                            </span>
                            {active && <Check className="h-4 w-4 text-[#246BFD]" />}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                            {purpose.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-[#246BFD]" />
                      <span className="font-display text-lg font-bold text-[#F5F7FA]">
                        4. Oyun Seçenekleri
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#94A3B8]">
                        {draftCatalogPrefs.favoriteGames.length} oyun seçili
                      </span>
                      {draftCatalogPrefs.favoriteGames.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftCatalogPrefs((prev) => ({
                              ...prev,
                              favoriteGames: [],
                            }))
                          }
                          className="cursor-pointer font-medium text-[#FF7900] hover:underline"
                        >
                          Temizle
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Oynamak istediğiniz oyunları seçin; rekabetçi FPS veya ağır AAA grafik
                    gereksinimleri puanlamaya dahil edilsin.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
                    {POPULAR_GAMES.map((game) => {
                      const active = draftCatalogPrefs.favoriteGames.includes(game);
                      return (
                        <button
                          key={game}
                          type="button"
                          onClick={() => handleToggleCatalogGame(game)}
                          className={`flex min-h-[42px] cursor-pointer items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                            active
                              ? 'border-[#246BFD] bg-[#080B12] text-[#F5F7FA]'
                              : 'border-slate-800 bg-[#080B12]/70 text-[#94A3B8] hover:border-slate-600 hover:text-[#F5F7FA]'
                          }`}
                        >
                          <span className="truncate">{game}</span>
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#246BFD]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Extra Preferences + Main Search Button */}
            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setShowAdvancedPrefs((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#F5F7FA]"
                >
                  {showAdvancedPrefs ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>İsteğe Bağlı: İşlemci ve Ekran Kartı Marka Tercihi</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-7 py-3 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
                >
                  <Search className="h-4 w-4" />
                  <span>Uyumlu Sistemleri Ara</span>
                </button>
              </div>

              {showAdvancedPrefs && (
                <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-slate-800 bg-[#080B12] p-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#94A3B8]">
                      İşlemci Tercihi
                    </span>
                    <select
                      value={draftCatalogPrefs.cpuBrandPref}
                      onChange={(e) =>
                        setDraftCatalogPrefs((prev) => ({
                          ...prev,
                          cpuBrandPref: e.target.value as CpuBrandPreference,
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-700 bg-[#111827] px-3 text-xs text-[#F5F7FA]"
                    >
                      {CPU_BRAND_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#94A3B8]">
                      Ekran Kartı Tercihi
                    </span>
                    <select
                      value={draftCatalogPrefs.gpuBrandPref}
                      onChange={(e) =>
                        setDraftCatalogPrefs((prev) => ({
                          ...prev,
                          gpuBrandPref: e.target.value as GpuBrandPreference,
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-700 bg-[#111827] px-3 text-xs text-[#F5F7FA]"
                    >
                      {GPU_BRAND_OPTIONS.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </form>

          {/* Catalog Search Results */}
          <section ref={catalogResultsRef} aria-label="Uyumlu sistem kataloğu">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#246BFD]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>10/10 Teknik Uyumluluk Doğrulanmış Katalog</span>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#F5F7FA]">
                  Uyumlu Sistem Kataloğu
                </h2>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  Bütçe:{' '}
                  <span className="font-mono font-semibold text-[#FF7900]">
                    {formatTry(appliedCatalogPrefs.budget)}
                  </span>{' '}
                  · Amaç:{' '}
                  <span className="text-[#F5F7FA]">
                    {PURPOSE_OPTIONS.find((p) => p.id === appliedCatalogPrefs.purpose)?.title}
                  </span>{' '}
                  · Görüntü:{' '}
                  <span className="text-[#F5F7FA]">
                    {appliedCatalogPrefs.resolution.toUpperCase()}
                  </span>{' '}
                  · {sortedCatalogBuilds.length} farklı sistem listeleniyor
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="catalog-sort" className="text-xs text-[#94A3B8]">
                  Sıralama:
                </label>
                <select
                  id="catalog-sort"
                  value={catalogSort}
                  onChange={(e) => setCatalogSort(e.target.value as CatalogSortOrder)}
                  className="h-10 rounded-lg border border-slate-700 bg-[#111827] px-3 text-xs font-medium text-[#F5F7FA]"
                >
                  <option value="recommended">Önerilen Eşleşme</option>
                  <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
                  <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
                </select>
              </div>
            </div>

            {catalogResult.usedBudgetFallback && sortedCatalogBuilds.length > 0 && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Belirlediğiniz {formatTry(appliedCatalogPrefs.budget)} bütçe sınırının
                  altında doğrulanmış uyumlu sistem bulunamadığı için en düşük fiyatlı tam
                  uyumlu sistemler listelendi.
                </span>
              </div>
            )}

            {!pricingCatalog ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="h-[340px] animate-pulse rounded-xl border border-slate-800 bg-[#111827] sm:h-[440px]"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                {sortedCatalogBuilds.map((build) => (
                  <BuildCard
                    key={build.id}
                    build={build}
                    onInspect={onInspectBuild}
                    onCustomize={handleCustomizeFromCatalog}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MODE 1: 8-STEP PROGRESS STEPPER & WIZARD */}
      {builderMode === 'wizard' && (
        <>
          <div
            ref={workspaceTopRef}
            className="mt-6 rounded-xl border border-slate-800 bg-[#111827] p-4"
          >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#F5F7FA]">
            Adım {activeStepIndex + 1} / {CATEGORY_SECTIONS.length}:{' '}
            <span className="text-[#FF7900]">{activeSection.title} Seçimi</span>
          </span>
          <span className="font-mono text-[#94A3B8] tabular-nums">
            %{progressPercent}
          </span>
        </div>

        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#080B12]">
          <div
            className="h-full rounded-full bg-[#246BFD] transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Sistem toplama adımları"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8"
        >
          {CATEGORY_SECTIONS.map((sec, idx) => {
            const isActive = idx === activeStepIndex;
            const picked = sec.items.find((it) => it.id === selectedIds[sec.field]);
            const compatState = picked
              ? checkCandidateCompatibility(sec.field, picked.id, false)
              : { isIncompatible: false, reason: null };

            return (
              <button
                key={sec.field}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => goToStep(idx)}
                className={`flex cursor-pointer flex-col justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'border-[#246BFD] bg-[#080B12]'
                    : compatState.isIncompatible
                      ? 'border-red-500/60 bg-[#080B12]/70 hover:border-red-400'
                      : 'border-slate-800 bg-[#080B12]/70 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      isActive ? 'text-[#FF7900]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {sec.index}
                  </span>
                  {compatState.isIncompatible ? (
                    <span className="text-[10px] font-semibold text-red-400">Uyumsuz</span>
                  ) : (
                    <Check
                      className={`h-3 w-3 ${
                        isActive ? 'text-[#246BFD]' : 'text-emerald-400'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`mt-1 block truncate text-xs font-semibold ${
                    isActive ? 'text-[#F5F7FA]' : 'text-[#94A3B8]'
                  }`}
                >
                  {sec.shortTitle}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[#94A3B8]">
                  {picked ? picked.model.replace(/^(AMD|Intel|NVIDIA GeForce|Corsair|MSI|ASUS|Samsung)\s+/i, '') : 'Seçilmedi'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Wizard Workspace */}
      <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left: Active Single-Step Workspace */}
        <section
          aria-label={`Adım ${activeStepIndex + 1}: ${activeSection.title}`}
          className="lg:col-span-8"
        >
          {/* Step Header & Guidance */}
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-[#246BFD]">
                  Adım {activeStepIndex + 1} / {CATEGORY_SECTIONS.length}
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold text-[#F5F7FA]">
                  {activeSection.title} Seçin
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm text-[#94A3B8]">
                  {activeSection.guidance}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!prevSection}
                  onClick={() => goToStep(activeStepIndex - 1)}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    prevSection
                      ? 'cursor-pointer border-slate-700 bg-[#080B12] text-[#F5F7FA] hover:border-slate-500'
                      : 'cursor-not-allowed border-slate-800/60 bg-[#080B12]/40 text-slate-600'
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Geri</span>
                </button>
                {nextSection && (
                  <button
                    type="button"
                    onClick={() => goToStep(activeStepIndex + 1)}
                    className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg bg-[#246BFD] px-3.5 py-1.5 text-xs font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
                  >
                    <span>Sonraki: {nextSection.shortTitle}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Selection Highlight Strip */}
            {selectedActiveItem && (
              <div
                className={`mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${
                  selectedCurrentCompat.isIncompatible
                    ? 'border-red-500/60 bg-red-950/20'
                    : 'border-[#246BFD]/50 bg-[#080B12]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#111827]">
                    <ProductImage
                      compact
                      imageUrl={pricingCatalog?.productImages?.[selectedActiveItem.id]}
                      category={activeCategoryKey}
                      model={selectedActiveItem.model}
                      brand={selectedActiveItem.brand}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold text-[#246BFD]">
                      Şu An Seçili {activeSection.shortTitle}
                    </span>
                    <p className="truncate font-display text-base font-bold text-[#F5F7FA]">
                      {selectedActiveItem.model}
                    </p>
                    <p className="truncate text-xs text-[#94A3B8]">
                      {selectedCurrentCompat.isIncompatible && selectedCurrentCompat.reason
                        ? selectedCurrentCompat.reason
                        : selectedActiveItem.specSummary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-lg font-bold tabular-nums text-[#FF7900]">
                    {(() => {
                      const p = getPartPrice(selectedActiveItem.id, pricingCatalog);
                      if (p > 0) return formatTry(p);
                      return selectedActiveItem.id === 'gpu-apu-vega7' ||
                        selectedActiveItem.id === 'cooler-stock-wraith'
                        ? 'Dahili'
                        : 'Fiyat Bekleniyor';
                    })()}
                  </span>
                  {onInspectPart && (
                    <button
                      type="button"
                      onClick={() =>
                        onInspectPart(activeCategoryKey, selectedActiveItem.id)
                      }
                      className="cursor-pointer rounded-lg border border-slate-700 bg-[#111827] px-3 py-1.5 text-xs font-medium text-[#F5F7FA] hover:border-[#246BFD]"
                    >
                      Ürün Sayfası
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inline Search + Filter Toolbar */}
            <div className="mt-5 space-y-3">
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={sectionQueries[activeSection.field] ?? ''}
                    onFocus={() => {
                      const t = searchBlurTimers.current[activeSection.field];
                      if (t) window.clearTimeout(t);
                      setOpenSearchField(activeSection.field);
                    }}
                    onBlur={() => {
                      searchBlurTimers.current[activeSection.field] = window.setTimeout(
                        () => {
                          setOpenSearchField((prev) =>
                            prev === activeSection.field ? null : prev
                          );
                        },
                        180
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setOpenSearchField(null);
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSectionQueries((prev) => ({
                        ...prev,
                        [activeSection.field]: val,
                      }));
                      setOpenSearchField(activeSection.field);
                    }}
                    placeholder={`${activeSection.title} modeli yazarak arayın ve seçin...`}
                    aria-label={`${activeSection.title} model arama`}
                    className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] pl-10 pr-24 text-sm text-[#F5F7FA] placeholder:text-[#94A3B8] transition-colors focus:border-[#246BFD] focus:outline-none"
                  />
                  {(activeQuery.length > 0 || openSearchField === activeSection.field) && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSectionQueries((prev) => ({
                          ...prev,
                          [activeSection.field]: '',
                        }));
                        setOpenSearchField(null);
                      }}
                      className="absolute right-2 inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-700 bg-[#111827] px-2.5 py-1 text-xs font-medium text-[#94A3B8] hover:border-slate-500 hover:text-[#F5F7FA]"
                      aria-label={`${activeSection.title} arama sonuçlarını kapat`}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Kapat</span>
                    </button>
                  )}
                </div>

                {openSearchField === activeSection.field && (
                  <div
                    role="listbox"
                    aria-label={`${activeSection.title} arama sonuçları`}
                    className="absolute left-0 right-0 top-12 z-30 max-h-80 overflow-y-auto rounded-xl border border-slate-700 bg-[#111827] shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2 text-xs text-[#94A3B8]">
                      <span>
                        {searchMatches.length} {activeSection.title.toLowerCase()} sonucu
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setOpenSearchField(null)}
                        className="cursor-pointer font-semibold text-[#246BFD] hover:underline"
                      >
                        Listeyi Kapat
                      </button>
                    </div>

                    {searchMatches.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-[#94A3B8]">
                        &ldquo;{activeQuery}&rdquo; ile eşleşen {activeSection.title.toLowerCase()} bulunamadı.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-800/80">
                        {searchMatches.map((match) => {
                          const matchSelected =
                            selectedIds[activeSection.field] === match.id;
                          const matchPrice = getPartPrice(match.id, pricingCatalog);
                          const { isIncompatible: matchIncompat, reason: matchReason } =
                            checkCandidateCompatibility(activeSection.field, match.id);
                          const matchBlocked = compatLock && matchIncompat;

                          return (
                            <button
                              key={match.id}
                              type="button"
                              role="option"
                              aria-selected={matchSelected}
                              disabled={matchBlocked}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                if (matchBlocked) return;
                                handleSelectPart(activeSection.field, match.id);
                                setOpenSearchField(null);
                              }}
                              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                                matchBlocked
                                  ? 'cursor-not-allowed bg-[#0D111A] opacity-60'
                                  : matchSelected
                                    ? 'cursor-pointer bg-[#080B12]'
                                    : 'cursor-pointer hover:bg-[#080B12]'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md border border-slate-800 bg-[#080B12]">
                                  <ProductImage
                                    compact
                                    imageUrl={pricingCatalog?.productImages?.[match.id]}
                                    category={activeCategoryKey}
                                    model={match.model}
                                    brand={match.brand}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-[#F5F7FA]">
                                      {match.model}
                                    </span>
                                    {matchSelected && (
                                      <span className="text-[11px] font-semibold text-[#246BFD]">
                                        · Seçili
                                      </span>
                                    )}
                                    {matchIncompat && (
                                      <span className="text-[11px] font-semibold text-red-400">
                                        · Uyumsuz
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                                    {matchBlocked && matchReason
                                      ? matchReason
                                      : match.specSummary}
                                  </p>
                                </div>
                              </div>
                              <span className="font-mono text-xs font-bold tabular-nums text-[#FF7900] shrink-0">
                                {matchPrice === 0
                                  ? match.id === 'gpu-apu-vega7' ||
                                    match.id === 'cooler-stock-wraith'
                                    ? 'Dahili'
                                    : 'Fiyat Bekleniyor'
                                  : formatTry(matchPrice)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Brand Pills & Compatibility Filter Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {stepBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setStepBrandFilter(brand)}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        stepBrandFilter === brand
                          ? 'bg-[#246BFD] text-[#F5F7FA]'
                          : 'border border-slate-800 bg-[#080B12] text-[#94A3B8] hover:text-[#F5F7FA]'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                  <span>
                    {visibleItems.length} seçenek listeleniyor
                    {hiddenIncompatCount > 0 && compatLock && hideIncompatible
                      ? ` (${hiddenIncompatCount} uyumsuz gizlendi)`
                      : ''}
                  </span>
                  {compatLock && (hiddenIncompatCount > 0 || !hideIncompatible) && (
                    <button
                      type="button"
                      onClick={() => setHideIncompatible((prev) => !prev)}
                      className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#246BFD] hover:underline"
                    >
                      {hideIncompatible ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Tümünü Göster</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Uyumsuzları Gizle</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Step Component Grid */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4">
            {visibleItems.map((item) => {
              const isSelected = selectedIds[activeSection.field] === item.id;
              const price = getPartPrice(item.id, pricingCatalog);
              const { isIncompatible, reason } = checkCandidateCompatibility(
                activeSection.field,
                item.id
              );
              const blocked = compatLock && isIncompatible;
              const techOpen = Boolean(expandedPartTech[item.id]);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border p-3 transition-colors sm:p-5 ${
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                        <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#080B12] sm:h-14 sm:w-16">
                          <ProductImage
                            compact
                            imageUrl={pricingCatalog?.productImages?.[item.id]}
                            category={activeCategoryKey}
                            model={item.model}
                            brand={item.brand}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[11px] font-medium text-[#94A3B8] sm:text-xs">
                            {item.brand}
                          </span>
                          <h3 className="mt-0.5 line-clamp-2 font-display text-xs font-bold leading-snug text-[#F5F7FA] sm:text-base">
                            {item.model}
                          </h3>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="inline-flex w-fit items-center gap-1 rounded bg-[#246BFD] px-2 py-0.5 text-[10px] font-semibold text-[#F5F7FA] shrink-0 sm:text-[11px]">
                          <Check className="h-3 w-3" />
                          <span>Seçili</span>
                        </span>
                      )}
                    </div>

                    <p className="mt-2 hidden text-xs text-[#94A3B8] sm:mt-3 sm:block">{item.specSummary}</p>

                    <div className="mt-2.5 flex flex-col gap-1 sm:mt-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                      <span className="font-mono text-base font-bold tabular-nums text-[#FF7900] sm:text-xl">
                        {price === 0
                          ? item.id === 'gpu-apu-vega7' ||
                            item.id === 'cooler-stock-wraith'
                            ? 'Dahili'
                            : 'Fiyat Bekleniyor'
                          : formatTry(price)}
                      </span>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPartTech((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#246BFD] hover:underline sm:text-xs"
                        >
                          <span>{techOpen ? 'Gizle' : 'Detay'}</span>
                          {techOpen ? (
                            <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          ) : (
                            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          )}
                        </button>
                        {onInspectPart && (
                          <button
                            type="button"
                            onClick={() => onInspectPart(activeCategoryKey, item.id)}
                            className="cursor-pointer text-[11px] font-medium text-[#94A3B8] hover:text-[#F5F7FA] sm:text-xs"
                          >
                            İncele
                          </button>
                        )}
                      </div>
                    </div>

                    {techOpen && (
                      <div className="mt-2.5 rounded-lg bg-[#080B12] p-2.5 text-[11px] text-[#94A3B8] sm:mt-3 sm:p-3 sm:text-xs">
                        <p>{item.specSummary}</p>
                      </div>
                    )}

                    {isIncompatible && reason && (
                      <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-red-500/40 bg-red-950/25 px-2.5 py-1.5 text-[11px] text-red-200 sm:mt-3 sm:px-3 sm:py-2 sm:text-xs">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                        <span>{reason}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={blocked || isSelected}
                    onClick={() => handleSelectPart(activeSection.field, item.id)}
                    className={`mt-3 flex min-h-[36px] w-full items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:mt-4 sm:min-h-[42px] sm:px-4 sm:py-2 sm:text-xs ${
                      isSelected
                        ? 'cursor-default border border-[#246BFD]/50 bg-[#080B12] text-[#246BFD]'
                        : blocked
                          ? 'cursor-not-allowed border border-slate-800 bg-[#080B12] text-[#94A3B8]'
                          : 'cursor-pointer bg-[#246BFD] text-[#F5F7FA] hover:bg-[#3B7CFE]'
                    }`}
                  >
                    {isSelected
                      ? 'Seçili'
                      : blocked
                        ? 'Uyumsuz'
                        : 'Parçayı Seç'}
                  </button>
                </div>
              );
            })}
          </div>

          {visibleItems.length === 0 && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-[#111827] p-8 text-center">
              <p className="text-sm text-[#94A3B8]">
                Mevcut arama veya marka filtresine uygun parça bulunamadı.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStepBrandFilter('Tümü');
                  setSectionQueries((prev) => ({
                    ...prev,
                    [activeSection.field]: '',
                  }));
                }}
                className="mt-3 cursor-pointer rounded-lg border border-slate-700 bg-[#080B12] px-4 py-2 text-xs font-semibold text-[#F5F7FA] hover:border-[#246BFD]"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}

          {/* Bottom Step Footer Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] p-4">
            <button
              type="button"
              disabled={!prevSection}
              onClick={() => goToStep(activeStepIndex - 1)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                prevSection
                  ? 'cursor-pointer border-slate-700 bg-[#080B12] text-[#F5F7FA] hover:border-slate-500'
                  : 'cursor-not-allowed border-slate-800/60 bg-[#080B12]/40 text-slate-600'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{prevSection ? `Önceki: ${prevSection.shortTitle}` : 'İlk Adım'}</span>
            </button>

            <span className="text-xs font-medium text-[#94A3B8]">
              Adım {activeStepIndex + 1} / {CATEGORY_SECTIONS.length} · {activeSection.title}
            </span>

            {nextSection ? (
              <button
                type="button"
                onClick={() => goToStep(activeStepIndex + 1)}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#246BFD] px-5 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
              >
                <span>Sonraki Adım: {nextSection.shortTitle}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onInspectBuild(currentBuild)}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#FF7900] px-5 py-2 text-xs font-bold text-[#080B12] transition-opacity hover:opacity-90"
              >
                <span>Sistemi Tamamla ve İncele</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        {/* Right: Sticky System Summary Sidebar (Every slot jumps directly to its step!) */}
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
            </div>

            {/* Big Total Price */}
            <div className="border-b border-slate-800 py-4">
              {currentBuild.bundleSavingsTry > 0 && (
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-mono text-[#94A3B8] line-through tabular-nums">
                    {formatTry(currentBuild.allNewTotalTry)}
                  </span>
                  <span className="font-mono font-semibold text-[#FF7900]">
                    -%{currentBuild.bundleSavingsPercent} Tasarruf
                  </span>
                </div>
              )}
              <span className="block font-mono text-3xl font-bold tabular-nums text-[#FF7900]">
                {formatTry(currentBuild.samplePriceTry)}
              </span>
              <span className="mt-1 block text-[11px] text-[#94A3B8]">
                {currentBuild.hasRealListingData
                  ? 'Canlı mağaza ve referans bileşen toplamı'
                  : 'Referans tahmini bileşen toplamı'}
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
                    : 'Teknik Kontrolleri Gör (10 Kontrol)'}
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

            {/* 8 Clickable Component Slots */}
            <div className="mt-4 divide-y divide-slate-800/70 text-xs">
              {summaryParts.map((part, idx) => {
                const isActiveSlot = idx === activeStepIndex;
                return (
                  <button
                    key={part.category}
                    type="button"
                    onClick={() => goToStep(idx)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${
                      isActiveSlot ? 'bg-[#080B12]' : 'hover:bg-[#080B12]/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="h-8 w-10 shrink-0 overflow-hidden rounded border border-slate-800 bg-[#080B12]">
                        <ProductImage
                          compact
                          imageUrl={pricingCatalog?.productImages?.[part.partId]}
                          category={part.category}
                          model={part.model}
                        />
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`block text-[11px] ${
                            isActiveSlot ? 'font-semibold text-[#246BFD]' : 'text-[#94A3B8]'
                          }`}
                        >
                          {idx + 1}. {part.label}
                        </span>
                        <span className="block truncate font-semibold text-[#F5F7FA]">
                          {part.model}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-semibold tabular-nums text-[#FF7900] shrink-0">
                      {part.priceTry === 0
                        ? part.partId === 'gpu-apu-vega7' ||
                          part.partId === 'cooler-stock-wraith'
                          ? 'Dahili'
                          : 'Fiyat Bekleniyor'
                        : formatTry(part.priceTry)}
                    </span>
                  </button>
                );
              })}
            </div>

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

              <button
                type="button"
                onClick={handleCopyList}
                className="flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#080B12] px-3 py-2 text-xs font-medium text-[#F5F7FA] hover:border-slate-500"
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
            </div>
          </div>
        </aside>
      </div>
        </>
      )}
    </div>
  );
}
