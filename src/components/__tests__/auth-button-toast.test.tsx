/**
 * @jest-environment jsdom
 */

/**
 * Tests for Sign-In Success Toast (Task 4.2)
 *
 * Test requirements from spec:
 * - Toast shows after successful sign-in
 * - Toast displays correct user name
 * - Toast doesn't show on page refresh (existing session)
 * - Toast styling matches app theme
 * - Falls back to email if no display name
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

// Mock SaveSessionModal component
let mockSaveModalOpen = false;
let mockSaveModalOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('@/components/save-session-modal', () => ({
  SaveSessionModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    mockSaveModalOpen = open;
    mockSaveModalOnOpenChange = onOpenChange;
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
  onNewSession: jest.fn(),
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

describe('AuthButton Sign-In Success Toast (Task 4.2)', () => {
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
    mockSaveModalOpen = false;
    mockSaveModalOnOpenChange = null;
    mockSessionsModalOpen = false;
    mockSessionsModalOnOpenChange = null;
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
  });

  describe('Toast shows after successful sign-in', () => {
    it('should show toast when user signs in via modal', () => {
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

        // Toast should be shown with user name
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Signed in as Test User',
        });
      } finally {
        harness.unmount();
      }
    });

    it('should call t() with auth.signedInAs and name parameter', () => {
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
          displayName: 'John Doe',
          photoURL: null,
        };
        harness.rerender();

        // Check t() was called with correct key and parameter
        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: 'John Doe' });
      } finally {
        harness.unmount();
      }
    });

    it('should only show toast once per sign-in', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Open modal and trigger onSuccess
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

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

        // Toast should be called once
        const toastCallCount = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        ).length;
        expect(toastCallCount).toBe(1);

        // Trigger another render - toast should not be called again
        mockToast.mockClear();
        harness.rerender();

        const newToastCallCount = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        ).length;
        expect(newToastCallCount).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Toast displays correct user name', () => {
    it('should display displayName in toast when available', () => {
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

        // User with displayName
        mockUser = {
          uid: 'test-uid',
          email: 'user@example.com',
          displayName: 'Jane Smith',
          photoURL: null,
        };
        harness.rerender();

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Signed in as Jane Smith',
        });
      } finally {
        harness.unmount();
      }
    });

    it('should handle Unicode characters in display name', () => {
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
          email: 'user@example.com',
          displayName: 'Jose Garcia',
          photoURL: null,
        };
        harness.rerender();

        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: 'Jose Garcia' });
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Falls back to email if no display name', () => {
    it('should use email when displayName is null', () => {
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
          email: 'john@example.com',
          displayName: null,
          photoURL: null,
        };
        harness.rerender();

        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: 'john@example.com' });
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Signed in as john@example.com',
        });
      } finally {
        harness.unmount();
      }
    });

    it('should use email when displayName is empty string', () => {
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
          email: 'test@test.com',
          displayName: '',
          photoURL: null,
        };
        harness.rerender();

        // Empty string is falsy, so should fall back to email
        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: 'test@test.com' });
      } finally {
        harness.unmount();
      }
    });

    it('should use "User" when both displayName and email are empty', () => {
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
          email: '',
          displayName: null,
          photoURL: null,
        };
        harness.rerender();

        // Should fall back to 'User'
        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: 'User' });
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Toast does not show on page refresh (existing session)', () => {
    it('should NOT show toast when user is already authenticated on mount', () => {
      // Simulate page refresh - user is already logged in
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
        // Toast should NOT be called for existing session
        const signInToastCalls = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        );
        expect(signInToastCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show toast when loading completes with existing user', () => {
      // Start loading
      mockLoading = true;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Loading completes with existing user (page refresh scenario)
        mockLoading = false;
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Existing User',
          photoURL: null,
        };
        harness.rerender();

        // Toast should NOT be shown (no onSuccess was called)
        const signInToastCalls = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        );
        expect(signInToastCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should only show toast when justSignedInRef flag is set via onSuccess', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Without calling onSuccess, just simulate user appearing
        // This simulates auth state change without modal flow
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        // Toast should NOT be shown (onSuccess was never called)
        const signInToastCalls = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        );
        expect(signInToastCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Toast mechanism - dual ref pattern', () => {
    it('should require BOTH prevUser null AND justSignedInRef true to show toast', () => {
      // Start with user already set (prevUserRef will capture this)
      mockUser = {
        uid: 'user-1',
        email: 'first@example.com',
        displayName: 'First User',
        photoURL: null,
      };
      mockLoading = false;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Clear any initial calls
        mockToast.mockClear();

        // Now sign out
        mockUser = null;
        harness.rerender();

        // Open modal while signed out
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Trigger onSuccess
        act(() => {
          mockLoginModalOnSuccess?.();
        });

        // Sign in as new user
        mockUser = {
          uid: 'user-2',
          email: 'second@example.com',
          displayName: 'Second User',
          photoURL: null,
        };
        harness.rerender();

        // Should show toast because:
        // 1. prevUserRef was null (after sign out)
        // 2. justSignedInRef was set by onSuccess
        const signInToastCalls = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        );
        expect(signInToastCalls.length).toBe(1);
      } finally {
        harness.unmount();
      }
    });

    it('should reset justSignedInRef after showing toast', () => {
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

        // First toast should be shown
        expect(mockToast).toHaveBeenCalledTimes(1);

        // Clear and trigger multiple rerenders
        mockToast.mockClear();
        harness.rerender();
        harness.rerender();
        harness.rerender();

        // No additional toasts should be shown (flag was reset)
        expect(mockToast).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Toast styling matches app theme', () => {
    it('should call toast without variant (default styling)', () => {
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

        // Toast should be called with only title, no variant (uses default)
        expect(mockToast).toHaveBeenCalledWith({
          title: expect.any(String),
        });

        // Should NOT have destructive variant
        const toastCall = mockToast.mock.calls[0][0];
        expect(toastCall.variant).toBeUndefined();
      } finally {
        harness.unmount();
      }
    });

    it('should pass title as only content (no description)', () => {
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

        const toastCall = mockToast.mock.calls[0][0];
        expect(toastCall.title).toBeDefined();
        expect(toastCall.description).toBeUndefined();
        expect(toastCall.action).toBeUndefined();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('LoginModal onSuccess callback integration', () => {
    it('should pass onSuccess callback to LoginModal', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // onSuccess should be captured
        expect(mockLoginModalOnSuccess).not.toBeNull();
        expect(typeof mockLoginModalOnSuccess).toBe('function');
      } finally {
        harness.unmount();
      }
    });

    it('should set justSignedInRef to true when onSuccess is called', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Call onSuccess
        act(() => {
          mockLoginModalOnSuccess?.();
        });

        // Now when user appears, toast should show (proving flag was set)
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        };
        harness.rerender();

        expect(mockToast).toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid sign-in/sign-out cycles', () => {
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

        // First toast
        expect(mockToast).toHaveBeenCalledTimes(1);
        mockToast.mockClear();

        // Sign out
        mockUser = null;
        harness.rerender();

        // Second sign-in (need to open modal again)
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

        // Second toast should show
        const signInToastCalls = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        );
        expect(signInToastCalls.length).toBe(1);
        expect(signInToastCalls[0][0].title).toBe('Signed in as User 2');
      } finally {
        harness.unmount();
      }
    });

    it('should not show toast if onSuccess called but user never appears', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Call onSuccess (sets flag)
        act(() => {
          mockLoginModalOnSuccess?.();
        });

        // But user never signs in (maybe cancelled or error)
        harness.rerender();
        harness.rerender();

        // No toast should show (user is still null)
        const signInToastCalls = mockToast.mock.calls.filter(
          call => call[0]?.title?.includes?.('Signed in as')
        );
        expect(signInToastCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should handle user with very long display name', () => {
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

        const longName = 'A'.repeat(100);
        mockUser = {
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: longName,
          photoURL: null,
        };
        harness.rerender();

        // Toast should still show with full name
        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: longName });
      } finally {
        harness.unmount();
      }
    });

    it('should handle special characters in display name', () => {
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
          displayName: 'O\'Connor & Sons <test>',
          photoURL: null,
        };
        harness.rerender();

        expect(mockT).toHaveBeenCalledWith('auth.signedInAs', { name: 'O\'Connor & Sons <test>' });
      } finally {
        harness.unmount();
      }
    });
  });
});
