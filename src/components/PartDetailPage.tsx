import {
  ArrowLeft,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  SlidersHorizontal,
  Store,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import { findMergedPartById, getMergedCatalogParts } from '../data/catalogAdapter';
import {
  AnyCatalogPart,
  CATEGORY_LABELS,
} from '../data/partMedia';
import { fetchPartPriceHistory } from '../services/pricingClient';
import {
  PartCategoryKey,
  PcBuild,
  PriceHistoryPoint,
  PricingCatalogResponse,
} from '../types/pc';
import { buildAffiliateUrl } from '../utils/affiliate';
import { AdBanner } from './AdBanner';
import { ChunkErrorBoundary, lazyWithRetry } from './ChunkErrorBoundary';
import { ProductImage } from './ProductImage';

const PriceHistoryChart = lazyWithRetry(() =>
  import('./PriceHistoryChart').then((m) => ({ default: m.PriceHistoryChart }))
);

interface PartDetailPageProps {
  category: PartCategoryKey;
  partId: string;
  pricingCatalog: PricingCatalogResponse | null;
  relatedBuilds: PcBuild[];
  backLabel: string;
  onBack: () => void;
  onBuildWithPart: (category: PartCategoryKey, partId: string) => void;
  onInspectBuild: (build: PcBuild) => void;
}

interface SpecRow {
  label: string;
  value: string;
}

function buildSpecRows(entry: AnyCatalogPart): SpecRow[] {
  switch (entry.category) {
    case 'cpu': {
      const p = entry.part;
      return [
        { label: 'Marka / Seri', value: `${p.brand}${p.generation ? ` · ${p.generation}` : ''}` },
        { label: 'Soket Yapısı', value: p.socket },
        { label: 'Çekirdek / İzlek', value: `${p.cores} Çekirdek / ${p.threads} İzlek` },
        { label: 'Maks. Turbo Frekansı', value: `${p.boostClockGhz} GHz` },
        {
          label: 'Temel TDP / Tepe Güç',
          value: `${p.tdpWatts ?? '—'}W / ${p.maxPowerWatts ?? '—'}W`,
        },
        { label: 'Desteklenen Bellek', value: p.supportedRam.join(' / ') },
        {
          label: 'Dahili Grafik Birimi',
          value: p.hasIntegratedGraphics ? 'Var (APU / iGPU)' : 'Yok (Harici GPU Gerekli)',
        },
        {
          label: 'Soğutucu Gereksinimi',
          value: p.requiresDedicatedCooler
            ? 'Harici kule veya sıvı soğutucu önerilir'
            : 'Stok soğutucu ile uyumlu',
        },
        { label: 'Oyun Performans Skoru', value: `${p.gamingScore} / 100` },
        { label: 'Üretkenlik Skoru', value: `${p.productivityScore} / 100` },
      ];
    }

    case 'gpu': {
      const p = entry.part;
      const connectorText =
        p.requiredConnectors === null
          ? 'Partner kart modeline göre kontrol edilmeli'
          : p.requiredConnectors.twelveVhpwrCount > 0
            ? `${p.requiredConnectors.twelveVhpwrCount}x 16-Pin 12VHPWR`
            : p.requiredConnectors.eightPinCount > 0
              ? `${p.requiredConnectors.eightPinCount}x 8-Pin PCIe`
              : 'Harici güç konektörü gerekmez';
      return [
        { label: 'Marka / Seri', value: `${p.brand} · ${p.shortTitle}` },
        { label: 'Video Bellek (VRAM)', value: p.vramGb !== null ? `${p.vramGb} GB` : 'Belirtilmedi' },
        {
          label: 'TDP / Tepe Yük',
          value: `${p.tdpWatts ?? '—'}W / ${p.peakPowerWatts ?? '—'}W`,
        },
        {
          label: 'Önerilen PSU',
          value: p.recommendedPsuWatts !== null ? `${p.recommendedPsuWatts}W` : 'Belirtilmedi',
        },
        {
          label: 'Kart Uzunluğu',
          value: p.lengthMm !== null ? `${p.lengthMm} mm` : 'Partner modele göre değişir',
        },
        {
          label: 'Yuva Kalınlığı',
          value: p.widthSlots !== null ? `${p.widthSlots} Yuva` : 'Partner modele göre değişir',
        },
        { label: 'Güç Konektörü', value: connectorText },
        { label: 'NVENC Yayın Kodlayıcı', value: p.supportsNvenc ? 'Destekliyor' : 'Standart Kodlayıcı' },
        {
          label: 'Çözünürlük Skorları',
          value: `1080p: ${p.score1080p}/100 · 1440p: ${p.score1440p}/100 · 4K: ${p.score4k}/100`,
        },
      ];
    }

    case 'motherboard': {
      const p = entry.part;
      return [
        { label: 'Marka', value: p.brand },
        { label: 'İşlemci Soketi', value: p.socket },
        { label: 'Form Faktörü', value: p.formFactor },
        { label: 'Bellek Desteği', value: p.supportedRam ?? 'Belirtilmedi' },
        {
          label: 'RAM Yuva / Kapasite',
          value: `${p.ramSlots ?? '—'} Yuva · Maks. ${p.maxRamGb ?? '—'} GB (${p.maxRamSpeedMhz ?? '—'} MHz)`,
        },
        { label: 'VRM Güç Beslemesi', value: p.vrmMaxCpuWatts !== null ? `${p.vrmMaxCpuWatts}W` : '—' },
        { label: 'M.2 NVMe Yuvası', value: `${p.m2Slots} Adet` },
        { label: 'CPU EPS Güç Girişi', value: `${p.cpuEpsConnectors}x 8-Pin EPS` },
        {
          label: 'Doğrudan Desteklenen CPU',
          value: p.nativeCpuGenerations.length > 0 ? p.nativeCpuGenerations.join(', ') : 'BIOS Güncellemesi Gerekebilir',
        },
        {
          label: 'BIOS Flashback',
          value: p.hasBiosFlashback ? 'Var (İşlemcisiz BIOS Güncelleme)' : 'Yok',
        },
      ];
    }

    case 'ram': {
      const p = entry.part;
      return [
        { label: 'Marka', value: p.brand },
        { label: 'Bellek Nesli', value: p.generation ?? '—' },
        { label: 'Kapasite', value: p.capacityGb !== null ? `${p.capacityGb} GB` : '—' },
        { label: 'Modül Yapısı', value: `${p.modulesCount ?? '—'} Modül · ${p.channelConfig}` },
        { label: 'Frekans Hızı', value: p.speedMhz !== null ? `${p.speedMhz} MHz` : '—' },
        { label: 'Gecikme Değeri (CAS)', value: p.latency },
      ];
    }

    case 'ssd': {
      const p = entry.part;
      return [
        { label: 'Marka', value: p.brand },
        { label: 'Kapasite', value: p.capacityGb >= 1000 ? `${p.capacityGb / 1000} TB` : `${p.capacityGb} GB` },
        { label: 'Arabirim', value: `${p.interfaceType} M.2 NVMe` },
        { label: 'Okuma Hızı', value: `${new Intl.NumberFormat('tr-TR').format(p.readSpeedMb)} MB/sn` },
        { label: 'DRAM Önbellek', value: p.hasDramCache ? 'Var (Yüksek IOPS Dayanıklılığı)' : 'DRAM-less (HMB)' },
      ];
    }

    case 'psu': {
      const p = entry.part;
      return [
        { label: 'Marka', value: p.brand },
        { label: 'Güç Kapasitesi', value: p.wattage !== null ? `${p.wattage}W` : '—' },
        { label: 'Verimlilik Sertifikası', value: p.efficiency },
        { label: 'Modüler Yapı', value: p.modular },
        { label: 'ATX Standardı', value: p.atxStandard },
        {
          label: 'PCIe & EPS Konektörler',
          value: p.connectors
            ? `${p.connectors.pcie8PinCount}x 8-Pin PCIe · ${p.connectors.twelveVhpwrCount}x 12VHPWR · ${p.connectors.eps8PinCount}x EPS`
            : '—',
        },
      ];
    }

    case 'pcCase': {
      const p = entry.part;
      return [
        { label: 'Marka', value: p.brand },
        { label: 'Uyumlu Anakart Boyutları', value: p.supportedFormFactors.join(', ') },
        { label: 'Hava Akışı Tasarımı', value: p.airflowType },
        {
          label: 'Maks. Ekran Kartı Uzunluğu',
          value: p.maxGpuLengthMm !== null ? `${p.maxGpuLengthMm} mm` : 'Belirtilmedi',
        },
        {
          label: 'Maks. Hava Soğutucu Yüksekliği',
          value: p.maxCoolerHeightMm !== null ? `${p.maxCoolerHeightMm} mm` : 'Belirtilmedi',
        },
        {
          label: 'Radyatör Desteği',
          value: p.supportedRadiatorMm.length > 0 ? p.supportedRadiatorMm.map((r) => `${r} mm`).join(', ') : 'Belirtilmedi',
        },
        { label: 'Genişleme Yuvası', value: p.expansionSlots !== null ? `${p.expansionSlots} Yuva` : '—' },
      ];
    }

    case 'cooler': {
      const p = entry.part;
      return [
        { label: 'Marka', value: p.brand },
        { label: 'Soğutma Tipi', value: p.coolerType },
        { label: 'Desteklenen Soketler', value: p.supportedSockets.join(', ') },
        {
          label: 'Maks. Isı Dağıtım Kapasitesi',
          value: p.maxTdpCapacityWatts !== null ? `${p.maxTdpCapacityWatts}W TDP` : '—',
        },
        {
          label: 'Ölçü / Radyatör',
          value: p.radiatorMm !== null
            ? `${p.radiatorMm} mm Radyatör`
            : p.heightMm !== null
              ? `${p.heightMm} mm Yükseklik`
              : 'Belirtilmedi',
        },
      ];
    }
  }
}

export function PartDetailPage({
  category,
  partId,
  pricingCatalog,
  relatedBuilds,
  backLabel,
  onBack,
  onBuildWithPart,
  onInspectBuild,
}: PartDetailPageProps) {
  const entry = findMergedPartById(category, partId, pricingCatalog);
  const dynamicProduct = !entry
    ? pricingCatalog?.dynamicProducts?.find((p) => p.id === partId) ?? null
    : null;
  const [copied, setCopied] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);

  const partListings = useMemo(() => {
    if (!pricingCatalog?.listings) return [];
    return pricingCatalog.listings
      .filter((listing) => listing.partId === partId && listing.isNew)
      .sort((a, b) => a.listingPriceTry - b.listingPriceTry);
  }, [pricingCatalog, partId]);

  const cheapestListing = partListings[0] ?? null;

  useEffect(() => {
    let active = true;
    fetchPartPriceHistory(partId)
      .then((points) => {
        if (active) setPriceHistory(points);
      })
      .catch(() => {
        if (active) setPriceHistory([]);
      });
    return () => {
      active = false;
    };
  }, [partId, pricingCatalog]);

  if (!entry && !dynamicProduct) {
    return (
      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#94A3B8] hover:text-[#F5F7FA]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{backLabel}</span>
        </button>
        <div className="mt-8 rounded-xl border border-slate-800 bg-[#111827] p-10 text-center">
          <Cpu className="mx-auto h-10 w-10 text-[#94A3B8]" />
          <h1 className="mt-4 font-display text-xl font-bold text-[#F5F7FA]">
            Ürün Kataloğunda Bulunamadı
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Seçtiğiniz donanım parçası katalogda yer almıyor olabilir.
          </p>
        </div>
      </div>
    );
  }

  const resolvedCategory = entry ? entry.category : dynamicProduct!.category;
  const resolvedId = entry ? entry.part.id : dynamicProduct!.id;
  const resolvedModel = entry ? entry.part.model : dynamicProduct!.name;
  const resolvedBrand = entry ? entry.part.brand : dynamicProduct!.brand;
  const resolvedSpecSummary = entry
    ? entry.part.specSummary
    : dynamicProduct!.specSummary;
  const resolvedImageUrl =
    pricingCatalog?.productImages?.[resolvedId] ??
    dynamicProduct?.imageUrl ??
    null;

  const categoryLabel = CATEGORY_LABELS[resolvedCategory];
  const pricing = pricingCatalog?.partsPricing[resolvedId];
  const isBuiltinZeroCost =
    resolvedId === 'gpu-apu-vega7' || resolvedId === 'cooler-stock-wraith';

  const activePrice = pricing?.newPriceTry ?? null;
  const activeSourceLabel = pricing?.newSourceLabel ?? 'Referans fiyat henüz tanımlanmadı';

  const specRows: SpecRow[] = entry
    ? buildSpecRows(entry)
    : [
        { label: 'Marka', value: resolvedBrand },
        { label: 'Kategori', value: categoryLabel },
        { label: 'Ürün Özeti', value: resolvedSpecSummary || 'Mağaza Katalog Kaydı' },
        ...(dynamicProduct?.sourceStore
          ? [{ label: 'İlk Kaynak Mağaza', value: dynamicProduct.sourceStore }]
          : []),
      ];

  const supportedSockets = new Set(
    getMergedCatalogParts(pricingCatalog).motherboards.map((m) => m.socket)
  );
  const cpuUnsupportedSocket =
    entry?.category === 'cpu' && !supportedSockets.has(entry.part.socket);

  const matchedBuilds = relatedBuilds.filter((b) => {
    const ids = b.selectedIds;
    return (
      ids.cpuId === resolvedId ||
      ids.gpuId === resolvedId ||
      ids.motherboardId === resolvedId ||
      ids.ramId === resolvedId ||
      ids.ssdId === resolvedId ||
      ids.psuId === resolvedId ||
      ids.caseId === resolvedId ||
      ids.coolerId === resolvedId
    );
  });

  const handleCopySpecs = async () => {
    const priceText =
      activePrice && activePrice > 0
        ? formatTry(activePrice)
        : isBuiltinZeroCost
          ? 'Dahili'
          : 'Fiyat Bekleniyor';
    const text = [
      `RMG Garaj — ${resolvedModel}`,
      `Kategori: ${categoryLabel}`,
      `Fiyat: ${priceText}`,
      '',
      ...specRows.map((row) => `${row.label}: ${row.value}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Pano erişimi engellendiyse sessiz geç
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#94A3B8] transition-colors hover:text-[#F5F7FA]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{backLabel}</span>
      </button>

      {/* Main 2-Column Product Detail Header */}
      <div className="mt-6 grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left: Dedicated Product Image from DB imageUrl with Placeholder Fallback */}
        <div className="lg:col-span-6">
          <div className="relative flex h-full min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/75">
            <div className="aspect-[4/3] w-full bg-slate-900/80">
              <ProductImage
                imageUrl={resolvedImageUrl}
                category={resolvedCategory}
                model={resolvedModel}
                brand={resolvedBrand}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* Right: Contiguous Product Purchase / Pricing / Overview Module */}
        <div className="flex flex-col justify-between lg:col-span-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#94A3B8]">
              <span className="font-semibold text-[#246BFD]">{categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{resolvedBrand}</span>
              <span aria-hidden="true">·</span>
              <span>
                {dynamicProduct ? 'Otomatik Mağaza Kataloğu' : 'RMG Garaj Katalog'}
              </span>
            </div>

            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F5F7FA] sm:text-4xl">
              {resolvedModel}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
              {resolvedSpecSummary}
            </p>

            {/* Tabular Price Box */}
            <div className="mt-6 border-y border-slate-800 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="font-mono text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-[#FF7900]">
                  {activePrice && activePrice > 0
                    ? formatTry(activePrice)
                    : isBuiltinZeroCost
                      ? 'Dahili (0 TL)'
                      : 'Fiyat Bekleniyor'}
                </span>
                <span className="text-xs text-[#94A3B8]">{activeSourceLabel}</span>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="mt-6">
              {entry ? (
                <button
                  type="button"
                  disabled={cpuUnsupportedSocket}
                  onClick={() => onBuildWithPart(resolvedCategory, resolvedId)}
                  className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    cpuUnsupportedSocket
                      ? 'cursor-not-allowed border border-slate-800 bg-[#111827] text-[#94A3B8]'
                      : 'cursor-pointer bg-[#246BFD] text-[#F5F7FA] hover:bg-[#3B7CFE]'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0" />
                  <span>
                    {cpuUnsupportedSocket && entry.category === 'cpu'
                      ? `Anakart Kataloğu Bekleniyor (${entry.part.socket})`
                      : 'Bu Parçayla Sistem Topla'}
                  </span>
                </button>
              ) : (
                <a
                  href={
                    cheapestListing
                      ? buildAffiliateUrl(
                          cheapestListing.listingUrl,
                          cheapestListing.platform
                        )
                      : '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!cheapestListing?.listingUrl) e.preventDefault();
                  }}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#246BFD] px-5 py-3 text-sm font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE]"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span>En Ucuz Mağazaya Git</span>
                </a>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={handleCopySpecs}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[#94A3B8] hover:text-[#F5F7FA]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#246BFD]" />
                    <span>Ürün Özellikleri Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Özellikleri Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Sponsor / AdSense Leaderboard Banner */}
      <div className="mt-12">
        <AdBanner
          variant="leaderboard"
          sponsorLabel="Sponsorlu Alan · Google AdSense / Marka İş Birliği"
          headline="Bu Bileşen İçin Yetkili Satıcı & Donanım Kampanya Alanı"
          dimensionsLabel="728 × 90"
        />
      </div>

      {/* Price Comparison Section: Cheapest Highlight Card + Sorted Store Listings + Price History Chart */}
      <section className="mt-10 border-t border-slate-800/90 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#FF7900]">
              Fiyat Karşılaştırma
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#F5F7FA]">
              Mağaza Fiyatları
            </h2>
          </div>
        </div>

        {/* Highlighted "En Ucuz" Card */}
        {cheapestListing ? (
          <div className="rounded-2xl border border-[#FF7900]/50 bg-slate-800/80 p-6 sm:p-7">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="text-[#FF7900]">En Ucuz</span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="text-slate-400">
                    {partListings.length} mağaza karşılaştırıldı
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2.5">
                  <Store className="h-6 w-6 shrink-0 text-[#246BFD]" />
                  <h3 className="font-display text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                    {cheapestListing.platform}
                  </h3>
                </div>

                <p className="mt-1.5 truncate text-sm text-slate-400">
                  {cheapestListing.productName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:justify-end shrink-0">
                <div className="text-left md:text-right">
                  <span className="block text-xs font-medium text-slate-400">
                    En Düşük Fiyat
                  </span>
                  <span className="font-mono text-3xl font-extrabold tracking-tight text-[#FF7900] tabular-nums sm:text-4xl">
                    {formatTry(cheapestListing.listingPriceTry)}
                  </span>
                </div>

                <a
                  href={buildAffiliateUrl(cheapestListing.listingUrl, cheapestListing.platform)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!cheapestListing.listingUrl || cheapestListing.listingUrl.trim() === '#') {
                      e.preventDefault();
                    }
                  }}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-6 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-[#FF8C24] whitespace-nowrap shrink-0"
                >
                  <span>Mağazaya Git</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#246BFD]">
                Mağaza Durumu
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-[#F5F7FA]">
                Bu ürün için henüz canlı mağaza kaydı bulunmuyor
              </h3>
              <p className="mt-1 text-sm text-[#94A3B8]">
                {activePrice && activePrice > 0
                  ? `Referans piyasa tahmini: ${formatTry(activePrice)}. Yetkili mağaza akışları senkronize edildiğinde güncel satıcı fiyatları burada listelenir.`
                  : 'Yetkili mağaza akışlarından henüz anlık fiyat kaydı alınmadı.'}
              </p>
            </div>
          </div>
        )}

        {/* Sorted Store Comparison Table */}
        {partListings.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0D1320] px-5 py-3 text-xs font-semibold text-[#94A3B8]">
              <span>Tüm Mağaza Fiyatları ({partListings.length})</span>
              <span>En ucuzdan en pahalıya sıralı</span>
            </div>

            <div className="hidden grid-cols-12 gap-4 border-b border-slate-800/80 px-5 py-2.5 text-xs font-medium text-[#94A3B8] md:grid">
              <div className="col-span-6">Mağaza Adı</div>
              <div className="col-span-2">Güncelleme</div>
              <div className="col-span-2 text-right">Fiyat</div>
              <div className="col-span-2 text-right">İşlem</div>
            </div>

            <ul className="divide-y divide-slate-800">
              {partListings.map((listing, idx) => {
                const isLowest = idx === 0;
                return (
                  <li
                    key={listing.id}
                    className={`grid grid-cols-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-[#161F31] md:grid-cols-12 ${
                      isLowest ? 'bg-[#131B2C]' : ''
                    }`}
                  >
                    {/* Store Name & Product Title */}
                    <div className="min-w-0 md:col-span-6">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-[#F5F7FA]">
                          {listing.platform}
                        </span>
                        {isLowest && (
                          <span className="text-xs font-semibold text-[#FF7900]">
                            · En Ucuz
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                        {listing.productName}
                      </p>
                    </div>

                    {/* Updated Date */}
                    <div className="md:col-span-2">
                      <span className="text-xs text-[#94A3B8]">
                        {listing.listingDate || 'Güncel'}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2 md:text-right">
                      <span
                        className={`font-mono text-lg font-bold tabular-nums ${
                          isLowest ? 'text-[#FF7900]' : 'text-[#F5F7FA]'
                        }`}
                      >
                        {formatTry(listing.listingPriceTry)}
                      </span>
                    </div>

                    {/* Go to Store Button */}
                    <div className="flex md:col-span-2 md:justify-end">
                      <a
                        href={buildAffiliateUrl(listing.listingUrl, listing.platform)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          if (!listing.listingUrl || listing.listingUrl.trim() === '#') {
                            e.preventDefault();
                          }
                        }}
                        className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#FF7900] px-4 py-2 text-xs font-bold text-[#080B12] transition-colors hover:bg-[#FF912E] whitespace-nowrap shrink-0 md:w-auto"
                      >
                        <span>Mağazaya Git</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Price History Chart directly below comparison */}
        <div className="mt-10">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-wider text-[#246BFD]">
              Piyasa Fiyat Takibi
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-[#F5F7FA]">
              Fiyat Geçmişi Grafiği
            </h3>
          </div>
          <ChunkErrorBoundary
            variant="inline"
            resetKey={`${category}:${partId}`}
          >
            <Suspense
              fallback={
                <div
                  className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-800 bg-[#111827] px-6 text-sm text-[#94A3B8]"
                  role="status"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-[#FF7900] border-t-transparent"
                      aria-hidden="true"
                    />
                    Fiyat geçmişi grafiği yükleniyor...
                  </span>
                </div>
              }
            >
              <PriceHistoryChart
                data={priceHistory}
                productName={resolvedModel}
              />
            </Suspense>
          </ChunkErrorBoundary>
        </div>
      </section>

      {/* Technical Specifications Table + Vertical AdBanner Slot */}
      <section className="mt-14 border-t border-slate-800/90 pt-10">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-wider text-[#FF7900]">
            Donanım Veri Sayfası
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[#F5F7FA]">
            Teknik Özellikler
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-span-8">
            {specRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] px-5 py-4 text-sm"
              >
                <span className="text-[#94A3B8]">{row.label}</span>
                <span className="text-right font-mono font-semibold text-[#F5F7FA] tabular-nums">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4">
            <AdBanner
              variant="vertical"
              sponsorLabel="Sponsorlu Vitrin · Partner Alanı"
              headline="ASUS, MSI & İtopya Donanım Fırsatları"
              dimensionsLabel="300 × 600"
            />
          </div>
        </div>
      </section>

      {/* Related Ready Builds using this Part */}
      {matchedBuilds.length > 0 && (
        <section className="mt-14 border-t border-slate-800/90 pt-10">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-[#F5F7FA]">
              Bu Parçayı İçeren Örnek Sistemler
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Seçili donanım parçasının yer aldığı hazır sistem önerilerini inceleyebilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
            {matchedBuilds.slice(0, 3).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onInspectBuild(b)}
                className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-800 bg-[#111827] p-3 text-left transition-colors hover:border-[#246BFD] sm:p-5"
              >
                <div>
                  <span className="text-[10px] font-medium text-[#246BFD] sm:text-xs">
                    {b.tierTitle} · {b.targetResolution.toUpperCase()}
                  </span>
                  <h3 className="mt-1 line-clamp-2 font-display text-xs font-bold text-[#F5F7FA] sm:text-lg">
                    {b.systemName}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#94A3B8] sm:text-xs">
                    {b.cpu.model} · {b.gpu.model}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-1 border-t border-slate-800 pt-2.5 sm:mt-4 sm:flex-row sm:items-baseline sm:justify-between sm:pt-3">
                  <span className="font-mono text-sm font-bold text-[#FF7900] tabular-nums sm:text-lg">
                    {formatTry(b.samplePriceTry)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#246BFD] sm:text-xs">
                    İncele →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
