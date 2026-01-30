'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectLocale, isRTL, type Locale } from '@/i18n';
import en from '@/i18n/translations/en.json';
import he from '@/i18n/translations/he.json';

const translations = { en, he };

interface I18nContextType {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ t, locale, isRTL: isRTL(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
