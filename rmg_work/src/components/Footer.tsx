import { PageId } from '../types/pc';
import { RmgLogo } from './RmgLogo';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-slate-800/90 bg-[#080B12]">
      <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <RmgLogo />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#94A3B8]">
              Doğrulanmış donanım uyumluluğu ile hazır sistemler ve özel bilgisayar toplama
              deneyimi.
            </p>
          </div>

          <nav
            aria-label="Alt menü"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-[#94A3B8]"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="cursor-pointer transition-colors hover:text-[#F5F7FA] whitespace-nowrap"
            >
              Ana Sayfa
            </button>
            <button
              type="button"
              onClick={() => onNavigate('systems')}
              className="cursor-pointer transition-colors hover:text-[#F5F7FA] whitespace-nowrap"
            >
              Hazır Sistemler
            </button>
            <button
              type="button"
              onClick={() => onNavigate('builder')}
              className="cursor-pointer transition-colors hover:text-[#F5F7FA] whitespace-nowrap"
            >
              Bilgisayar Topla
            </button>
            <button
              type="button"
              onClick={() => onNavigate('gpus')}
              className="cursor-pointer transition-colors hover:text-[#F5F7FA] whitespace-nowrap"
            >
              Ekran Kartları
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cpus')}
              className="cursor-pointer transition-colors hover:text-[#F5F7FA] whitespace-nowrap"
            >
              İşlemciler
            </button>
          </nav>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-800/80 pt-6 text-xs text-[#94A3B8] sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} RMG TECH. Tüm hakları saklıdır.</span>
          <span>10 Maddeli Uyumluluk Kontrolü · İzinli İlan ve Referans Fiyat Sistemi</span>
        </div>
      </div>
    </footer>
  );
}
