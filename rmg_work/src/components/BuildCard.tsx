import { ArrowRight, Cpu } from 'lucide-react';
import { useState } from 'react';
import { formatTry } from '../data/builds';
import { PcBuild } from '../types/pc';

interface BuildCardProps {
  build: PcBuild;
  isCompared?: boolean;
  onInspect: (build: PcBuild) => void;
  onToggleCompare?: (build: PcBuild) => void;
}

export function BuildCard({
  build,
  isCompared = false,
  onInspect,
  onToggleCompare,
}: BuildCardProps) {
  const [imgError, setImgError] = useState(false);

  const ramSummary = build.ram.model.split(' ').slice(0, 3).join(' ');
  const ssdSummary = build.ssd.model.includes('2 TB')
    ? '2 TB NVMe SSD'
    : build.ssd.model.includes('1 TB')
      ? '1 TB NVMe SSD'
      : '500 GB NVMe SSD';

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#111827] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#246BFD]/70">
      {/* Large Product Image */}
      <button
        type="button"
        onClick={() => onInspect(build)}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-[#080B12] text-left focus-visible:outline-2 focus-visible:outline-[#246BFD]"
      >
        {!imgError ? (
          <img
            src={build.image}
            alt={build.systemName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#080B12] p-6 text-center">
            <Cpu className="h-12 w-12 text-[#246BFD]" />
            <span className="font-display text-lg font-semibold text-[#F5F7FA]">
              {build.systemName}
            </span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111827]/85 via-transparent to-transparent"
          aria-hidden="true"
        />
      </button>

      {/* Clean E-Commerce Card Body */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {/* Clean 1-line kicker */}
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#94A3B8]">
            <span>
              {build.tierTitle} · {build.targetResolution.toUpperCase()}
            </span>
            {build.zeroVsUsedSavingsPercent > 0 && (
              <span className="font-mono font-semibold text-[#FF7900]">
                %{build.zeroVsUsedSavingsPercent} Tasarruf
              </span>
            )}
          </div>

          {/* Big Readable System Name */}
          <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-[#F5F7FA]">
            {build.systemName}
          </h3>

          {/* 4 Essential Hardware Specs Only (CPU, GPU, RAM, SSD) */}
          <dl className="mt-4 space-y-2 border-t border-slate-800/80 pt-4 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-[#94A3B8] shrink-0">İşlemci</dt>
              <dd className="truncate text-right font-medium text-[#F5F7FA]">
                {build.cpu.model}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-[#94A3B8] shrink-0">Ekran Kartı</dt>
              <dd className="truncate text-right font-medium text-[#F5F7FA]">
                {build.gpu.model}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-[#94A3B8] shrink-0">Bellek</dt>
              <dd className="truncate text-right font-medium text-[#F5F7FA]">
                {ramSummary}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-[#94A3B8] shrink-0">Depolama</dt>
              <dd className="truncate text-right font-medium text-[#F5F7FA]">
                {ssdSummary}
              </dd>
            </div>
          </dl>
        </div>

        {/* Big Orange Price & Clear CTA */}
        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              {build.zeroVsUsedSavingsTry > 0 && (
                <span className="block font-mono text-xs tabular-nums text-[#94A3B8] line-through">
                  {formatTry(build.allNewTotalTry)}
                </span>
              )}
              <span className="font-mono text-2xl font-bold tabular-nums tracking-tight text-[#FF7900]">
                {formatTry(build.samplePriceTry)}
              </span>
            </div>

            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(build)}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  isCompared
                    ? 'border-[#FF7900] bg-[#080B12] text-[#FF7900]'
                    : 'border-slate-700 bg-[#080B12] text-[#94A3B8] hover:text-[#F5F7FA]'
                }`}
              >
                {isCompared ? 'Karşılaştırmada' : 'Karşılaştır'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onInspect(build)}
            className="mt-4 flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-5 py-2.5 text-sm font-semibold text-[#F5F7FA] transition-colors duration-150 hover:bg-[#3B7CFE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#246BFD]"
          >
            <span>İncele</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    </article>
  );
}
