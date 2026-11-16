import { ArrowRight, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatTry, getShowcaseReadyBuilds } from '../data/builds';
import { PageId, PcBuild, PricingCatalogResponse } from '../types/pc';

interface HeroSliderProps {
  pricingCatalog: PricingCatalogResponse | null;
  onNavigate: (page: PageId) => void;
  onInspectBuild: (build: PcBuild) => void;
}

export function HeroSlider({
  pricingCatalog,
  onNavigate,
  onInspectBuild,
}: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Slider'da SADECE Hazır Sistemler kampanya afişleri gösterilir
  const campaignSlides = useMemo(
    () => getShowcaseReadyBuilds(pricingCatalog).slice(0, 4),
    [pricingCatalog]
  );

  useEffect(() => {
    if (isPaused || campaignSlides.length <= 1) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % campaignSlides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isPaused, campaignSlides.length]);

  const goPrev = () => {
    setActiveIndex(
      (prev) => (prev - 1 + campaignSlides.length) % campaignSlides.length
    );
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % campaignSlides.length);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Hazır sistem kampanyaları"
      className="border-b border-slate-800 bg-slate-900"
    >
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-800"
        >
          {/* Slides Track */}
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {campaignSlides.map(({ preset, build, oldPriceTry, discountPercent }) => {
              const imgFailed = Boolean(failedImages[preset.id]);
              return (
                <div
                  key={preset.id}
                  onClick={() => onInspectBuild(build)}
                  role="group"
                  aria-roledescription="slide"
                  className="relative min-h-[430px] w-full shrink-0 cursor-pointer sm:min-h-[470px] lg:min-h-[500px]"
                >
                  {/* Background Media */}
                  {!imgFailed ? (
                    <img
                      src={preset.image}
                      alt={preset.systemName}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [preset.id]: true }))
                      }
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <Cpu className="h-16 w-16 text-[#FF7900]/40" />
                    </div>
                  )}

                  {/* Measured Contrast Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/35" />

                  {/* Foreground Ready-System Campaign Copy */}
                  <div className="relative z-10 flex h-full min-h-[430px] flex-col justify-center px-6 py-12 sm:min-h-[470px] sm:px-12 lg:min-h-[500px] lg:px-16">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF7900]">
                        <span>Hazır Sistem Kampanyası</span>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="text-slate-300">{preset.tierTitle}</span>
                        <span aria-hidden="true" className="text-slate-500">
                          ·
                        </span>
                        <span className="text-[#FF7900]">-%{discountPercent} Fırsat</span>
                      </div>

                      <h1
                        className="mt-3 font-display font-extrabold tracking-tight text-slate-50"
                        style={{
                          fontSize: 'clamp(1.85rem, 3.5vw, 3.15rem)',
                          lineHeight: 1.12,
                          textWrap: 'balance',
                        }}
                      >
                        {preset.systemName}
                      </h1>

                      <p className="mt-3 text-sm font-semibold text-slate-200 sm:text-base">
                        {preset.tagline}
                      </p>

                      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-slate-300">
                        {preset.performanceNote}
                      </p>

                      <div className="mt-6 flex flex-wrap items-baseline gap-3">
                        <span className="font-mono text-3xl font-extrabold tracking-tight text-[#FF7900] tabular-nums sm:text-4xl">
                          {formatTry(build.samplePriceTry)}
                        </span>
                        <span className="font-mono text-sm text-slate-400 line-through tabular-nums">
                          {formatTry(oldPriceTry)}
                        </span>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-3.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectBuild(build);
                          }}
                          className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-[#FF8C24] whitespace-nowrap"
                        >
                          <span>Sistemi İncele</span>
                          <ArrowRight className="h-4 w-4 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('systems');
                          }}
                          className="inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/75 px-6 py-3 text-sm font-semibold text-slate-100 backdrop-blur-sm transition-colors hover:border-slate-400 hover:bg-slate-800 whitespace-nowrap"
                        >
                          <span>Tüm Hazır Sistemler</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Left / Right Arrow Navigation */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Önceki hazır sistem kampanyası"
            className="absolute left-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-100 backdrop-blur-sm transition-colors hover:border-[#FF7900] hover:text-[#FF7900] sm:left-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Sonraki hazır sistem kampanyası"
            className="absolute right-3 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-100 backdrop-blur-sm transition-colors hover:border-[#FF7900] hover:text-[#FF7900] sm:right-4"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Bottom Pagination Dots */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/85 px-3 py-1.5 backdrop-blur-sm">
            {campaignSlides.map(({ preset }, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(idx);
                  }}
                  aria-label={`Kampanya ${idx + 1}: ${preset.systemName}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`h-2.5 cursor-pointer rounded-full transition-all duration-200 ${
                    isActive
                      ? 'w-7 bg-[#FF7900]'
                      : 'w-2.5 bg-slate-500 hover:bg-slate-300'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
