/**
 * @jest-environment jsdom
 */

/**
 * Tests for Auth Context Provider
 *
 * Test requirements from spec:
 * - `loading` is true initially, false after auth check completes
 * - `user` is null when signed out
 * - `user` contains correct properties when signed in
 * - `signIn` calls `signInWithPopup` with correct provider
 * - `signOut` calls Firebase `signOut`
 * - Error codes are mapped correctly (popup-blocked, network error, popup-closed-by-user is silent)
 */

// Mock Firebase modules before any imports
const mockUnsubscribe = jest.fn();
let authStateCallback: ((user: any) => void) | null = null;
const mockSignInWithPopup = jest.fn();
const mockFirebaseSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    authStateCallback = callback;
    return mockUnsubscribe;
  }),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  signOut: (...args: any[]) => mockFirebaseSignOut(...args),
}));

const mockAuth = { name: 'mock-auth' };
const mockGoogleProvider = { providerId: 'google.com' };

jest.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  googleProvider: mockGoogleProvider,
}));

// Import React and testing utilities
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

// Import after mocks are set up
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

// Test helper to capture hook state
interface CapturedState {
  user: ReturnType<typeof useAuth>['user'];
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

function createTestHarness() {
  const states: CapturedState[] = [];
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function TestComponent() {
    const authValue = useAuth();
    // Capture current state on each render
    states.push({
      user: authValue.user,
      loading: authValue.loading,
      error: authValue.error,
      signIn: authValue.signIn,
      signOut: authValue.signOut,
    });
    return null;
  }

  function mount() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
  }

