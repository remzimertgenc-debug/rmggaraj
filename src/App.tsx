import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ChunkErrorBoundary, lazyWithRetry } from './components/ChunkErrorBoundary';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { generateSampleBuilds } from './data/builds';
import { getMergedCatalogParts } from './data/catalogAdapter';
import { fetchPricingCatalog } from './services/pricingClient';
import { useAuth } from './lib/AuthContext';
import {
  BuilderPreferences,
  PageId,
  PartCategoryKey,
  PcBuild,
  PricingCatalogResponse,
  SelectedPartIds,
} from './types/pc';

const SystemsPage = lazyWithRetry(() =>
  import('./components/SystemsPage').then((m) => ({ default: m.SystemsPage }))
);
const PCBuilder = lazyWithRetry(() =>
  import('./components/PCBuilder').then((m) => ({ default: m.PCBuilder }))
);
const SmartAdvisorPage = lazyWithRetry(() =>
  import('./components/SmartAdvisorPage').then((m) => ({
    default: m.SmartAdvisorPage,
  }))
);
const GpusPage = lazyWithRetry(() =>
  import('./components/GpusPage').then((m) => ({ default: m.GpusPage }))
);
const CpusPage = lazyWithRetry(() =>
  import('./components/CpusPage').then((m) => ({ default: m.CpusPage }))
);
const CategoryCatalogPage = lazyWithRetry(() =>
  import('./components/CategoryCatalogPage').then((m) => ({
    default: m.CategoryCatalogPage,
  }))
);
const SystemDetailPage = lazyWithRetry(() =>
  import('./components/SystemDetailPage').then((m) => ({
    default: m.SystemDetailPage,
  }))
);
const PartDetailPage = lazyWithRetry(() =>
  import('./components/PartDetailPage').then((m) => ({
    default: m.PartDetailPage,
  }))
);
const LegalPage = lazyWithRetry(() =>
  import('./components/LegalPage').then((m) => ({ default: m.LegalPage }))
);
const ProfilePage = lazyWithRetry(() =>
  import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);

