import { useCallback, useEffect, useMemo, useState } from 'react';
import { BuilderPage } from './components/BuilderPage';
import { CpusPage } from './components/CpusPage';
import { Footer } from './components/Footer';
import { GpusPage } from './components/GpusPage';
import { HomePage } from './components/HomePage';
import { ListingManagerModal } from './components/ListingManagerModal';
import { Navbar } from './components/Navbar';
import { SystemDetailPage } from './components/SystemDetailPage';
import { SystemsPage } from './components/SystemsPage';
import { generateSampleBuilds } from './data/builds';
import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
} from './data/hardwareDb';
import { fetchPricingCatalog } from './services/pricingClient';
import {
  BuilderPreferences,
  PageId,
  PcBuild,
  PricingCatalogResponse,
  SelectedPartIds,
} from './types/pc';

const DEFAULT_PREFERENCES: BuilderPreferences = {
  budget: 58000,
  purpose: 'oyun',
  favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
  resolution: '1440p',
  condition: 'sifir',
  cpuBrandPref: 'farketmez',
  gpuBrandPref: 'farketmez',
};

const DEFAULT_SELECTED_IDS: SelectedPartIds = {
  cpuId: 'cpu-i5-14400f',
  gpuId: 'gpu-rtx4070-super',
  motherboardId: 'mb-b760m-d4',
  ramId: 'ram-16-d4',
  ssdId: 'ssd-1tb-gen4',
  psuId: 'psu-750-gold',
  caseId: 'case-matx-compact',
  coolerId: 'cooler-ak400',
};

const HASH_TO_PAGE: Record<string, PageId> = {
  '#ana-sayfa': 'home',
  '#hazir-sistemler': 'systems',
  '#bilgisayar-topla': 'builder',
  '#ekran-kartlari': 'gpus',
  '#islemciler': 'cpus',
  '#sistem-detay': 'detail',
};

const PAGE_TO_HASH: Record<PageId, string> = {
  home: '#ana-sayfa',
  systems: '#hazir-sistemler',
  builder: '#bilgisayar-topla',
  gpus: '#ekran-kartlari',
  cpus: '#islemciler',
  detail: '#sistem-detay',
};

