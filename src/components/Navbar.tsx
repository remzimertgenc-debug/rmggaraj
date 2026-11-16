import {
  Box,
  ChevronRight,
  CircuitBoard,
  Cpu,
  Fan,
  Gauge,
  HardDrive,
  Layers,
  LogIn,
  LogOut,
  MemoryStick,
  Menu,
  Monitor,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { formatTry } from '../data/builds';
import {
  AnyCatalogPart,
  CATEGORY_LABELS,
  getAllCatalogEntries,
} from '../data/partMedia';
import { useAuth } from '../lib/AuthContext';
import {
  PageId,
  PartCategoryKey,
  PcBuild,
  PricingCatalogResponse,
} from '../types/pc';
import { ProductImage } from './ProductImage';
import { RmgLogo } from './RmgLogo';

interface NavbarProps {
  currentPage: PageId;
  activeCatalogCategory?: PartCategoryKey | null;
  searchableBuilds: PcBuild[];
  pricingCatalog: PricingCatalogResponse | null;
  onNavigate: (page: PageId) => void;
  onSelectCategory: (category: PartCategoryKey) => void;
  onSelectBuild: (build: PcBuild) => void;
  onSelectPart: (category: PartCategoryKey, partId: string) => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Ana Sayfa' },
  { id: 'systems', label: 'Hazır Sistemler' },
  { id: 'builder', label: 'Bilgisayar Topla' },
  { id: 'advisor', label: 'Sistem Öner & FPS' },
  { id: 'gpus', label: 'Ekran Kartları' },
  { id: 'cpus', label: 'İşlemciler' },
];

type RankedSearchItem =
  | {
      kind: 'part';
      key: string;
      score: number;
      title: string;
      subtitle: string;
      category: PartCategoryKey;
      partId: string;
      imageUrl: string | null;
      priceTry: number | null;
      isBuiltinZeroCost: boolean;
    }
  | {
      kind: 'build';
      key: string;
      score: number;
      title: string;
      subtitle: string;
      image: string;
      priceTry: number;
      build: PcBuild;
    };

function toSearchAscii(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeSearch(value: string): string {
  return toSearchAscii(value).replace(/[^a-z0-9]/g, '');
}

function getExtraSearchKeywords(entry: AnyCatalogPart): string {
  switch (entry.category) {
    case 'cpu':
      return `${entry.part.socket} ${entry.part.generation ?? ''} ${entry.part.supportedRam.join(' ')}`;
    case 'gpu':
      return `${entry.part.shortTitle} ${entry.part.vramGb ?? ''}GB`;
    case 'motherboard':
      return `${entry.part.socket} ${entry.part.supportedRam ?? ''} ${entry.part.formFactor}`;
    case 'ram':
      return `${entry.part.generation ?? ''} ${entry.part.speedMhz ?? ''}MHz ${entry.part.latency}`;
    case 'ssd':
      return `${entry.part.interfaceType} ${entry.part.capacityGb}GB`;
    case 'psu':
      return `${entry.part.wattage ?? ''}W ${entry.part.efficiency} ${entry.part.atxStandard}`;
    case 'pcCase':
      return `${entry.part.supportedFormFactors.join(' ')} ${entry.part.airflowType}`;
    case 'cooler':
      return `${entry.part.coolerType} ${entry.part.supportedSockets.join(' ')}`;
  }
}

function renderCategoryIcon(category: PartCategoryKey, className = 'h-4 w-4 shrink-0'): ReactNode {
  switch (category) {
    case 'cpu':
      return <Cpu className={className} />;
    case 'gpu':
      return <Monitor className={className} />;
    case 'motherboard':
      return <CircuitBoard className={className} />;
    case 'ram':
      return <MemoryStick className={className} />;
    case 'ssd':
      return <HardDrive className={className} />;
    case 'psu':
      return <Zap className={className} />;
    case 'pcCase':
      return <Box className={className} />;
    case 'cooler':
      return <Fan className={className} />;
  }
}

const SIDEBAR_CATEGORIES: {
  id: PartCategoryKey;
  label: string;
  renderIcon: () => ReactNode;
}[] = [
  { id: 'cpu', label: 'İşlemciler', renderIcon: () => renderCategoryIcon('cpu') },
  { id: 'gpu', label: 'Ekran Kartları', renderIcon: () => renderCategoryIcon('gpu') },
  { id: 'motherboard', label: 'Anakartlar', renderIcon: () => renderCategoryIcon('motherboard') },
  { id: 'ram', label: "RAM'ler", renderIcon: () => renderCategoryIcon('ram') },
  { id: 'ssd', label: "SSD'ler", renderIcon: () => renderCategoryIcon('ssd') },
  { id: 'psu', label: 'Güç Kaynakları', renderIcon: () => renderCategoryIcon('psu') },
  { id: 'pcCase', label: 'Kasalar', renderIcon: () => renderCategoryIcon('pcCase') },
  { id: 'cooler', label: 'Soğutucular', renderIcon: () => renderCategoryIcon('cooler') },
];

export function Navbar({
  currentPage,
  activeCatalogCategory,
  searchableBuilds,
  pricingCatalog,
  onNavigate,
  onSelectCategory,
  onSelectBuild,
  onSelectPart,
}: NavbarProps) {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!searchFocused) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [searchFocused]);

  const normalizedQuery = normalizeSearch(searchQuery);

  const rankedResults = useMemo(() => {
    if (normalizedQuery.length < 1) return null;

    const queryTokens = toSearchAscii(searchQuery)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    const scoreTextMatch = (primary: string, secondary = ''): number => {
      const normPrimary = normalizeSearch(primary);
      if (normPrimary === normalizedQuery) return 1000;
      if (normPrimary.startsWith(normalizedQuery)) {
        return 880 - Math.min(100, Math.abs(normPrimary.length - normalizedQuery.length));
      }

      const idx = normPrimary.indexOf(normalizedQuery);
      if (idx >= 0) {
        return (
          780 -
          Math.min(120, idx * 4) -
          Math.min(120, Math.abs(normPrimary.length - normalizedQuery.length))
        );
      }

      const primaryTokens = toSearchAscii(primary)
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const compactPrimary = primaryTokens.join('');
      if (
        queryTokens.length > 0 &&
        queryTokens.every(
          (token) =>
            primaryTokens.includes(token) || compactPrimary.includes(token)
        )
      ) {
        return (
          640 -
          Math.min(100, Math.abs(normPrimary.length - normalizedQuery.length))
        );
      }

      const combined = `${primary} ${secondary}`;
      const normCombined = normalizeSearch(combined);
      if (normCombined.includes(normalizedQuery)) return 420;

      const combinedTokens = toSearchAscii(combined)
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const compactCombined = combinedTokens.join('');
      if (
        queryTokens.length > 0 &&
        queryTokens.every(
          (token) =>
            combinedTokens.includes(token) || compactCombined.includes(token)
        )
      ) {
        return 320;
      }

      return 0;
    };

    const items: RankedSearchItem[] = [];

    for (const entry of getAllCatalogEntries()) {
      const { part, category } = entry;
      const extra = getExtraSearchKeywords(entry);
      const modelWithoutBrand = part.model
        .replace(new RegExp(`^${part.brand}\\s+`, 'i'), '')
        .replace(/^GeForce\s+/i, '')
        .replace(/^Radeon\s+/i, '');
      const shortTitle =
        entry.category === 'gpu' ? entry.part.shortTitle : modelWithoutBrand;

      const modelScore = scoreTextMatch(
        part.model,
        `${part.brand} ${CATEGORY_LABELS[category]} ${part.specSummary} ${extra}`
      );
      const shortScore = Math.max(
        scoreTextMatch(shortTitle),
        scoreTextMatch(modelWithoutBrand)
      );
      const brandModelScore = scoreTextMatch(`${part.brand} ${part.model}`);
      const score = Math.max(
        modelScore,
        brandModelScore,
        shortScore >= 880 ? shortScore - 20 : shortScore
      );
      if (score <= 0) continue;

      const pricing = pricingCatalog?.partsPricing[part.id];
      const priceTry = pricing?.newPriceTry ?? null;
      const isBuiltinZeroCost =
        part.id === 'gpu-apu-vega7' || part.id === 'cooler-stock-wraith';

      items.push({
        kind: 'part',
        key: `${category}-${part.id}`,
        score,
        title: part.model,
        subtitle: `${CATEGORY_LABELS[category]} · ${part.brand}`,
        category,
        partId: part.id,
        imageUrl: pricingCatalog?.productImages?.[part.id] ?? null,
        priceTry,
        isBuiltinZeroCost,
      });
    }

    const seenPartIds = new Set(
      items
        .filter((i): i is Extract<RankedSearchItem, { kind: 'part' }> => i.kind === 'part')
        .map((i) => i.partId)
    );
    const extraDbProducts = [
      ...(pricingCatalog?.catalogProducts ?? []),
      ...(pricingCatalog?.dynamicProducts ?? []),
    ];

    for (const dyn of extraDbProducts) {
      if (seenPartIds.has(dyn.id)) continue;
      seenPartIds.add(dyn.id);

      const compatKeywords = `${dyn.socket ?? ''} ${dyn.ramType ?? ''} ${dyn.formFactor ?? ''} ${dyn.wattage ? `${dyn.wattage}W` : ''}`;
      const score = Math.max(
        scoreTextMatch(
          dyn.name,
          `${dyn.brand} ${CATEGORY_LABELS[dyn.category]} ${dyn.specSummary} ${compatKeywords}`
        ),
        scoreTextMatch(`${dyn.brand} ${dyn.name}`)
      );
      if (score <= 0) continue;

      const pricing = pricingCatalog?.partsPricing[dyn.id];
      const priceTry = pricing?.newPriceTry ?? null;
      items.push({
        kind: 'part',
        key: `${dyn.category}-${dyn.id}`,
        score,
        title: dyn.name,
        subtitle: `${CATEGORY_LABELS[dyn.category]} · ${dyn.brand}`,
        category: dyn.category,
        partId: dyn.id,
        imageUrl: dyn.imageUrl ?? pricingCatalog?.productImages?.[dyn.id] ?? null,
        priceTry,
        isBuiltinZeroCost: false,
      });
    }

    for (const build of searchableBuilds) {
      const nameScore = scoreTextMatch(build.systemName);
      const componentMatch =
        scoreTextMatch(
          `${build.cpu.model} ${build.gpu.model} ${build.targetResolution}`
        ) > 0;
      const isBrandOrFullNameQuery =
        normalizeSearch(build.systemName).startsWith(normalizedQuery) ||
        normalizedQuery.startsWith('rmg');
      const score =
        nameScore > 0
          ? isBrandOrFullNameQuery
            ? nameScore
            : Math.min(680, nameScore)
          : componentMatch
            ? 180
            : 0;
      if (score <= 0) continue;

      items.push({
        kind: 'build',
        key: `build-${build.id}`,
        score,
        title: build.systemName,
        subtitle: `Hazır Sistem · ${build.cpu.model}`,
        image: build.image,
        priceTry: build.samplePriceTry,
        build,
      });
    }

    items.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.kind !== b.kind) return a.kind === 'part' ? -1 : 1;
      return a.title.length - b.title.length;
    });

    return items.slice(0, 10);
  }, [normalizedQuery, searchQuery, searchableBuilds, pricingCatalog]);

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
    setSidebarOpen(false);
  };

  const handleSidebarCategoryClick = (category: PartCategoryKey) => {
    if (category === 'cpu') {
      onNavigate('cpus');
    } else if (category === 'gpu') {
      onNavigate('gpus');
    } else {
      onSelectCategory(category);
    }
    setSidebarOpen(false);
    setMobileOpen(false);
  };

  const handleSelectItem = (item: RankedSearchItem) => {
    if (item.kind === 'part') {
      onSelectPart(item.category, item.partId);
    } else {
      onSelectBuild(item.build);
    }
    setSearchQuery('');
    setSearchFocused(false);
    setMobileOpen(false);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!rankedResults || rankedResults.length === 0) return;
    handleSelectItem(rankedResults[0]);
  };

  const renderSearchDropdown = (isMobile = false) => {
    if (!rankedResults) return null;
    if (!isMobile && !searchFocused) return null;

    return (
      <div
        className={
          isMobile
            ? 'mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-700 bg-[#080B12] shadow-xl'
            : 'absolute left-0 right-0 top-full mt-2 z-50 max-h-[440px] overflow-y-auto rounded-xl border border-slate-700/90 bg-[#111827] shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
        }
      >
        {rankedResults.length === 0 ? (
          <p className="px-4 py-4 text-xs text-[#94A3B8]">
            &ldquo;{searchQuery}&rdquo; için eşleşen ürün veya sistem bulunamadı.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/80">
            <div className="flex items-center justify-between bg-[#0D1320] px-4 py-2 text-[11px] font-semibold text-[#94A3B8]">
              <span>Akıllı Arama Sonuçları ({rankedResults.length})</span>
              <span className="text-[#246BFD]">Ürün detayı için seçin</span>
            </div>
            {rankedResults.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(item);
                }}
                onClick={() => handleSelectItem(item)}
                className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#080B12] ${
                  idx === 0 ? 'bg-[#0D1422]/80' : ''
                }`}
              >
                <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#080B12]">
                  {item.kind === 'part' ? (
                    <ProductImage
                      compact
                      imageUrl={item.imageUrl}
                      category={item.category}
                      model={item.title}
                    />
                  ) : (
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[11px] font-medium text-[#246BFD]">
                    <span className="text-[#FF7900]">
                      {item.kind === 'part' ? (
                        renderCategoryIcon(item.category, 'h-3.5 w-3.5 shrink-0')
                      ) : (
                        <Layers className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </span>
                    <span className="truncate">{item.subtitle}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#F5F7FA] group-hover:text-white">
                    {item.title}
                  </span>
                </div>
                <div className="shrink-0">
                  {item.kind === 'build' || (item.priceTry && item.priceTry > 0) ? (
                    <span className="font-mono text-xs font-bold tabular-nums text-[#FF7900]">
                      {formatTry(item.priceTry ?? 0)}
                    </span>
                  ) : item.isBuiltinZeroCost ? (
                    <span className="font-mono text-xs font-semibold text-[#94A3B8]">
                      Dahili
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#246BFD]/40 bg-[#246BFD]/15 px-2.5 py-1 text-[11px] font-semibold text-[#60A5FA] transition-colors group-hover:border-[#FF7900]/50 group-hover:bg-[#FF7900]/15 group-hover:text-[#FF7900]">
                      <span>Fiyat Gör</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:gap-10 lg:px-8">
          {/* Top-Left: Hamburger Menu Icon + Brand Logo */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Donanım kategorileri menüsünü aç"
              aria-expanded={sidebarOpen}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800 text-slate-100 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] focus-visible:outline-2 focus-visible:outline-[#246BFD]"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className="inline-flex items-center cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#246BFD] whitespace-nowrap shrink-0"
              aria-label="RMG Garaj Ana Sayfa"
            >
              <RmgLogo size="lg" />
            </button>
          </div>

          {/* Center: Wide Smart Search Bar */}
          <div
            ref={searchContainerRef}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setSearchFocused(false);
              }
            }}
            className="relative hidden flex-1 max-w-xl sm:block"
          >
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search
                className={`pointer-events-none absolute left-4 h-4 w-4 transition-colors ${
                  searchFocused ? 'text-[#FF7900]' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="İşlemci, ekran kartı, anakart, RAM, SSD veya sistem ara..."
                aria-label="Tüm donanım ve sistemlerde akıllı arama"
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-slate-800 pl-11 pr-10 text-sm text-slate-50 placeholder:text-slate-400 transition-all focus:border-[#FF7900] focus:ring-2 focus:ring-[#246BFD]/30 focus:outline-none"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchFocused(false);
                  }}
                  aria-label="Aramayı temizle"
                  className="absolute right-2.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {renderSearchDropdown(false)}
          </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              title={`${user.email ?? 'Hesap'} — Çıkış Yap`}
              className="hidden sm:inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition-colors hover:border-slate-500 whitespace-nowrap shrink-0"
            >
              <span className="max-w-[110px] truncate">
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Hesabım'}
              </span>
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="hidden sm:inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#246BFD]/60 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#246BFD] whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Giriş Yap</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800 text-slate-100 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] sm:hidden focus-visible:outline-2 focus-visible:outline-[#246BFD]"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Arama ve menüyü kapat' : 'Arama ve menüyü aç'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800/90 bg-[#111827] px-4 py-4 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-3 sm:hidden">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İşlemci, ekran kartı, anakart, RAM, SSD ara..."
                aria-label="Mobil arama"
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#080B12] pl-10 pr-3 text-sm text-[#F5F7FA] placeholder:text-[#94A3B8] transition-all focus:border-[#FF7900] focus:ring-2 focus:ring-[#246BFD]/35 focus:outline-none"
              />
            </div>
            {renderSearchDropdown(true)}
          </form>

          <nav className="flex flex-col gap-1.5" aria-label="Mobil menü">
            {NAV_ITEMS.map((item) => {
              const isActive =
                currentPage === item.id ||
                (currentPage === 'detail' && item.id === 'systems');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#080B12] text-[#FF7900]'
                      : 'text-[#94A3B8] hover:bg-[#080B12] hover:text-[#F5F7FA]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-xs font-semibold">Aktif</span>}
                </button>
              );
            })}

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void signOutUser();
                }}
                className="mt-1.5 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#080B12] px-4 py-2.5 text-sm font-medium text-[#F5F7FA]"
              >
                <LogOut className="h-4 w-4 text-[#94A3B8]" />
                <span>Çıkış Yap ({user.email})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void signInWithGoogle();
                }}
                className="mt-1.5 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-4 py-2.5 text-sm font-semibold text-[#F5F7FA]"
              >
                <LogIn className="h-4 w-4" />
                <span>Google ile Giriş Yap</span>
              </button>
            )}
          </nav>
        </div>
      )}
      </header>

      {/* Left Slide-Over Category Sidebar Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          sidebarOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!sidebarOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <aside
          aria-label="Donanım Kategorileri Menüsü"
          className={`fixed inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl transition-transform duration-200 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <RmgLogo />
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Yan menüyü kapat"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800 text-slate-300 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-[#246BFD]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            {/* Highlighted PC Builder Wizard CTA */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleNavClick('builder')}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#FF7900] px-4 py-3 text-sm font-bold text-[#080B12] shadow-[0_12px_28px_-12px_rgba(255,121,0,0.75)] transition-colors hover:bg-[#FF912E]"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Kendin Topla (Sistem Sihirbazı)</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('advisor')}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#246BFD]/60 bg-[#246BFD]/15 px-4 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#246BFD]"
              >
                <Gauge className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                <span className="whitespace-nowrap">Bütçe &amp; Oyunla Sistem Öner (FPS)</span>
              </button>
            </div>

            <div className="mt-6">
              <p className="px-2 text-xs font-semibold tracking-wider text-[#246BFD]">
                Donanım Kategorileri
              </p>

              <nav className="mt-2.5 flex flex-col gap-1" aria-label="Donanım kategorileri">
                {SIDEBAR_CATEGORIES.map((cat) => {
                  const isCategoryActive =
                    (cat.id === 'cpu' && currentPage === 'cpus') ||
                    (cat.id === 'gpu' && currentPage === 'gpus') ||
                    (currentPage === 'catalog' && activeCatalogCategory === cat.id);

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSidebarCategoryClick(cat.id)}
                      className={`group flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        isCategoryActive
                          ? 'border border-[#246BFD]/50 bg-[#111827] text-[#F5F7FA]'
                          : 'border border-transparent text-[#94A3B8] hover:bg-[#111827] hover:text-[#F5F7FA]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={
                            isCategoryActive
                              ? 'text-[#FF7900]'
                              : 'text-[#246BFD] transition-colors group-hover:text-[#FF7900]'
                          }
                        >
                          {cat.renderIcon()}
                        </span>
                        <span>{cat.label}</span>
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          isCategoryActive
                            ? 'text-[#FF7900]'
                            : 'text-slate-600 group-hover:translate-x-0.5 group-hover:text-[#94A3B8]'
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="border-t border-slate-800/90 bg-[#111827]/60 px-5 py-4">
            <button
              type="button"
              onClick={() => handleNavClick('systems')}
              className="flex min-h-[42px] w-full cursor-pointer items-center justify-center rounded-lg border border-[#246BFD]/50 bg-[#111827] px-4 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:bg-[#246BFD]"
            >
              Hazır Sistemleri İncele
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