function PageLoadingFallback() {
  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-[1320px] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-slate-800 bg-[#111827]/90 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF7900] border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-slate-100">
            Sayfa modülü yükleniyor...
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl border border-slate-800/80 bg-slate-800/50" />
          <div className="h-28 animate-pulse rounded-xl border border-slate-800/80 bg-slate-800/50" />
          <div className="h-28 animate-pulse rounded-xl border border-slate-800/80 bg-slate-800/50" />
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PREFERENCES: BuilderPreferences = {
  budget: 58000,
  purpose: 'oyun',
  favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
  resolution: '1440p',
  cpuBrandPref: 'farketmez',
  gpuBrandPref: 'farketmez',
};

const EMPTY_SELECTED_IDS: Partial<SelectedPartIds> = {};

const HASH_TO_PAGE: Record<string, PageId> = {
  '#ana-sayfa': 'home',
  '#hazir-sistemler': 'systems',
  '#prebuilt-systems': 'systems',
  '#bilgisayar-topla': 'builder',
  '#akilli-sistem-onerici': 'advisor',
  '#ekran-kartlari': 'gpus',
  '#islemciler': 'cpus',
  '#donanim-kategorisi': 'catalog',
  '#sistem-detay': 'detail',
  '#urun-detay': 'part-detail',
  '#hesabim': 'profile',
  '#profil': 'profile',
  '#kullanim-kosullari': 'terms',
  '#gizlilik-politikasi': 'privacy',
  '#cerez-politikasi': 'cookies',
  '#kvkk-aydinlatma-metni': 'kvkk',
};

const PAGE_TO_HASH: Record<PageId, string> = {
  home: '#ana-sayfa',
  systems: '#hazir-sistemler',
  builder: '#bilgisayar-topla',
  advisor: '#akilli-sistem-onerici',
  gpus: '#ekran-kartlari',
  cpus: '#islemciler',
  catalog: '#donanim-kategorisi',
  detail: '#sistem-detay',
  'part-detail': '#urun-detay',
  profile: '#hesabim',
  terms: '#kullanim-kosullari',
  privacy: '#gizlilik-politikasi',
  cookies: '#cerez-politikasi',
  kvkk: '#kvkk-aydinlatma-metni',
};

const BACK_PAGE_LABELS: Record<PageId, string> = {
  home: 'Ana Sayfaya Dön',
  systems: 'Hazır Sistemlere Dön',
  builder: 'Bilgisayar Toplama Sayfasına Dön',
  advisor: 'Sistem Önericiye Dön',
  gpus: 'Ekran Kartlarına Dön',
  cpus: 'İşlemcilere Dön',
  catalog: 'Kategori Listesine Dön',
  detail: 'Sistem Detayına Dön',
  'part-detail': 'Geri Dön',
  profile: 'Hesabıma Dön',
  terms: 'Ana Sayfaya Dön',
  privacy: 'Ana Sayfaya Dön',
  cookies: 'Ana Sayfaya Dön',
  kvkk: 'Ana Sayfaya Dön',
};

function getInitialPage(): PageId {
  if (typeof window === 'undefined') return 'home';
  if (window.location.pathname === '/prebuilt-systems') return 'systems';
  const mapped = HASH_TO_PAGE[window.location.hash];
  if (!mapped || mapped === 'detail' || mapped === 'part-detail') return 'home';
  return mapped;
}

export default function App() {
  const { idToken } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>(getInitialPage);
  const [returnPage, setReturnPage] = useState<PageId>('home');
  const [preferences, setPreferences] =
    useState<BuilderPreferences>(DEFAULT_PREFERENCES);
  const [builderSelectedIds, setBuilderSelectedIds] =
    useState<Partial<SelectedPartIds>>(EMPTY_SELECTED_IDS);
  const [detailBuild, setDetailBuild] = useState<PcBuild | null>(null);
  const [selectedCatalogCategory, setSelectedCatalogCategory] =
    useState<PartCategoryKey>('motherboard');
  const [selectedDetailPart, setSelectedDetailPart] = useState<{
    category: PartCategoryKey;
    partId: string;
  } | null>(null);
  const [builderInitialStep, setBuilderInitialStep] =
    useState<keyof SelectedPartIds | null>(null);
  const [comparedBuilds, setComparedBuilds] = useState<PcBuild[]>([]);

  const [pricingCatalog, setPricingCatalog] =
    useState<PricingCatalogResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState<boolean>(true);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const loadPricingCatalog = useCallback(async () => {
    setPricingLoading(true);
    setPricingError(null);
    try {
      const data = await fetchPricingCatalog(idToken);
      setPricingCatalog(data);
    } catch (error) {
      setPricingError(
        error instanceof Error
          ? error.message
          : 'Fiyat veri sağlayıcısına bağlanılamadı.'
      );
    } finally {
      setPricingLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    loadPricingCatalog();
  }, [loadPricingCatalog]);

  const searchableBuilds = useMemo(() => {
    if (!pricingCatalog) return [];
    const tiers = [35000, 60000, 95000];
    const list: PcBuild[] = [];
    const seen = new Set<string>();
    for (const budget of tiers) {
      for (const b of generateSampleBuilds({ ...DEFAULT_PREFERENCES, budget }, pricingCatalog)) {
        if (!seen.has(b.systemName)) {
          seen.add(b.systemName);
          list.push(b);
        }
      }
    }
    return list;
  }, [pricingCatalog]);

  useEffect(() => {
    const handleHashChange = () => {
      const next = HASH_TO_PAGE[window.location.hash] ?? 'home';
      if (next === 'detail' && !detailBuild) {
        setCurrentPage('systems');
        return;
      }
      if (next === 'part-detail' && !selectedDetailPart) {
        setCurrentPage('home');
        return;
      }
      setCurrentPage(next);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [detailBuild, selectedDetailPart]);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    const nextHash = PAGE_TO_HASH[page];
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSystemDetail = (build: PcBuild) => {
    setDetailBuild(build);
    navigateTo('detail');
  };

  const handleInspectPart = (category: PartCategoryKey, partId: string) => {
    if (currentPage !== 'part-detail') {
      setReturnPage(currentPage);
    }
    setSelectedDetailPart({ category, partId });
    navigateTo('part-detail');
  };

  const handleSelectCatalogCategory = (category: PartCategoryKey) => {
    if (category === 'cpu') {
      navigateTo('cpus');
      return;
    }
    if (category === 'gpu') {
      navigateTo('gpus');
      return;
    }
    setSelectedCatalogCategory(category);
    navigateTo('catalog');
  };

  const handleCustomizeBuild = (build: PcBuild) => {
    setPreferences((prev) => ({
      ...prev,
      budget: Math.min(160000, Math.max(18000, build.samplePriceTry)),
      resolution: build.targetResolution,
      purpose: build.suitedPurposes[0] ?? prev.purpose,
    }));
    setBuilderSelectedIds(build.selectedIds);
    navigateTo('builder');
  };

  const handleBuildWithGpu = (gpuId: string) => {
    const merged = getMergedCatalogParts(pricingCatalog);
    const gpu = merged.gpus.find((g) => g.id === gpuId);
    setBuilderSelectedIds((prev) => {
      const next: Partial<SelectedPartIds> = { ...prev, gpuId };
      if (!gpu) return next;

      if (prev.caseId) {
        const currentCase = merged.cases.find((c) => c.id === prev.caseId);
        if (
          currentCase &&
          gpu.lengthMm !== null &&
          currentCase.maxGpuLengthMm !== null &&
          gpu.lengthMm > currentCase.maxGpuLengthMm
        ) {
          delete next.caseId;
        }
      }

      if (prev.psuId) {
        const currentPsu = merged.psus.find((p) => p.id === prev.psuId);
        const req12v = gpu.requiredConnectors?.twelveVhpwrCount ?? 0;
        const req8p = gpu.requiredConnectors?.eightPinCount ?? 0;
        const recWatts = gpu.recommendedPsuWatts ?? 0;
        const psuInsufficient =
          currentPsu &&
          ((currentPsu.wattage ?? 0) < recWatts ||
            (currentPsu.connectors?.twelveVhpwrCount ?? 0) < req12v ||
            (currentPsu.connectors?.pcie8PinCount ?? 0) < req8p);
        if (psuInsufficient) {
          delete next.psuId;
        }
      }

      return next;
    });
    setBuilderInitialStep('cpuId');
    navigateTo('builder');
  };

  const handleBuildWithCpu = (cpuId: string) => {
    const merged = getMergedCatalogParts(pricingCatalog);
    const cpu = merged.cpus.find((c) => c.id === cpuId);
    setBuilderSelectedIds((prev) => {
      const next: Partial<SelectedPartIds> = { ...prev, cpuId };
      if (!cpu) return next;

      if (prev.motherboardId) {
        const mb = merged.motherboards.find((m) => m.id === prev.motherboardId);
        if (mb && mb.socket !== cpu.socket) {
          delete next.motherboardId;
        }
      }
      if (prev.ramId) {
        const ram = merged.rams.find((r) => r.id === prev.ramId);
        if (ram?.generation && !cpu.supportedRam.includes(ram.generation)) {
          delete next.ramId;
        }
      }
      if (prev.coolerId) {
        const cooler = merged.coolers.find((cl) => cl.id === prev.coolerId);
        if (cooler && !cooler.supportedSockets.includes(cpu.socket)) {
          delete next.coolerId;
        }
      }
      return next;
    });
    setBuilderInitialStep('motherboardId');
    navigateTo('builder');
  };

  const handleBuildWithPart = (category: PartCategoryKey, partId: string) => {
    const fieldMap: Record<PartCategoryKey, keyof SelectedPartIds> = {
      cpu: 'cpuId',
      gpu: 'gpuId',
      motherboard: 'motherboardId',
      ram: 'ramId',
      ssd: 'ssdId',
      psu: 'psuId',
      pcCase: 'caseId',
      cooler: 'coolerId',
    };
    const targetField = fieldMap[category];
    setBuilderInitialStep(targetField);

    if (category === 'cpu') {
      handleBuildWithCpu(partId);
      return;
    }
    if (category === 'gpu') {
      handleBuildWithGpu(partId);
      return;
    }

    setBuilderSelectedIds((prev) => ({
      ...prev,
      [targetField]: partId,
    }));
    navigateTo('builder');
  };

  const handleToggleCompare = (build: PcBuild) => {
    setComparedBuilds((prev) => {
      const exists = prev.some((b) => b.id === build.id);
      if (exists) return prev.filter((b) => b.id !== build.id);
      if (prev.length >= 3) return [...prev.slice(1), build];
      return [...prev, build];
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-50">
      <Navbar
        currentPage={currentPage}
        activeCatalogCategory={selectedCatalogCategory}
        searchableBuilds={searchableBuilds}
        pricingCatalog={pricingCatalog}
        onNavigate={navigateTo}
        onSelectCategory={handleSelectCatalogCategory}
        onSelectBuild={handleOpenSystemDetail}
        onSelectPart={handleInspectPart}
      />

      <main className="flex-1">
        <ChunkErrorBoundary
          resetKey={`${currentPage}:${selectedCatalogCategory}:${selectedDetailPart?.partId ?? ''}:${detailBuild?.id ?? ''}`}
          onGoHome={() => navigateTo('home')}
        >
          <Suspense fallback={<PageLoadingFallback />}>
          {currentPage === 'home' && (
            <HomePage
              pricingCatalog={pricingCatalog}
              pricingLoading={pricingLoading}
              pricingError={pricingError}
              onRetryPricing={loadPricingCatalog}
              onNavigate={navigateTo}
              onInspectBuild={handleOpenSystemDetail}
              onInspectPart={handleInspectPart}
            />
          )}

          {currentPage === 'systems' && (
            <SystemsPage
              pricingCatalog={pricingCatalog}
              pricingLoading={pricingLoading}
              pricingError={pricingError}
              comparedBuilds={comparedBuilds}
              onRetryPricing={loadPricingCatalog}
              onInspectBuild={handleOpenSystemDetail}
              onToggleCompare={handleToggleCompare}
              onClearCompare={() => setComparedBuilds([])}
              onCustomizeBuild={handleCustomizeBuild}
            />
          )}

          {currentPage === 'builder' && (
            <PCBuilder
              preferences={preferences}
              selectedIds={builderSelectedIds}
              pricingCatalog={pricingCatalog}
              pricingError={pricingError}
              initialStepField={builderInitialStep}
              onRetryPricing={loadPricingCatalog}
              onChangeSelectedIds={setBuilderSelectedIds}
              onResetAll={() => {
                setPreferences(DEFAULT_PREFERENCES);
                setBuilderSelectedIds(EMPTY_SELECTED_IDS);
                setBuilderInitialStep(null);
              }}
              onInspectBuild={handleOpenSystemDetail}
              onInspectPart={handleInspectPart}
              onOpenAdvisor={() => navigateTo('advisor')}
            />
          )}

          {currentPage === 'advisor' && (
            <SmartAdvisorPage
              initialPreferences={preferences}
              pricingCatalog={pricingCatalog}
              pricingLoading={pricingLoading}
              pricingError={pricingError}
              onRetryPricing={loadPricingCatalog}
              onUpdatePreferences={setPreferences}
              onInspectBuild={handleOpenSystemDetail}
              onCustomizeBuild={handleCustomizeBuild}
              onInspectPart={handleInspectPart}
              onOpenManualBuilder={() => navigateTo('builder')}
            />
          )}

          {currentPage === 'gpus' && (
            <GpusPage
              pricingCatalog={pricingCatalog}
              onBuildWithGpu={handleBuildWithGpu}
              onInspectPart={handleInspectPart}
            />
          )}

          {currentPage === 'cpus' && (
            <CpusPage
              pricingCatalog={pricingCatalog}
              onBuildWithCpu={handleBuildWithCpu}
              onInspectPart={handleInspectPart}
            />
          )}

          {currentPage === 'catalog' && (
            <CategoryCatalogPage
              category={selectedCatalogCategory}
              pricingCatalog={pricingCatalog}
              onSelectCategory={handleSelectCatalogCategory}
              onInspectPart={handleInspectPart}
              onBuildWithPart={handleBuildWithPart}
            />
          )}

          {currentPage === 'detail' && detailBuild && (
            <SystemDetailPage
              build={detailBuild}
              pricingCatalog={pricingCatalog}
              isCompared={comparedBuilds.some((b) => b.id === detailBuild.id)}
              onBack={() => navigateTo('systems')}
              onCustomizeBuild={handleCustomizeBuild}
              onToggleCompare={handleToggleCompare}
              onInspectPart={handleInspectPart}
            />
          )}

          {currentPage === 'part-detail' && selectedDetailPart && (
            <PartDetailPage
              category={selectedDetailPart.category}
              partId={selectedDetailPart.partId}
              pricingCatalog={pricingCatalog}
              relatedBuilds={searchableBuilds}
              backLabel={BACK_PAGE_LABELS[returnPage]}
              onBack={() => navigateTo(returnPage)}
              onBuildWithPart={handleBuildWithPart}
              onInspectBuild={handleOpenSystemDetail}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage onNavigate={navigateTo} />
          )}

          {(currentPage === 'terms' ||
            currentPage === 'privacy' ||
            currentPage === 'cookies' ||
            currentPage === 'kvkk') && (
            <LegalPage pageId={currentPage} onNavigate={navigateTo} />
          )}
          </Suspense>
        </ChunkErrorBoundary>
      </main>

      <Footer
        onNavigate={navigateTo}
        onSelectCategory={handleSelectCatalogCategory}
      />
    </div>
  );
}