function getInitialPage(): PageId {
  if (typeof window === 'undefined') return 'home';
  const mapped = HASH_TO_PAGE[window.location.hash];
  if (!mapped || mapped === 'detail') return 'home';
  return mapped;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(getInitialPage);
  const [preferences, setPreferences] =
    useState<BuilderPreferences>(DEFAULT_PREFERENCES);
  const [builderSelectedIds, setBuilderSelectedIds] =
    useState<SelectedPartIds>(DEFAULT_SELECTED_IDS);
  const [detailBuild, setDetailBuild] = useState<PcBuild | null>(null);
  const [comparedBuilds, setComparedBuilds] = useState<PcBuild[]>([]);

  const [pricingCatalog, setPricingCatalog] =
    useState<PricingCatalogResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState<boolean>(true);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const [listingModalOpen, setListingModalOpen] = useState<boolean>(false);
  const [listingModalPartId, setListingModalPartId] = useState<string | null>(null);

  const loadPricingCatalog = useCallback(async () => {
    setPricingLoading(true);
    setPricingError(null);
    try {
      const data = await fetchPricingCatalog();
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
  }, []);

  useEffect(() => {
    loadPricingCatalog();
  }, [loadPricingCatalog]);

  // İlk yüklemede builder başlangıç parçalarını dengeli öneriyle hizala
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
      setCurrentPage(next);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [detailBuild]);

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
    const gpu = GPU_DB.find((g) => g.id === gpuId);
    setBuilderSelectedIds((prev) => {
      const next = { ...prev, gpuId };
      if (!gpu) return next;

      // Kasa GPU uzunluğunu desteklemiyorsa uygun kasaya geç
      const currentCase = CASE_DB.find((c) => c.id === prev.caseId);
      if (
        !currentCase ||
        currentCase.isUnverifiedSpecSample ||
        (gpu.lengthMm !== null &&
          currentCase.maxGpuLengthMm !== null &&
          gpu.lengthMm > currentCase.maxGpuLengthMm)
      ) {
        const compatCase =
          CASE_DB.find(
            (c) =>
              !c.isUnverifiedSpecSample &&
              c.maxGpuLengthMm !== null &&
              (gpu.lengthMm ?? 0) <= c.maxGpuLengthMm
          ) ?? CASE_DB.find((c) => c.id === 'case-atx-flow')!;
        next.caseId = compatCase.id;
      }

      // PSU watt ve güç konektörü kontrolü
      const currentPsu = PSU_DB.find((p) => p.id === prev.psuId);
      const req12v = gpu.requiredConnectors?.twelveVhpwrCount ?? 0;
      const req8p = gpu.requiredConnectors?.eightPinCount ?? 0;
      const recWatts = gpu.recommendedPsuWatts ?? 0;
      const psuInsufficient =
        !currentPsu ||
        (currentPsu.wattage ?? 0) < recWatts ||
        (currentPsu.connectors?.twelveVhpwrCount ?? 0) < req12v ||
        (currentPsu.connectors?.pcie8PinCount ?? 0) < req8p;

      if (psuInsufficient) {
        const compatPsu =
          PSU_DB.find(
            (p) =>
              (p.wattage ?? 0) >= recWatts &&
              (p.connectors?.twelveVhpwrCount ?? 0) >= req12v &&
              (p.connectors?.pcie8PinCount ?? 0) >= req8p
          ) ?? PSU_DB[PSU_DB.length - 1];
        next.psuId = compatPsu.id;
      }

      return next;
    });
    navigateTo('builder');
  };

  const handleBuildWithCpu = (cpuId: string) => {
    const cpu = CPU_DB.find((c) => c.id === cpuId);
    if (cpu) {
      const mb =
        MOTHERBOARD_DB.find(
          (m) =>
            m.socket === cpu.socket &&
            cpu.generation !== null &&
            m.nativeCpuGenerations.includes(cpu.generation) &&
            (cpu.maxPowerWatts ?? 0) <= (m.vrmMaxCpuWatts ?? 999)
        ) ??
        MOTHERBOARD_DB.find((m) => m.socket === cpu.socket) ??
        MOTHERBOARD_DB[0];
      const ram =
        RAM_DB.find((r) => !r.isUnverifiedSpecSample && r.generation === mb.supportedRam) ??
        RAM_DB[0];
      const cooler =
        CPU_COOLER_DB.find(
          (cl) =>
            !cl.isUnverifiedSpecSample &&
            cl.supportedSockets.includes(cpu.socket) &&
            (cl.maxTdpCapacityWatts ?? 0) >= (cpu.maxPowerWatts ?? 0) &&
            (!cpu.requiresDedicatedCooler || cl.coolerType !== 'Stok / Giriş')
        ) ?? CPU_COOLER_DB[1];

      setBuilderSelectedIds((prev) => {
        const currentGpu = GPU_DB.find((g) => g.id === prev.gpuId);
        const needDiscreteGpu =
          currentGpu?.isIntegrated &&
          (!cpu.hasIntegratedGraphics || currentGpu.brand !== cpu.brand);

        const currentCase = CASE_DB.find((c) => c.id === prev.caseId);
        const caseSupportsMb =
          currentCase &&
          !currentCase.isUnverifiedSpecSample &&
          currentCase.supportedFormFactors.includes(mb.formFactor);
        const compatCase = caseSupportsMb
          ? currentCase
          : CASE_DB.find(
              (c) =>
                !c.isUnverifiedSpecSample &&
                c.supportedFormFactors.includes(mb.formFactor)
            ) ?? currentCase;

        const currentPsu = PSU_DB.find((p) => p.id === prev.psuId);
        const compatPsu =
          currentPsu && (currentPsu.connectors?.eps8PinCount ?? 0) >= mb.cpuEpsConnectors
            ? currentPsu
            : PSU_DB.find(
                (p) => (p.connectors?.eps8PinCount ?? 0) >= mb.cpuEpsConnectors
              ) ?? currentPsu;

        return {
          ...prev,
          cpuId,
          motherboardId: mb.id,
          ramId: ram.id,
          coolerId: cooler.id,
          gpuId: needDiscreteGpu ? 'gpu-rtx4060' : prev.gpuId,
          caseId: compatCase ? compatCase.id : prev.caseId,
          psuId: compatPsu ? compatPsu.id : prev.psuId,
        };
      });
    }
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

  const handleOpenListings = (partId?: string) => {
    setListingModalPartId(partId ?? null);
    setListingModalOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080B12] text-[#F5F7FA]">
      <Navbar
        currentPage={currentPage}
        searchableBuilds={searchableBuilds}
        onNavigate={navigateTo}
        onSelectBuild={handleOpenSystemDetail}
        onSelectGpu={() => navigateTo('gpus')}
        onSelectCpu={() => navigateTo('cpus')}
        onOpenListings={() => handleOpenListings()}
      />

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            pricingCatalog={pricingCatalog}
            pricingLoading={pricingLoading}
            pricingError={pricingError}
            onRetryPricing={loadPricingCatalog}
            onNavigate={navigateTo}
            onInspectBuild={handleOpenSystemDetail}
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
          <BuilderPage
            preferences={preferences}
            selectedIds={builderSelectedIds}
            pricingCatalog={pricingCatalog}
            pricingError={pricingError}
            onRetryPricing={loadPricingCatalog}
            onChangePreferences={setPreferences}
            onChangeSelectedIds={setBuilderSelectedIds}
            onResetAll={() => {
              setPreferences(DEFAULT_PREFERENCES);
              setBuilderSelectedIds(DEFAULT_SELECTED_IDS);
            }}
            onInspectBuild={handleOpenSystemDetail}
            onManageListings={handleOpenListings}
          />
        )}

        {currentPage === 'gpus' && (
          <GpusPage
            pricingCatalog={pricingCatalog}
            onBuildWithGpu={handleBuildWithGpu}
            onManageListings={handleOpenListings}
          />
        )}

        {currentPage === 'cpus' && (
          <CpusPage
            pricingCatalog={pricingCatalog}
            onBuildWithCpu={handleBuildWithCpu}
            onManageListings={handleOpenListings}
          />
        )}

        {currentPage === 'detail' && detailBuild && (
          <SystemDetailPage
            build={detailBuild}
            isCompared={comparedBuilds.some((b) => b.id === detailBuild.id)}
            onBack={() => navigateTo('systems')}
            onCustomizeBuild={handleCustomizeBuild}
            onToggleCompare={handleToggleCompare}
            onManageListings={handleOpenListings}
          />
        )}
      </main>

      <Footer onNavigate={navigateTo} />

      <ListingManagerModal
        isOpen={listingModalOpen}
        initialPartId={listingModalPartId}
        catalog={pricingCatalog}
        onClose={() => setListingModalOpen(false)}
        onCatalogUpdated={setPricingCatalog}
      />
    </div>
  );
}
