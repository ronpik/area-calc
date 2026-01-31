export type Locale = 'en' | 'he';

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('he')) return 'he';
  return 'en';
}

export function isRTL(locale: Locale): boolean {
  return locale === 'he';
}
