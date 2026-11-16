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
        className={`group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 font-sans text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${className}`}
      >
        {/* Top Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-block rounded-md border border-orange-200/80 bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold tracking-tight text-[#EA580C]">
            {badgeText}
          </span>
        </div>

        {/* Clean Object-Contain Case Image */}
        <div className="my-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50/75 p-3">
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
              <Cpu className="h-10 w-10 text-[#FF7900]" />
              <span className="text-xs font-semibold text-slate-700">
                {build.systemName}
              </span>
            </div>
          )}
        </div>

        {/* Single-Line Gray Hardware Summary */}
        <p className="truncate text-xs font-normal text-slate-500" title={hardwareSummaryLine}>
          {hardwareSummaryLine}
        </p>

        {/* Bottom Large Orange Price + Installment Note */}
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <span className="block font-sans text-2xl font-extrabold tracking-tight text-[#FF7900] tabular-nums">
            {formatTry(build.samplePriceTry)}
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500 tabular-nums">
            {formatTry(monthlyInstallmentTry)} x 12 Taksit İmkanı
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
      <div className="relative bg-slate-50/80 p-5">
        {onToggleCompare && (
          <button
            type="button"
            onClick={() => onToggleCompare(build)}
            aria-label={isCompared ? 'Karşılaştırmadan çıkar' : 'Karşılaştırmaya ekle'}
            className={`absolute right-3.5 top-3.5 z-10 inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              isCompared
                ? 'border-[#246BFD] bg-[#246BFD] text-white'
                : 'border-slate-200 bg-white/95 text-slate-600 hover:border-[#246BFD] hover:text-[#246BFD]'
            }`}
          >
            <Scale className="h-3 w-3" />
            <span>{isCompared ? 'Seçildi' : 'Karşılaştır'}</span>
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
              <Cpu className="h-12 w-12 text-[#FF7900]" />
              <span className="text-sm font-bold text-slate-700">
                {build.systemName}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Body: Star Rating, Main Title, Vertical Component Summary, Footer CTA */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Star Rating */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-0.5 text-amber-400" aria-label={`Puan ${rating.score} / 5`}>
            {[0, 1, 2, 3, 4].map((starIdx) => (
              <Star
                key={starIdx}
                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
          <span className="font-semibold text-slate-700 tabular-nums">{rating.score}</span>
          <span className="text-slate-400 tabular-nums">({rating.count})</span>
        </div>

        {/* Main Title */}
        <h3 className="mt-2 font-sans text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
          <button
            type="button"
            onClick={() => onInspect(build)}
            className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-[#246BFD]"
          >
            {build.systemName}
          </button>
        </h3>

        {/* Vertical Core Hardware Summary with Icons */}
        <ul className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <li className="flex items-center gap-2.5 text-xs text-slate-600">
            <Cpu className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700" title={build.cpu.model}>
              {build.cpu.model}
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-slate-600">
            <CircuitBoard className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700" title={build.motherboard.model}>
              {build.motherboard.model}
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-slate-600">
            <Monitor className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700" title={build.gpu.model}>
              {build.gpu.model}
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-slate-600">
            <MemoryStick className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700" title={build.ram.model}>
              {build.ram.model}
            </span>
          </li>
        </ul>

        {/* Bottom Price + Primary Action Button */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <span className="block font-sans text-xl font-extrabold tracking-tight text-[#246BFD] tabular-nums sm:text-2xl">
              {formatTry(build.samplePriceTry)}
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-500 tabular-nums">
              {formatTry(monthlyInstallmentTry)} x 12 Taksit
            </span>
          </div>

          <button
            type="button"
            onClick={() => (onCustomize ? onCustomize(build) : onInspect(build))}
            className="inline-flex min-h-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#FF7900] px-4 py-2 text-xs font-extrabold tracking-wide text-slate-950 transition-colors hover:bg-[#FF8C24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] whitespace-nowrap"
          >
            {onCustomize ? 'ÖZELLEŞTİR' : 'İNCELE'}
          </button>
        </div>
      </div>
    </article>
  );
}
