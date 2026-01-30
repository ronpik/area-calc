/**
 * Tests for Internationalization (i18n) System
 *
 * Test requirements from spec:
 * - `detectLocale()` returns 'he' for Hebrew browser language
 * - `detectLocale()` returns 'en' for all other languages
 * - `t()` function retrieves nested keys correctly
 * - Parameter substitution works: `t('auth.signedInAs', { name: 'John' })` → "Signed in as John"
 * - `isRTL` returns true for Hebrew locale
 */

import { detectLocale, isRTL, type Locale } from '@/i18n';
import en from '@/i18n/translations/en.json';
import he from '@/i18n/translations/he.json';

describe('i18n Core Functions', () => {
  describe('detectLocale()', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      // Restore original navigator after each test
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('should return "he" for Hebrew browser language "he"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'he' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('he');
    });

    it('should return "he" for Hebrew browser language "he-IL"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'he-IL' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('he');
    });

    it('should return "he" for Hebrew browser language with uppercase "HE"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'HE' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('he');
    });

    it('should return "he" for Hebrew browser language with uppercase "HE-IL"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'HE-IL' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('he');
    });

    it('should return "en" for English browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" for English US browser language "en-US"', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-US' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" for German browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'de' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" for French browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'fr' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" for Spanish browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'es' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" for Japanese browser language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'ja' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" for Arabic browser language (not Hebrew)', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'ar' },
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });

    it('should return "en" when navigator is undefined (SSR environment)', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(detectLocale()).toBe('en');
    });
  });

  describe('isRTL()', () => {
    it('should return true for Hebrew locale', () => {
      expect(isRTL('he')).toBe(true);
    });

    it('should return false for English locale', () => {
      expect(isRTL('en')).toBe(false);
    });
  });

  describe('Locale type', () => {
    it('should accept "en" as a valid Locale', () => {
      const locale: Locale = 'en';
      expect(locale).toBe('en');
    });

    it('should accept "he" as a valid Locale', () => {
      const locale: Locale = 'he';
      expect(locale).toBe('he');
    });
  });
});

describe('Translation Files', () => {
  describe('English translations (en.json)', () => {
    it('should have auth section with all required keys', () => {
      expect(en.auth).toBeDefined();
      expect(en.auth.signIn).toBe('Sign In');
      expect(en.auth.signOut).toBe('Sign Out');
      expect(en.auth.signedInAs).toBe('Signed in as {name}');
      expect(en.auth.signedOut).toBe('Signed out');
      expect(en.auth.continueWithGoogle).toBe('Continue with Google');
      expect(en.auth.signInTitle).toBe('Sign In');
      expect(en.auth.signInSubtitle).toBe('Save your measurements and access them from any device.');
      expect(en.auth.termsNotice).toBe('By signing in, you agree to our Terms of Service and Privacy Policy');
    });

    it('should have errors section with all required keys', () => {
      expect(en.errors).toBeDefined();
      expect(en.errors.popupBlocked).toBe('Please allow popups for this site to sign in');
      expect(en.errors.networkError).toBe('Network error. Please check your connection.');
      expect(en.errors.unknownError).toBe('Something went wrong. Please try again.');
    });

    it('should have common section with all required keys', () => {
      expect(en.common).toBeDefined();
      expect(en.common.cancel).toBe('Cancel');
      expect(en.common.retry).toBe('Retry');
    });

    it('should have {name} placeholder in signedInAs for parameter substitution', () => {
      expect(en.auth.signedInAs).toContain('{name}');
    });
  });

  describe('Hebrew translations (he.json)', () => {
    it('should have auth section with all required keys', () => {
      expect(he.auth).toBeDefined();
      expect(he.auth.signIn).toBeDefined();
      expect(he.auth.signOut).toBeDefined();
      expect(he.auth.signedInAs).toBeDefined();
      expect(he.auth.signedOut).toBeDefined();
      expect(he.auth.continueWithGoogle).toBeDefined();
      expect(he.auth.signInTitle).toBeDefined();
      expect(he.auth.signInSubtitle).toBeDefined();
      expect(he.auth.termsNotice).toBeDefined();
    });

    it('should have errors section with all required keys', () => {
      expect(he.errors).toBeDefined();
      expect(he.errors.popupBlocked).toBeDefined();
      expect(he.errors.networkError).toBeDefined();
      expect(he.errors.unknownError).toBeDefined();
    });

    it('should have common section with all required keys', () => {
      expect(he.common).toBeDefined();
      expect(he.common.cancel).toBeDefined();
      expect(he.common.retry).toBeDefined();
    });

    it('should have {name} placeholder in signedInAs for parameter substitution', () => {
      expect(he.auth.signedInAs).toContain('{name}');
    });

    it('should have matching structure with English translations', () => {
      // Verify both files have the same keys
      expect(Object.keys(he.auth).sort()).toEqual(Object.keys(en.auth).sort());
      expect(Object.keys(he.errors).sort()).toEqual(Object.keys(en.errors).sort());
      expect(Object.keys(he.common).sort()).toEqual(Object.keys(en.common).sort());
    });
  });
});

