import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Heart,
  Info,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  type AuthMeResponse,
  fetchCurrentUserAccount,
} from '../services/authClient';
import { PageId } from '../types/pc';

interface ProfilePageProps {
  onNavigate: (page: PageId) => void;
}

type ExtensibleSectionTab = 'favorites' | 'notifications';

function getInitials(displayName: string | null, email: string | null): string {
  const source = (displayName || email || 'RMG').trim();
  if (!source) return 'RG';

  if (displayName && displayName.trim().length > 0) {
    const words = displayName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase('tr-TR');
    }
    return words[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  }

  const emailLocal = source.split('@')[0] || source;
  return emailLocal.slice(0, 2).toLocaleUpperCase('tr-TR');
}

function formatTurkishDateTime(rawDate?: string): string {
  if (!rawDate) return 'Bilgi mevcut değil';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 'Bilgi mevcut değil';

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const {
    user,
    idToken,
    loading,
    authError,
    signInWithGoogle,
    signOutUser,
    getFreshIdToken,
  } = useAuth();

  const [photoFailed, setPhotoFailed] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activeExtensionTab, setActiveExtensionTab] =
    useState<ExtensibleSectionTab>('favorites');

  const [accountRecord, setAccountRecord] = useState<AuthMeResponse | null>(
    null
  );
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    setPhotoFailed(false);
  }, [user?.photoURL, user?.uid]);

  const loadAccountRecord = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setAccountRecord(null);
        setAccountError(null);
        setAccountLoading(false);
        return;
      }

      setAccountLoading(true);
      setAccountError(null);

      try {
        const token = idToken || (await getFreshIdToken());
        if (!token) {
          throw new Error('Oturum doğrulama anahtarı alınamadı.');
        }
        const data = await fetchCurrentUserAccount(token, signal);
        if (!signal?.aborted) {
          setAccountRecord(data);
        }
      } catch (error) {
        if (signal?.aborted) return;
        setAccountRecord(null);
        setAccountError(
          error instanceof Error
            ? error.message
            : 'Üyelik kaydı sunucudan şu anda alınamadı.'
        );
      } finally {
        if (!signal?.aborted) {
          setAccountLoading(false);
        }
      }
    },
    [user, idToken, getFreshIdToken]
  );

  useEffect(() => {
    if (!user) {
      setAccountRecord(null);
      setAccountError(null);
      setAccountLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadAccountRecord(controller.signal);

    return () => {
      controller.abort();
    };
  }, [user, loadAccountRecord]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#FF7900]" />
            <p className="text-sm font-semibold text-slate-100">
              Oturum ve hesap bilgileri yükleniyor...
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#080B12]" />
            <div className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#080B12]" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mb-6 inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-700/80 bg-[#111827] px-4 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF7900]/30 bg-[#FF7900]/10 text-[#FF7900]">
              <UserIcon className="h-8 w-8" />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#246BFD]/40 bg-[#246BFD]/10 px-3 py-1 text-xs font-semibold text-[#60A5FA]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Google Hesabı ile Güvenli Erişim</span>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              RMG Garaj Hesabınıza Giriş Yapın
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
              Profil bilgilerinizi, üyelik kaydınızı ve ileride eklenecek
              favori donanımlar ile bildirim alanlarınızı görüntülemek için
              Google hesabınızla oturum açın.
            </p>

            {authError && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-left text-xs leading-relaxed text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div>
                  <p className="font-semibold text-rose-100">
                    Giriş işlemi tamamlanamadı
                  </p>
                  <p className="mt-1 text-rose-200/90">{authError}</p>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleSignIn()}
                className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#FF7900] px-6 py-3 text-sm font-bold text-[#080B12] shadow-[0_12px_28px_-12px_rgba(255,121,0,0.75)] transition-colors hover:bg-[#FF912E] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {signingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                <span>
                  {signingIn ? 'Google Penceresi Açılıyor...' : 'Google ile Giriş Yap'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('builder')}
                className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-[#080B12] px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-[#246BFD] hover:text-white sm:w-auto"
              >
                Giriş Yapmadan PC Topla
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    user.displayName?.trim() ||
    user.email?.split('@')[0] ||
    'RMG Garaj Kullanıcısı';
  const email = user.email ?? accountRecord?.email ?? 'E-posta bilgisi yok';
  const initials = getInitials(user.displayName, user.email);
  const showPhoto = Boolean(user.photoURL) && !photoFailed;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-700/80 bg-[#111827] px-4 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:border-[#FF7900] hover:text-[#FF7900]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <button
          type="button"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-700/80 bg-[#111827] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-rose-500/70 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>{signingOut ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}</span>
        </button>
      </div>

      {/* Hero Profile Header Card */}
      <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            {showPhoto ? (
              <img
                src={user.photoURL!}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setPhotoFailed(true)}
                className="h-20 w-20 shrink-0 rounded-2xl border-2 border-[#FF7900]/60 bg-[#080B12] object-cover shadow-lg sm:h-24 sm:w-24"
              />
            ) : (
              <div
                aria-label={displayName}
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-[#FF7900]/60 bg-gradient-to-br from-[#FF7900]/25 to-[#246BFD]/25 text-2xl font-extrabold tracking-wide text-[#F5F7FA] sm:h-24 sm:w-24 sm:text-3xl"
              >
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF7900]/35 bg-[#FF7900]/10 px-3 py-1 text-[11px] font-semibold text-[#FF7900]">
                <UserIcon className="h-3.5 w-3.5" />
                <span>Profil ve Hesap</span>
              </div>

              <h1 className="mt-2.5 truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {displayName}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[#94A3B8]">
                <span className="inline-flex items-center gap-1.5 break-all">
                  <Mail className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                  <span>{email}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>E-posta Doğrulandı</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>E-posta Doğrulanmadı</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#246BFD]/35 bg-[#080B12]/90 p-4 text-xs leading-relaxed text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]" />
          <p>
            Ad, e-posta adresi ve profil fotoğrafı bilgileriniz Google
            hesabınızdan <strong className="text-slate-100">salt okunur</strong>{' '}
            olarak alınmaktadır. Bu bilgileri değiştirmek için Google hesap
            ayarlarınızı güncellemeniz gerekir.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs leading-relaxed text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}
      </section>

      {/* Account & Membership Metadata Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Google Auth Metadata */}
        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF7900]/30 bg-[#FF7900]/10 text-[#FF7900]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                Google Hesap ve Oturum Bilgileri
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Firebase kimlik doğrulama oturum kayıtları
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-3">
            <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-[#080B12] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
                <Calendar className="h-3.5 w-3.5 text-[#FF7900]" />
                <span>Hesap Oluşturma Tarihi</span>
              </dt>
              <dd className="text-xs font-semibold text-[#F5F7FA]">
                {formatTurkishDateTime(user.metadata.creationTime)}
              </dd>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-[#080B12] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
                <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                <span>Son Giriş Tarihi</span>
              </dt>
              <dd className="text-xs font-semibold text-[#F5F7FA]">
                {formatTurkishDateTime(user.metadata.lastSignInTime)}
              </dd>
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-[#080B12] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 text-xs font-medium text-[#94A3B8]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Giriş Sağlayıcısı</span>
              </dt>
              <dd className="text-xs font-semibold text-[#F5F7FA]">
                Google (Firebase Auth)
              </dd>
            </div>
          </dl>
        </section>

        {/* PostgreSQL / API Membership Record */}
        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#246BFD]/35 bg-[#246BFD]/10 text-[#60A5FA]">
                <Database className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">
                  RMG Garaj Üyelik Kaydı
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Sunucu üyelik doğrulaması (/api/auth/me)
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={accountLoading}
              onClick={() => void loadAccountRecord()}
              aria-label="Üyelik kaydını yenile"
              className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#080B12] px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[#FF7900] hover:text-[#FF7900] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${accountLoading ? 'animate-spin' : ''}`}
              />
              <span>Yenile</span>
            </button>
          </div>

          {accountLoading && !accountRecord ? (
            <div className="mt-5 space-y-3">
              <div className="h-12 animate-pulse rounded-xl border border-slate-800 bg-[#080B12]" />
              <div className="h-12 animate-pulse rounded-xl border border-slate-800 bg-[#080B12]" />
              <div className="h-12 animate-pulse rounded-xl border border-slate-800 bg-[#080B12]" />
            </div>
          ) : accountError ? (
            <div className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-100">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-50">
                    Veritabanı üyelik kaydı şu anda alınamadı
                  </p>
                  <p className="mt-1 text-amber-200/90">{accountError}</p>
                  <p className="mt-2 text-amber-200/80">
                    Google oturumunuz aktif olmaya devam etmektedir; bu durum
                    profil görüntülemenizi engellemez.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <dl className="mt-5 space-y-3">
              <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-[#080B12] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-medium text-[#94A3B8]">
                  Üyelik Kayıt Numarası
                </dt>
                <dd className="font-mono text-xs font-bold text-[#FF7900]">
                  {accountRecord?.dbUserId !== null &&
                  accountRecord?.dbUserId !== undefined
                    ? `#${accountRecord.dbUserId}`
                    : 'Henüz senkronize edilmedi'}
                </dd>
              </div>

              <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-[#080B12] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-medium text-[#94A3B8]">
                  Kayıtlı E-posta
                </dt>
                <dd className="break-all text-xs font-semibold text-[#F5F7FA]">
                  {accountRecord?.email || email}
                </dd>
              </div>

              <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-[#080B12] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-medium text-[#94A3B8]">
                  Firebase Kullanıcı Kimliği (UID)
                </dt>
                <dd className="break-all font-mono text-[11px] font-medium text-slate-300">
                  {accountRecord?.uid || user.uid}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>

      {/* Extensible Profile Area: Favorites & Notifications (Empty State Placeholders) */}
      <section className="mt-6 rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              Kişisel Alanlar
            </h2>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Favori donanımlarınız ve fiyat bildirimleriniz için ayrılan profil
              bölümü
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Profil kişisel alanları"
            className="inline-flex rounded-xl border border-slate-800 bg-[#080B12] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeExtensionTab === 'favorites'}
              onClick={() => setActiveExtensionTab('favorites')}
              className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeExtensionTab === 'favorites'
                  ? 'bg-[#FF7900] text-[#080B12]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Heart className="h-3.5 w-3.5" />
              <span>Favoriler</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeExtensionTab === 'notifications'}
              onClick={() => setActiveExtensionTab('notifications')}
              className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                activeExtensionTab === 'notifications'
                  ? 'bg-[#FF7900] text-[#080B12]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Bildirimler</span>
            </button>
          </div>
        </div>

        {activeExtensionTab === 'favorites' ? (
          <div
            role="tabpanel"
            className="mt-6 rounded-xl border border-dashed border-slate-700/80 bg-[#080B12]/70 px-6 py-10 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF7900]/30 bg-[#FF7900]/10 text-[#FF7900]">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">
              Favori Parçalar ve Sistemler Alanı
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#94A3B8]">
              Henüz kayıtlı bir favori ürün veya sistem bulunmuyor. Beğendiğiniz
              donanım bileşenlerini ve hazır sistemleri bu alanda toplayabilmeniz
              için favori yönetimi bir sonraki geliştirme adımında eklenecektir.
            </p>
          </div>
        ) : (
          <div
            role="tabpanel"
            className="mt-6 rounded-xl border border-dashed border-slate-700/80 bg-[#080B12]/70 px-6 py-10 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#246BFD]/35 bg-[#246BFD]/10 text-[#60A5FA]">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">
              Fiyat ve Sistem Bildirimleri Alanı
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#94A3B8]">
              Şu anda aktif bir bildirim veya fiyat alarmınız bulunmuyor. Takip
              ettiğiniz donanımlar için fiyat düşüşü ve stok uyarıları bir
              sonraki geliştirme adımında bu bölümden yönetilecektir.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
