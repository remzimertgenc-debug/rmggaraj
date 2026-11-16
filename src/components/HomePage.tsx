import { AlertTriangle, ArrowRight, Gauge, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { generateSampleBuilds } from '../data/builds';
import { CATEGORY_LABELS } from '../data/partMedia';
import {
  BuilderPreferences,
  PageId,
  PartCategoryKey,
  PcBuild,
  PricingCatalogResponse,
} from '../types/pc';
import { AdBanner } from './AdBanner';
import { BuildCard } from './BuildCard';
import { DealsShowcase } from './DealsShowcase';
import { FeaturedSystemsBand } from './FeaturedSystemsBand';
import { HeroSlider } from './HeroSlider';
import { ProductCard } from './ProductCard';

interface HomePageProps {
  pricingCatalog: PricingCatalogResponse | null;
  pricingLoading: boolean;
  pricingError: string | null;
  onRetryPricing: () => void;
  onNavigate: (page: PageId) => void;
  onInspectBuild: (build: PcBuild) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
}

const POPULAR_SHOWCASE_PREFS: BuilderPreferences = {
  budget: 60000,
  purpose: 'oyun',
  favoriteGames: ['Valorant', 'Cyberpunk 2077', 'Red Dead Redemption 2'],
  resolution: '1440p',
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
  onInspectPart,
}: HomePageProps) {
  const [dynamicCatFilter, setDynamicCatFilter] = useState<'all' | PartCategoryKey>('all');

  const popularBuilds = useMemo(() => {
    if (!pricingCatalog) return [];
    return generateSampleBuilds(POPULAR_SHOWCASE_PREFS, pricingCatalog);
  }, [pricingCatalog]);

  const dynamicProducts = pricingCatalog?.dynamicProducts ?? [];
  const dynamicCategories = useMemo(
    () => Array.from(new Set(dynamicProducts.map((p) => p.category))),
    [dynamicProducts]
  );
  const visibleDynamicProducts = useMemo(
    () =>
      dynamicCatFilter === 'all'
        ? dynamicProducts
        : dynamicProducts.filter((p) => p.category === dynamicCatFilter),
    [dynamicProducts, dynamicCatFilter]
  );

  return (
    <div className="bg-slate-900">
      {/* 1. Ready Systems Campaign Hero Slider */}
      <HeroSlider
        pricingCatalog={pricingCatalog}
        onNavigate={onNavigate}
        onInspectBuild={onInspectBuild}
      />

      {/* 2. Dual Band Upper: Çok Satan Hazır Sistemler */}
      <FeaturedSystemsBand
        pricingCatalog={pricingCatalog}
        onInspectBuild={onInspectBuild}
        onNavigate={onNavigate}
      />

      {/* 3. Dual Band Lower: Fırsat Donanımları (Tekil Bileşenler) */}
      <DealsShowcase
        pricingCatalog={pricingCatalog}
        onInspectPart={onInspectPart}
      />

      {/* 4. Horizontal Leaderboard AdBanner (728x90) */}
      <div className="mx-auto max-w-[1320px] px-4 pb-6 sm:px-6 lg:px-8">
        <AdBanner
          variant="leaderboard"
          sponsorLabel="Sponsorlu Alan · Google AdSense / İş Ortağı"
          headline="İtopya, ASUS ROG & MSI Sezon Donanım Kampanyaları"
          dimensionsLabel="728 × 90"
        />
      </div>

      {/* 4b. Dual PC Building Modes: Budget+Games FPS Advisor vs Manual Kendin Topla */}
      <section className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-[#FF7900]/45 bg-slate-800/80 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF7900]">
                Bütçe · Amaç · Oyun Seçimi
              </p>
              <h2 className="mt-1.5 font-display text-xl font-extrabold text-slate-50">
                Bütçene &amp; Oyunlarına Göre Sistem Öner (FPS Gör)
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Bütçeni ve oynayacağın oyunları seç; 10/10 uyumlu önerilen sistemlerde her oyunda
                kaç FPS alacağını 1080p, 1440p ve 4K olarak gör.
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => onNavigate('advisor')}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-[#FF7900] px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8E29] whitespace-nowrap"
              >
                <Gauge className="h-4 w-4 shrink-0" />
                <span>Sistem Öner ve FPS Hesapla</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-700/70 bg-slate-800/80 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
                Manuel Parça Sihirbazı
              </p>
              <h2 className="mt-1.5 font-display text-xl font-extrabold text-slate-50">
                Kendin Topla — Parçaları Adım Adım Seç
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                İşlemciden soğutucuya tüm sıfır bileşenleri tek tek seç, soket, DDR tipi, kasa
                ölçüsü ve PSU kapasitesini gerçek zamanlı kontrol et.
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => onNavigate('builder')}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-[#246BFD]/60 bg-[#246BFD]/15 px-5 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#246BFD] whitespace-nowrap"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span>Kendin Topla Sihirbazını Aç</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Popular Ready Systems Grid */}
      <section className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col justify-between gap-4 pb-10 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
              Öne Çıkan Sistemler
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
              Popüler Hazır Sistemler
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('systems')}
            className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 text-sm font-semibold text-[#FF7900] transition-colors hover:text-[#FF9A3D] whitespace-nowrap shrink-0"
          >
            <span>Tüm Hazır Sistemleri Gör</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>

        {pricingError && (
          <div
            role="alert"
            className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>Fiyat verisi yüklenemedi: {pricingError}</span>
            </span>
            <button
              type="button"
              onClick={onRetryPricing}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-400/40 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Yeniden Dene</span>
            </button>
          </div>
        )}

        {pricingLoading && !pricingCatalog ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="h-[340px] animate-pulse rounded-2xl border border-slate-700/50 bg-slate-800/70 sm:h-[460px]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {popularBuilds.map((build) => (
              <BuildCard
                key={build.id}
                build={build}
                variant="compact"
                badgeText={build.tier === 'yuksek-performans' ? 'Öne Çıkan' : 'Çok Satıyor'}
                onInspect={onInspectBuild}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. Auto-Discovered Store Hardware Products */}
      {dynamicProducts.length > 0 && (
        <section className="border-t border-slate-800 bg-slate-900">
          <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-col justify-between gap-6 pb-10 lg:flex-row lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
                  Güncel Donanım Fırsatları
                </p>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
                  Pazardan Çekilen Güncel Donanımlar
                </h2>
                <p className="mt-2 text-sm font-normal text-slate-400">
                  Türkiye mağazalarından anlık fiyatı takip edilen RAM, anakart, güç kaynağı ve
                  depolama ürünleri.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-800 p-1.5">
                <button
                  type="button"
                  onClick={() => setDynamicCatFilter('all')}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    dynamicCatFilter === 'all'
                      ? 'bg-[#FF7900] text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Tümü ({dynamicProducts.length})
                </button>
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDynamicCatFilter(cat)}
                    className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      dynamicCatFilter === cat
                        ? 'bg-[#FF7900] text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {visibleDynamicProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  pricing={pricingCatalog?.partsPricing[product.id]}
                  onInspect={onInspectPart}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
