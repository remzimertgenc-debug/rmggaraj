import {
  AlertTriangle,
  ExternalLink,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatTry } from '../data/builds';
import {
  CASE_DB,
  CPU_COOLER_DB,
  CPU_DB,
  GPU_DB,
  MOTHERBOARD_DB,
  PSU_DB,
  RAM_DB,
  SSD_DB,
} from '../data/hardwareDb';
import {
  removeMarketplaceListing,
  submitMarketplaceListing,
} from '../services/pricingClient';
import {
  MarketplacePlatform,
  PricingCatalogResponse,
  ProductConditionGrade,
} from '../types/pc';

interface ListingManagerModalProps {
  isOpen: boolean;
  initialPartId?: string | null;
  catalog: PricingCatalogResponse | null;
  onClose: () => void;
  onCatalogUpdated: (next: PricingCatalogResponse) => void;
}

const PLATFORMS: MarketplacePlatform[] = [
  'Sahibinden',
  'Letgo',
  'Facebook Marketplace',
  'Yetkili Sağlayıcı',
];

const CONDITION_GRADES: ProductConditionGrade[] = [
  'Çok İyi (Faturalı)',
  'İyi',
  'Orta',
  'Sıfır / Kapalı Kutu',
];

interface SelectablePartOption {
  id: string;
  categoryLabel: string;
  brandModel: string;
}

const ALL_SELECTABLE_PARTS: SelectablePartOption[] = [
  ...CPU_DB.map((p) => ({ id: p.id, categoryLabel: 'İşlemci', brandModel: p.model })),
  ...GPU_DB.filter((p) => !p.isIntegrated).map((p) => ({
    id: p.id,
    categoryLabel: 'Ekran Kartı',
    brandModel: p.model,
  })),
  ...MOTHERBOARD_DB.map((p) => ({
    id: p.id,
    categoryLabel: 'Anakart',
    brandModel: p.model,
  })),
  ...RAM_DB.map((p) => ({ id: p.id, categoryLabel: 'RAM', brandModel: p.model })),
  ...SSD_DB.map((p) => ({ id: p.id, categoryLabel: 'SSD', brandModel: p.model })),
  ...PSU_DB.map((p) => ({ id: p.id, categoryLabel: 'PSU', brandModel: p.model })),
  ...CASE_DB.map((p) => ({ id: p.id, categoryLabel: 'Kasa', brandModel: p.model })),
  ...CPU_COOLER_DB.map((p) => ({
    id: p.id,
    categoryLabel: 'Soğutucu',
    brandModel: p.model,
  })),
];

