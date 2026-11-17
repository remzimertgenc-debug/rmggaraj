import {
  AlertTriangle,
  ArrowRight,
  Check,
  Cpu,
  Gamepad2,
  Gauge,
  Monitor,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  BUDGET_PRESETS,
  CPU_BRAND_OPTIONS,
  ESPORTS_GAMES,
  formatTry,
  generateSampleBuilds,
  getReadySystemCaseImage,
  GPU_BRAND_OPTIONS,
  HEAVY_AAA_GAMES,
  POPULAR_GAMES,
  PURPOSE_OPTIONS,
  RESOLUTION_OPTIONS,
} from '../data/builds';
import {
  BuilderPreferences,
  CpuBrandPreference,
  GpuBrandPreference,
  PartCategoryKey,
  PcBuild,
  PricingCatalogResponse,
  TargetResolution,
  UsagePurpose,
} from '../types/pc';
import {
  estimateGameFps,
  GAME_BENCHMARK_PROFILES,
  getBuildWorkloadMetrics,
} from '../utils/fpsEstimator';

interface SmartAdvisorPageProps {
  initialPreferences: BuilderPreferences;
  pricingCatalog: PricingCatalogResponse | null;
  pricingLoading: boolean;
  pricingError: string | null;
  onRetryPricing: () => void;
  onUpdatePreferences: (next: BuilderPreferences) => void;
  onInspectBuild: (build: PcBuild) => void;
  onCustomizeBuild: (build: PcBuild) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onOpenManualBuilder: () => void;
}

