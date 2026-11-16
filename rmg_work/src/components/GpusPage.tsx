import { ChevronDown, ChevronUp, Cpu, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTry, HARDWARE_STUDIO_IMAGES } from '../data/builds';
import { GPU_DB } from '../data/hardwareDb';
import { PricingCatalogResponse } from '../types/pc';

interface GpusPageProps {
  pricingCatalog: PricingCatalogResponse | null;
  onBuildWithGpu: (gpuId: string) => void;
  onManageListings: (partId?: string) => void;
}

export function GpusPage({
  pricingCatalog,
  onBuildWithGpu,
  onManageListings,
}: GpusPageProps) {
  const [brandFilter, setBrandFilter] = useState<'Tümü' | 'NVIDIA' | 'AMD' | 'Intel'>('Tümü');
  const [search, setSearch] = useState('');
  const [minVram, setMinVram] = useState('Tümü');
  const [conditionMode, setConditionMode] = useState<'sifir' | 'ikinci-el'>('sifir');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const gpus = useMemo(() => GPU_DB.filter((g) => !g.isIntegrated && !g.isUnverifiedSpecSample)
    .filter((g) => brandFilter === 'Tümü' || g.brand === brandFilter)
    .filter((g) => g.model.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')))
    .filter((g) => minVram === 'Tümü' || (g.vramGb ?? 0) >= Number(minVram))
    .sort((a, b) => a.model.localeCompare(b.model, 'tr')), [brandFilter, search, minVram]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/90 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
            Ekran Kartı Kataloğu
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-[#F5F7FA] sm:text-4xl">
            Ekran Kartları
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#94A3B8]">
            1080p, 1440p ve 4K oyun performansı için ekran kartlarını inceleyin ve tek tıkla
            sisteminize ekleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-800 bg-[#111827] p-1">
            {(['Tümü', 'NVIDIA', 'AMD', 'Intel'] as const).map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setBrandFilter(brand)}
                className={`cursor-pointer rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                  brandFilter === brand
                    ? 'bg-[#246BFD] text-[#F5F7FA]'
                    : 'text-[#94A3B8] hover:text-[#F5F7FA]'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-slate-800 bg-[#111827] p-1">
            <button
              type="button"
              onClick={() => setConditionMode('sifir')}
              className={`cursor-pointer rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                conditionMode === 'sifir'
                  ? 'bg-[#FF7900] text-[#080B12]'
                  : 'text-[#94A3B8] hover:text-[#F5F7FA]'
              }`}
            >
              Sıfır
            </button>
            <button
              type="button"
              onClick={() => setConditionMode('ikinci-el')}
              className={`cursor-pointer rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                conditionMode === 'ikinci-el'
                  ? 'bg-[#FF7900] text-[#080B12]'
                  : 'text-[#94A3B8] hover:text-[#F5F7FA]'
              }`}
            >
              İkinci El
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-[#111827] p-4 md:grid-cols-[1fr_220px_auto] md:items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Model ara: RTX 4070, RX 7800 XT, Arc B580..." className="min-h-11 rounded-lg border border-slate-700 bg-[#080B12] px-4 text-sm text-white outline-none focus:border-[#FF7900]" />
        <select value={minVram} onChange={(e) => setMinVram(e.target.value)} className="min-h-11 rounded-lg border border-slate-700 bg-[#080B12] px-3 text-sm text-white">
          <option value="Tümü">Tüm VRAM kapasiteleri</option><option value="4">4 GB ve üzeri</option><option value="6">6 GB ve üzeri</option><option value="8">8 GB ve üzeri</option><option value="12">12 GB ve üzeri</option><option value="16">16 GB ve üzeri</option><option value="24">24 GB ve üzeri</option>
        </select>
        <span className="text-sm text-slate-400">{gpus.length} model listeleniyor</span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {gpus.length === 0 && <div className="col-span-full rounded-xl border border-slate-800 bg-[#111827] p-10 text-center text-slate-400">Aramanızla eşleşen ekran kartı bulunamadı.</div>}
        {gpus.map((gpu) => {
          const pricing = pricingCatalog?.partsPricing[gpu.id];
          const activePrice =
            conditionMode === 'ikinci-el'
              ? pricing?.usedPriceTry ?? 0
              : pricing?.newPriceTry ?? 0;
          const sourceLabel =
            conditionMode === 'ikinci-el'
              ? pricing?.usedSourceLabel ?? 'İkinci el ilanı bulunamadı'
              : pricing?.newSourceLabel ?? 'Veri yükleniyor';
          const isExpanded = Boolean(expandedIds[gpu.id]);

          return (
            <article
              key={gpu.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#111827] transition-colors hover:border-[#FF7900]/70"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#080B12]">
                <img
                  src={HARDWARE_STUDIO_IMAGES.gpu}
                  alt={gpu.model}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <span className="text-xs font-medium text-[#94A3B8]">
                    {gpu.brand} · {gpu.vramGb ?? '?'} GB VRAM
                  </span>
                  <h2 className="mt-1.5 font-display text-xl font-bold text-[#F5F7FA]">
                    {gpu.model}
                  </h2>

                  <div className="mt-4 border-t border-slate-800 pt-4">
                    {conditionMode === 'ikinci-el' &&
                      pricing?.newPriceTry &&
                      pricing.comparison.savingsPercent !== null && (
                        <span className="block font-mono text-xs text-[#94A3B8] line-through tabular-nums">
                          {formatTry(pricing.newPriceTry)}
                        </span>
                      )}
                    <span className="font-mono text-2xl font-bold tabular-nums text-[#FF7900]">
                      {activePrice > 0 ? formatTry(activePrice) : 'Fiyat Bekleniyor'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpand(gpu.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#246BFD] hover:underline"
                    >
                      <span>
                        {isExpanded
                          ? 'Teknik Özellikleri Gizle'
                          : 'Teknik Özellikleri Gör'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onManageListings(gpu.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#94A3B8] hover:text-[#FF7900]"
                    >
                      <span>İlan Ekle</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 rounded-lg bg-[#080B12] p-3.5 text-xs text-[#94A3B8]">
                      <p>
                        <strong className="text-[#F5F7FA]">Boyut &amp; Güç: </strong>
                        {gpu.lengthMm ?? '?'} mm · {gpu.widthSlots ?? '?'} Yuva · Önerilen{' '}
                        {gpu.recommendedPsuWatts ?? '?'}W PSU
                      </p>
                      <p>
                        <strong className="text-[#F5F7FA]">Konektör: </strong>
                        {gpu.requiredConnectors?.twelveVhpwrCount
                          ? `${gpu.requiredConnectors.twelveVhpwrCount}x 16-Pin 12VHPWR`
                          : `${gpu.requiredConnectors?.eightPinCount ?? 0}x 8-Pin PCIe`}
                      </p>
                      <p>
                        <strong className="text-[#F5F7FA]">Kaynak: </strong>
                        {sourceLabel}
                      </p>
                      {pricing?.comparison.differenceTry !== null &&
                        pricing?.comparison.differenceTry !== undefined && (
                          <p className="text-[#FF7900]">
                            İkinci El Tasarrufu: {formatTry(pricing.comparison.differenceTry)}{' '}
                            (%{pricing.comparison.savingsPercent ?? 0})
                          </p>
                        )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onBuildWithGpu(gpu.id)}
                  className="mt-5 flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-4 py-2.5 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span>Bu Kartla Sistem Topla</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {gpus.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#111827] py-16 text-center">
          <Cpu className="h-10 w-10 text-[#94A3B8]" />
          <p className="mt-3 text-sm text-[#94A3B8]">
            Seçili filtrelere uygun ekran kartı bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
}
