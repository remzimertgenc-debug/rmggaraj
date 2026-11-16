import { ArrowLeft, Cookie, FileText, Lock, ShieldCheck } from 'lucide-react';
import { PageId } from '../types/pc';

export type LegalPageId = Extract<PageId, 'terms' | 'privacy' | 'cookies' | 'kvkk'>;

interface LegalPageProps {
  pageId: LegalPageId;
  onNavigate: (page: PageId) => void;
}

interface LegalDocumentContent {
  id: LegalPageId;
  title: string;
  eyebrow: string;
  updatedAt: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

const LEGAL_DOCUMENTS: Record<LegalPageId, LegalDocumentContent> = {
  terms: {
    id: 'terms',
    eyebrow: 'Hukuki Bilgilendirme · Sözleşme',
    title: 'Kullanım Koşulları',
    updatedAt: '15 Kasım 2026',
    summary:
      'RMG Garaj donanım karşılaştırma ve sistem toplama platformunun kullanım esaslarını düzenleyen genel koşullar.',
    sections: [
      {
        heading: '1. Hizmetin Kapsamı',
        body: 'RMG Garaj, bilgisayar donanım bileşenleri için teknik uyumluluk analizi, hazır sistem önerileri ve üçüncü taraf mağaza fiyat karşılaştırma bilgileri sunan bir rehberlik platformudur. Platformda listelenen fiyatlar satıcı mağazaların anlık verilerine göre değişiklik gösterebilir.',
      },
      {
        heading: '2. Satış Ortaklığı (Affiliate) ve Mağaza Yönlendirmeleri',
        body: 'Ürün detay sayfalarındaki "Mağazaya Git" bağlantıları kullanıcıları ilgili yetkili satıcı veya ilan platformlarına yönlendirir. Satın alma, garanti, kargo ve iade süreçleri doğrudan alışverişin yapıldığı mağazanın sorumluluğundadır.',
      },
      {
        heading: '3. Kullanıcı İlanları ve Doğruluk',
        body: 'Kullanıcılar tarafından eklenen ikinci el veya mağaza ilanları moderasyon ve aykırı değer analizinden geçirilir. Yanıltıcı fiyat veya sahte bağlantı içeren kayıtlar sistem tarafından otomatik olarak hariç tutulur veya kaldırılır.',
      },
      {
        heading: '4. Güvenlik ve Otomatik Erişim Kuralları',
        body: 'Platform altyapısını korumak amacıyla API uç noktalarında hız sınırlaması (rate limiting) uygulanmaktadır. İzinsiz toplu veri çekme, bot saldırısı veya servis bütünlüğünü bozmaya yönelik girişimler engellenir.',
      },
    ],
  },
  privacy: {
    id: 'privacy',
    eyebrow: 'Hukuki Bilgilendirme · Veri Koruma',
    title: 'Gizlilik Politikası',
    updatedAt: '15 Kasım 2026',
    summary:
      'Kullanıcı hesabınızla giriş yaptığınızda veya platformu ziyaret ettiğinizde işlenen temel bilgilerin korunmasına ilişkin esaslar.',
    sections: [
      {
        heading: '1. Toplanan Bilgiler',
        body: 'RMG Garaj üzerinde ziyaretçilerin donanım karşılaştırması ve sistem toplama özelliklerini kullanması için kişisel veri paylaşması zorunlu değildir. Yalnızca Google hesabı ile oturum açan kullanıcıların kimlik doğrulama bilgisi (e-posta ve kullanıcı kimliği) ilan yönetimi amacıyla işlenir.',
      },
      {
        heading: '2. Verilerin Kullanım Amacı',
        body: 'Elde edilen hesap bilgileri yalnızca eklediğiniz ilanların size ait olduğunu doğrulamak, silme/düzenleme yetkisi tanımlamak ve sistem güvenliğini sağlamak amacıyla kullanılır.',
      },
      {
        heading: '3. Üçüncü Taraf Bağlantılar ve Reklam Alanları',
        body: 'Platform içerisindeki mağaza bağlantıları ve sponsorlu reklam alanları üzerinden ziyaret edilen dış sitelerin gizlilik uygulamaları ilgili üçüncü tarafın politikalarına tabidir.',
      },
      {
        heading: '4. İletişim ve Haklarınız',
        body: 'Gizlilik uygulamalarımız hakkında sorularınız veya veri silme talepleriniz için destek kanallarımız üzerinden bizimle iletişime geçebilirsiniz.',
      },
    ],
  },
  cookies: {
    id: 'cookies',
    eyebrow: 'Hukuki Bilgilendirme · Çerez Yönetimi',
    title: 'Çerez Politikası',
    updatedAt: '15 Kasım 2026',
    summary:
      'RMG Garaj deneyimini kesintisiz, güvenli ve hızlı sunabilmek için tarayıcınızda saklanan zorunlu ve işlevsel çerezler hakkında bilgilendirme.',
    sections: [
      {
        heading: '1. Zorunlu Oturum ve Güvenlik Çerezleri',
        body: 'Oturum durumunu korumak, hız sınırlama ve bot koruma doğrulamalarını yürütmek amacıyla teknik olarak gerekli çerezler ve yerel tarayıcı depolaması kullanılır.',
      },
      {
        heading: '2. Tercih ve İşlevsel Depolama',
        body: 'Sistem Sihirbazı ve kategori filtrelerinizdeki geçici seçimlerin sayfa içi geçişlerde korunması için tarayıcı belleğinden yararlanılır.',
      },
      {
        heading: '3. Reklam ve Analiz Çerezleri',
        body: 'İleride Google AdSense veya sponsorlu kampanya ölçümlemeleri etkinleştirildiğinde ilgili reklam sağlayıcılarının çerez tercihleri şeffaf onay mekanizmasıyla sunulacaktır.',
      },
      {
        heading: '4. Çerezleri Yönetme',
        body: 'Tarayıcı ayarlarınız üzerinden çerezleri dilediğiniz zaman temizleyebilir veya engelleyebilirsiniz; ancak zorunlu çerezlerin kapatılması oturum açma işlevini etkileyebilir.',
      },
    ],
  },
  kvkk: {
    id: 'kvkk',
    eyebrow: '6698 Sayılı Kanun · Aydınlatma Metni',
    title: 'KVKK Aydınlatma Metni',
    updatedAt: '15 Kasım 2026',
    summary:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca veri sorumlusu sıfatıyla aydınlatma yükümlülüğü metni.',
    sections: [
      {
        heading: '1. Veri Sorumlusu',
        body: 'RMG Garaj platformu üzerinden işlenen kişisel veriler bakımından 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında veri sorumlusu sıfatıyla gerekli teknik ve idari tedbirler alınmaktadır.',
      },
      {
        heading: '2. İşlenen Kişisel Veriler ve Hukuki Sebep',
        body: 'Üye girişi gerçekleştiren kullanıcılar için ad, e-posta adresi ve işlem güvenliği IP kayıtları; KVKK m. 5/2-c (sözleşmenin kurulması ve ifası) ve m. 5/2-f (meşru menfaat / bilgi güvenliği) hukuki sebeplerine dayanılarak işlenir.',
      },
      {
        heading: '3. Kişisel Verilerin Aktarımı',
        body: 'Verileriniz, yalnızca kimlik doğrulama altyapısı ve yasal yükümlülükler çerçevesinde yetkili kamu kurumları ile sınırlı olmak üzere üçüncü taraflarla paylaşılabilir; ticari amaçla satılmaz.',
      },
      {
        heading: '4. KVKK Madde 11 Kapsamındaki Haklarınız',
        body: 'Veri sahibi olarak kişisel verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini talep etme ve kanuna aykırı işleme halinde zararın giderilmesini isteme haklarına sahipsiniz.',
      },
    ],
  },
};

const LEGAL_TABS: { id: LegalPageId; label: string; icon: typeof FileText }[] = [
  { id: 'terms', label: 'Kullanım Koşulları', icon: FileText },
  { id: 'privacy', label: 'Gizlilik Politikası', icon: Lock },
  { id: 'cookies', label: 'Çerez Politikası', icon: Cookie },
  { id: 'kvkk', label: 'KVKK Aydınlatma Metni', icon: ShieldCheck },
];

export function LegalPage({ pageId, onNavigate }: LegalPageProps) {
  const doc = LEGAL_DOCUMENTS[pageId];

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Ana Sayfaya Dön</span>
      </button>

      {/* Quick Switcher between the 4 Legal Pages */}
      <nav
        aria-label="Yasal dokümanlar"
        className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/75 p-2"
      >
        {LEGAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === pageId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#FF7900] text-slate-950'
                  : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <article className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/75 p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF7900]">
          {doc.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
          {doc.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span>Son Güncelleme: {doc.updatedAt}</span>
          <span aria-hidden="true">·</span>
          <span>RMG Garaj Hukuki Altyapı Metni</span>
        </div>

        <p className="mt-6 border-b border-slate-700/60 pb-6 text-base leading-relaxed text-slate-300">
          {doc.summary}
        </p>

        <div className="mt-8 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-lg font-bold text-slate-50">
                {section.heading}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
