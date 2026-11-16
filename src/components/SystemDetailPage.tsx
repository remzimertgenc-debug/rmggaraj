import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Scale,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { formatTry, getBuildGallery } from '../data/builds';
import { PartCategoryKey, PcBuild, PricingCatalogResponse } from '../types/pc';
import { AdBanner } from './AdBanner';
import { ProductImage } from './ProductImage';

interface SystemDetailPageProps {
  build: PcBuild;
  pricingCatalog?: PricingCatalogResponse | null;
  isCompared: boolean;
  onBack: () => void;
  onCustomizeBuild: (build: PcBuild) => void;
  onToggleCompare: (build: PcBuild) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onManageListings: (partId?: string) => void;
}

export function SystemDetailPage({
  build,
  pricingCatalog,
  isCompared,
  onBack,
  onCustomizeBuild,
  onToggleCompare,
  onInspectPart,
  onManageListings,
}: SystemDetailPageProps) {
  const gallery = getBuildGallery(build);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showSystemTechSpecs, setShowSystemTechSpecs] = useState(false);
  const [expandedPartIds, setExpandedPartIds] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const specs = [
    build.cpu,
    build.gpu,
    build.motherboard,
    build.ram,
    build.ssd,
    build.psu,
    build.pcCase,
    build.cooler,
  ];

  const togglePartSpecs = (key: string) => {
    setExpandedPartIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async () => {
    const text = [
      `RMG Garaj — ${build.systemName}`,
      `Fiyat: ${formatTry(build.samplePriceTry)}`,
      '',
      ...specs.map((s) => `${s.label}: ${s.model} (${formatTry(s.priceTry)})`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Pano erişimi engellendiyse sessiz geç
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const activePhoto = gallery[activeImageIdx] ?? gallery[0];
  const { overallStatus, verifiedCount, totalChecks } = build.compatibility;

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Top Breadcrumb Back Link */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#94A3B8] transition-colors hover:text-[#F5F7FA]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Hazır Sistemlere Dön</span>
      </button>

      {/* Main 2-Column Retail Product Detail Header */}
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left: Large Image + Gallery Switcher */}
        <div className="lg:col-span-6">
          <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/75">
            <div className="aspect-[4/3] w-full bg-slate-900/80">
              <img
                src={activePhoto.src}
                alt={`${build.systemName} — ${activePhoto.label}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {gallery.map((item, idx) => {
              const selected = idx === activeImageIdx;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`cursor-pointer overflow-hidden rounded-lg border bg-[#111827] text-left transition-colors ${
                    selected
                      ? 'border-[#246BFD]'
                      : 'border-slate-800 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="aspect-[4/3] w-full bg-[#080B12]">
                    <img
                      src={item.src}
                      alt={item.label}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <span className="block truncate px-2.5 py-1.5 text-[11px] font-medium text-[#F5F7FA]">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Title, Price, Short Description, Stock/Availability, Actions */}
        <div className="flex flex-col justify-between lg:col-span-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#246BFD]">
              {build.tierTitle} · {build.targetResolution.toUpperCase()}
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F5F7FA] sm:text-4xl">
              {build.systemName}
            </h1>

            {/* Big Orange Price */}
            <div className="mt-6 border-y border-slate-800 py-5">
              {build.zeroVsUsedSavingsTry > 0 && (
                <div className="mb-1 flex items-center gap-3 text-sm">
                  <span className="font-mono text-[#94A3B8] line-through tabular-nums">
                    {formatTry(build.allNewTotalTry)}
                  </span>
                  <span className="font-mono font-semibold text-[#FF7900]">
                    %{build.zeroVsUsedSavingsPercent} Tasarruf ({formatTry(build.zeroVsUsedSavingsTry)})
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="font-mono text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-[#FF7900]">
                  {formatTry(build.samplePriceTry)}
                </span>
                <span className="text-xs text-[#94A3B8]">
                  {build.hasRealListingData
                    ? 'İlan ve referans fiyat karışımı'
                    : 'Referans bütçe fiyatı'}
                </span>
              </div>
            </div>

            {/* Short Description */}
            <p className="mt-5 text-base leading-relaxed text-[#94A3B8]">
              {build.performanceNote}
            </p>

            {/* Availability & Compatibility Status */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-[#111827] px-4 py-3.5 text-sm">
              {overallStatus === 'verified' && (
                <>
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#246BFD]" />
                  <div>
                    <span className="block font-semibold text-[#F5F7FA]">
                      Kuruluma Hazır · {verifiedCount}/{totalChecks} Uyumluluk Doğrulandı
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      {build.conditionSummary}
                    </span>
                  </div>
                </>
              )}
              {overallStatus === 'needs_verification' && (
                <>
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <span className="block font-semibold text-amber-200">
                      Parça Doğrulaması Gerekiyor
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      Bazı ölçüm veya BIOS verileri teknik bölümde kontrol edilmelidir.
                    </span>
                  </div>
                </>
              )}
              {overallStatus === 'incompatible' && (
                <>
                  <ShieldAlert className="h-5 w-5 shrink-0 text-red-400" />
                  <div>
                    <span className="block font-semibold text-red-200">
                      Uyumluluk Uyarısı Mevcut
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      Özelleştirerek uyumsuz parçaları güncelleyebilirsiniz.
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onCustomizeBuild(build)}
                className="flex min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-6 py-3 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span>Bilgisayarı Özelleştir</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleCompare(build)}
                className={`flex min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold transition-colors ${
                  isCompared
                    ? 'border-[#FF7900] bg-[#111827] text-[#FF7900]'
                    : 'border-slate-700 bg-[#111827] text-[#F5F7FA] hover:border-[#246BFD]'
                }`}
              >
                <Scale className="h-4 w-4 shrink-0" />
                <span>{isCompared ? 'Karşılaştırmadan Çıkar' : 'Karşılaştır'}</span>
              </button>
            </div>

            {/* Secondary Controls: Copy + Expand Technical Specifications */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowSystemTechSpecs((prev) => !prev)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#246BFD] hover:underline"
              >
                <span>Teknik Özellikleri Gör</span>
                {showSystemTechSpecs ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[#94A3B8] hover:text-[#F5F7FA]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#246BFD]" />
                    <span>Liste Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Listeyi Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Technical Compatibility Audit (Hidden by Default) */}
          {showSystemTechSpecs && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-[#111827] p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#F5F7FA]">
                  10 Maddeli Teknik Uyumluluk Raporu
                </span>
                <span className="font-mono text-[#FF7900]">
                  Tepe Güç: {build.estimatedWattage !== null ? `~${build.estimatedWattage}W` : '—'} ·
                  Önerilen PSU:{' '}
                  {build.recommendedPsuWatts !== null ? `${build.recommendedPsuWatts}W` : '—'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {build.compatibility.checks.map((check) => (
                  <div
                    key={check.id}
                    className="rounded-lg border border-slate-800 bg-[#080B12] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 font-semibold">
                      <span className="text-[#F5F7FA]">{check.title}</span>
                      <span
                        className={
                          check.status === 'verified'
                            ? 'text-[#246BFD]'
                            : check.status === 'needs_verification'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {check.status === 'verified'
                          ? 'Doğrulandı'
                          : check.status === 'needs_verification'
                            ? 'Kontrol'
                            : 'Uyumsuz'}
                      </span>
                    </div>
                    <p className="mt-1 text-[#94A3B8]">{check.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Sponsor / AdSense Leaderboard Banner */}
      <div className="mt-12">
        <AdBanner
          variant="leaderboard"
          sponsorLabel="Sponsorlu Alan · Google AdSense / Marka İş Birliği"
          headline="Hazır Sistem Sponsorları: İtopya, ASUS & Vatan Kampanyaları"
          dimensionsLabel="728 × 90"
        />
      </div>

      {/* Bottom Section: 8 Component Visual Cards with Expandable Technical Specs */}
      <section className="mt-10 border-t border-slate-800/90 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#F5F7FA]">
              Sistem Bileşenleri
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Tüm donanım parçaları ve detaylı teknik özellikleri görmek için ilgili karttan
              açabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onManageListings()}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#FF7900] hover:underline"
          >
            <span>İlan Fiyatlarını Yönet</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {specs.map((spec) => {
            const isExpanded = Boolean(expandedPartIds[spec.category]);
            return (
              <div
                key={spec.category}
                className="rounded-xl border border-slate-800 bg-[#111827] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => onInspectPart(spec.category, spec.partId)}
                    className="flex cursor-pointer items-start gap-3 text-left group"
                  >
                    <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#080B12]">
                      <ProductImage
                        compact
                        imageUrl={pricingCatalog?.productImages?.[spec.partId]}
                        category={spec.category}
                        model={spec.model}
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-[#94A3B8]">
                        {spec.label} · {spec.conditionLabel}
                      </span>
                      <h3 className="mt-0.5 font-display text-base font-bold text-[#F5F7FA] transition-colors group-hover:text-[#246BFD]">
                        {spec.model}
                      </h3>
                    </div>
                  </button>

                  <span className="font-mono text-base font-bold tabular-nums text-[#FF7900] shrink-0">
                    {spec.priceTry === 0 ? 'Dahili' : formatTry(spec.priceTry)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => togglePartSpecs(spec.category)}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#246BFD] hover:underline"
                    >
                      <span>
                        {isExpanded ? 'Teknik Özellikleri Gizle' : 'Teknik Özellikleri Gör'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onInspectPart(spec.category, spec.partId)}
                      className="cursor-pointer text-xs font-semibold text-[#F5F7FA] hover:text-[#FF7900]"
                    >
                      Ürün Sayfası →
                    </button>
                  </div>

                  {spec.priceTry > 0 && (
                    <button
                      type="button"
                      onClick={() => onManageListings(spec.partId)}
                      className="cursor-pointer text-xs font-medium text-[#94A3B8] hover:text-[#FF7900]"
                    >
                      İlan Ekle
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 rounded-lg bg-[#080B12] p-3.5 text-xs text-[#94A3B8]">
                    <p>
                      <strong className="text-[#F5F7FA]">Teknik Özeti: </strong>
                      {spec.detail}
                    </p>
                    <p>
                      <strong className="text-[#F5F7FA]">Seçim Nedeni: </strong>
                      {spec.selectionReason}
                    </p>
                    <p>
                      <strong className="text-[#F5F7FA]">Fiyat Kaynağı: </strong>
                      {spec.priceSourceSummary}
                      {spec.excludedOutlierCount > 0 &&
                        ` (${spec.excludedOutlierCount} şüpheli ilan hariç)`}
                    </p>
                    {spec.comparison.newPriceTry !== null &&
                      spec.comparison.usedPriceTry !== null && (
                        <p className="text-[#FF7900]">
                          Sıfır: {formatTry(spec.comparison.newPriceTry)} · İkinci El:{' '}
                          {formatTry(spec.comparison.usedPriceTry)} (Fark:{' '}
                          {formatTry(spec.comparison.differenceTry ?? 0)} / %
                          {spec.comparison.savingsPercent ?? 0})
                        </p>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