function formatShortDate(iso: string | null): string {
  if (!iso) return 'Kontrol edilmedi';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ListingManagerModal({
  isOpen,
  initialPartId,
  catalog,
  onClose,
  onCatalogUpdated,
}: ListingManagerModalProps) {
  const defaultPart = useMemo(
    () =>
      ALL_SELECTABLE_PARTS.find((p) => p.id === initialPartId) ??
      ALL_SELECTABLE_PARTS[0],
    [initialPartId]
  );

  const [selectedPartId, setSelectedPartId] = useState<string>(defaultPart.id);
  const [productName, setProductName] = useState<string>(defaultPart.brandModel);
  const [brandModel, setBrandModel] = useState<string>(defaultPart.brandModel);
  const [listingPriceTry, setListingPriceTry] = useState<string>('');
  const [platform, setPlatform] = useState<MarketplacePlatform>('Sahibinden');
  const [listingUrl, setListingUrl] = useState<string>('');
  const [listingDate, setListingDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [conditionGrade, setConditionGrade] = useState<ProductConditionGrade>(
    'Çok İyi (Faturalı)'
  );
  const [isNew, setIsNew] = useState<boolean>(false);
  const [showOnlySelectedPart, setShowOnlySelectedPart] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialPartId) {
      const match = ALL_SELECTABLE_PARTS.find((p) => p.id === initialPartId);
      if (match) {
        setSelectedPartId(match.id);
        setProductName(match.brandModel);
        setBrandModel(match.brandModel);
      }
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, initialPartId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedPricing = catalog?.partsPricing[selectedPartId];
  const allListings = catalog?.listings ?? [];
  const displayedListings = showOnlySelectedPart
    ? allListings.filter((l) => l.partId === selectedPartId)
    : allListings;

  const handlePartChange = (partId: string) => {
    setSelectedPartId(partId);
    const found = ALL_SELECTABLE_PARTS.find((p) => p.id === partId);
    if (found) {
      setProductName(found.brandModel);
      setBrandModel(found.brandModel);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedPrice = Number(listingPriceTry.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Lütfen geçerli bir TL ilan fiyatı giriniz.');
      return;
    }
    if (!/^https?:\/\//i.test(listingUrl.trim())) {
      setErrorMsg('İlan bağlantısı http:// veya https:// ile başlamalıdır.');
      return;
    }

    setSubmitting(true);
    try {
      const nextCatalog = await submitMarketplaceListing({
        partId: selectedPartId,
        productName: productName.trim() || undefined,
        brandModel: brandModel.trim() || undefined,
        listingPriceTry: parsedPrice,
        platform,
        listingUrl: listingUrl.trim(),
        listingDate,
        conditionGrade,
        isNew,
      });
      onCatalogUpdated(nextCatalog);
      setListingPriceTry('');
      setListingUrl('');
      setSuccessMsg(
        'İlan kaydı eklendi ve medyan / aykırı değer analizi yeniden hesaplandı.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'İlan kaydı kaydedilemedi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingId(id);
    try {
      const nextCatalog = await removeMarketplaceListing(id);
      onCatalogUpdated(nextCatalog);
      setSuccessMsg('İlan kaydı kaldırıldı ve istatistikler güncellendi.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'İlan kaydı silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-manager-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-700/90 bg-[#111827] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold text-[#FF7900]">
              İkinci El &amp; Piyasa Veri Katmanı
            </p>
            <h2
              id="listing-manager-title"
              className="mt-1 font-display text-2xl font-bold text-[#F5F7FA]"
            >
              İlan Fiyat Kaynakları ve İkinci El Analizi
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
              Sahibinden, Letgo ve Facebook Marketplace kaynaklı ilanları doğrulayarak
              ekleyebilirsiniz. İzinsiz scraping veya CAPTCHA aşma yöntemleri kullanılmaz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-[#111827] text-[#F5F7FA] hover:border-slate-500 shrink-0"
            aria-label="İlan yöneticisini kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Authorized Provider Status */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-[#111827] p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-[#F5F7FA]">
              Yetkili Veri Sağlayıcı Durumu:{' '}
              <span
                className={
                  catalog?.providerStatus.authorizedApiConfigured
                    ? 'text-[#246BFD]'
                    : 'text-[#FF7900]'
                }
              >
                {catalog?.providerStatus.authorizedApiConfigured
                  ? 'Bağlı'
                  : 'Yapılandırılmadı (Referans Tahmin + Kullanıcı İlanları)'}
              </span>
            </span>
            {catalog?.providerStatus.lastSyncedAt && (
              <span className="font-mono text-[11px] text-[#94A3B8]">
                Son senkron: {formatShortDate(catalog.providerStatus.lastSyncedAt)}
              </span>
            )}
          </div>
          <p className="mt-1.5 leading-relaxed text-[#94A3B8]">
            {catalog?.providerStatus.providerMessage ??
              'Fiyat veri kaynağı bilgisi alınamadı.'}
          </p>
        </div>

        {/* Selected Part Comparison + Stats */}
        {selectedPricing && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-slate-800 bg-[#080B12] p-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-semibold text-[#246BFD]">
                Sıfır vs İkinci El Karşılaştırması
              </span>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="block text-[#94A3B8]">Sıfır</span>
                  <span className="font-mono font-semibold tabular-nums text-[#F5F7FA]">
                    {selectedPricing.comparison.newPriceTry !== null
                      ? formatTry(selectedPricing.comparison.newPriceTry)
                      : 'Yok'}
                  </span>
                </div>
                <div>
                  <span className="block text-[#94A3B8]">İkinci El</span>
                  <span className="font-mono font-semibold tabular-nums text-[#F5F7FA]">
                    {selectedPricing.comparison.usedPriceTry !== null
                      ? formatTry(selectedPricing.comparison.usedPriceTry)
                      : 'Yok'}
                  </span>
                </div>
                <div>
                  <span className="block text-[#94A3B8]">Fark / Tasarruf</span>
                  <span className="font-mono font-semibold tabular-nums text-[#FF7900]">
                    {selectedPricing.comparison.differenceTry !== null
                      ? `${formatTry(selectedPricing.comparison.differenceTry)} (%${
                          selectedPricing.comparison.savingsPercent ?? 0
                        })`
                      : '—'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#94A3B8]">
                <strong className="text-[#F5F7FA]">Avantaj: </strong>
                {selectedPricing.comparison.advantageNote}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#94A3B8]">
                <strong className="text-[#FF7900]">Risk: </strong>
                {selectedPricing.comparison.riskNote}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <span className="text-[11px] font-semibold text-[#FF7900]">
                İkinci El İlan İstatistikleri (Seçili Parça)
              </span>
              {selectedPricing.usedStats ? (
                <div className="mt-2 grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="block text-[#94A3B8]">En Düşük (Geçerli)</span>
                    <span className="font-mono font-semibold tabular-nums text-[#F5F7FA]">
                      {formatTry(selectedPricing.usedStats.minPriceTry)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#94A3B8]">Medyan (Kullanılan)</span>
                    <span className="font-mono font-semibold tabular-nums text-[#FF7900]">
                      {formatTry(selectedPricing.usedStats.medianPriceTry)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#94A3B8]">Ortalama</span>
                    <span className="font-mono font-semibold tabular-nums text-[#F5F7FA]">
                      {formatTry(selectedPricing.usedStats.averagePriceTry)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#94A3B8]">İlan / Hariç Aykırı</span>
                    <span className="font-mono font-semibold tabular-nums text-[#F5F7FA]">
                      {selectedPricing.usedStats.listingCount} geçerli ·{' '}
                      {selectedPricing.usedStats.excludedOutlierCount} şüpheli
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
                  Bu parça için doğrulanmış ikinci el ilanı girilmedi; sistemde yalnızca{' '}
                  <strong className="text-[#F5F7FA]">referans bütçe tahmini</strong>{' '}
                  gösterilmektedir.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add New Listing Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-lg border border-slate-800 bg-[#111827] p-4 sm:p-5"
        >
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[#F5F7FA]">
            <Plus className="h-4 w-4 text-[#246BFD]" />
            <span>Yeni İlan Bilgisi Ekle</span>
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Bileşen
              </span>
              <select
                value={selectedPartId}
                onChange={(e) => handlePartChange(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              >
                {ALL_SELECTABLE_PARTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.categoryLabel}] {p.brandModel}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                İlan Başlığı / Ürün Adı
              </span>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Örn: RTX 4070 Windforce OC"
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Marka ve Model
              </span>
              <input
                type="text"
                required
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                İlan Fiyatı (TL)
              </span>
              <input
                type="number"
                required
                min={100}
                step={50}
                value={listingPriceTry}
                onChange={(e) => setListingPriceTry(e.target.value)}
                placeholder="Örn: 18500"
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 font-mono text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                İlan Platformu
              </span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as MarketplacePlatform)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              >
                {PLATFORMS.map((pl) => (
                  <option key={pl} value={pl}>
                    {pl}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                İlan Tarihi
              </span>
              <input
                type="date"
                required
                value={listingDate}
                onChange={(e) => setListingDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 font-mono text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                İlan Bağlantısı (URL)
              </span>
              <input
                type="url"
                required
                value={listingUrl}
                onChange={(e) => setListingUrl(e.target.value)}
                placeholder="https://www.sahibinden.com/ilan/..."
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[#94A3B8]">
                Kondisyon / Durum
              </span>
              <select
                value={conditionGrade}
                onChange={(e) =>
                  setConditionGrade(e.target.value as ProductConditionGrade)
                }
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#080B12] px-3 text-xs text-[#F5F7FA] focus:border-[#246BFD] focus:outline-none"
              >
                {CONDITION_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#F5F7FA]">
                <input
                  type="radio"
                  name="listing-is-new"
                  checked={!isNew}
                  onChange={() => setIsNew(false)}
                  className="accent-[#246BFD]"
                />
                <span>İkinci El İlan</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#F5F7FA]">
                <input
                  type="radio"
                  name="listing-is-new"
                  checked={isNew}
                  onChange={() => setIsNew(true)}
                  className="accent-[#246BFD]"
                />
                <span>Sıfır Ürün İlanı</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg bg-[#246BFD] px-5 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:bg-[#3B7CFE] disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{submitting ? 'Kaydediliyor...' : 'İlanı Kaydet ve Hesapla'}</span>
            </button>
          </div>

          {errorMsg && (
            <p className="mt-3 flex items-center gap-2 rounded border border-red-500/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </p>
          )}
          {successMsg && (
            <p className="mt-3 flex items-center gap-2 rounded border border-[#246BFD]/50 bg-[#080B12] px-3 py-2 text-xs text-[#F5F7FA]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#246BFD]" />
              <span>{successMsg}</span>
            </p>
          )}
        </form>

        {/* Existing Listings List */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-[#F5F7FA]">
              Kayıtlı İlan Verileri ({displayedListings.length})
            </h3>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#94A3B8]">
              <input
                type="checkbox"
                checked={showOnlySelectedPart}
                onChange={(e) => setShowOnlySelectedPart(e.target.checked)}
                className="accent-[#246BFD]"
              />
              <span>Yalnızca seçili parçayı göster</span>
            </label>
          </div>

          {displayedListings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-slate-800 bg-[#080B12] px-4 py-5 text-center text-xs text-[#94A3B8]">
              Henüz kayıtlı gerçek ilan bulunmuyor. Yukarıdaki formdan Sahibinden, Letgo veya
              Facebook Marketplace ilanı ekleyerek canlı medyan fiyat hesabını başlatabilirsiniz.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {displayedListings.map((listing) => (
                <div
                  key={listing.id}
                  className={`flex flex-col justify-between gap-3 rounded-lg border p-3.5 text-xs sm:flex-row sm:items-center ${
                    listing.isSuspiciousOutlier
                      ? 'border-[#FF7900]/50 bg-[#111827]'
                      : 'border-slate-800 bg-[#080B12]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-[#F5F7FA]">
                        {listing.productName}
                      </span>
                      <span className="text-[#94A3B8]">· {listing.platform}</span>
                      <span className="text-[#246BFD]">
                        · {listing.isNew ? 'Sıfır' : 'İkinci El'} ({listing.conditionGrade})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#94A3B8]">
                      <span>Model: {listing.brandModel}</span>
                      <span>İlan Tarihi: {listing.listingDate}</span>
                      <span>Son Kontrol: {formatShortDate(listing.lastCheckedAt)}</span>
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#246BFD] hover:underline"
                      >
                        <span>İlan Bağlantısı</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {listing.isSuspiciousOutlier && (
                      <p className="flex items-center gap-1.5 text-[11px] text-[#FF7900]">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Aykırı / Şüpheli Fiyat (Hesaba Dahil Edilmedi):{' '}
                          {listing.outlierReason}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-mono text-sm font-semibold tabular-nums text-[#FF7900]">
                      {formatTry(listing.listingPriceTry)}
                    </span>
                    <button
                      type="button"
                      disabled={deletingId === listing.id}
                      onClick={() => handleDelete(listing.id)}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-[#111827] text-[#94A3B8] hover:border-red-500/60 hover:text-red-400 disabled:opacity-50"
                      aria-label={`${listing.productName} ilanını sil`}
                      title="İlanı sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
