import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import {
  Component,
  type ComponentProps,
  type ComponentType,
  createContext,
  type ErrorInfo,
  lazy,
  type LazyExoticComponent,
  type ReactNode,
  useContext,
} from 'react';

export interface LazyRetryContextValue {
  retryNonce: number;
  onLoadSuccess?: () => void;
}

/**
 * Başarısız olmuş React.lazy() bileşenlerini yeniden deneme sırasında
 * taze bir lazy örneğiyle değiştirmek ve başarılı yüklemede deneme sayacını
 * sıfırlamak için kullanılan bağlam.
 */
export const LazyRetryContext = createContext<LazyRetryContextValue>({
  retryNonce: 0,
});

/**
 * React.lazy() sarmalayıcısı: Vite dinamik import çağrılarını korur ve
 * ChunkErrorBoundary üzerinden "Tekrar Dene" tetiklendiğinde yeni bir
 * lazy bileşen örneği oluşturarak reddedilmiş önceki Promise önbelleğini aşar.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): ComponentType<ComponentProps<T>> {
  let cachedNonce: number | null = null;
  let cachedLazy: LazyExoticComponent<T> | null = null;
  let latestOnLoadSuccess: (() => void) | undefined;

  function getOrCreateLazy(retryNonce: number): LazyExoticComponent<T> {
    if (cachedLazy === null || cachedNonce !== retryNonce) {
      cachedNonce = retryNonce;
      cachedLazy = lazy(() =>
        factory().then((mod) => {
          latestOnLoadSuccess?.();
          return mod;
        })
      );
    }
    return cachedLazy;
  }

  function RetryableLazy(props: ComponentProps<T>) {
    const { retryNonce, onLoadSuccess } = useContext(LazyRetryContext);
    latestOnLoadSuccess = onLoadSuccess;
    const LazyComponent = getOrCreateLazy(retryNonce);
    return <LazyComponent {...props} />;
  }

  return RetryableLazy;
}

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = `${error.name} ${error.message}`.toLowerCase();
  return (
    msg.includes('chunkloaderror') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('unable to preload css')
  );
}

interface ChunkErrorBoundaryProps {
  children: ReactNode;
  /** Değiştiğinde (ör. rota veya parça geçişinde) hata durumu ve deneme sayacı sıfırlanır. */
  resetKey?: string | number;
  /** Ana sayfa görünümü ('page') veya bileşen içi görünüm ('inline'). */
  variant?: 'page' | 'inline';
  /** Kullanıcı "Ana Sayfaya Dön" butonuna bastığında çağrılır. */
  onGoHome?: () => void;
  /** Başlık özelleştirmesi (opsiyonel). */
  title?: string;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryNonce: number;
  softRetriesUsed: number;
}

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = {
    hasError: false,
    error: null,
    retryNonce: 0,
    softRetriesUsed: 0,
  };

  private cachedRetryNonce = -1;
  private cachedContextValue: LazyRetryContextValue = {
    retryNonce: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ChunkErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ChunkErrorBoundary] Sayfa/modül yükleme hatası:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ChunkErrorBoundaryProps) {
    if (
      prevProps.resetKey !== this.props.resetKey &&
      (this.state.hasError || this.state.softRetriesUsed !== 0)
    ) {
      this.setState({
        hasError: false,
        error: null,
        softRetriesUsed: 0,
      });
    }
  }

  private handleLoadSuccess = () => {
    if (this.state.softRetriesUsed !== 0 || this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        softRetriesUsed: 0,
      });
    }
  };

  private getContextValue(): LazyRetryContextValue {
    if (this.cachedRetryNonce !== this.state.retryNonce) {
      this.cachedRetryNonce = this.state.retryNonce;
      this.cachedContextValue = {
        retryNonce: this.state.retryNonce,
        onLoadSuccess: this.handleLoadSuccess,
      };
    }
    return this.cachedContextValue;
  }

  private handleRetry = () => {
    const chunkErr = isChunkLoadError(this.state.error);

    // İlk denemede React.lazy örneğini yenileyerek yalnızca ilgili modülü tekrar dene.
    // İlk yazılımsal deneme de başarısız olursa ikinci tıklamada yalnızca chunk hatalarında sayfayı yenile.
    if (this.state.softRetriesUsed >= 1 && chunkErr && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryNonce: prev.retryNonce + 1,
      softRetriesUsed: prev.softRetriesUsed + 1,
    }));
  };

  private handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      softRetriesUsed: 0,
    });
    this.props.onGoHome?.();
  };

  render() {
    const { hasError, error, softRetriesUsed } = this.state;
    const { children, variant = 'page', onGoHome, title } = this.props;

    if (!hasError) {
      return (
        <LazyRetryContext.Provider value={this.getContextValue()}>
          {children}
        </LazyRetryContext.Provider>
      );
    }

    const chunkErr = isChunkLoadError(error);
    const resolvedTitle =
      title ??
      (variant === 'inline'
        ? 'Fiyat geçmişi grafiği yüklenemedi'
        : chunkErr
          ? 'Sayfa modülü indirilemedi'
          : 'Sayfa görüntülenirken bir sorun oluştu');

    const description = chunkErr
      ? softRetriesUsed >= 1
        ? 'Modül bağlantısı tekrar denenmesine rağmen yüklenemedi. Yeni bir sürüm yayınlanmış olabilir; "Tekrar Dene" seçildiğinde sayfa güncellenecektir.'
        : 'Bağlantı kesintisi veya önbellek nedeniyle sayfa dosyası yüklenemedi. Lütfen tekrar deneyin.'
      : 'Bu bölüm yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir veya ana sayfaya dönebilirsiniz.';

    if (variant === 'inline') {
      return (
        <div
          className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-[#111827] px-6 py-8 text-center"
          role="alert"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#FF7900]/30 bg-[#FF7900]/10 text-[#FF7900]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-display text-base font-bold text-[#F5F7FA]">
            {resolvedTitle}
          </h4>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#94A3B8]">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl bg-[#FF7900] px-4 py-2 text-xs font-bold text-[#080B12] transition-colors hover:bg-[#FF8E29]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tekrar Dene
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="mx-auto flex min-h-[60vh] max-w-[1320px] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8"
        role="alert"
      >
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-800 bg-[#111827] p-6 text-center shadow-xl sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF7900]/35 bg-[#FF7900]/10 text-[#FF7900]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#FF7900]">
            RMG Garaj · Bağlantı Koruması
          </p>
          <h2 className="mt-1.5 font-display text-xl font-extrabold text-slate-50 sm:text-2xl">
            {resolvedTitle}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
            {description}
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-[#FF8E29]"
            >
              <RefreshCw className="h-4 w-4" />
              Tekrar Dene
            </button>
            {onGoHome && (
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-600 hover:bg-slate-800"
              >
                <Home className="h-4 w-4" />
                Ana Sayfaya Dön
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
