import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PageId, PartCategoryKey } from '../types/pc';
import { RmgLogo } from './RmgLogo';

interface FooterProps {
  onNavigate: (page: PageId) => void;
  onSelectCategory?: (category: PartCategoryKey) => void;
}

const LEGAL_LINKS: { id: PageId; label: string }[] = [
  { id: 'terms', label: 'Kullanım Koşulları' },
  { id: 'privacy', label: 'Gizlilik Politikası' },
  { id: 'cookies', label: 'Çerez Politikası' },
  { id: 'kvkk', label: 'KVKK Aydınlatma Metni' },
];

const CATEGORY_LINKS: { id: PartCategoryKey; label: string }[] = [
  { id: 'cpu', label: 'İşlemciler' },
  { id: 'gpu', label: 'Ekran Kartları' },
  { id: 'motherboard', label: 'Anakartlar' },
  { id: 'ram', label: "RAM'ler" },
  { id: 'ssd', label: "SSD'ler" },
  { id: 'psu', label: 'Güç Kaynakları' },
];

export function Footer({
  onNavigate,
  onSelectCategory,
}: FooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/70">
      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-12">
          {/* Column 1: Brand & Platform Summary */}
          <div className="md:col-span-5">
            <RmgLogo size="lg" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Türkiye donanım pazarında anlık mağaza fiyatlarını karşılaştıran, 10 maddeli
              donanım uyumluluğu doğrulayan yeni nesil PC toplama ve fırsat platformu.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('builder')}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-[#FF7900] px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8C24]"
              >
                <span>Sistem Sihirbazı</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </button>

              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-[#246BFD]" />
                <span>Doğrulanmış Uyumluluk Altyapısı</span>
              </span>
            </div>
          </div>

          {/* Column 2: Hardware Categories */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Donanım Kategorileri
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {CATEGORY_LINKS.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(cat.id);
                      } else if (cat.id === 'cpu') {
                        onNavigate('cpus');
                      } else if (cat.id === 'gpu') {
                        onNavigate('gpus');
                      } else {
                        onNavigate('catalog');
                      }
                    }}
                    className="cursor-pointer transition-colors hover:text-[#FF7900]"
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Platform
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="cursor-pointer transition-colors hover:text-[#FF7900]"
                >
                  Ana Sayfa
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('systems')}
                  className="cursor-pointer transition-colors hover:text-[#FF7900]"
                >
                  Hazır Sistemler
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('builder')}
                  className="cursor-pointer transition-colors hover:text-[#FF7900]"
                >
                  Bilgisayar Topla
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('advisor')}
                  className="cursor-pointer transition-colors hover:text-[#FF7900]"
                >
                  Sistem Öner &amp; FPS
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal Pages */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Kurumsal &amp; Yasal
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {LEGAL_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(link.id)}
                    className="cursor-pointer transition-colors hover:text-[#FF7900]"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-slate-800 pt-7 text-xs text-slate-400 sm:flex-row sm:items-center">
          <span className="font-medium text-slate-300">
            © 2026 RMG Garaj. Tüm hakları saklıdır.
          </span>
          <span>
            Affiliate Mağaza Yönlendirmeleri · API Hız Sınırlama &amp; KVKK Uyumlu Altyapı
          </span>
        </div>
      </div>
    </footer>
  );
}
