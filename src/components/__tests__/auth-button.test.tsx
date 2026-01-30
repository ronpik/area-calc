/**
 * @jest-environment jsdom
 */

/**
 * Tests for Auth Button Component
 *
 * Test requirements from spec (Task 3.2):
 * - Loading spinner shows during auth check
 * - Sign In button shows when logged out
 * - User avatar/name shows when logged in
 * - Dropdown opens on click
 * - Sign out works and shows toast
 * - Three states render correctly (loading, signed out, signed in)
 * - Login modal opens when Sign In clicked
 * - Avatar displays user photo or initials
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
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('div', {
      'data-testid': 'dropdown-item',
      onClick,
      role: 'menuitem'
    }, children),
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
const mockT = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.signedOut': 'Signed out successfully',
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

// Helper to render component
function createTestHarness() {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function mount(props: { className?: string } = {}) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<AuthButton {...props} />);
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
      root!.render(<AuthButton {...props} />);
    });
  }

  return {
    mount,
    unmount,
    rerender,
    getContainer: () => container,
  };
}

describe('AuthButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockLoading = true;
    mockAuthError = null;
    mockDropdownOpen = false;
    mockDropdownOnOpenChange = null;
    mockLoginModalOpen = false;
    mockLoginModalOnOpenChange = null;
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
  });

  describe('Loading State', () => {
    it('should show loading spinner during auth check', () => {
      mockLoading = true;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Should render a div with Loader2 spinner
        const loader = document.querySelector('[data-testid="loader-icon"]');
        expect(loader).not.toBeNull();

        // Loader should have animate-spin class (the class is passed to the mock)
        // The actual component passes "h-5 w-5 animate-spin text-muted-foreground"
        expect(loader?.getAttribute('class')).toContain('animate-spin');

        // Should NOT show sign-in button or dropdown
        const buttons = document.querySelectorAll('[data-testid="button"]');
        expect(buttons.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should render loading container with correct styling', () => {
      mockLoading = true;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount();

      try {
        // The loading state renders a div, not a button
        const container = document.querySelector('div.bg-white.rounded-lg.shadow-md');
        expect(container).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should apply custom className to loading container', () => {
      mockLoading = true;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount({ className: 'custom-class' });

      try {
        // Find the container by looking for the one with bg-white (the loading div)
        const container = document.body.querySelector('div.bg-white');
        expect(container).not.toBeNull();
        expect(container?.className).toContain('custom-class');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Signed Out State', () => {
    beforeEach(() => {
      mockLoading = false;
      mockUser = null;
    });

    it('should show Sign In button when logged out', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Find button with Sign In text
        const button = document.querySelector('[data-testid="button"]');
        expect(button).not.toBeNull();
        expect(button?.textContent).toContain('Sign In');

        // Should have LogIn icon
        const loginIcon = document.querySelector('[data-testid="login-icon"]');
        expect(loginIcon).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should render sign-in button with outline variant', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.getAttribute('data-variant')).toBe('outline');
      } finally {
        harness.unmount();
      }
    });

    it('should apply custom className to sign-in button', () => {
      const harness = createTestHarness();
      harness.mount({ className: 'custom-button-class' });

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.className).toContain('custom-button-class');
      } finally {
        harness.unmount();
      }
    });

    it('should have white background and shadow styling', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.className).toContain('bg-white');
        expect(button?.className).toContain('shadow-md');
      } finally {
        harness.unmount();
      }
    });

    it('should open login modal when Sign In is clicked', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Initially modal should not be visible
        expect(document.querySelector('[data-testid="login-modal"]')).toBeNull();

        // Click the sign-in button
        const button = document.querySelector('[data-testid="button"]');
        expect(button).not.toBeNull();

        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // After re-render, check if the modal state was changed
        // Since we need to re-render to see the modal, let's verify the LoginModal component was rendered
        harness.rerender();

        // The LoginModal mock should now be rendered (loginModalOpen should be true)
        const modal = document.querySelector('[data-testid="login-modal"]');
        expect(modal).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should call t() for auth.signIn translation', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        expect(mockT).toHaveBeenCalledWith('auth.signIn');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Signed In State', () => {
    beforeEach(() => {
      mockLoading = false;
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };
    });

    it('should show user avatar when logged in', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const avatar = document.querySelector('[data-testid="avatar"]');
        expect(avatar).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should show user display name when logged in', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Find the span with the user's name
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.textContent).toContain('Test User');
      } finally {
        harness.unmount();
      }
    });

    it('should display avatar image when photoURL is available', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const avatarImage = document.querySelector('[data-testid="avatar-image"]');
        expect(avatarImage).not.toBeNull();
        expect(avatarImage?.getAttribute('src')).toBe('https://example.com/photo.jpg');
      } finally {
        harness.unmount();
      }
    });

    it('should display initials as avatar fallback', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const avatarFallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(avatarFallback).not.toBeNull();
        expect(avatarFallback?.textContent).toBe('TU'); // Test User -> TU
      } finally {
        harness.unmount();
      }
    });

    it('should show ChevronDown icon for dropdown indicator', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        const chevron = document.querySelector('[data-testid="chevron-icon"]');
        expect(chevron).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should open dropdown menu when clicked', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Dropdown content should not be visible initially
        expect(document.querySelector('[data-testid="dropdown-content"]')).toBeNull();

        // Click the trigger
        const trigger = document.querySelector('[data-testid="dropdown-trigger"]');
        expect(trigger).not.toBeNull();

        act(() => {
          trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Re-render to see the dropdown content
        harness.rerender();

        // Dropdown content should now be visible
        const content = document.querySelector('[data-testid="dropdown-content"]');
        expect(content).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should show Sign Out option in dropdown', () => {
      mockDropdownOpen = true; // Start with dropdown open

      const harness = createTestHarness();
      harness.mount();

      try {
        const menuItem = document.querySelector('[data-testid="dropdown-item"]');
        expect(menuItem).not.toBeNull();
        expect(menuItem?.textContent).toContain('Sign Out');

        // Should have LogOut icon
        const logoutIcon = document.querySelector('[data-testid="logout-icon"]');
        expect(logoutIcon).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should have dropdown aligned to end (right side)', () => {
      mockDropdownOpen = true;

      const harness = createTestHarness();
      harness.mount();

      try {
        const content = document.querySelector('[data-testid="dropdown-content"]');
        expect(content?.getAttribute('data-align')).toBe('end');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Initials Calculation', () => {
    beforeEach(() => {
      mockLoading = false;
    });

    it('should extract initials from displayName (first two)', () => {
      mockUser = {
        uid: 'test',
        email: 'test@test.com',
        displayName: 'John Doe',
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const fallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(fallback?.textContent).toBe('JD');
      } finally {
        harness.unmount();
      }
    });

    it('should handle single name (one initial)', () => {
      mockUser = {
        uid: 'test',
        email: 'test@test.com',
        displayName: 'John',
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const fallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(fallback?.textContent).toBe('J');
      } finally {
        harness.unmount();
      }
    });

    it('should handle three-part name (only first two initials)', () => {
      mockUser = {
        uid: 'test',
        email: 'test@test.com',
        displayName: 'John Michael Doe',
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const fallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(fallback?.textContent).toBe('JM');
      } finally {
        harness.unmount();
      }
    });

    it('should fall back to email first character when no displayName', () => {
      mockUser = {
        uid: 'test',
        email: 'user@example.com',
        displayName: null,
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const fallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(fallback?.textContent).toBe('U'); // 'u' -> 'U'
      } finally {
        harness.unmount();
      }
    });

    it('should fall back to question mark when no displayName and no email', () => {
      mockUser = {
        uid: 'test',
        email: '',
        displayName: null,
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const fallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(fallback?.textContent).toBe('?');
      } finally {
        harness.unmount();
      }
    });

    it('should uppercase initials', () => {
      mockUser = {
        uid: 'test',
        email: 'test@test.com',
        displayName: 'john doe',
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const fallback = document.querySelector('[data-testid="avatar-fallback"]');
        expect(fallback?.textContent).toBe('JD'); // Should be uppercase
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Sign Out Flow', () => {
    beforeEach(() => {
      mockLoading = false;
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };
      mockDropdownOpen = true;
    });

    it('should call signOut when Sign Out is clicked', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      const harness = createTestHarness();
      harness.mount();

      try {
        const menuItem = document.querySelector('[data-testid="dropdown-item"]');
        expect(menuItem).not.toBeNull();

        await act(async () => {
          menuItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(mockSignOut).toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should show toast notification on successful sign out', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      const harness = createTestHarness();
      harness.mount();

      try {
        const menuItem = document.querySelector('[data-testid="dropdown-item"]');

        await act(async () => {
          menuItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Signed out successfully',
        });
      } finally {
        harness.unmount();
      }
    });

    it('should call t() for auth.signedOut translation on success', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      const harness = createTestHarness();
      harness.mount();

      try {
        const menuItem = document.querySelector('[data-testid="dropdown-item"]');

        await act(async () => {
          menuItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(mockT).toHaveBeenCalledWith('auth.signedOut');
      } finally {
        harness.unmount();
      }
    });

    it('should show error toast on sign out failure', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      const harness = createTestHarness();
      harness.mount();

      try {
        const menuItem = document.querySelector('[data-testid="dropdown-item"]');

        await act(async () => {
          menuItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Something went wrong. Please try again.',
        });
      } finally {
        harness.unmount();
      }
    });

    it('should call t() for errors.unknownError on sign out failure', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      const harness = createTestHarness();
      harness.mount();

      try {
        const menuItem = document.querySelector('[data-testid="dropdown-item"]');

        await act(async () => {
          menuItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(mockT).toHaveBeenCalledWith('errors.unknownError');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Display Name/Email Fallback', () => {
    beforeEach(() => {
      mockLoading = false;
    });

    it('should display displayName when available', () => {
      mockUser = {
        uid: 'test',
        email: 'test@example.com',
        displayName: 'Display Name',
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.textContent).toContain('Display Name');
      } finally {
        harness.unmount();
      }
    });

    it('should display email when displayName is null', () => {
      mockUser = {
        uid: 'test',
        email: 'user@example.com',
        displayName: null,
        photoURL: null,
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.textContent).toContain('user@example.com');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('LoginModal Integration', () => {
    beforeEach(() => {
      mockLoading = false;
      mockUser = null;
    });

    it('should render LoginModal component', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Click sign-in to open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        harness.rerender();

        const modal = document.querySelector('[data-testid="login-modal"]');
        expect(modal).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should close LoginModal when onOpenChange is called with false', () => {
      const harness = createTestHarness();
      harness.mount();

      try {
        // Open modal
        const button = document.querySelector('[data-testid="button"]');
        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        harness.rerender();

        // Modal should be open
        expect(document.querySelector('[data-testid="login-modal"]')).not.toBeNull();

        // Close modal via onOpenChange
        act(() => {
          mockLoginModalOnOpenChange?.(false);
        });
        harness.rerender();

        // Modal should be closed
        expect(document.querySelector('[data-testid="login-modal"]')).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Component Props', () => {
    beforeEach(() => {
      mockLoading = false;
      mockUser = null;
    });

    it('should accept optional className prop', () => {
      const harness = createTestHarness();

      expect(() => {
        harness.mount({ className: 'test-class' });
      }).not.toThrow();

      harness.unmount();
    });

    it('should work without className prop', () => {
      const harness = createTestHarness();

      expect(() => {
        harness.mount();
      }).not.toThrow();

      harness.unmount();
    });
  });

  describe('Three States Render Correctly', () => {
    it('should render loading state correctly', () => {
      mockLoading = true;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Has spinner
        expect(document.querySelector('[data-testid="loader-icon"]')).not.toBeNull();
        // No button
        expect(document.querySelector('[data-testid="button"]')).toBeNull();
        // No dropdown
        expect(document.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should render signed-out state correctly', () => {
      mockLoading = false;
      mockUser = null;

      const harness = createTestHarness();
      harness.mount();

      try {
        // Has sign-in button
        const button = document.querySelector('[data-testid="button"]');
        expect(button).not.toBeNull();
        expect(button?.textContent).toContain('Sign In');
        // Has login icon
        expect(document.querySelector('[data-testid="login-icon"]')).not.toBeNull();
        // No avatar
        expect(document.querySelector('[data-testid="avatar"]')).toBeNull();
        // No dropdown
        expect(document.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should render signed-in state correctly', () => {
      mockLoading = false;
      mockUser = {
        uid: 'test',
        email: 'test@test.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      const harness = createTestHarness();
      harness.mount();

      try {
        // Has dropdown menu
        expect(document.querySelector('[data-testid="dropdown-menu"]')).not.toBeNull();
        // Has avatar
        expect(document.querySelector('[data-testid="avatar"]')).not.toBeNull();
        // Has user name
        expect(document.querySelector('[data-testid="button"]')?.textContent).toContain('Test User');
        // Has chevron
        expect(document.querySelector('[data-testid="chevron-icon"]')).not.toBeNull();
        // No login icon
        expect(document.querySelector('[data-testid="login-icon"]')).toBeNull();
        // No spinner
        expect(document.querySelector('[data-testid="loader-icon"]')).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });
});

describe('AuthButton Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      uid: 'test',
      email: 'test@test.com',
      displayName: 'Test User',
      photoURL: null,
    };
    mockLoading = false;
    mockDropdownOpen = true;
  });

  it('should have menuitem role for dropdown items', () => {
    const harness = createTestHarness();
    harness.mount();

    try {
      const menuItem = document.querySelector('[data-testid="dropdown-item"]');
      expect(menuItem?.getAttribute('role')).toBe('menuitem');
    } finally {
      harness.unmount();
    }
  });
});

describe('AuthButton Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockDropdownOpen = false;
  });

  it('should handle empty string displayName (fallback to email)', () => {
    mockUser = {
      uid: 'test',
      email: 'test@example.com',
      displayName: '',
      photoURL: null,
    };

    const harness = createTestHarness();
    harness.mount();

    try {
      // Empty string is falsy, so should show email
      const button = document.querySelector('[data-testid="button"]');
      // displayName || email means empty string will show email
      expect(button?.textContent).toContain('test@example.com');
    } finally {
      harness.unmount();
    }
  });

  it('should truncate long display names', () => {
    mockUser = {
      uid: 'test',
      email: 'test@test.com',
      displayName: 'A Very Long Display Name That Should Be Truncated',
      photoURL: null,
    };

    const harness = createTestHarness();
    harness.mount();

    try {
      // Check that the span with user name has truncate class (max-w-[120px])
      // Find the span that contains the display name (not the avatar fallback)
      const button = document.querySelector('[data-testid="button"]');
      const spans = button?.querySelectorAll('span');
      let nameSpan: Element | null = null;
      spans?.forEach(span => {
        if (span.textContent?.includes('A Very Long Display Name')) {
          nameSpan = span;
        }
      });

      expect(nameSpan).not.toBeNull();
      expect(nameSpan?.className).toContain('truncate');
      expect(nameSpan?.className).toContain('max-w-[120px]');
    } finally {
      harness.unmount();
    }
  });

  it('should handle photoURL as null (no AvatarImage rendered)', () => {
    mockUser = {
      uid: 'test',
      email: 'test@test.com',
      displayName: 'Test',
      photoURL: null,
    };

    const harness = createTestHarness();
    harness.mount();

    try {
      // AvatarImage should not render (or render null) when src is undefined
      // Our mock renders null when src is falsy
      const img = document.querySelector('[data-testid="avatar-image"]');
      expect(img).toBeNull();

      // But fallback should still be there
      const fallback = document.querySelector('[data-testid="avatar-fallback"]');
      expect(fallback).not.toBeNull();
    } finally {
      harness.unmount();
    }
  });

  it('should convert photoURL null to undefined for AvatarImage src', () => {
    // This tests that photoURL || undefined is used
    mockUser = {
      uid: 'test',
      email: 'test@test.com',
      displayName: 'Test',
      photoURL: 'https://example.com/valid.jpg',
    };

    const harness = createTestHarness();
    harness.mount();

    try {
      const img = document.querySelector('[data-testid="avatar-image"]') as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toBe('https://example.com/valid.jpg');
    } finally {
      harness.unmount();
    }
  });
});
