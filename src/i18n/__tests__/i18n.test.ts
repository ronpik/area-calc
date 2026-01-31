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

  describe('English sessions translations (en.json)', () => {
    it('should have sessions section defined', () => {
      expect(en.sessions).toBeDefined();
    });

    it('should have all basic sessions keys', () => {
      expect(en.sessions.mySessions).toBe('My Sessions');
      expect(en.sessions.saveCurrent).toBe('Save Current');
      expect(en.sessions.noSessions).toBe('No saved sessions yet');
      expect(en.sessions.noSessionsHint).toBe('Start measuring an area and save it to access it later from any device.');
      expect(en.sessions.loadingSessions).toBe('Loading sessions...');
      expect(en.sessions.loadFailed).toBe('Failed to load sessions');
      expect(en.sessions.save).toBe('Save');
      expect(en.sessions.cancel).toBe('Cancel');
    });

    it('should have all save modal keys', () => {
      expect(en.sessions.saveSession).toBe('Save Session');
      expect(en.sessions.saveNewSession).toBe('Save New Session');
      expect(en.sessions.sessionName).toBe('Session Name');
      expect(en.sessions.sessionSaved).toBe('Session saved');
      expect(en.sessions.noPointsToSave).toBe('No points to save');
    });

    it('should have all session actions keys', () => {
      expect(en.sessions.rename).toBe('Rename');
      expect(en.sessions.delete).toBe('Delete');
      expect(en.sessions.load).toBe('Load');
      expect(en.sessions.sessionLoaded).toBe('Loaded {name}');
      expect(en.sessions.sessionDeleted).toBe('Session deleted');
      expect(en.sessions.sessionRenamed).toBe('Session renamed');
    });

    it('should have all confirmation dialog keys', () => {
      expect(en.sessions.deleteConfirmTitle).toBe('Delete "{name}"?');
      expect(en.sessions.deleteConfirmMessage).toBe('This session will be permanently deleted. This cannot be undone.');
      expect(en.sessions.loadConfirmTitle).toBe('Load "{name}"?');
      expect(en.sessions.loadConfirmMessage).toBe('Your current points will be replaced. This cannot be undone.');
    });

    it('should have all session metadata keys with placeholders', () => {
      expect(en.sessions.points).toBe('{count} points');
      expect(en.sessions.area).toContain('{value}');
      expect(en.sessions.area).toContain('m\u00b2'); // m² symbol
      expect(en.sessions.currentSession).toBe('Current: {name}');
    });

    it('should have all session state keys', () => {
      expect(en.sessions.unsavedChanges).toBe('Unsaved changes');
      expect(en.sessions.startNew).toBe('Start new measurement');
    });

    it('should have all update existing session keys', () => {
      expect(en.sessions.updateExisting).toBe('Update "{name}"');
      expect(en.sessions.updateExistingHint).toBe('Save changes to existing session');
      expect(en.sessions.saveAsNew).toBe('Save as New Session');
      expect(en.sessions.saveAsNewHint).toBe('Keep original, create a copy');
    });

    it('should have working on and updated keys', () => {
      expect(en.sessions.workingOn).toBe('You\'re working on "{name}"');
      expect(en.sessions.sessionUpdated).toBe('Session updated');
      expect(en.sessions.defaultName).toBe('Area {n}');
    });

    it('should have correct placeholder parameters in all parameterized keys', () => {
      expect(en.sessions.sessionLoaded).toContain('{name}');
      expect(en.sessions.deleteConfirmTitle).toContain('{name}');
      expect(en.sessions.loadConfirmTitle).toContain('{name}');
      expect(en.sessions.points).toContain('{count}');
      expect(en.sessions.area).toContain('{value}');
      expect(en.sessions.currentSession).toContain('{name}');
      expect(en.sessions.updateExisting).toContain('{name}');
      expect(en.sessions.workingOn).toContain('{name}');
      expect(en.sessions.defaultName).toContain('{n}');
    });

    it('should have session error keys in errors section', () => {
      expect(en.errors.saveFailed).toBe('Failed to save session');
      expect(en.errors.loadFailed).toBe('Failed to load session');
      expect(en.errors.deleteFailed).toBe('Failed to delete session');
      expect(en.errors.renameFailed).toBe('Failed to rename session');
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

  describe('Hebrew sessions translations (he.json)', () => {
    it('should have sessions section defined', () => {
      expect(he.sessions).toBeDefined();
    });

    it('should have all basic sessions keys', () => {
      expect(he.sessions.mySessions).toBe('המדידות שלי');
      expect(he.sessions.saveCurrent).toBe('שמור נוכחי');
      expect(he.sessions.noSessions).toBe('אין מדידות שמורות');
      expect(he.sessions.noSessionsHint).toBeDefined();
      expect(he.sessions.loadingSessions).toBe('טוען מדידות...');
      expect(he.sessions.loadFailed).toBeDefined();
      expect(he.sessions.save).toBe('שמור');
      expect(he.sessions.cancel).toBe('ביטול');
    });

    it('should have all save modal keys', () => {
      expect(he.sessions.saveSession).toBe('שמור מדידה');
      expect(he.sessions.saveNewSession).toBe('שמור מדידה חדשה');
      expect(he.sessions.sessionName).toBe('שם המדידה');
      expect(he.sessions.sessionSaved).toBe('המדידה נשמרה');
      expect(he.sessions.noPointsToSave).toBe('אין נקודות לשמירה');
    });

    it('should have all session actions keys', () => {
      expect(he.sessions.rename).toBe('שנה שם');
      expect(he.sessions.delete).toBe('מחק');
      expect(he.sessions.load).toBe('טען');
      expect(he.sessions.sessionLoaded).toContain('{name}');
      expect(he.sessions.sessionDeleted).toBe('המדידה נמחקה');
      expect(he.sessions.sessionRenamed).toBe('שם המדידה שונה');
    });

    it('should have all confirmation dialog keys with placeholders', () => {
      expect(he.sessions.deleteConfirmTitle).toContain('{name}');
      expect(he.sessions.deleteConfirmMessage).toBeDefined();
      expect(he.sessions.loadConfirmTitle).toContain('{name}');
      expect(he.sessions.loadConfirmMessage).toBeDefined();
    });

    it('should have all session metadata keys with placeholders', () => {
      expect(he.sessions.points).toContain('{count}');
      expect(he.sessions.area).toContain('{value}');
      expect(he.sessions.currentSession).toContain('{name}');
    });

    it('should have all session state keys', () => {
      expect(he.sessions.unsavedChanges).toBe('שינויים לא שמורים');
      expect(he.sessions.startNew).toBe('התחל מדידה חדשה');
    });

    it('should have all update existing session keys', () => {
      expect(he.sessions.updateExisting).toContain('{name}');
      expect(he.sessions.updateExistingHint).toBeDefined();
      expect(he.sessions.saveAsNew).toBe('שמור כמדידה חדשה');
      expect(he.sessions.saveAsNewHint).toBeDefined();
    });

    it('should have working on and updated keys', () => {
      expect(he.sessions.workingOn).toContain('{name}');
      expect(he.sessions.sessionUpdated).toBe('המדידה עודכנה');
      expect(he.sessions.defaultName).toContain('{n}');
    });

    it('should have session error keys in errors section', () => {
      expect(he.errors.saveFailed).toBe('שמירת המדידה נכשלה');
      expect(he.errors.loadFailed).toBe('טעינת המדידה נכשלה');
      expect(he.errors.deleteFailed).toBe('מחיקת המדידה נכשלה');
      expect(he.errors.renameFailed).toBe('שינוי שם המדידה נכשל');
    });

    it('should have matching sessions structure with English translations', () => {
      // Verify both files have the same session keys
      expect(Object.keys(he.sessions).sort()).toEqual(Object.keys(en.sessions).sort());
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

  describe('Session key parameter substitution', () => {
    it('should substitute {name} in sessions.sessionLoaded (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.sessionLoaded', { name: 'Test Session' });
      expect(result).toBe('Loaded Test Session');
    });

    it('should substitute {name} in sessions.sessionLoaded (Hebrew)', () => {
      const t = createTranslator('he');
      const result = t('sessions.sessionLoaded', { name: 'Test Session' });
      expect(result).toBe('נטען: Test Session');
    });

    it('should substitute {name} in sessions.deleteConfirmTitle (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.deleteConfirmTitle', { name: 'My Area' });
      expect(result).toBe('Delete "My Area"?');
    });

    it('should substitute {name} in sessions.loadConfirmTitle (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.loadConfirmTitle', { name: 'My Area' });
      expect(result).toBe('Load "My Area"?');
    });

    it('should substitute {count} in sessions.points (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.points', { count: 5 });
      expect(result).toBe('5 points');
    });

    it('should substitute {count} in sessions.points (Hebrew)', () => {
      const t = createTranslator('he');
      const result = t('sessions.points', { count: 10 });
      expect(result).toBe('10 נקודות');
    });

    it('should substitute {value} in sessions.area (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.area', { value: '123.45' });
      expect(result).toBe('123.45 m\u00b2');
    });

    it('should substitute {value} in sessions.area (Hebrew)', () => {
      const t = createTranslator('he');
      const result = t('sessions.area', { value: '123.45' });
      expect(result).toContain('123.45');
    });

    it('should substitute {name} in sessions.currentSession (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.currentSession', { name: 'Farm Plot' });
      expect(result).toBe('Current: Farm Plot');
    });

    it('should substitute {name} in sessions.currentSession (Hebrew)', () => {
      const t = createTranslator('he');
      const result = t('sessions.currentSession', { name: 'Farm Plot' });
      expect(result).toBe('נוכחי: Farm Plot');
    });

    it('should substitute {name} in sessions.updateExisting (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.updateExisting', { name: 'Garden' });
      expect(result).toBe('Update "Garden"');
    });

    it('should substitute {name} in sessions.workingOn (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.workingOn', { name: 'Backyard' });
      expect(result).toBe('You\'re working on "Backyard"');
    });

    it('should substitute {n} in sessions.defaultName (English)', () => {
      const t = createTranslator('en');
      const result = t('sessions.defaultName', { n: 1 });
      expect(result).toBe('Area 1');
    });

    it('should substitute {n} in sessions.defaultName (Hebrew)', () => {
      const t = createTranslator('he');
      const result = t('sessions.defaultName', { n: 1 });
      expect(result).toBe('שטח 1');
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
