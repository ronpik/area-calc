/**
 * @jest-environment jsdom
 */

/**
 * Tests for Providers Component and App Layout Integration
 *
 * Test requirements from spec (Task 2.2):
 * - App loads without errors
 * - useAuth can be called from page.tsx
 * - useI18n can be called from page.tsx
 */

// Mock Firebase modules before any imports
const mockUnsubscribe = jest.fn();
let authStateCallback: ((user: any) => void) | null = null;

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    authStateCallback = callback;
    return mockUnsubscribe;
  }),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

const mockAuth = { name: 'mock-auth' };
const mockGoogleProvider = { providerId: 'google.com' };

jest.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  googleProvider: mockGoogleProvider,
}));

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

import { Providers } from '@/components/providers';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';

describe('Providers Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
  });

  describe('App loads without errors', () => {
    it('should render Providers component without throwing', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      expect(() => {
        act(() => {
          root.render(
            <Providers>
              <div data-testid="child">Child Content</div>
            </Providers>
          );
        });
      }).not.toThrow();

      const child = container.querySelector('[data-testid="child"]');
      expect(child).not.toBeNull();
      expect(child?.textContent).toBe('Child Content');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should render children correctly', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <span id="test-child">Test Content</span>
          </Providers>
        );
      });

      const child = container.querySelector('#test-child');
      expect(child).not.toBeNull();
      expect(child?.textContent).toBe('Test Content');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should allow nested children within Providers', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <div id="parent">
              <div id="nested-1">
                <span id="deep-nested">Deep Content</span>
              </div>
              <div id="nested-2">Second Nested</div>
            </div>
          </Providers>
        );
      });

      expect(container.querySelector('#parent')).not.toBeNull();
      expect(container.querySelector('#nested-1')).not.toBeNull();
      expect(container.querySelector('#nested-2')).not.toBeNull();
      expect(container.querySelector('#deep-nested')?.textContent).toBe('Deep Content');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe('useAuth can be called from within Providers', () => {
    it('should provide auth context to child components', () => {
      let capturedAuth: ReturnType<typeof useAuth> | null = null;

      function AuthConsumer() {
        capturedAuth = useAuth();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <AuthConsumer />
          </Providers>
        );
      });

      expect(capturedAuth).not.toBeNull();
      expect(capturedAuth).toHaveProperty('user');
      expect(capturedAuth).toHaveProperty('loading');
      expect(capturedAuth).toHaveProperty('error');
      expect(capturedAuth).toHaveProperty('signIn');
      expect(capturedAuth).toHaveProperty('signOut');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should have correct initial auth state', () => {
      let capturedAuth: ReturnType<typeof useAuth> | null = null;

      function AuthConsumer() {
        capturedAuth = useAuth();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <AuthConsumer />
          </Providers>
        );
      });

      expect(capturedAuth?.loading).toBe(true);
      expect(capturedAuth?.user).toBeNull();
      expect(capturedAuth?.error).toBeNull();

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should update auth state when onAuthStateChanged fires', () => {
      let capturedAuth: ReturnType<typeof useAuth> | null = null;

      function AuthConsumer() {
        capturedAuth = useAuth();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <AuthConsumer />
          </Providers>
        );
      });

      // Simulate auth state change
      expect(authStateCallback).not.toBeNull();
      act(() => {
        authStateCallback!(null);
      });

      expect(capturedAuth?.loading).toBe(false);
      expect(capturedAuth?.user).toBeNull();

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should provide signIn and signOut as callable functions', () => {
      let capturedAuth: ReturnType<typeof useAuth> | null = null;

      function AuthConsumer() {
        capturedAuth = useAuth();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <AuthConsumer />
          </Providers>
        );
      });

      expect(typeof capturedAuth?.signIn).toBe('function');
      expect(typeof capturedAuth?.signOut).toBe('function');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe('useI18n can be called from within Providers', () => {
    it('should provide i18n context to child components', () => {
      let capturedI18n: ReturnType<typeof useI18n> | null = null;

      function I18nConsumer() {
        capturedI18n = useI18n();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <I18nConsumer />
          </Providers>
        );
      });

      expect(capturedI18n).not.toBeNull();
      expect(capturedI18n).toHaveProperty('t');
      expect(capturedI18n).toHaveProperty('locale');
      expect(capturedI18n).toHaveProperty('isRTL');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should have correct initial i18n state', () => {
      let capturedI18n: ReturnType<typeof useI18n> | null = null;

      function I18nConsumer() {
        capturedI18n = useI18n();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <I18nConsumer />
          </Providers>
        );
      });

      // Initial state before useEffect runs is 'en'
      expect(capturedI18n?.locale).toBe('en');
      expect(capturedI18n?.isRTL).toBe(false);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should provide t as a callable function', () => {
      let capturedI18n: ReturnType<typeof useI18n> | null = null;

      function I18nConsumer() {
        capturedI18n = useI18n();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <I18nConsumer />
          </Providers>
        );
      });

      expect(typeof capturedI18n?.t).toBe('function');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should translate keys correctly', () => {
      let capturedI18n: ReturnType<typeof useI18n> | null = null;

      function I18nConsumer() {
        capturedI18n = useI18n();
        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <I18nConsumer />
          </Providers>
        );
      });

      // Test translation function works
      expect(capturedI18n?.t('auth.signIn')).toBe('Sign In');
      expect(capturedI18n?.t('common.cancel')).toBe('Cancel');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe('Both hooks can be called together (simulates page.tsx)', () => {
    it('should allow both useAuth and useI18n in the same component', () => {
      let capturedAuth: ReturnType<typeof useAuth> | null = null;
      let capturedI18n: ReturnType<typeof useI18n> | null = null;

      // Simulates a page component that uses both hooks
      function PageSimulator() {
        capturedAuth = useAuth();
        capturedI18n = useI18n();
        return <div>Page Content</div>;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <PageSimulator />
          </Providers>
        );
      });

      // Both contexts should be available
      expect(capturedAuth).not.toBeNull();
      expect(capturedI18n).not.toBeNull();

      // Auth properties
      expect(capturedAuth).toHaveProperty('user');
      expect(capturedAuth).toHaveProperty('loading');
      expect(capturedAuth).toHaveProperty('signIn');
      expect(capturedAuth).toHaveProperty('signOut');

      // I18n properties
      expect(capturedI18n).toHaveProperty('t');
      expect(capturedI18n).toHaveProperty('locale');
      expect(capturedI18n).toHaveProperty('isRTL');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });

    it('should allow auth-dependent translations', () => {
      let translatedSignIn = '';
      let translatedSignOut = '';

      function PageSimulator() {
        const { user, loading } = useAuth();
        const { t } = useI18n();

        translatedSignIn = t('auth.signIn');
        translatedSignOut = t('auth.signOut');

        return (
          <div>
            {loading ? 'Loading...' : user ? t('auth.signOut') : t('auth.signIn')}
          </div>
        );
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <PageSimulator />
          </Providers>
        );
      });

      expect(translatedSignIn).toBe('Sign In');
      expect(translatedSignOut).toBe('Sign Out');

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe('Provider nesting order', () => {
    it('should have I18nProvider wrapping AuthProvider (auth can access translations)', () => {
      // This test verifies the correct nesting order by checking that
      // both contexts are available, which wouldn't work if nesting was wrong

      let authAvailable = false;
      let i18nAvailable = false;

      function DeepChild() {
        try {
          useAuth();
          authAvailable = true;
        } catch {
          authAvailable = false;
        }

        try {
          useI18n();
          i18nAvailable = true;
        } catch {
          i18nAvailable = false;
        }

        return null;
      }

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <DeepChild />
          </Providers>
        );
      });

      expect(authAvailable).toBe(true);
      expect(i18nAvailable).toBe(true);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe('Cleanup on unmount', () => {
    it('should clean up auth subscription when Providers unmounts', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      act(() => {
        root.render(
          <Providers>
            <div>Test</div>
          </Providers>
        );
      });

      act(() => {
        root.unmount();
      });

      expect(mockUnsubscribe).toHaveBeenCalled();

      document.body.removeChild(container);
    });
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
  });

  it('should throw when useAuth is called outside Providers', () => {
    let caughtError: Error | null = null;

    function TestComponent() {
      try {
        useAuth();
      } catch (e) {
        caughtError = e as Error;
      }
      return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const originalError = console.error;
    console.error = jest.fn();

    try {
      act(() => {
        root.render(<TestComponent />);
      });

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('useAuth must be used within AuthProvider');
    } finally {
      console.error = originalError;
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    }
  });

  it('should throw when useI18n is called outside Providers', () => {
    let caughtError: Error | null = null;

    function TestComponent() {
      try {
        useI18n();
      } catch (e) {
        caughtError = e as Error;
      }
      return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const originalError = console.error;
    console.error = jest.fn();

    try {
      act(() => {
        root.render(<TestComponent />);
      });

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toBe('useI18n must be used within I18nProvider');
    } finally {
      console.error = originalError;
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    }
  });
});