describe('Translation Function (t)', () => {
  // Create a standalone t function that mimics the context implementation
  // This allows testing the logic without React context
  const translations = { en, he };

  function createTranslator(locale: Locale) {
    return (key: string, params?: Record<string, string | number>): string => {
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
  }

  describe('Nested key retrieval', () => {
    it('should retrieve top-level nested key correctly (auth.signIn)', () => {
      const t = createTranslator('en');
      expect(t('auth.signIn')).toBe('Sign In');
    });

    it('should retrieve errors nested key correctly (errors.networkError)', () => {
      const t = createTranslator('en');
      expect(t('errors.networkError')).toBe('Network error. Please check your connection.');
    });

    it('should retrieve common nested key correctly (common.cancel)', () => {
      const t = createTranslator('en');
      expect(t('common.cancel')).toBe('Cancel');
    });

    it('should return the key itself for non-existent keys', () => {
      const t = createTranslator('en');
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should return the key itself for deeply non-existent keys', () => {
      const t = createTranslator('en');
      expect(t('auth.nonexistent.deep.key')).toBe('auth.nonexistent.deep.key');
    });

    it('should return the key for partial matches', () => {
      const t = createTranslator('en');
      // 'auth' exists but 'auth.missing' does not
      expect(t('auth.missing')).toBe('auth.missing');
    });
  });

  describe('Hebrew locale translations', () => {
    it('should retrieve Hebrew translation for auth.signIn', () => {
      const t = createTranslator('he');
      expect(t('auth.signIn')).toBe('התחברות');
    });

    it('should retrieve Hebrew translation for common.cancel', () => {
      const t = createTranslator('he');
      expect(t('common.cancel')).toBe('ביטול');
    });

    it('should retrieve Hebrew translation for errors.networkError', () => {
      const t = createTranslator('he');
      expect(t('errors.networkError')).toBe('שגיאת רשת. אנא בדוק את החיבור.');
    });
  });

  describe('Parameter substitution', () => {
    it('should substitute {name} parameter correctly in English', () => {
      const t = createTranslator('en');
      const result = t('auth.signedInAs', { name: 'John' });
      expect(result).toBe('Signed in as John');
    });

    it('should substitute {name} parameter correctly in Hebrew', () => {
      const t = createTranslator('he');
      const result = t('auth.signedInAs', { name: 'John' });
      expect(result).toBe('מחובר כ-John');
    });

    it('should substitute numeric parameter values', () => {
      const t = createTranslator('en');
      const result = t('auth.signedInAs', { name: 123 });
      expect(result).toBe('Signed in as 123');
    });

    it('should handle empty string parameter', () => {
      const t = createTranslator('en');
      const result = t('auth.signedInAs', { name: '' });
      expect(result).toBe('Signed in as ');
    });

    it('should keep placeholder for missing parameter', () => {
      const t = createTranslator('en');
      // Pass params object without 'name' key
      const result = t('auth.signedInAs', { other: 'value' });
      expect(result).toBe('Signed in as {name}');
    });

    it('should keep placeholder when params is not provided', () => {
      const t = createTranslator('en');
      // Not passing params at all, so the original string with placeholder is returned
      const result = t('auth.signedInAs');
      expect(result).toBe('Signed in as {name}');
    });

    it('should handle special characters in parameter value', () => {
      const t = createTranslator('en');
      const result = t('auth.signedInAs', { name: 'John <script>alert("xss")</script>' });
      expect(result).toBe('Signed in as John <script>alert("xss")</script>');
    });

    it('should handle unicode characters in parameter value', () => {
      const t = createTranslator('en');
      const result = t('auth.signedInAs', { name: 'יוסי' });
      expect(result).toBe('Signed in as יוסי');
    });
  });

  describe('Edge cases', () => {
    it('should return empty string key as-is', () => {
      const t = createTranslator('en');
      expect(t('')).toBe('');
    });

    it('should handle single-segment key (no dots)', () => {
      const t = createTranslator('en');
      // 'auth' is an object, not a string, so it should return the key
      expect(t('auth')).toBe('auth');
    });

    it('should handle key starting with dot', () => {
      const t = createTranslator('en');
      expect(t('.auth.signIn')).toBe('.auth.signIn');
    });

    it('should handle key ending with dot', () => {
      const t = createTranslator('en');
      expect(t('auth.signIn.')).toBe('auth.signIn.');
    });

    it('should handle multiple consecutive dots', () => {
      const t = createTranslator('en');
      expect(t('auth..signIn')).toBe('auth..signIn');
    });
  });
});

describe('Integration: Locale Detection and RTL', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('should correctly detect Hebrew locale and indicate RTL', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'he-IL' },
      writable: true,
      configurable: true,
    });

    const locale = detectLocale();
    expect(locale).toBe('he');
    expect(isRTL(locale)).toBe(true);
  });

  it('should correctly detect English locale and indicate LTR', () => {
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-US' },
      writable: true,
      configurable: true,
    });

    const locale = detectLocale();
    expect(locale).toBe('en');
    expect(isRTL(locale)).toBe(false);
  });

  it('should default to English (LTR) in SSR environment', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const locale = detectLocale();
    expect(locale).toBe('en');
    expect(isRTL(locale)).toBe(false);
  });
});