export function SmartAdvisorPage({
  initialPreferences,
  pricingCatalog,
  pricingLoading,
  pricingError,
  onRetryPricing,
  onUpdatePreferences,
  onInspectBuild,
  onCustomizeBuild,
  onInspectPart,
  onOpenManualBuilder,
}: SmartAdvisorPageProps) {
  const [prefs, setPrefs] = useState<BuilderPreferences>(initialPreferences);
  const [budgetInputText, setBudgetInputText] = useState<string>(
    String(initialPreferences.budget)
  );
  const [previewResolution, setPreviewResolution] = useState<TargetResolution>(
    initialPreferences.resolution
  );
  const [includeGamesInDesign, setIncludeGamesInDesign] = useState<boolean>(false);

  const isGamingPurpose = prefs.purpose === 'oyun' || prefs.purpose === 'yayin';
  const showGameSelector =
    isGamingPurpose || (prefs.purpose === 'tasarim' && includeGamesInDesign);

  const updatePrefs = (updater: (prev: BuilderPreferences) => BuilderPreferences) => {
    const next = updater(prefs);
    setPrefs(next);
    onUpdatePreferences(next);
  };

  const handleBudgetNumericChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/[^0-9]/g, '');
    setBudgetInputText(digitsOnly);
    if (!digitsOnly) return;
    const parsed = Number(digitsOnly);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(250000, Math.max(15000, parsed));
      updatePrefs((prev) => ({ ...prev, budget: clamped }));
    }
  };

  const handleBudgetBlur = () => {
    setBudgetInputText(String(prefs.budget));
  };

  const handleBudgetSliderOrPreset = (value: number) => {
    const clamped = Math.min(200000, Math.max(15000, value));
    setBudgetInputText(String(clamped));
    updatePrefs((prev) => ({ ...prev, budget: clamped }));
  };

  const handlePurposeChange = (purpose: UsagePurpose) => {
    updatePrefs((prev) => ({
      ...prev,
      purpose,
      favoriteGames:
        (purpose === 'oyun' || purpose === 'yayin') && prev.favoriteGames.length === 0
          ? ['Valorant', 'Counter-Strike 2', 'Cyberpunk 2077']
          : prev.favoriteGames,
    }));
  };

  const handleResolutionChange = (resolution: TargetResolution) => {
    setPreviewResolution(resolution);
    updatePrefs((prev) => ({ ...prev, resolution }));
  };

  const toggleGame = (game: string) => {
    updatePrefs((prev) => {
      const exists = prev.favoriteGames.includes(game);
      const nextGames = exists
        ? prev.favoriteGames.filter((g) => g !== game)
        : [...prev.favoriteGames, game];
      return { ...prev, favoriteGames: nextGames };
    });
  };

  const selectGamePreset = (mode: 'esports' | 'aaa' | 'all' | 'clear') => {
    updatePrefs((prev) => {
      if (mode === 'clear') return { ...prev, favoriteGames: [] };
      if (mode === 'all') return { ...prev, favoriteGames: [...POPULAR_GAMES] };
      if (mode === 'esports') {
        return {
          ...prev,
          favoriteGames: POPULAR_GAMES.filter((g) => ESPORTS_GAMES.has(g)),
        };
      }
      return {
        ...prev,
        favoriteGames: POPULAR_GAMES.filter((g) => HEAVY_AAA_GAMES.has(g)),
      };
    });
  };

  const recommendedBuilds = useMemo(
    () => generateSampleBuilds(prefs, pricingCatalog),
    [prefs, pricingCatalog]
  );

  const anyOutsideBudget = recommendedBuilds.some((b) => !b.isWithinBudget);

  const activeGamesForFps = useMemo(() => {
    if (!showGameSelector) return [];
    return prefs.favoriteGames;
  }, [prefs.favoriteGames, showGameSelector]);

  const scrollToResults = () => {
    const el = document.getElementById('advisor-results');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const purposeTitle =
    PURPOSE_OPTIONS.find((p) => p.id === prefs.purpose)?.title ?? 'Oyun';

  return (
    <div className="bg-slate-900">
      <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Header Banner */}
        <div className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-800/80 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7900]">
                Akıllı Sistem Önerici &amp; FPS Tahmini
              </p>
              <h1
                className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl"
                style={{ textWrap: 'balance' }}
              >
                Bütçene ve Oyunlarına Göre Sistem Önerisi Al
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Bütçeni ve kullanım amacını belirle; oyun oynayacaksan oynayacağın oyunları seç.
                10 maddeli uyumluluk kontrolünden geçmiş sıfır donanım önerilerini ve her oyunda
                alabileceğin tahmini FPS değerlerini anında gör.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenManualBuilder}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] whitespace-nowrap"
              >
                <Wrench className="h-4 w-4 shrink-0" />
                <span>Parçaları Tek Tek Kendin Seç</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Configurator Panel */}
        <section
          aria-label="Bütçe, kullanım amacı ve oyun seçimi"
          className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5 sm:p-7"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Step 1: Budget */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-slate-50 sm:text-lg">
                  01. Bütçeni Gir
                </h2>
                <span className="font-mono text-lg font-extrabold text-[#FF7900] tabular-nums">
                  {formatTry(prefs.budget)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Sistem toplamı için ayırdığın hedef bütçeyi yaz veya kaydırıcıyla ayarla.
              </p>

              {/* Direct numeric TL input */}
              <div className="mt-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetInputText}
                    onChange={(e) => handleBudgetNumericChange(e.target.value)}
                    onBlur={handleBudgetBlur}
                    aria-label="Hedef bütçe (TL)"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 pr-12 font-mono text-sm font-bold text-slate-50 tabular-nums focus:border-[#FF7900] focus:ring-2 focus:ring-[#246BFD]/30 focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-slate-400">
                    TL
                  </span>
                </div>
              </div>

              {/* Range Slider */}
              <div className="mt-4">
                <input
                  type="range"
                  min={15000}
                  max={200000}
                  step={1000}
                  value={Math.min(200000, prefs.budget)}
                  onChange={(e) => handleBudgetSliderOrPreset(Number(e.target.value))}
                  aria-label="Bütçe kaydırıcısı"
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-900 accent-[#FF7900]"
                />
                <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
                  <span>15.000 TL</span>
                  <span>100.000 TL</span>
                  <span>200.000 TL</span>
                </div>
              </div>

              {/* Quick Budget Presets */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
                {BUDGET_PRESETS.map((preset) => {
                  const active = prefs.budget === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleBudgetSliderOrPreset(preset)}
                      className={`min-h-[38px] cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums transition-colors whitespace-nowrap ${
                        active
                          ? 'border-[#FF7900] bg-[#FF7900]/15 text-[#FF7900]'
                          : 'border-slate-700/80 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      {new Intl.NumberFormat('tr-TR').format(preset)} ₺
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Usage Purpose & Resolution */}
            <div className="lg:col-span-7">
              <h2 className="font-display text-base font-bold text-slate-50 sm:text-lg">
                02. Kullanım Amacı ve Hedef Çözünürlük
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Bilgisayarı hangi amaçla kullanacaksın? Oyun veya Yayın seçtiğinde oyun listesi
                otomatik açılır.
              </p>

              {/* Purpose 2-col on mobile, 4-col on desktop */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {PURPOSE_OPTIONS.map((opt) => {
                  const active = prefs.purpose === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handlePurposeChange(opt.id)}
                      className={`flex min-h-[78px] cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-[#FF7900] bg-[#FF7900]/12 text-slate-50'
                          : 'border-slate-700/70 bg-slate-900/90 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-sm font-bold">{opt.title}</span>
                        {active && <Check className="h-4 w-4 shrink-0 text-[#FF7900]" />}
                      </div>
                      <span className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-400">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Resolution & Brand row */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold text-slate-300">
                    Monitör Çözünürlüğü (FPS hesabı bu çözünürlüğe göre yapılır)
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {RESOLUTION_OPTIONS.map((res) => {
                      const active = prefs.resolution === res.id;
                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => handleResolutionChange(res.id)}
                          className={`cursor-pointer rounded-xl border p-2.5 text-left transition-colors sm:p-3 ${
                            active
                              ? 'border-[#246BFD] bg-[#246BFD]/15 text-slate-50'
                              : 'border-slate-700/70 bg-slate-900/90 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-bold sm:text-sm">
                              {res.title}
                            </span>
                            {active && (
                              <Monitor className="hidden h-3.5 w-3.5 shrink-0 text-[#60A5FA] sm:block" />
                            )}
                          </div>
                          <span className="mt-1 hidden text-[11px] text-slate-400 sm:block">
                            {res.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    İşlemci Markası
                  </label>
                  <select
                    value={prefs.cpuBrandPref}
                    onChange={(e) =>
                      updatePrefs((prev) => ({
                        ...prev,
                        cpuBrandPref: e.target.value as CpuBrandPreference,
                      }))
                    }
                    className="h-10 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-100 focus:border-[#246BFD] focus:outline-none"
                  >
                    {CPU_BRAND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Ekran Kartı Markası
                  </label>
                  <select
                    value={prefs.gpuBrandPref}
                    onChange={(e) =>
                      updatePrefs((prev) => ({
                        ...prev,
                        gpuBrandPref: e.target.value as GpuBrandPreference,
                      }))
                    }
                    className="h-10 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-100 focus:border-[#246BFD] focus:outline-none"
                  >
                    {GPU_BRAND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Game Selection (Shown for Oyun / Yayin or Optional for Tasarim) */}
          <div className="mt-8 border-t border-slate-700/60 pt-7">
            {showGameSelector ? (
              <div>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-[#FF7900]" />
                      <h2 className="font-display text-base font-bold text-slate-50 sm:text-lg">
                        03. Oynayacağın Oyunları Seç ({prefs.favoriteGames.length} seçili)
                      </h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Seçtiğin oyunlar işlemci/ekran kartı dengesini şekillendirir ve her önerilen
                      sistemde bu oyunlarda alacağın tahmini FPS hesaplanır.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectGamePreset('esports')}
                      className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] whitespace-nowrap"
                    >
                      Espor Paketi
                    </button>
                    <button
                      type="button"
                      onClick={() => selectGamePreset('aaa')}
                      className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] whitespace-nowrap"
                    >
                      Ağır AAA Paketi
                    </button>
                    <button
                      type="button"
                      onClick={() => selectGamePreset('all')}
                      className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[#246BFD] hover:text-white whitespace-nowrap"
                    >
                      Tümünü Seç
                    </button>
                    <button
                      type="button"
                      onClick={() => selectGamePreset('clear')}
                      className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-white whitespace-nowrap"
                    >
                      Temizle
                    </button>
                  </div>
                </div>

                {/* 2-col on mobile, 3-col sm, 4-col lg */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                  {POPULAR_GAMES.map((game) => {
                    const selected = prefs.favoriteGames.includes(game);
                    const profile = GAME_BENCHMARK_PROFILES[game];
                    return (
                      <button
                        key={game}
                        type="button"
                        onClick={() => toggleGame(game)}
                        aria-pressed={selected}
                        className={`flex min-h-[54px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? 'border-[#FF7900] bg-[#FF7900]/14 text-slate-50'
                            : 'border-slate-700/70 bg-slate-900/90 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-bold sm:text-sm">
                            {game}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {profile?.categoryLabel ?? 'Oyun'}
                          </span>
                        </div>
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            selected
                              ? 'border-[#FF7900] bg-[#FF7900] text-slate-950'
                              : 'border-slate-600 bg-slate-800 text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {prefs.favoriteGames.length === 0 && (
                  <p className="mt-3 text-xs text-amber-300">
                    Tahmini FPS tablosunu görmek için en az 1 oyun seçin.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-900/80 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold text-slate-100">
                    {prefs.purpose === 'tasarim'
                      ? 'Tasarım & Kurgu Odaklı Sistem Modu Aktif'
                      : 'Sessiz Ofis & Üretkenlik Modu Aktif'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {prefs.purpose === 'tasarim'
                      ? 'Sistem önerileri çok çekirdekli render hızı, VRAM ve 32 GB+ bellek kapasitesine göre optimize edilir.'
                      : 'Günlük ofis işleri, yüksek NVMe hızı ve düşük güç tüketimi hedeflenir.'}
                  </p>
                </div>

                {prefs.purpose === 'tasarim' ? (
                  <button
                    type="button"
                    onClick={() => setIncludeGamesInDesign(true)}
                    className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#246BFD]/60 bg-[#246BFD]/15 px-4 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#246BFD] whitespace-nowrap shrink-0"
                  >
                    <Gamepad2 className="h-4 w-4 shrink-0" />
                    <span>Oyun FPS Tahmini de Ekle</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePurposeChange('oyun')}
                    className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#FF7900]/60 bg-[#FF7900]/15 px-4 py-2 text-xs font-semibold text-[#FF7900] transition-colors hover:bg-[#FF7900] hover:text-slate-950 whitespace-nowrap shrink-0"
                  >
                    <Gamepad2 className="h-4 w-4 shrink-0" />
                    <span>Oyun Moduna Geç</span>
                  </button>
                )}
              </div>
            )}

            {/* Action bar directly under Step 3 */}
            <div className="mt-6 flex flex-col items-stretch justify-between gap-4 border-t border-slate-700/60 pt-5 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="font-semibold text-slate-100">Seçimin:</span>
                <span className="font-mono font-bold text-[#FF7900] tabular-nums">
                  {formatTry(prefs.budget)}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span>{purposeTitle}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="font-mono">{prefs.resolution.toUpperCase()}</span>
                {showGameSelector && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span>{prefs.favoriteGames.length} oyun</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={scrollToResults}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-6 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-[#FF8E29] whitespace-nowrap"
              >
                <span>Önerileri ve FPS&apos;i Göster</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section id="advisor-results" className="mt-10 scroll-mt-24">
          <div className="flex flex-col justify-between gap-4 pb-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="text-[#FF7900]">Doğrulanmış Sistem Önerileri</span>
                <span aria-hidden="true">·</span>
                <span>Hedef Bütçe: {formatTry(prefs.budget)}</span>
                <span aria-hidden="true">·</span>
                <span>Amaç: {purposeTitle}</span>
                {activeGamesForFps.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{activeGamesForFps.length} Oyun FPS Analizi</span>
                  </>
                )}
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-50 sm:text-3xl">
                Senin İçin Seçilen 3 Uyumlu Sistem ve FPS Değerleri
              </h2>
            </div>

            {/* Live FPS Resolution Switcher */}
            {activeGamesForFps.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  FPS Karşılaştırma Çözünürlüğü:
                </span>
                <div className="flex items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-800 p-1">
                  {(['1080p', '1440p', '4k'] as TargetResolution[]).map((res) => {
                    const active = previewResolution === res;
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setPreviewResolution(res)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-[#FF7900] text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {res.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {pricingError && (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-200"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>Canlı fiyat verisi alınamadı: {pricingError}</span>
              </span>
              <button
                type="button"
                onClick={onRetryPricing}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-400/40 bg-slate-800 px-3 py-1.5 font-semibold text-slate-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Yeniden Dene</span>
              </button>
            </div>
          )}

          {anyOutsideBudget && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                Seçilen bütçe sınırında tüm marka filtreleriyle eşleşen alternatif kalmadığı için
                bütçeye en yakın 10/10 uyumlu sistemler gösteriliyor.
              </span>
            </div>
          )}

          {pricingLoading && !pricingCatalog ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="h-[580px] animate-pulse rounded-2xl border border-slate-700/60 bg-slate-800/70"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {recommendedBuilds.map((build) => {
                const fpsEntries = activeGamesForFps.map((game) =>
                  estimateGameFps(build, game, previewResolution, pricingCatalog)
                );
                const avgAcrossGames =
                  fpsEntries.length > 0
                    ? Math.round(
                        fpsEntries.reduce((acc, item) => acc + item.avgFps, 0) /
                          fpsEntries.length
                      )
                    : null;
                const workload = getBuildWorkloadMetrics(build, pricingCatalog);
                const isRecommendedHero = build.tier === 'fiyat-performans';
                const caseImage = getReadySystemCaseImage(build);
                const monthlyInstallment = Math.round(build.samplePriceTry / 12);

                const specRows: {
                  label: string;
                  category: PartCategoryKey;
                  partId: string;
                  model: string;
                }[] = [
                  {
                    label: 'İşlemci',
                    category: 'cpu',
                    partId: build.cpu.partId,
                    model: build.cpu.model,
                  },
                  {
                    label: 'Ekran Kartı',
                    category: 'gpu',
                    partId: build.gpu.partId,
                    model: build.gpu.model,
                  },
                  {
                    label: 'Anakart',
                    category: 'motherboard',
                    partId: build.motherboard.partId,
                    model: build.motherboard.model,
                  },
                  {
                    label: 'RAM',
                    category: 'ram',
                    partId: build.ram.partId,
                    model: build.ram.model,
                  },
                  {
                    label: 'SSD',
                    category: 'ssd',
                    partId: build.ssd.partId,
                    model: build.ssd.model,
                  },
                  {
                    label: 'Güç Kaynağı',
                    category: 'psu',
                    partId: build.psu.partId,
                    model: build.psu.model,
                  },
                  {
                    label: 'Kasa',
                    category: 'pcCase',
                    partId: build.pcCase.partId,
                    model: build.pcCase.model,
                  },
                  {
                    label: 'Soğutucu',
                    category: 'cooler',
                    partId: build.cooler.partId,
                    model: build.cooler.model,
                  },
                ];

                return (
                  <article
                    key={build.id}
                    className={`flex flex-col rounded-2xl border bg-slate-800/80 p-5 transition-colors sm:p-6 ${
                      isRecommendedHero
                        ? 'border-[#FF7900]/70'
                        : 'border-slate-700/70'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start gap-3.5">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900">
                        <img
                          src={caseImage}
                          alt={build.systemName}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-center"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          <span
                            className={
                              isRecommendedHero ? 'text-[#FF7900]' : 'text-[#60A5FA]'
                            }
                          >
                            {build.tierTitle}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <ShieldCheck className="h-3 w-3 shrink-0" />
                            <span>
                              {build.compatibility.verifiedCount}/
                              {build.compatibility.totalChecks} Uyumlu
                            </span>
                          </span>
                        </div>

                        <h3 className="mt-1 font-display text-lg font-extrabold leading-snug text-slate-50">
                          {build.systemName}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">{build.tierSubtitle}</p>
                      </div>
                    </div>

                    {/* Price Block */}
                    <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-y border-slate-700/60 py-3.5">
                      <div>
                        <span className="block font-mono text-2xl font-extrabold text-[#FF7900] tabular-nums">
                          {formatTry(build.samplePriceTry)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-slate-400 tabular-nums">
                          12 ay x {formatTry(monthlyInstallment)} · Sıfır Kapalı Kutu
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          build.isWithinBudget ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {build.budgetStatusText}
                      </span>
                    </div>

                    {/* Per-Game FPS Section */}
                    {fpsEntries.length > 0 ? (
                      <div className="mt-5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Gauge className="h-4 w-4 text-[#FF7900]" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                              Oyun FPS Tahmini ({previewResolution.toUpperCase()})
                            </h4>
                          </div>
                          {avgAcrossGames !== null && (
                            <span className="font-mono text-xs font-bold text-[#60A5FA] tabular-nums">
                              Ort. ~{avgAcrossGames} FPS
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-3">
                          {fpsEntries.map((item) => {
                            const barColor =
                              item.verdictTone === 'elite'
                                ? 'bg-emerald-400'
                                : item.verdictTone === 'smooth'
                                  ? 'bg-[#FF7900]'
                                  : item.verdictTone === 'playable'
                                    ? 'bg-[#246BFD]'
                                    : 'bg-amber-500';

                            const verdictTextClass =
                              item.verdictTone === 'elite'
                                ? 'text-emerald-400'
                                : item.verdictTone === 'smooth'
                                  ? 'text-[#FF9A3D]'
                                  : item.verdictTone === 'playable'
                                    ? 'text-[#60A5FA]'
                                    : 'text-amber-300';

                            return (
                              <div
                                key={item.game}
                                className="rounded-xl border border-slate-700/50 bg-slate-900/75 p-3"
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="block truncate text-xs font-bold text-slate-100">
                                      {item.game}
                                    </span>
                                    <span className="block truncate text-[11px] text-slate-400">
                                      {item.qualityPresetLabel}
                                    </span>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="font-mono text-sm font-extrabold text-slate-50 tabular-nums">
                                      ~{item.avgFps} FPS
                                    </span>
                                  </div>
                                </div>

                                {/* FPS Bar */}
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className={`h-full rounded-full ${barColor}`}
                                    style={{ width: `${item.barPercent}%` }}
                                  />
                                </div>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2 font-mono text-slate-400 tabular-nums">
                                    <span>%1 Low: {item.low1PercentFps} FPS</span>
                                    {item.upscaledFps && item.upscalerLabel && (
                                      <>
                                        <span aria-hidden="true" className="text-slate-600">
                                          ·
                                        </span>
                                        <span className="text-slate-200">
                                          {item.upscalerLabel}: ~{item.upscaledFps} FPS
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <span className={`font-semibold ${verdictTextClass}`}>
                                    {item.verdictLabel}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Workload Index Bars for Office / Design (when no games selected) */
                      <div className="mt-5 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="h-4 w-4 text-[#246BFD]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                            Sistem Performans Dengesi
                          </h4>
                        </div>

                        {[
                          {
                            label: 'İşlemci, Yayın ve Kurgu Gücü',
                            score: workload.cpuRenderIndex,
                            color: 'bg-[#246BFD]',
                          },
                          {
                            label: 'Oyun ve 3B Grafik Hızı',
                            score: workload.gamingIndex,
                            color: 'bg-[#FF7900]',
                          },
                          {
                            label: 'Bellek ve VRAM Kapasitesi',
                            score: workload.memoryVramIndex,
                            color: 'bg-emerald-400',
                          },
                        ].map((metric) => (
                          <div
                            key={metric.label}
                            className="rounded-xl border border-slate-700/50 bg-slate-900/75 p-3"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-200">{metric.label}</span>
                              <span className="font-mono font-bold text-slate-100 tabular-nums">
                                {metric.score}/100
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className={`h-full rounded-full ${metric.color}`}
                                style={{ width: `${metric.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hardware Summary */}
                    <div className="mt-5 border-t border-slate-700/60 pt-4">
                      <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Sistem Bileşenleri
                      </p>
                      <dl className="grid grid-cols-1 gap-1.5 text-xs">
                        {specRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <dt className="shrink-0 text-slate-400">{row.label}</dt>
                            <dd className="min-w-0 truncate text-right font-medium text-slate-100">
                              <button
                                type="button"
                                onClick={() => onInspectPart(row.category, row.partId)}
                                className="cursor-pointer truncate text-right transition-colors hover:text-[#FF7900]"
                                title={`${row.model} — Parça detayını gör`}
                              >
                                {row.model}
                              </button>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onCustomizeBuild(build)}
                        className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#246BFD]/60 bg-[#246BFD]/15 px-3.5 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#246BFD] whitespace-nowrap"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                        <span>Kendin Topla&apos;da Düzenle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onInspectBuild(build)}
                        className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#FF7900] px-3.5 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8E29] whitespace-nowrap"
                      >
                        <span>Sistemi İncele</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Methodology Note */}
          <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5 text-xs leading-relaxed text-slate-400">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7900]" />
              <p>
                <strong className="text-slate-200">FPS Tahmin Metodolojisi:</strong> Gösterilen kare
                hızları; işlemcinin tek/çok çekirdek oyun puanı, ekran kartının seçilen çözünürlükteki
                (1080p / 1440p / 4K) ham grafik performansı, VRAM kapasitesi ve bellek mimarisi (DDR4 /
                DDR5) birlikte değerlendirilerek hesaplanan yaklaşık ortalama FPS aralıklarıdır. Gerçek
                oyun içi değerler sahne yoğunluğu, sürücü sürümü ve DLSS/FSR ayarına göre değişiklik
                gösterebilir.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
