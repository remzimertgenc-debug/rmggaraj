import { ExternalLink, Megaphone } from 'lucide-react';

export type AdBannerVariant = 'leaderboard' | 'vertical' | 'rectangle';

interface AdBannerProps {
  variant?: AdBannerVariant;
  sponsorLabel?: string;
  headline?: string;
  description?: string;
  dimensionsLabel?: string;
  className?: string;
}

export function AdBanner({
  variant = 'leaderboard',
  sponsorLabel = 'Sponsorlu Alan · Google AdSense / Marka İş Birliği',
  headline,
  description,
  dimensionsLabel,
  className = '',
}: AdBannerProps) {
  if (variant === 'vertical') {
    return (
      <aside
        aria-label="Dikey Reklam Alanı"
        className={`flex min-h-[420px] flex-col justify-between rounded-2xl border border-dashed border-slate-700/80 bg-slate-800/45 p-6 ${className}`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5 text-[#FF7900]" />
              <span>Reklam Alanı</span>
            </span>
            <span className="font-mono text-slate-500">
              {dimensionsLabel ?? '300 × 600'}
            </span>
          </div>

          <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#FF7900]">
              {sponsorLabel}
            </p>
            <h3 className="mt-3 font-display text-lg font-bold leading-snug text-slate-100">
              {headline ?? 'ASUS ROG, MSI & İtopya Sezon Kampanyaları'}
            </h3>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
              {description ??
                'Donanım markaları, yetkili e-ticaret mağazaları veya Google AdSense dikey vitrin reklamları için ayrılmış alan.'}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-700/60 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Partner &amp; AdSense Hazır</span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
              <span>Slot #V-01</span>
              <ExternalLink className="h-3 w-3 text-[#FF7900]" />
            </span>
          </div>
        </div>
      </aside>
    );
  }

  if (variant === 'rectangle') {
    return (
      <aside
        aria-label="Kare Reklam Alanı"
        className={`flex min-h-[250px] flex-col justify-between rounded-2xl border border-dashed border-slate-700/80 bg-slate-800/45 p-5 ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5 text-[#FF7900]" />
            <span>Reklam Alanı</span>
          </span>
          <span className="font-mono text-slate-500">
            {dimensionsLabel ?? '300 × 250'}
          </span>
        </div>

        <div className="my-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#246BFD]">
            {sponsorLabel}
          </p>
          <p className="mt-1.5 font-display text-base font-bold text-slate-100">
            {headline ?? 'Sponsorlu Donanım & Mağaza Vitrini'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {description ??
              'Google AdSense veya partner mağaza kampanyaları için ayrılmış içerik içi reklam alanı.'}
          </p>
        </div>

        <span className="font-mono text-[11px] text-slate-500">AdSense / Sponsorlu Banner</span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Yatay Reklam Alanı"
      className={`mx-auto w-full max-w-[970px] rounded-2xl border border-dashed border-slate-700/80 bg-slate-800/45 px-5 py-4 sm:px-7 ${className}`}
    >
      <div className="flex min-h-[62px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-[#FF7900]">
              <Megaphone className="h-3.5 w-3.5" />
              <span>Reklam Alanı</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{sponsorLabel}</span>
          </div>
          <p className="mt-1 truncate font-display text-sm font-bold text-slate-100 sm:text-base">
            {headline ??
              'İtopya, ASUS, MSI veya Google AdSense Yatay Banner Yerleşimi'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 font-mono text-xs font-semibold text-slate-300">
            {dimensionsLabel ?? '728 × 90'}
          </span>
        </div>
      </div>
    </aside>
  );
}
