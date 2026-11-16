import { AlertTriangle, ArrowRight, Cpu, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BUILD_IMAGES, generateSampleBuilds } from '../data/builds';
import {
  BuilderPreferences,
  PageId,
  PcBuild,
  PricingCatalogResponse,
} from '../types/pc';
import { BuildCard } from './BuildCard';

interface HomePageProps {
  pricingCatalog: PricingCatalogResponse | null;
  pricingLoading: boolean;
  pricingError: string | null;
  onRetryPricing: () => void;
  onNavigate: (page: PageId) => void;
  onInspectBuild: (build: PcBuild) => void;
}

const POPULAR_SHOWCASE_PREFS: BuilderPreferences = {
  budget: 60000,
  purpose: 'oyun',
  favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
  resolution: '1440p',
  condition: 'sifir',
  cpuBrandPref: 'farketmez',
  gpuBrandPref: 'farketmez',
};

export function HomePage({
  pricingCatalog,
  pricingLoading,
  pricingError,
  onRetryPricing,
  onNavigate,
  onInspectBuild,
}: HomePageProps) {
  const [heroImgError, setHeroImgError] = useState(false);

  const popularBuilds = useMemo(() => {
    if (!pricingCatalog) return [];
    return generateSampleBuilds(POPULAR_SHOWCASE_PREFS, pricingCatalog);
  }, [pricingCatalog]);

  return (
    <div>
      {/* Storefront Hero Section */}
      <section className="border-b border-slate-800/90 bg-gradient-to-b from-[#111827]/70 via-[#080B12] to-[#080B12]">
        <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy Column */}
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
                RMG TECH · Özel Bilgisayar Mağazası
              </p>

              <h1
                className="mt-4 font-display font-bold tracking-tight text-[#F5F7FA]"
                style={{
                  fontSize: 'clamp(2.4rem, 4.2vw, 3.85rem)',
                  lineHeight: 1.08,
                  textWrap: 'balance',
                }}
              >
                Hayalindeki bilgisayarı birlikte toplayalım.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#94A3B8] sm:text-lg">
                Bütçene ve oyun tercihlerine en uygun bilgisayarı keşfet.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('systems')}
                  className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-[#246BFD] px-7 py-3.5 text-sm font-semibold text-[#F5F7FA] shadow-[0_14px_32px_-12px_rgba(36,107,253,0.85)] transition-colors duration-150 hover:bg-[#3B7CFE] active:bg-[#1C58D6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#246BFD] whitespace-nowrap"
                >
                  <span>Hazır Sistemleri İncele</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('builder')}
                  className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#FF7900]/70 bg-[#111827] px-7 py-3.5 text-sm font-semibold text-[#F5F7FA] transition-colors duration-150 hover:border-[#FF7900] hover:bg-[#FF7900] hover:text-[#080B12] focus-visible:outline-2 focus-visible:outline-[#FF7900] whitespace-nowrap"
                >
                  <span>Bilgisayarını Topla</span>
                </button>
              </div>
            </div>

            {/* Right Visual Showcase Column */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[300px] overflow-hidden rounded-xl border border-slate-800 bg-[#111827] sm:min-h-[400px]">
                {!heroImgError ? (
                  <img
                    src={BUILD_IMAGES.hero}
                    alt="RMG TECH özel performans oyuncu bilgisayarı"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="h-full w-full object-cover object-center lg:h-full"
                  />
                ) : (
                  <div className="flex h-full min-h-[340px] flex-col items-center justify-center gap-3 bg-[#111827] p-8 text-center">
                    <Cpu className="h-14 w-14 text-[#246BFD]" />
                    <span className="font-display text-xl font-semibold text-[#F5F7FA]">
                      RMG TECH Performans Sistemleri
                    </span>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080B12]/70 via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Ready Systems Showcase */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-4 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
              Öne Çıkanlar
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#F5F7FA] sm:text-3xl">
              Popüler Hazır Sistemler
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('systems')}
            className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 text-sm font-semibold text-[#246BFD] transition-colors hover:text-[#3B7CFE] whitespace-nowrap shrink-0"
          >
            <span>Tüm Hazır Sistemleri Gör</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>

        {pricingError && (
          <div
            role="alert"
            className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/50 bg-red-950/25 p-4 text-sm text-red-200"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>Fiyat verisi yüklenemedi: {pricingError}</span>
            </span>
            <button
              type="button"
              onClick={onRetryPricing}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-400/50 bg-[#111827] px-3.5 py-2 text-xs font-semibold text-[#F5F7FA]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Yeniden Dene</span>
            </button>
          </div>
        )}

        {pricingLoading && !pricingCatalog ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-[500px] animate-pulse rounded-xl border border-slate-800 bg-[#111827]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {popularBuilds.map((build) => (
              <BuildCard
                key={build.id}
                build={build}
                onInspect={onInspectBuild}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
