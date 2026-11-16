/**
 * RMG Garaj Ön Yüz Bot Koruması (Görünmez reCAPTCHA v3 / Cloudflare Turnstile Altyapısı)
 *
 * İleride eklenecek tüm iletişim, üyelik, fiyat alarmı ve ilan gönderim formlarında
 * spam ve otomatik bot saldırılarını önlemek için görünmez doğrulama katmanı:
 *
 * 1. Google reCAPTCHA v3 entegrasyonu için:
 *    - index.html <head> içine:
 *      <script src="https://www.google.com/recaptcha/api.js?render=VITE_RECAPTCHA_SITE_KEY" async defer></script>
 *    - Ortam değişkeni: VITE_RECAPTCHA_SITE_KEY
 *    - Form gönderiminden hemen önce:
 *      const token = await window.grecaptcha.execute(siteKey, { action });
 *
 * 2. Cloudflare Turnstile (Invisible Mode) entegrasyonu için:
 *    - index.html <head> içine:
 *      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
 *    - Ortam değişkeni: VITE_TURNSTILE_SITE_KEY
 *    - Görünmez widget alanı: <div id="rmg-invisible-turnstile" data-size="invisible" />
 *    - Backend doğrulaması (server.ts POST rotalarında):
 *      POST https://challenges.cloudflare.com/turnstile/v0/siteverify
 *      veya https://www.google.com/recaptcha/api/siteverify
 */

export type BotProtectionProvider = 'turnstile' | 'recaptcha-v3' | 'none';

export interface BotVerificationResult {
  verified: boolean;
  provider: BotProtectionProvider;
  token: string | null;
}

export function getBotProtectionConfig(): {
  provider: BotProtectionProvider;
  siteKey: string | null;
} {
  const turnstileKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || null;
  if (turnstileKey) {
    return { provider: 'turnstile', siteKey: turnstileKey };
  }

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() || null;
  if (recaptchaKey) {
    return { provider: 'recaptcha-v3', siteKey: recaptchaKey };
  }

  return { provider: 'none', siteKey: null };
}

/**
 * İleride eklenecek formların onSubmit akışında çağrılacak görünmez doğrulama yardımcısı.
 * Şu an site anahtarı tanımlı değilse formu kesintiye uğratmadan hazır altyapıyı döner;
 * anahtar tanımlandığında ilgili sağlayıcıdan token talep edilir.
 */
export async function verifyHumanInteractionToken(
  action: string
): Promise<BotVerificationResult> {
  const { provider, siteKey } = getBotProtectionConfig();

  if (provider === 'none' || !siteKey) {
    // Görünmez CAPTCHA anahtarı (VITE_TURNSTILE_SITE_KEY / VITE_RECAPTCHA_SITE_KEY)
    // eklendiğinde burada otomatik token üretilecek ve backend'e gönderilecektir.
    return {
      verified: true,
      provider: 'none',
      token: null,
    };
  }

  if (provider === 'recaptcha-v3' && typeof window !== 'undefined') {
    const win = window as Window & {
      grecaptcha?: {
        ready: (cb: () => void) => void;
        execute: (key: string, opts: { action: string }) => Promise<string>;
      };
    };

    if (win.grecaptcha) {
      const token = await new Promise<string>((resolve, reject) => {
        win.grecaptcha!.ready(() => {
          win.grecaptcha!.execute(siteKey, { action }).then(resolve).catch(reject);
        });
      });
      return { verified: Boolean(token), provider, token };
    }
  }

  if (provider === 'turnstile' && typeof window !== 'undefined') {
    const win = window as Window & {
      turnstile?: {
        getResponse: (widgetId?: string) => string | undefined;
      };
    };
    const token = win.turnstile?.getResponse() ?? null;
    return {
      verified: true,
      provider,
      token,
    };
  }

  return {
    verified: true,
    provider,
    token: null,
  };
}
