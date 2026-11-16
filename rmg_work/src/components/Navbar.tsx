import { Menu, Search, Tag, X } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { CPU_DB, GPU_DB, MOTHERBOARD_DB } from '../data/hardwareDb';
import { PageId, PcBuild } from '../types/pc';
import { RmgLogo } from './RmgLogo';

interface NavbarProps {
  currentPage: PageId;
  searchableBuilds: PcBuild[];
  onNavigate: (page: PageId) => void;
  onSelectBuild: (build: PcBuild) => void;
  onSelectGpu: (gpuId: string) => void;
  onSelectCpu: (cpuId: string) => void;
  onOpenListings: () => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Ana Sayfa' },
  { id: 'systems', label: 'Hazır Sistemler' },
  { id: 'builder', label: 'Bilgisayar Topla' },
  { id: 'gpus', label: 'Ekran Kartları' },
  { id: 'cpus', label: 'İşlemciler' },
];

export function Navbar({
  currentPage,
  searchableBuilds,
  onNavigate,
  onSelectBuild,
  onSelectGpu,
  onSelectCpu,
  onOpenListings,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimeoutRef = useRef<number   // Harf, boşluk, tire ve noktalama farklarını aramada yok say.
  // Örn. "Ryzen 5 7500 F" ve "Ryzen 5 7500F" aynı ürüne eşleşir.
  const normalizeSearch = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^a-z0-9]/g, '');

  const normalizedQuery = normalizeSearch(searchQuery);
  const queryTokens = searchQuery
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const matchesSearch = (value: string) => {
    const normalizedValue = normalizeSearch(value);
    if (normalizedQuery && normalizedValue.includes(normalizedQuery)) return true;
    const valueTokens = value
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    // Birleşik model kodlarını da yakala: 7500F == 7500 F.
    const compactValue = valueTokens.join('');
    return queryTokens.length > 0 && queryTokens.every((token) =>
      valueTokens.includes(token) || compactValue.includes(token)
    );
  };

  const searchResults = useMemo(() => {
    if (normalizedQuery.length < 2) return null;

    const matchingBuilds = searchableBuilds
      .filter((b) =>
        matchesSearch(b.systemName) || matchesSearch(b.cpu.model) ||
        matchesSearch(b.gpu.model) || matchesSearch(b.targetResolution)
      )
      .slice(0, 3);

    const matchingGpus = GPU_DB
      .filter((g) => !g.isIntegrated && !g.isUnverifiedSpecSample &&
        (matchesSearch(g.model) || matchesSearch(g.brand)))
      .sort((a, b) => {
        const aIndex = normalizeSearch(a.model).indexOf(normalizedQuery);
        const bIndex = normalizeSearch(b.model).indexOf(normalizedQuery);
        return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.model.length - b.model.length;
      })
      .slice(0, 5);

    const supportedSockets = new Set(MOTHERBOARD_DB.map((m) => m.socket));
    const matchingCpus = CPU_DB
      .filter((c) => !c.isUnverifiedSpecSample &&
        (currentPage !== 'builder' || supportedSockets.has(c.socket)) &&
        (matchesSearch(c.model) || matchesSearch(c.socket)))
      .sort((a, b) => {
        const aIndex = normalizeSearch(a.model).indexOf(normalizedQuery);
        const bIndex = normalizeSearch(b.model).indexOf(normalizedQuery);
        return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.model.length - b.model.length;
      })
      .slice(0, 8);

    return { matchingBuilds, matchingGpus, matchingCpus };
  }, [normalizedQuery, searchQuery, searchableBuilds, currentPage]);rchableBuilds]);

  const handleNavClick = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchResults) return;
    if (searchResults.matchingBuilds.length > 0) {
      onSelectBuild(searchResults.matchingBuilds[0]);
      setSearchQuery('');
      setSearchFocused(false);
      return;
    }
    if (searchResults.matchingGpus.length > 0) {
      onSelectGpu(searchResults.matchingGpus[0].id);
      setSearchQuery('');
      setSearchFocused(false);
      return;
    }
    if (searchResults.matchingCpus.length > 0) {
      onSelectCpu(searchResults.matchingCpus[0].id);
      setSearchQuery('');
      setSearchFocused(false);
    }
  };

  const hasAnyResults =
    searchResults &&
    (searchResults.matchingBuilds.length > 0 ||
      searchResults.matchingGpus.length > 0 ||
      searchResults.matchingCpus.length > 0);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#080B12]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:gap-8 lg:px-8">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => handleNavClick('home')}
          className="cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#246BFD] whitespace-nowrap shrink-0"
          aria-label="RMG TECH Ana Sayfa"
        >
          <RmgLogo />
        </button>

        {/* Primary Storefront Navigation */}
        <nav
          aria-label="Ana gezinme"
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPage === item.id ||
              (currentPage === 'detail' && item.id === 'systems');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative cursor-pointer py-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#246BFD] ${
                  isActive
                    ? 'text-[#F5F7FA] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#FF7900]'
                    : 'text-[#94A3B8] hover:text-[#F5F7FA]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Search + User Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#94A3B8]" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => {
                  if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
                  setSearchFocused(true);
                }}
                onBlur={() => {
                  blurTimeoutRef.current = window.setTimeout(
                    () => setSearchFocused(false),
                    180
                  );
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sistem, GPU veya CPU ara..."
                aria-label="Sistem veya donanım ara"
                className="h-10 w-52 rounded-lg border border-slate-800 bg-[#111827] pl-9 pr-3 text-xs text-[#F5F7FA] placeholder:text-[#94A3B8] transition-colors focus:border-[#246BFD] focus:outline-none xl:w-64"
              />
            </form>

            {searchFocused && searchResults && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-700 bg-[#111827] shadow-2xl">
                {!hasAnyResults ? (
                  <p className="px-4 py-4 text-xs text-[#94A3B8]">
                    &ldquo;{searchQuery}&rdquo; için eşleşen ürün bulunamadı.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {searchResults.matchingBuilds.length > 0 && (
                      <div className="p-2">
                        <span className="block px-2 py-1 text-[11px] font-semibold text-[#FF7900]">
                          Hazır Sistemler
                        </span>
                        {searchResults.matchingBuilds.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onMouseDown={() => {
                              onSelectBuild(b);
                              setSearchQuery('');
                              setSearchFocused(false);
                            }}
                            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-[#F5F7FA] hover:bg-[#080B12]"
                          >
                            <span className="truncate font-medium">{b.systemName}</span>
                            <span className="ml-2 font-mono font-semibold text-[#FF7900] shrink-0">
                              {new Intl.NumberFormat('tr-TR').format(b.samplePriceTry)} TL
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.matchingGpus.length > 0 && (
                      <div className="p-2">
                        <span className="block px-2 py-1 text-[11px] font-semibold text-[#246BFD]">
                          Ekran Kartları
                        </span>
                        {searchResults.matchingGpus.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onMouseDown={() => {
                              onSelectGpu(g.id);
                              setSearchQuery('');
                              setSearchFocused(false);
                            }}
                            className="block w-full cursor-pointer truncate rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#F5F7FA] hover:bg-[#080B12]"
                          >
                            {g.model}
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.matchingCpus.length > 0 && (
                      <div className="p-2">
                        <span className="block px-2 py-1 text-[11px] font-semibold text-[#246BFD]">
                          İşlemciler
                        </span>
                        {searchResults.matchingCpus.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              onSelectCpu(c.id);
                              setSearchQuery('');
                              setSearchFocused(false);
                            }}
                            className="block w-full cursor-pointer truncate rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#F5F7FA] hover:bg-[#080B12]"
                          >
                            {c.model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenListings}
            className="hidden sm:inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#111827] px-3.5 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:border-[#FF7900] hover:text-[#FF7900] whitespace-nowrap shrink-0"
          >
            <Tag className="h-3.5 w-3.5 text-[#FF7900]" />
            <span>İlan Fiyatları</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-[#F5F7FA] transition-colors hover:border-slate-700 lg:hidden focus-visible:outline-2 focus-visible:outline-[#246BFD]"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800/90 bg-[#111827] px-4 py-4 lg:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-3 sm:hidden">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#94A3B8]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sistem, GPU veya CPU ara..."
                aria-label="Mobil arama"
                className="h-11 w-full rounded-lg border border-slate-700 bg-[#080B12] pl-9 pr-3 text-sm text-[#F5F7FA] placeholder:text-[#94A3B8] focus:border-[#246BFD] focus:outline-none"
              />
            </div>
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
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenListings();
              }}
              className="mt-2 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#080B12] px-4 py-2.5 text-sm font-semibold text-[#FF7900]"
            >
              <Tag className="h-4 w-4" />
              <span>İlan Fiyatları ve Kaynaklar</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
