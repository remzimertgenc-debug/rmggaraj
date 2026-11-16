import {
  CircuitBoard,
  Cpu,
  MemoryStick,
  Monitor,
  Scale,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { formatTry, getReadySystemCaseImage } from '../data/builds';
import { PcBuild } from '../types/pc';

export type BuildCardVariant = 'compact' | 'detailed';

interface BuildCardProps {
  build: PcBuild;
  variant?: BuildCardVariant;
  badgeText?: string;
  compactSummary?: string;
  isCompared?: boolean;
  onInspect: (build: PcBuild) => void;
  onToggleCompare?: (build: PcBuild) => void;
  onCustomize?: (build: PcBuild) => void;
  className?: string;
}

function formatCompactHardwareLine(build: PcBuild, override?: string): string {
  if (override && override.trim().length > 0) return override;
  const baseName = build.systemName.split(' - ')[0].trim();
  const ramMatch = build.ram.model.match(/\b(\d+\s*GB)\b/i);
  const ramLabel = ramMatch ? ramMatch[1] : build.ram.model;
  const gpuLabel = build.gpu.model.replace(
    /^(ASUS|MSI|Gigabyte|Sapphire|XFX|PowerColor|ASRock|Palit|Galax|Zotac|Gainward|PNY|INNO3D|NVIDIA|AMD)\s+/i,
    ''
  );
  return `${baseName} | ${build.cpu.model} | ${ramLabel} | ${gpuLabel}`;
}

function getSystemRating(build: PcBuild): { score: string; count: number } {
  const hash = Array.from(build.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const scoreVal = build.tier === 'yuksek-performans' ? 4.9 : 4.7 + (hash % 3) * 0.1;
  const count = 24 + (hash % 55);
  return { score: scoreVal.toFixed(1), count };
}

export function BuildCard({
  build,
  variant = 'detailed',
  badgeText = 'Çok Satıyor',
  compactSummary,
  isCompared = false,
  onInspect,
  onToggleCompare,
  onCustomize,
  className = '',
}: BuildCardProps) {
  const [imgError, setImgError] = useState(false);
  const caseImageUrl = getReadySystemCaseImage(build);
  const monthlyInstallmentTry = Math.ceil(build.samplePriceTry / 12);

  if (variant === 'compact') {
    const hardwareSummaryLine = formatCompactHardwareLine(build, compactSummary);

    return (
      <article
        onClick={() => onInspect(build)}
        className={`group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3 font-sans text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-4 ${className}`}
      >
        {/* Top Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-block rounded-md border border-orange-200/80 bg-orange-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-[#EA580C] sm:px-2.5 sm:text-[11px]">
            {badgeText}
          </span>
        </div>

        {/* Clean Object-Contain Case Image */}
        <div className="my-2 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/75 p-2 sm:my-3 sm:p-3">
          {!imgError ? (
            <img
              src={caseImageUrl}
              alt={build.systemName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
              <Cpu className="h-8 w-8 text-[#FF7900] sm:h-10 sm:w-10" />
              <span className="line-clamp-2 text-center text-[11px] font-semibold text-slate-700 sm:text-xs">
                {build.systemName}
              </span>
            </div>
          )}
        </div>

        {/* Single-Line Gray Hardware Summary */}
        <p className="truncate text-[11px] font-normal text-slate-500 sm:text-xs" title={hardwareSummaryLine}>
          {hardwareSummaryLine}
        </p>

        {/* Bottom Large Orange Price + Installment Note */}
        <div className="mt-2 border-t border-slate-100 pt-2 sm:mt-3 sm:pt-2.5">
          <span className="block font-sans text-base font-extrabold tracking-tight text-[#FF7900] tabular-nums sm:text-2xl">
            {formatTry(build.samplePriceTry)}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500 tabular-nums sm:text-[11px]">
            {formatTry(monthlyInstallmentTry)} x 12 Taksit
          </span>
        </div>
      </article>
    );
  }

  // Detailed Card (Systems Listing Page)
  const rating = getSystemRating(build);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white font-sans text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${className}`}
    >
      {/* Top Product Showcase Image (object-contain on light surface) */}
      <div className="relative bg-slate-50/80 p-2.5 sm:p-5">
        {onToggleCompare && (
          <button
            type="button"
            onClick={() => onToggleCompare(build)}
            aria-label={isCompared ? 'Karşılaştırmadan çıkar' : 'Karşılaştırmaya ekle'}
            className={`absolute right-2 top-2 z-10 inline-flex cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold transition-colors sm:right-3.5 sm:top-3.5 sm:px-2.5 sm:py-1 sm:text-[11px] ${
              isCompared
                ? 'border-[#246BFD] bg-[#246BFD] text-white'
                : 'border-slate-200 bg-white/95 text-slate-600 hover:border-[#246BFD] hover:text-[#246BFD]'
            }`}
          >
            <Scale className="h-3 w-3" />
            <span className="hidden sm:inline">{isCompared ? 'Seçildi' : 'Karşılaştır'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onInspect(build)}
          className="flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-[#246BFD]"
        >
          {!imgError ? (
            <img
              src={caseImageUrl}
              alt={build.systemName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
              <Cpu className="h-10 w-10 text-[#FF7900] sm:h-12 sm:w-12" />
              <span className="text-xs font-bold text-slate-700 sm:text-sm">
                {build.systemName}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Body: Star Rating, Main Title, Vertical Component Summary, Footer CTA */}
      <div className="flex flex-1 flex-col p-3 sm:p-6">
        {/* Star Rating */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 sm:gap-1.5 sm:text-xs">
          <div className="flex items-center gap-0.5 text-amber-400" aria-label={`Puan ${rating.score} / 5`}>
            {[0, 1, 2, 3, 4].map((starIdx) => (
              <Star
                key={starIdx}
                className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5"
              />
            ))}
          </div>
          <span className="font-semibold text-slate-700 tabular-nums">{rating.score}</span>
          <span className="text-slate-400 tabular-nums">({rating.count})</span>
        </div>

        {/* Main Title */}
        <h3 className="mt-1.5 font-sans text-xs font-bold leading-snug tracking-tight text-slate-900 sm:mt-2 sm:text-lg">
          <button
            type="button"
            onClick={() => onInspect(build)}
            className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#246BFD]"
          >
            {build.systemName}
          </button>
        </h3>

        {/* Vertical Core Hardware Summary with Icons */}
        <ul className="mt-2.5 space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-2 sm:mt-4 sm:space-y-2 sm:p-3.5">
          <li className="flex items-center gap-1.5 text-[11px] text-slate-600 sm:gap-2.5 sm:text-xs">
            <Cpu className="h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" />
            <span className="truncate font-medium text-slate-700" title={build.cpu.model}>
              {build.cpu.model}
            </span>
          </li>
          <li className="hidden items-center gap-2.5 text-xs text-slate-600 sm:flex">
            <CircuitBoard className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700" title={build.motherboard.model}>
              {build.motherboard.model}
            </span>
          </li>
          <li className="flex items-center gap-1.5 text-[11px] text-slate-600 sm:gap-2.5 sm:text-xs">
            <Monitor className="h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" />
            <span className="truncate font-medium text-slate-700" title={build.gpu.model}>
              {build.gpu.model}
            </span>
          </li>
          <li className="hidden items-center gap-2.5 text-xs text-slate-600 sm:flex">
            <MemoryStick className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700" title={build.ram.model}>
              {build.ram.model}
            </span>
          </li>
        </ul>

        {/* Bottom Price + Primary Action Button */}
        <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
          <div className="min-w-0">
            <span className="block font-sans text-base font-extrabold tracking-tight text-[#246BFD] tabular-nums sm:text-2xl">
              {formatTry(build.samplePriceTry)}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500 tabular-nums sm:text-[11px]">
              {formatTry(monthlyInstallmentTry)} x 12 Taksit
            </span>
          </div>

          <button
            type="button"
            onClick={() => (onCustomize ? onCustomize(build) : onInspect(build))}
            className="inline-flex min-h-[36px] w-full shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#FF7900] px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-slate-950 transition-colors hover:bg-[#FF8C24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] whitespace-nowrap sm:min-h-[42px] sm:w-auto sm:px-4 sm:py-2 sm:text-xs"
          >
            {onCustomize ? 'ÖZELLEŞTİR' : 'İNCELE'}
          </button>
        </div>
      </div>
    </article>
  );
}
