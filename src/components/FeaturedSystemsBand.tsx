import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { getShowcaseReadyBuilds } from '../data/builds';
import { PageId, PcBuild, PricingCatalogResponse } from '../types/pc';
import { BuildCard } from './BuildCard';

interface FeaturedSystemsBandProps {
  pricingCatalog: PricingCatalogResponse | null;
  onInspectBuild: (build: PcBuild) => void;
  onNavigate: (page: PageId) => void;
}

export function FeaturedSystemsBand({
  pricingCatalog,
  onInspectBuild,
  onNavigate,
}: FeaturedSystemsBandProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const readySystems = useMemo(
    () => getShowcaseReadyBuilds(pricingCatalog),
    [pricingCatalog]
  );

  const hasAnyRealPricing = readySystems.some(
    ({ build }) => build.hasRealListingData
  );

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -330 : 330,
      behavior: 'smooth',
    });
  };

  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-12 pb-6 sm:px-6 lg:px-8 lg:pt-14">
      <div className="flex flex-col justify-between gap-4 pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
            Hazır Sistem Önerileri
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
            Öne Çıkan Sistem Konfigürasyonları
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {hasAnyRealPricing
              ? 'Uyumluluğu doğrulanmış, oyun ve üretim odaklı sistem konfigürasyonları.'
              : 'Uyumluluğu doğrulanmış sistem konfigürasyonları · Fiyatlar canlı mağaza verisi gelene kadar referans tahmini olarak gösterilir.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('systems')}
            className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#FF7900] transition-colors hover:text-[#FF9A3D] whitespace-nowrap"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCard('left')}
              aria-label="Hazır sistemleri sola kaydır"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800 text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard('right')}
              aria-label="Hazır sistemleri sağa kaydır"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800 text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Ready Systems Showcase (Compact Cards) */}
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scroll-smooth [scrollbar-color:#334155_transparent] [scrollbar-width:thin] sm:gap-5"
      >
        {readySystems.map(({ preset, build }) => {
          const baseName = preset.systemName.split(' - ')[0].trim();
          const ramMatch = build.ram.model.match(/\b(\d+\s*GB)\b/i);
          const ramLabel = ramMatch ? ramMatch[1] : build.ram.model;
          const gpuLabel = build.gpu.model.replace(
            /^(ASUS|MSI|Gigabyte|Sapphire|XFX|PowerColor|ASRock|Palit|Galax|Zotac|Gainward|PNY|INNO3D|NVIDIA|AMD)\s+/i,
            ''
          );
          const summaryLine = `${baseName} | ${build.cpu.model} | ${ramLabel} | ${gpuLabel}`;

          return (
            <BuildCard
              key={preset.id}
              build={build}
              variant="compact"
              badgeText={
                build.hasRealListingData ? preset.badgeText : 'Referans Tahmini'
              }
              compactSummary={summaryLine}
              onInspect={onInspectBuild}
              className="w-[calc(50%-6px)] min-w-[160px] shrink-0 snap-start sm:w-[295px]"
            />
          );
        })}
      </div>
    </section>
  );
}