  function unmount() {
    if (root) {
      act(() => {
        root!.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    root = null;
    container = null;
  }

  return {
    mount,
    unmount,
    getStates: () => states,
    getLatestState: () => states[states.length - 1],
    getContainer: () => container,
    getRoot: () => root,
  };
}

describe('Auth Context Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
    mockSignInWithPopup.mockReset();
    mockFirebaseSignOut.mockReset();
  });

  describe('Initial Loading State', () => {
    it('should have loading=true initially before auth check completes', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const initialState = harness.getStates()[0];
        expect(initialState.loading).toBe(true);
      } finally {
        harness.unmount();
      }
    });

    it('should have user=null initially', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const initialState = harness.getStates()[0];
        expect(initialState.user).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should have error=null initially', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const initialState = harness.getStates()[0];
        expect(initialState.error).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Auth State Changes via onAuthStateChanged', () => {
    it('should set loading=false after auth check completes (no user)', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        expect(authStateCallback).not.toBeNull();

        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();
        expect(state.loading).toBe(false);
        expect(state.user).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should set user with correct properties when signed in', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const mockFirebaseUser = {
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: 'https://example.com/photo.jpg',
        };

        expect(authStateCallback).not.toBeNull();

        act(() => {
          authStateCallback!(mockFirebaseUser);
        });

        const state = harness.getLatestState();
        expect(state.loading).toBe(false);
        expect(state.user).not.toBeNull();
        expect(state.user).toEqual({
          uid: 'test-uid-123',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: 'https://example.com/photo.jpg',
        });
      } finally {
        harness.unmount();
      }
    });

    it('should map null email to empty string', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const mockFirebaseUser = {
          uid: 'test-uid',
          email: null,
          displayName: 'User',
          photoURL: null,
        };

        act(() => {
          authStateCallback!(mockFirebaseUser);
        });

        const state = harness.getLatestState();
        expect(state.user?.email).toBe('');
      } finally {
        harness.unmount();
      }
    });

    it('should preserve null displayName and photoURL', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const mockFirebaseUser = {
          uid: 'test-uid',
          email: 'test@test.com',
          displayName: null,
          photoURL: null,
        };

        act(() => {
          authStateCallback!(mockFirebaseUser);
        });

        const state = harness.getLatestState();
        expect(state.user?.displayName).toBeNull();
        expect(state.user?.photoURL).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should subscribe to onAuthStateChanged on mount', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        expect(onAuthStateChanged).toHaveBeenCalledWith(auth, expect.any(Function));
      } finally {
        harness.unmount();
      }
    });

    it('should unsubscribe from onAuthStateChanged on unmount', () => {
      const harness = createTestHarness();
      harness.mount();
      harness.unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('signIn Method', () => {
    it('should call signInWithPopup with correct auth and provider', async () => {
      mockSignInWithPopup.mockResolvedValueOnce({ user: {} });

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();

        await act(async () => {
          await state.signIn();
        });

        expect(mockSignInWithPopup).toHaveBeenCalledWith(auth, googleProvider);
      } finally {
        harness.unmount();
      }
    });

    it('should clear error before attempting sign in', async () => {
      // First call fails with an error
      mockSignInWithPopup.mockRejectedValueOnce({ code: 'auth/unknown' });

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        // First sign in attempt - should set error
        const state1 = harness.getLatestState();
        await act(async () => {
          try {
            await state1.signIn();
          } catch (e) {
            // Expected
          }
        });

        // Verify error is set
        const stateWithError = harness.getLatestState();
        expect(stateWithError.error).toBe('unknownError');

        // Second call succeeds
        mockSignInWithPopup.mockResolvedValueOnce({ user: {} });

        // Second sign in - should clear error first
        const state2 = harness.getLatestState();
        await act(async () => {
          await state2.signIn();
        });

        // Error should be cleared
        const stateAfter = harness.getLatestState();
        expect(stateAfter.error).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('signOut Method', () => {
    it('should call Firebase signOut', async () => {
      mockFirebaseSignOut.mockResolvedValueOnce(undefined);

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!({
            uid: 'test',
            email: 'test@test.com',
            displayName: 'Test',
            photoURL: null,
          });
        });

        const state = harness.getLatestState();

        await act(async () => {
          await state.signOut();
        });

        expect(mockFirebaseSignOut).toHaveBeenCalledWith(auth);
      } finally {
        harness.unmount();
      }
    });

    it('should set error on signOut failure', async () => {
      mockFirebaseSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!({
            uid: 'test',
            email: 'test@test.com',
            displayName: 'Test',
            photoURL: null,
          });
        });

        const state = harness.getLatestState();

        await act(async () => {
          try {
            await state.signOut();
          } catch (e) {
            // Expected
          }
        });

        const errorState = harness.getLatestState();
        expect(errorState.error).toBe('unknownError');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Error Code Mapping', () => {
    it('should map auth/popup-blocked to "popupBlocked"', async () => {
      mockSignInWithPopup.mockRejectedValueOnce({
        code: 'auth/popup-blocked',
      });

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();

        await act(async () => {
          try {
            await state.signIn();
          } catch (e) {
            // Expected
          }
        });

        const errorState = harness.getLatestState();
        expect(errorState.error).toBe('popupBlocked');
      } finally {
        harness.unmount();
      }
    });

    it('should map auth/network-request-failed to "networkError"', async () => {
      mockSignInWithPopup.mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      });

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();

        await act(async () => {
          try {
            await state.signIn();
          } catch (e) {
            // Expected
          }
        });

        const errorState = harness.getLatestState();
        expect(errorState.error).toBe('networkError');
      } finally {
        harness.unmount();
      }
    });

    it('should handle auth/popup-closed-by-user silently (error should be null)', async () => {
      mockSignInWithPopup.mockRejectedValueOnce({
        code: 'auth/popup-closed-by-user',
      });

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();

        await act(async () => {
          try {
            await state.signIn();
          } catch (e) {
            // Expected
          }
        });

        const errorState = harness.getLatestState();
        expect(errorState.error).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should map unknown errors to "unknownError"', async () => {
      mockSignInWithPopup.mockRejectedValueOnce({
        code: 'auth/some-unknown-error',
      });

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();

        await act(async () => {
          try {
            await state.signIn();
          } catch (e) {
            // Expected
          }
        });

        const errorState = harness.getLatestState();
        expect(errorState.error).toBe('unknownError');
      } finally {
        harness.unmount();
      }
    });

    it('should map errors without code to "unknownError"', async () => {
      mockSignInWithPopup.mockRejectedValueOnce(new Error('Generic error'));

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();

        await act(async () => {
          try {
            await state.signIn();
          } catch (e) {
            // Expected
          }
        });

        const errorState = harness.getLatestState();
        expect(errorState.error).toBe('unknownError');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('useAuth Hook Outside Provider', () => {
    it('should throw error when used outside AuthProvider', () => {
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

      // Suppress console.error for this test
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
  });

  describe('Context Value Structure', () => {
    it('should provide all required fields: user, loading, error, signIn, signOut', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const state = harness.getLatestState();

        expect(state).toHaveProperty('user');
        expect(state).toHaveProperty('loading');
        expect(state).toHaveProperty('error');
        expect(state).toHaveProperty('signIn');
        expect(state).toHaveProperty('signOut');

        expect(typeof state.signIn).toBe('function');
        expect(typeof state.signOut).toBe('function');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('signIn re-throws errors', () => {
    it('should re-throw the error after mapping it', async () => {
      const originalError = { code: 'auth/popup-blocked' };
      mockSignInWithPopup.mockRejectedValueOnce(originalError);

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!(null);
        });

        const state = harness.getLatestState();
        let thrownError: any = null;

        await act(async () => {
          try {
            await state.signIn();
          } catch (e) {
            thrownError = e;
          }
        });

        expect(thrownError).toBe(originalError);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('signOut re-throws errors', () => {
    it('should re-throw the error after setting error state', async () => {
      const originalError = new Error('Network failure');
      mockFirebaseSignOut.mockRejectedValueOnce(originalError);

      const harness = createTestHarness();
      harness.mount();

      try {
        act(() => {
          authStateCallback!({
            uid: 'test',
            email: 'test@test.com',
            displayName: null,
            photoURL: null,
          });
        });

        const state = harness.getLatestState();
        let thrownError: any = null;

        await act(async () => {
          try {
            await state.signOut();
          } catch (e) {
            thrownError = e;
          }
        });

        expect(thrownError).toBe(originalError);
      } finally {
        harness.unmount();
      }
    });
  });
});

describe('AuthProvider Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
  });

  it('should render children correctly', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <AuthProvider>
            <div id="child-element">Test Child</div>
          </AuthProvider>
        );
      });

      const child = container.querySelector('#child-element');
      expect(child).not.toBeNull();
      expect(child?.textContent).toBe('Test Child');
    } finally {
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    }
  });

  it('should allow nested children', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <AuthProvider>
            <div id="parent">
              <span id="nested-child">Nested Content</span>
            </div>
          </AuthProvider>
        );
      });

      const nestedChild = container.querySelector('#nested-child');
      expect(nestedChild).not.toBeNull();
      expect(nestedChild?.textContent).toBe('Nested Content');
    } finally {
      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    }
  });
});
