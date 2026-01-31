/**
 * @jest-environment jsdom
 */

/**
 * Tests for "My Sessions" Menu Item in AuthButton (Task 3.3)
 *
 * Test requirements from spec:
 * - "My Sessions" appears in dropdown when signed in
 * - Only show when signed in
 * - Position above "Save Current"
 * - Opens sessions modal on click
 * - onLoadSession callback is passed to SessionsModal
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
      'aria-disabled': disabled ? 'true' : 'false',
      'data-disabled': disabled ? 'true' : 'false',
    }, children),
  DropdownMenuSeparator: () => React.createElement('div', { 'data-testid': 'dropdown-separator' }),
}));

// Mock LoginModal component
let mockLoginModalOpen = false;
let mockLoginModalOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('@/components/login-modal', () => ({
  LoginModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    mockLoginModalOpen = open;
    mockLoginModalOnOpenChange = onOpenChange;
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

// Mock SessionsModal component - captures all props for verification
let mockSessionsModalOpen = false;
let mockSessionsModalOnOpenChange: ((open: boolean) => void) | null = null;
let mockSessionsModalProps: {
  open?: boolean;
  onLoadSession?: (session: any, meta: any) => void;
  hasCurrentPoints?: boolean;
} = {};

jest.mock('@/components/sessions-modal', () => ({
  SessionsModal: ({
    open,
    onOpenChange,
    onLoadSession,
    hasCurrentPoints,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLoadSession: (session: any, meta: any) => void;
    hasCurrentPoints: boolean;
  }) => {
    mockSessionsModalOpen = open;
    mockSessionsModalOnOpenChange = onOpenChange;
    mockSessionsModalProps = { open, onLoadSession, hasCurrentPoints };
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

// Mock useI18n hook
const mockT = jest.fn((key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.signedOut': 'Signed out successfully',
    'sessions.saveCurrent': 'Save Current',
    'sessions.mySessions': 'My Sessions',
    'sessions.noPointsToSave': 'No points to save',
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
import type { TrackedPoint } from '@/app/page';
import type { CurrentSessionState } from '@/types/session';

// Test data
const createTestPoints = (count: number): TrackedPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    point: { lat: 51.5 + i * 0.001, lng: -0.1 + i * 0.001 },
    type: 'manual' as const,
    timestamp: Date.now() + i * 1000,
  }));
};

// Helper to render component
function createTestHarness() {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function mount(props: {
    className?: string;
    points?: TrackedPoint[];
    area?: number;
    currentSession?: CurrentSessionState | null;
    sessionCount?: number;
    onSaveComplete?: (session: CurrentSessionState) => void;
    onLoadSession?: (session: any, meta: any) => void;
  } = {}) {
    const defaultProps = {
      points: [],
      area: 0,
      currentSession: null,
      sessionCount: 0,
      onSaveComplete: jest.fn(),
      onLoadSession: jest.fn(),
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<AuthButton {...defaultProps} {...props} />);
    });

    return { ...defaultProps, ...props };
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

  function rerender(props: {
    className?: string;
    points?: TrackedPoint[];
    area?: number;
    currentSession?: CurrentSessionState | null;
    sessionCount?: number;
    onSaveComplete?: (session: CurrentSessionState) => void;
    onLoadSession?: (session: any, meta: any) => void;
  } = {}) {
    const defaultProps = {
      points: [],
      area: 0,
      currentSession: null,
      sessionCount: 0,
      onSaveComplete: jest.fn(),
      onLoadSession: jest.fn(),
    };
    act(() => {
      root!.render(<AuthButton {...defaultProps} {...props} />);
    });
  }

  return {
    mount,
    unmount,
    rerender,
    getContainer: () => container,
  };
}

describe('AuthButton My Sessions Menu Item (Task 3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    mockAuthError = null;
    mockDropdownOpen = false;
    mockDropdownOnOpenChange = null;
    mockLoginModalOpen = false;
    mockLoginModalOnOpenChange = null;
    mockSaveModalOpen = false;
    mockSaveModalOnOpenChange = null;
    mockSessionsModalOpen = false;
    mockSessionsModalOnOpenChange = null;
    mockSessionsModalProps = {};
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
  });

  describe('My Sessions appears in dropdown when signed in', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should show My Sessions menu item in dropdown', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        expect(mySessionsItem).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should show FolderOpen icon in My Sessions menu item', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const folderIcon = document.querySelector('[data-testid="folder-open-icon"]');
        expect(folderIcon).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should call t() for sessions.mySessions translation', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        expect(mockT).toHaveBeenCalledWith('sessions.mySessions');
      } finally {
        harness.unmount();
      }
    });

    it('should show My Sessions as first item in dropdown', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const itemTexts = Array.from(dropdownItems).map(item => item.textContent);

        // My Sessions should be first (index 0)
        expect(itemTexts[0]).toContain('My Sessions');
      } finally {
        harness.unmount();
      }
    });

    it('should show My Sessions before Save Current in dropdown', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const itemTexts = Array.from(dropdownItems).map(item => item.textContent);

        const mySessionsIndex = itemTexts.findIndex(text => text?.includes('My Sessions'));
        const saveCurrentIndex = itemTexts.findIndex(text => text?.includes('Save Current'));

        expect(mySessionsIndex).toBeLessThan(saveCurrentIndex);
        expect(mySessionsIndex).toBe(0); // My Sessions is first
        expect(saveCurrentIndex).toBe(1); // Save Current is second
      } finally {
        harness.unmount();
      }
    });

    it('should NOT be disabled (always enabled)', () => {
      const harness = createTestHarness();
      harness.mount({ points: [], area: 0 }); // Even with no points

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        // My Sessions should NOT be disabled even with no points
        expect(mySessionsItem?.getAttribute('data-disabled')).toBe('false');
        expect(mySessionsItem?.getAttribute('aria-disabled')).toBe('false');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Only show when signed in', () => {
    it('should NOT show My Sessions when signed out', () => {
      mockUser = null;
      mockLoading = false;

      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // When signed out, there's no dropdown menu
        const dropdownMenu = document.querySelector('[data-testid="dropdown-menu"]');
        expect(dropdownMenu).toBeNull();

        // Just the Sign In button
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.textContent).toContain('Sign In');
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show My Sessions during loading state', () => {
      mockUser = null;
      mockLoading = true;

      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // When loading, there's no dropdown menu
        const dropdownMenu = document.querySelector('[data-testid="dropdown-menu"]');
        expect(dropdownMenu).toBeNull();

        // Just the loader
        const loader = document.querySelector('[data-testid="loader-icon"]');
        expect(loader).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Opens sessions modal on click', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should open sessions modal when My Sessions is clicked', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // Initially modal should not be visible
        expect(document.querySelector('[data-testid="sessions-modal"]')).toBeNull();

        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Re-render to see the modal
        harness.rerender({ points: createTestPoints(3), area: 100 });

        // Modal should now be visible
        const modal = document.querySelector('[data-testid="sessions-modal"]');
        expect(modal).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should set sessionsModalOpen to true when My Sessions is clicked', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({ points: createTestPoints(3), area: 100 });

        expect(mockSessionsModalOpen).toBe(true);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('SessionsModal receives correct props', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should pass onLoadSession callback to SessionsModal', () => {
      const mockOnLoadSession = jest.fn();
      const harness = createTestHarness();
      harness.mount({
        points: createTestPoints(3),
        area: 100,
        onLoadSession: mockOnLoadSession,
      });

      try {
        // Open the modal
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({
          points: createTestPoints(3),
          area: 100,
          onLoadSession: mockOnLoadSession,
        });

        // Verify onLoadSession is passed to SessionsModal
        expect(mockSessionsModalProps.onLoadSession).toBe(mockOnLoadSession);
      } finally {
        harness.unmount();
      }
    });

    it('should pass hasCurrentPoints as true when points exist', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(5), area: 200 });

      try {
        // Open the modal
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({ points: createTestPoints(5), area: 200 });

        expect(mockSessionsModalProps.hasCurrentPoints).toBe(true);
      } finally {
        harness.unmount();
      }
    });

    it('should pass hasCurrentPoints as false when no points', () => {
      const harness = createTestHarness();
      harness.mount({ points: [], area: 0 });

      try {
        // Open the modal
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({ points: [], area: 0 });

        expect(mockSessionsModalProps.hasCurrentPoints).toBe(false);
      } finally {
        harness.unmount();
      }
    });

    it('should pass onOpenChange callback to SessionsModal', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // Open the modal
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({ points: createTestPoints(3), area: 100 });

        // onOpenChange should be a function
        expect(typeof mockSessionsModalOnOpenChange).toBe('function');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('onLoadSession callback integration', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should pass onLoadSession to modal which can call it', () => {
      const mockOnLoadSession = jest.fn();
      const harness = createTestHarness();
      harness.mount({
        points: createTestPoints(3),
        area: 100,
        onLoadSession: mockOnLoadSession,
      });

      try {
        // Open modal
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({
          points: createTestPoints(3),
          area: 100,
          onLoadSession: mockOnLoadSession,
        });

        // Simulate modal calling onLoadSession
        const sessionData = {
          id: 'session-123',
          name: 'Loaded Session',
          points: createTestPoints(5),
          area: 500,
          updatedAt: new Date().toISOString(),
        };
        const sessionMeta = {
          id: 'session-123',
          name: 'Loaded Session',
          pointCount: 5,
          area: 500,
          updatedAt: new Date().toISOString(),
        };

        act(() => {
          mockSessionsModalProps.onLoadSession?.(sessionData, sessionMeta);
        });

        expect(mockOnLoadSession).toHaveBeenCalledWith(sessionData, sessionMeta);
      } finally {
        harness.unmount();
      }
    });

    it('should close modal via onOpenChange after load', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // Open modal
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({ points: createTestPoints(3), area: 100 });

        // Modal should be open
        expect(mockSessionsModalOpen).toBe(true);

        // Simulate modal closing via onOpenChange
        act(() => {
          mockSessionsModalOnOpenChange?.(false);
        });

        harness.rerender({ points: createTestPoints(3), area: 100 });

        // Modal should be closed
        expect(document.querySelector('[data-testid="sessions-modal"]')).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Menu structure', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should have menu items in correct order: My Sessions, Save Current, separator, Sign Out', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const itemTexts = Array.from(dropdownItems).map(item => item.textContent);

        expect(itemTexts.length).toBe(3);
        expect(itemTexts[0]).toContain('My Sessions');
        expect(itemTexts[1]).toContain('Save Current');
        expect(itemTexts[2]).toContain('Sign Out');

        // Check for separator
        const separator = document.querySelector('[data-testid="dropdown-separator"]');
        expect(separator).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should show all three menu items with correct icons', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // FolderOpen for My Sessions
        const folderIcon = document.querySelector('[data-testid="folder-open-icon"]');
        expect(folderIcon).not.toBeNull();

        // Save for Save Current
        const saveIcon = document.querySelector('[data-testid="save-icon"]');
        expect(saveIcon).not.toBeNull();

        // LogOut for Sign Out
        const logoutIcon = document.querySelector('[data-testid="logout-icon"]');
        expect(logoutIcon).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should handle rapid open/close of sessions modal', () => {
      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        // Open modal
        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender({ points: createTestPoints(3), area: 100 });
        expect(mockSessionsModalOpen).toBe(true);

        // Close modal
        act(() => {
          mockSessionsModalOnOpenChange?.(false);
        });
        harness.rerender({ points: createTestPoints(3), area: 100 });

        // Open again
        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender({ points: createTestPoints(3), area: 100 });
        expect(mockSessionsModalOpen).toBe(true);
      } finally {
        harness.unmount();
      }
    });

    it('should work with empty points array', () => {
      const harness = createTestHarness();
      harness.mount({ points: [], area: 0 });

      try {
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        // Should still be able to click My Sessions
        expect(mySessionsItem).not.toBeNull();

        act(() => {
          mySessionsItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender({ points: [], area: 0 });

        expect(mockSessionsModalOpen).toBe(true);
        expect(mockSessionsModalProps.hasCurrentPoints).toBe(false);
      } finally {
        harness.unmount();
      }
    });

    it('should handle user with no display name', () => {
      mockUser = {
        uid: 'test-uid',
        email: 'user@example.com',
        displayName: null,
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount({ points: createTestPoints(3), area: 100 });

      try {
        // My Sessions should still appear in dropdown
        const dropdownItems = document.querySelectorAll('[data-testid="dropdown-item"]');
        const mySessionsItem = Array.from(dropdownItems).find(
          item => item.textContent?.includes('My Sessions')
        );

        expect(mySessionsItem).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });
});
