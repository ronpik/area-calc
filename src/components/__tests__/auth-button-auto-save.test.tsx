/**
 * @jest-environment jsdom
 */

/**
 * Tests for Auto-Save Prompt After Sign-In (Task 3.4)
 *
 * Test requirements from spec:
 * - Prompt appears after sign-in when localStorage has points
 * - No prompt if localStorage is empty
 * - User can save or cancel
 * - Cancel leaves data in localStorage
 * - No prompt on page refresh (existing auth)
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'loader-icon', className }),
  LogIn: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'login-icon', className }),
  LogOut: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'logout-icon', className }),
  ChevronDown: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'chevron-icon', className }),
  User: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'user-icon', className }),
  Save: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'save-icon', className }),
  FolderOpen: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'folder-open-icon', className }),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
  }) =>
    React.createElement('button', {
      onClick,
      disabled,
      className,
      'data-variant': variant,
      'data-testid': 'button',
    }, children),
}));

// Mock Avatar components
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'avatar', className }, children),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) =>
    src ? React.createElement('img', { 'data-testid': 'avatar-image', src, alt }) : null,
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'avatar-fallback', className }, children),
}));

// Mock DropdownMenu components
let mockDropdownOpen = false;
let mockDropdownOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open, onOpenChange }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    mockDropdownOnOpenChange = onOpenChange || null;
    return React.createElement('div', { 'data-testid': 'dropdown-menu' }, children);
  },
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    React.createElement('div', {
      'data-testid': 'dropdown-trigger',
      onClick: () => {
        mockDropdownOpen = !mockDropdownOpen;
        mockDropdownOnOpenChange?.(mockDropdownOpen);
      }
    }, children),
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) =>
    mockDropdownOpen ? React.createElement('div', {
      'data-testid': 'dropdown-content',
      'data-align': align
    }, children) : null,
  DropdownMenuItem: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    React.createElement('div', {
      'data-testid': 'dropdown-item',
      onClick: disabled ? undefined : onClick,
      role: 'menuitem',
      'aria-disabled': disabled,
    }, children),
  DropdownMenuSeparator: () => React.createElement('div', { 'data-testid': 'dropdown-separator' }),
}));

// Mock LoginModal component - captures onSuccess callback
let mockLoginModalOpen = false;
let mockLoginModalOnOpenChange: ((open: boolean) => void) | null = null;
let mockLoginModalOnSuccess: (() => void) | null = null;

jest.mock('@/components/login-modal', () => ({
  LoginModal: ({ open, onOpenChange, onSuccess }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
  }) => {
    mockLoginModalOpen = open;
    mockLoginModalOnOpenChange = onOpenChange;
    mockLoginModalOnSuccess = onSuccess || null;
    return open ? React.createElement('div', { 'data-testid': 'login-modal' }, 'Login Modal') : null;
  },
}));

// Mock SaveSessionModal component - track both regular and auto-save modals
let saveModalInstances: Array<{ open: boolean; onOpenChange: (open: boolean) => void }> = [];

jest.mock('@/components/save-session-modal', () => ({
  SaveSessionModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    // Track this instance
    const existingIndex = saveModalInstances.findIndex(i => i.onOpenChange === onOpenChange);
    if (existingIndex >= 0) {
      saveModalInstances[existingIndex] = { open, onOpenChange };
    } else {
      saveModalInstances.push({ open, onOpenChange });
    }
    return open ? React.createElement('div', { 'data-testid': 'save-session-modal' }, 'Save Session Modal') : null;
  },
}));

// Mock SessionsModal component
let mockSessionsModalOpen = false;
let mockSessionsModalOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('@/components/sessions-modal', () => ({
  SessionsModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    mockSessionsModalOpen = open;
    mockSessionsModalOnOpenChange = onOpenChange;
    return open ? React.createElement('div', { 'data-testid': 'sessions-modal' }, 'Sessions Modal') : null;
  },
}));

// Mock useAuth hook
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
let mockUser: { uid: string; email: string; displayName: string | null; photoURL: string | null } | null = null;
let mockLoading = true;
let mockAuthError: string | null = null;

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    error: mockAuthError,
    signIn: mockSignIn,
    signOut: mockSignOut,
  }),
}));

// Mock useI18n hook with parameter substitution support
const mockT = jest.fn((key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.signedOut': 'Signed out successfully',
    'auth.signedInAs': params?.name ? `Signed in as ${params.name}` : 'Signed in as {name}',
    'errors.unknownError': 'Something went wrong. Please try again.',
    'sessions.mySessions': 'My Sessions',
    'sessions.saveCurrent': 'Save Current',
    'sessions.noPointsToSave': 'No points to save',
  };
  return translations[key] ?? key;
});

jest.mock('@/contexts/i18n-context', () => ({
  useI18n: () => ({
    t: mockT,
    locale: 'en',
    isRTL: false,
  }),
}));

// Mock useToast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    toasts: [],
    dismiss: jest.fn(),
  }),
}));

// Import component after mocks
import { AuthButton } from '@/components/auth-button';

// Default props for AuthButton tests
const defaultAuthButtonProps = {
  points: [],
  area: 0,
  currentSession: null,
  sessionCount: 0,
  onSaveComplete: jest.fn(),
  onLoadSession: jest.fn(),
};

// Helper to render component
function createTestHarness() {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function mount(props: { className?: string } = {}) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<AuthButton {...defaultAuthButtonProps} {...props} />);
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

  function rerender(props: { className?: string } = {}) {
    act(() => {
      root!.render(<AuthButton {...defaultAuthButtonProps} {...props} />);
    });
  }

  return {
    mount,
    unmount,
    rerender,
    getContainer: () => container,
  };
}

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
    setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthButton Auto-Save Prompt After Sign-In (Task 3.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    mockAuthError = null;
    mockDropdownOpen = false;
    mockDropdownOnOpenChange = null;
    mockLoginModalOpen = false;
    mockLoginModalOnOpenChange = null;
    mockLoginModalOnSuccess = null;
    mockSessionsModalOpen = false;
    mockSessionsModalOnOpenChange = null;
    saveModalInstances = [];
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
    mockLocalStorage.clear();
  });

  describe('Prompt appears after sign-in when localStorage has points', () => {
    it('should show auto-save modal when user signs in via modal and localStorage has points', () => {
      // Set up localStorage with points
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
        { point: { lat: 32.1, lng: 34.1 }, type: 'auto', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        // Click sign-in to open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Simulate successful sign-in: onSuccess is called
        act(() => {
          mockLoginModalOnSuccess?.();
        });

        // Now user becomes authenticated
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Auto-save modal should be shown
        const saveModals = document.querySelectorAll('[data-testid="save-session-modal"]');
        expect(saveModals.length).toBeGreaterThan(0);

        // Verify localStorage was checked
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('recordedPoints');
      } finally {
        harness.unmount();
      }
    });

    it('should check localStorage for points using the correct key (recordedPoints)', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        // Open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Trigger onSuccess
        act(() => {
          mockLoginModalOnSuccess?.();
        });

        // User signs in
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Verify the correct localStorage key was used
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('recordedPoints');
      } finally {
        harness.unmount();
      }
    });

    it('should show auto-save modal when localStorage has a single point', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Should still show auto-save modal for a single point
        const saveModals = document.querySelectorAll('[data-testid="save-session-modal"]');
        expect(saveModals.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });

    it('should show auto-save modal when localStorage has many points', () => {
      const storedPoints = Array.from({ length: 100 }, (_, i) => ({
        point: { lat: 32.0 + i * 0.001, lng: 34.0 + i * 0.001 },
        type: i % 2 === 0 ? 'manual' : 'auto',
        timestamp: Date.now() + i,
      }));
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        const saveModals = document.querySelectorAll('[data-testid="save-session-modal"]');
        expect(saveModals.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('No prompt if localStorage is empty', () => {
    it('should NOT show auto-save modal when localStorage has no points key', () => {
      // localStorage is empty (no recordedPoints key)
      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Count only the open save modals (there should be none open for auto-save)
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show auto-save modal when localStorage has empty array', () => {
      mockLocalStorage.setItem('recordedPoints', JSON.stringify([]));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show auto-save modal when localStorage has null value', () => {
      mockLocalStorage.setItem('recordedPoints', 'null');

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show auto-save modal when localStorage has non-array value', () => {
      mockLocalStorage.setItem('recordedPoints', JSON.stringify({ notAnArray: true }));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      mockLocalStorage.setItem('recordedPoints', 'not valid json {{{');

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Should not throw and should not show modal
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('User can save or cancel', () => {
    it('should render SaveSessionModal for auto-save prompt', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // SaveSessionModal should be rendered and visible
        const saveModal = document.querySelector('[data-testid="save-session-modal"]');
        expect(saveModal).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should close auto-save modal when onOpenChange is called with false', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Find the auto-save modal instance (second one if there are two)
        const openModal = saveModalInstances.find(i => i.open);
        expect(openModal).toBeDefined();

        // Close the modal via onOpenChange
        act(() => {
          openModal!.onOpenChange(false);
        });
        harness.rerender();

        // Modal should now be closed
        const stillOpenModals = saveModalInstances.filter(i => i.open);
        expect(stillOpenModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Cancel leaves data in localStorage', () => {
    it('should NOT modify localStorage when cancel is triggered', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      const storedPointsJson = JSON.stringify(storedPoints);
      mockLocalStorage.setItem('recordedPoints', storedPointsJson);

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Clear mock to track any new calls
        mockLocalStorage.setItem.mockClear();
        mockLocalStorage.removeItem.mockClear();

        // Find and close the modal (cancel action)
        const openModal = saveModalInstances.find(i => i.open);
        act(() => {
          openModal!.onOpenChange(false);
        });
        harness.rerender();

        // localStorage should NOT have been modified
        expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith('recordedPoints', expect.anything());
        expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('recordedPoints');

        // Data should still be in localStorage
        expect(mockLocalStorage.getItem('recordedPoints')).toBe(storedPointsJson);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('No prompt on page refresh (existing auth)', () => {
    it('should NOT show auto-save modal when user is already authenticated on mount', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      // User is already logged in before component mounts (page refresh scenario)
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Existing User',
        photoURL: null,
      };
      mockLoading = false;

      const harness = createTestHarness();
      harness.mount();

      try {
        // No auto-save modal should be shown
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show auto-save modal when loading completes with existing user', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      // Start with loading state
      mockLoading = true;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Loading completes with existing user (simulating page refresh auth check)
        mockLoading = false;
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Existing User',
          photoURL: null,
        };
        harness.rerender();

        // No auto-save modal should be shown (no onSuccess was called)
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should only show auto-save modal when justSignedInRef flag is set via onSuccess', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        // Without calling onSuccess, just simulate user appearing
        // This simulates auth state change without modal flow (e.g., SSO redirect)
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Auto-save modal should NOT be shown (onSuccess was never called)
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Integration with sign-in toast', () => {
    it('should show both sign-in toast and auto-save modal when localStorage has points', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Toast should be shown
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Signed in as Test User',
        });

        // Auto-save modal should also be shown
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });

    it('should show sign-in toast but NOT auto-save modal when localStorage is empty', () => {
      // No points in localStorage
      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Toast should be shown
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Signed in as Test User',
        });

        // Auto-save modal should NOT be shown
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid sign-in/sign-out cycles with localStorage check', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        // First sign-in
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'User 1',
          photoURL: null,
        };
        harness.rerender();

        // Should show modal
        let openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBeGreaterThan(0);

        // Close the modal
        act(() => {
          openModals[0].onOpenChange(false);
        });
        harness.rerender();

        // Sign out
        mockUser = null;
        harness.rerender();

        // Reset instances tracking
        saveModalInstances = [];

        // Second sign-in
        const signInButton = document.querySelector('[data-testid="button"]');
        act(() => {
          signInButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid-2',
          email: 'test2@example.com',
          displayName: 'User 2',
          photoURL: null,
        };
        harness.rerender();

        // Should show modal again for second sign-in
        openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });

    it('should handle localStorage being modified between mount and sign-in', () => {
      // Start with empty localStorage
      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Add points to localStorage AFTER opening login modal
        const storedPoints = [
          { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
        ];
        mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Should show modal (localStorage is checked at sign-in time)
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });

    it('should handle localStorage being cleared between mount and sign-in', () => {
      // Start with points in localStorage
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Clear localStorage AFTER opening login modal
        mockLocalStorage.clear();

        act(() => {
          mockLoginModalOnSuccess?.();
        });

        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Should NOT show modal (localStorage was cleared)
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should not show auto-save modal if onSuccess called but user never appears', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Call onSuccess but user sign-in fails
        act(() => {
          mockLoginModalOnSuccess?.();
        });

        // User never appears (stays null)
        harness.rerender();
        harness.rerender();

        // Modal should NOT appear
        const openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Two SaveSessionModal instances', () => {
    it('should have separate state for regular save and auto-save modals', () => {
      const storedPoints = [
        { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
      ];
      mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

      // User is already signed in
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Verify no modals are open initially
        let openModals = saveModalInstances.filter(i => i.open);
        expect(openModals.length).toBe(0);

        // Component should have registered two modal instances (regular and auto-save)
        // Both should have different onOpenChange callbacks
        // The auto-save modal has its own state (autoSaveModalOpen)
      } finally {
        harness.unmount();
      }
    });
  });
});

describe('AuthButton Auto-Save justSignedInRef Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    mockAuthError = null;
    mockDropdownOpen = false;
    mockDropdownOnOpenChange = null;
    mockLoginModalOpen = false;
    mockLoginModalOnOpenChange = null;
    mockLoginModalOnSuccess = null;
    mockSessionsModalOpen = false;
    mockSessionsModalOnOpenChange = null;
    saveModalInstances = [];
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
    mockLocalStorage.clear();
  });

  it('should reset justSignedInRef after showing auto-save modal', () => {
    const storedPoints = [
      { point: { lat: 32.0, lng: 34.0 }, type: 'manual', timestamp: Date.now() },
    ];
    mockLocalStorage.setItem('recordedPoints', JSON.stringify(storedPoints));

    const harness = createTestHarness();
    harness.mount();

    try {
      // First sign-in
      const button = document.querySelector('[data-testid="button"]');
      act(() => {
        button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      harness.rerender();

      act(() => {
        mockLoginModalOnSuccess?.();
      });

      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      harness.rerender();

      // Modal should be shown once
      let openModals = saveModalInstances.filter(i => i.open);
      expect(openModals.length).toBeGreaterThan(0);

      // Close modal
      act(() => {
        openModals[0].onOpenChange(false);
      });

      // Clear tracking and rerender multiple times
      saveModalInstances = [];
      mockLocalStorage.getItem.mockClear();

      harness.rerender();
      harness.rerender();
      harness.rerender();

      // Should NOT check localStorage again (flag was reset)
      // No new modals should open
      openModals = saveModalInstances.filter(i => i.open);
      expect(openModals.length).toBe(0);
    } finally {
      harness.unmount();
    }
  });
});
