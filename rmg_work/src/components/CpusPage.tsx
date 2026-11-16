import { ChevronDown, ChevronUp, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTry, HARDWARE_STUDIO_IMAGES } from '../data/builds';
import { CPU_DB } from '../data/hardwareDb';
import { CpuSocket, PricingCatalogResponse } from '../types/pc';

interface CpusPageProps {
  pricingCatalog: PricingCatalogResponse | null;
  onBuildWithCpu: (cpuId: string) => void;
  onManageListings: (partId?: string) => void;
}

export function CpusPage({
  pricingCatalog,
  onBuildWithCpu,
  onManageListings,
}: CpusPageProps) {
  const [brandFilter, setBrandFilter] = useState<'Tümü' | 'Intel' | 'AMD'>('Tümü');
  const [socketFilter, setSocketFilter] = useState<'Tümü' | CpuSocket>('Tümü');
  const [conditionMode, setConditionMode] = useState<'sifir' | 'ikinci-el'>('sifir');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [generationFilter, setGenerationFilter] = useState('Tümü');

  const generations = Array.from(new Set(CPU_DB.map((c) => c.generation).filter(Boolean))) as string[];
  const cpus = useMemo(() => CPU_DB.filter((c) => !c.isUnverifiedSpecSample)
    .filter((c) => brandFilter === 'Tümü' || c.brand === brandFilter)
    .filter((c) => socketFilter === 'Tümü' || c.socket === socketFilter)
    .filter((c) => generationFilter === 'Tümü' || c.generation === generationFilter)
    .filter((c) => c.model.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')))
    .sort((a, b) => a.model.localeCompare(b.model, 'tr')), [brandFilter, socketFilter, generationFilter, search]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800/90 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
            İşlemci Kataloğu
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-[#F5F7FA] sm:text-4xl">
            İşlemciler
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#94A3B8]">
            Oyun, yayın ve iş istasyonları için AMD Ryzen ve Intel Core ailelerinden geniş işlemci kataloğunu inceleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-800 bg-[#111827] p-1">
            {(['Tümü', 'AMD', 'Intel'] as const).map((brand) => (
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
            {(['Tümü', 'AM5', 'AM4', 'LGA1700', 'LGA1851'] as const).map((socket) => (
              <button
                key={socket}
                type="button"
                onClick={() => setSocketFilter(socket)}
                className={`cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  socketFilter === socket
                    ? 'bg-[#246BFD] text-[#F5F7FA]'
                    : 'text-[#94A3B8] hover:text-[#F5F7FA]'
                }`}
              >
                {socket}
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

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-[#111827] p-4 md:grid-cols-[1fr_240px_auto] md:items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İşlemci ara: Ryzen 7 7800X3D, Core i7..." className="min-h-11 rounded-lg border border-slate-700 bg-[#080B12] px-4 text-sm text-white outline-none focus:border-[#FF7900]" />
        <select value={generationFilter} onChange={(e) => setGenerationFilter(e.target.value)} className="min-h-11 rounded-lg border border-slate-700 bg-[#080B12] px-3 text-sm text-white">
          <option value="Tümü">Tüm nesiller</option>{generations.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="text-sm text-slate-400">{cpus.length} model listeleniyor</span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {cpus.length === 0 && <div className="col-span-full rounded-xl border border-slate-800 bg-[#111827] p-10 text-center text-slate-400">Aramanızla eşleşen işlemci bulunamadı.</div>}
        {cpus.map((cpu) => {
          const pricing = pricingCatalog?.partsPricing[cpu.id];
          const activePrice =
            conditionMode === 'ikinci-el'
              ? pricing?.usedPriceTry ?? 0
              : pricing?.newPriceTry ?? 0;
          const sourceLabel =
            conditionMode === 'ikinci-el'
              ? pricing?.usedSourceLabel ?? 'İkinci el ilanı bulunamadı'
              : pricing?.newSourceLabel ?? 'Veri yükleniyor';
          const isExpanded = Boolean(expandedIds[cpu.id]);

          return (
            <article
              key={cpu.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#111827] transition-colors hover:border-[#FF7900]/70"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#080B12]">
                <img
                  src={HARDWARE_STUDIO_IMAGES.cpu}
                  alt={cpu.model}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <span className="text-xs font-medium text-[#94A3B8]">
                    {cpu.socket} · {cpu.cores} Çekirdek / {cpu.threads} İzlek
                  </span>
                  <h2 className="mt-1.5 font-display text-xl font-bold text-[#F5F7FA]">
                    {cpu.model}
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
                      onClick={() => toggleExpand(cpu.id)}
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
                      onClick={() => onManageListings(cpu.id)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#94A3B8] hover:text-[#FF7900]"
                    >
                      <span>İlan Ekle</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 rounded-lg bg-[#080B12] p-3.5 text-xs text-[#94A3B8]">
                      <p>
                        <strong className="text-[#F5F7FA]">Saat &amp; Güç: </strong>
                        {cpu.boostClockGhz} GHz Turbo · Maks. {cpu.maxPowerWatts ?? '?'}W ·{' '}
                        {cpu.supportedRam.join('/')}
                      </p>
                      <p>
                        <strong className="text-[#F5F7FA]">Soğutma: </strong>
                        {cpu.requiresDedicatedCooler
                          ? 'Harici kule tipi veya sıvı soğutucu gereklidir'
                          : 'Stok soğutucu ile kullanılabilir'}
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
                  onClick={() => onBuildWithCpu(cpu.id)}
                  className="mt-5 flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-4 py-2.5 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span>Bu İşlemciyle Sistem Topla</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
