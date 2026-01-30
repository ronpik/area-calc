/**
 * @jest-environment jsdom
 */

/**
 * Tests for Login Modal Component
 *
 * Test requirements from spec (Task 3.1):
 * - Modal opens when `open` is true
 * - Modal closes when X is clicked
 * - Modal closes when clicking outside
 * - Google button shows loading state during sign-in
 * - Error message displays when auth fails
 * - RTL layout applies for Hebrew locale
 * - Modal closes on successful sign-in
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'loader-icon', className }),
  MapPin: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'mappin-icon', className }),
  X: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'x-icon', className }),
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
}));

// Mock Dialog components
let mockDialogOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
    mockDialogOnOpenChange = onOpenChange;
    return open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null;
  },
  DialogContent: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) =>
    React.createElement('div', { role: 'dialog', className, style, 'data-testid': 'dialog-content' },
      children,
      React.createElement('button', {
        type: 'button',
        'data-testid': 'close-button',
        onClick: () => mockDialogOnOpenChange?.(false),
      },
        React.createElement('svg', { 'data-testid': 'x-icon' }),
        React.createElement('span', { className: 'sr-only' }, 'Close')
      )
    ),
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'dialog-header', className }, children),
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h2', { 'data-testid': 'dialog-title', className }, children),
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
      'data-testid': 'google-button',
    }, children),
}));

// Mock useAuth hook
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
let mockAuthError: string | null = null;

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: mockAuthError,
    signIn: mockSignIn,
    signOut: mockSignOut,
  }),
}));

// Mock useI18n hook
let mockIsRTL = false;
const mockT = jest.fn((key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'auth.signInTitle': 'Sign In',
    'auth.signInSubtitle': 'Save your measurements and access them from any device.',
    'auth.continueWithGoogle': 'Continue with Google',
    'auth.termsNotice': 'By signing in, you agree to our Terms of Service and Privacy Policy',
    'auth.signedInAs': params ? `Signed in as ${params.name}` : 'Signed in as {name}',
    'errors.popupBlocked': 'Please allow popups for this site to sign in',
    'errors.networkError': 'Network error. Please check your connection.',
    'errors.unknownError': 'Something went wrong. Please try again.',
  };
  return translations[key] ?? key;
});

jest.mock('@/contexts/i18n-context', () => ({
  useI18n: () => ({
    t: mockT,
    locale: mockIsRTL ? 'he' : 'en',
    isRTL: mockIsRTL,
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
import { LoginModal } from '@/components/login-modal';

// Helper to render component
function createTestHarness() {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function mount(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
  }) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<LoginModal {...props} />);
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

  function rerender(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
  }) {
    act(() => {
      root!.render(<LoginModal {...props} />);
    });
  }

  return {
    mount,
    unmount,
    rerender,
    getContainer: () => container,
  };
}

describe('LoginModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthError = null;
    mockIsRTL = false;
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
  });

  describe('Modal Open/Close Behavior', () => {
    it('should render modal content when open is true', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // Modal content should be visible
        const dialogContent = document.querySelector('[role="dialog"]');
        expect(dialogContent).not.toBeNull();

        // Check for modal title
        const title = document.body.querySelector('h2');
        expect(title?.textContent).toBe('Sign In');

        // Check for Google sign-in button
        const googleButton = document.body.querySelector('button');
        expect(googleButton?.textContent).toContain('Continue with Google');
      } finally {
        harness.unmount();
      }
    });

    it('should not render modal content when open is false', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: false, onOpenChange });

      try {
        // Modal content should not be visible
        const dialogContent = document.querySelector('[role="dialog"]');
        expect(dialogContent).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should call onOpenChange(false) when X button is clicked', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // Find the close button (has sr-only text "Close")
        const closeButton = document.body.querySelector('button[type="button"]');
        // The close button is the one with the X icon (has class for close)
        const allButtons = document.body.querySelectorAll('button');
        let closeBtn: Element | null = null;
        allButtons.forEach(btn => {
          // The close button contains a span with "Close" text
          const srOnlySpan = btn.querySelector('.sr-only');
          if (srOnlySpan?.textContent === 'Close') {
            closeBtn = btn;
          }
        });

        expect(closeBtn).not.toBeNull();

        act(() => {
          closeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(onOpenChange).toHaveBeenCalledWith(false);
      } finally {
        harness.unmount();
      }
    });

    it('should pass onOpenChange to Dialog for handling outside click', () => {
      // Note: The actual overlay click behavior is handled by Radix Dialog component
      // We verify that LoginModal passes onOpenChange to the Dialog, which handles
      // closing on outside click. Our mock captures onOpenChange when Dialog mounts.
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // Verify that mockDialogOnOpenChange was set (Dialog received onOpenChange)
        expect(mockDialogOnOpenChange).not.toBeNull();

        // Simulate what Dialog does when overlay is clicked
        act(() => {
          mockDialogOnOpenChange!(false);
        });

        expect(onOpenChange).toHaveBeenCalledWith(false);
      } finally {
        harness.unmount();
      }
    });

    it('should pass onOpenChange to Dialog for handling Escape key', () => {
      // Note: The actual Escape key behavior is handled by Radix Dialog component
      // We verify that onOpenChange callback is correctly wired up
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // Simulate what Dialog does when Escape is pressed
        act(() => {
          mockDialogOnOpenChange!(false);
        });

        expect(onOpenChange).toHaveBeenCalledWith(false);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Modal Content', () => {
    it('should display sign-in title', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('auth.signInTitle');
        const title = document.body.querySelector('h2');
        expect(title?.textContent).toBe('Sign In');
      } finally {
        harness.unmount();
      }
    });

    it('should display sign-in subtitle', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('auth.signInSubtitle');
        // Find the subtitle paragraph
        const subtitle = Array.from(document.body.querySelectorAll('p')).find(
          p => p.textContent?.includes('Save your measurements')
        );
        expect(subtitle).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should display Google sign-in button with correct text', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('auth.continueWithGoogle');
        const button = document.body.querySelector('button');
        expect(button?.textContent).toContain('Continue with Google');
      } finally {
        harness.unmount();
      }
    });

    it('should display terms notice at the bottom', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('auth.termsNotice');
        const termsNotice = Array.from(document.body.querySelectorAll('p')).find(
          p => p.textContent?.includes('Terms of Service')
        );
        expect(termsNotice).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should display MapPin icon', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // MapPin is rendered as an SVG with lucide-react
        const svgs = document.body.querySelectorAll('svg');
        // There should be at least one SVG (MapPin icon, and potentially the Google logo)
        expect(svgs.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });

    it('should display Google logo SVG in button when not loading', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // Find the Google button and check for its SVG (4 paths for Google logo)
        const buttons = document.body.querySelectorAll('button');
        let googleButton: Element | null = null;
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn;
          }
        });

        expect(googleButton).not.toBeNull();
        const googleSvg = googleButton?.querySelector('svg');
        expect(googleSvg).not.toBeNull();

        // Google logo has 4 paths
        const paths = googleSvg?.querySelectorAll('path');
        expect(paths?.length).toBe(4);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Google Sign-In Button Loading State', () => {
    it('should show loading spinner when sign-in is in progress', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Create a promise that doesn't resolve immediately
      let resolveSignIn: () => void;
      const signInPromise = new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      harness.mount({ open: true, onOpenChange });

      try {
        // Find and click the Google button
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        expect(googleButton).not.toBeNull();

        // Button should not be disabled initially
        expect(googleButton?.disabled).toBe(false);

        // Click the button to start sign-in
        await act(async () => {
          googleButton!.click();
        });

        // Button should now be disabled (loading state)
        expect(googleButton?.disabled).toBe(true);

        // Should show Loader2 spinner (animate-spin class)
        const spinner = googleButton?.querySelector('.animate-spin');
        expect(spinner).not.toBeNull();

        // Resolve the sign-in
        await act(async () => {
          resolveSignIn!();
          await signInPromise;
        });

        // Button should no longer be disabled
        expect(googleButton?.disabled).toBe(false);
      } finally {
        harness.unmount();
      }
    });

    it('should disable Google button during sign-in', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      let resolveSignIn: () => void;
      const signInPromise = new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        // Start sign-in
        await act(async () => {
          googleButton!.click();
        });

        // Verify disabled state
        expect(googleButton?.disabled).toBe(true);

        // Cleanup
        await act(async () => {
          resolveSignIn!();
          await signInPromise;
        });
      } finally {
        harness.unmount();
      }
    });

    it('should re-enable button after sign-in completes (success)', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockResolvedValue(undefined);

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // After successful sign-in, button should be re-enabled
        expect(googleButton?.disabled).toBe(false);
      } finally {
        harness.unmount();
      }
    });

    it('should re-enable button after sign-in fails', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/popup-blocked' });

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // After failed sign-in, button should be re-enabled
        expect(googleButton?.disabled).toBe(false);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Error Display', () => {
    it('should display error message when auth has error', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockAuthError = 'popupBlocked';

      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('errors.popupBlocked');

        // Find error paragraph (has text-destructive class)
        const errorParagraphs = Array.from(document.body.querySelectorAll('p')).filter(
          p => p.className.includes('destructive') || p.textContent?.includes('popups')
        );
        expect(errorParagraphs.length).toBeGreaterThan(0);
        expect(errorParagraphs[0].textContent).toBe('Please allow popups for this site to sign in');
      } finally {
        harness.unmount();
      }
    });

    it('should display network error message', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockAuthError = 'networkError';

      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('errors.networkError');

        const errorParagraph = Array.from(document.body.querySelectorAll('p')).find(
          p => p.textContent?.includes('Network error')
        );
        expect(errorParagraph).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should display unknown error message', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockAuthError = 'unknownError';

      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('errors.unknownError');

        const errorParagraph = Array.from(document.body.querySelectorAll('p')).find(
          p => p.textContent?.includes('Something went wrong')
        );
        expect(errorParagraph).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should not display error message when error is null', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockAuthError = null;

      harness.mount({ open: true, onOpenChange });

      try {
        // Check that no error-related translation was called
        const errorCalls = mockT.mock.calls.filter(
          call => call[0].startsWith('errors.')
        );
        expect(errorCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('RTL Layout for Hebrew Locale', () => {
    it('should apply RTL direction when isRTL is true', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockIsRTL = true;

      harness.mount({ open: true, onOpenChange });

      try {
        const dialogContent = document.querySelector('[role="dialog"]');
        expect(dialogContent).not.toBeNull();

        // Check for rtl class
        expect(dialogContent?.className).toContain('rtl');

        // Check for direction style
        const style = (dialogContent as HTMLElement)?.style;
        expect(style?.direction).toBe('rtl');
      } finally {
        harness.unmount();
      }
    });

    it('should not apply RTL direction when isRTL is false', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockIsRTL = false;

      harness.mount({ open: true, onOpenChange });

      try {
        const dialogContent = document.querySelector('[role="dialog"]');
        expect(dialogContent).not.toBeNull();

        // Should not have rtl class
        expect(dialogContent?.className).not.toContain('rtl');

        // Direction should be ltr
        const style = (dialogContent as HTMLElement)?.style;
        expect(style?.direction).toBe('ltr');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Successful Sign-In Flow', () => {
    it('should close modal on successful sign-in', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockResolvedValue(undefined);

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // Modal should close (onOpenChange called with false)
        expect(onOpenChange).toHaveBeenCalledWith(false);
      } finally {
        harness.unmount();
      }
    });

    it('should show toast notification on successful sign-in', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockResolvedValue(undefined);

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // Toast should be called
        expect(mockToast).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Signed in as'),
          })
        );
      } finally {
        harness.unmount();
      }
    });

    it('should call onSuccess callback on successful sign-in', async () => {
      const onOpenChange = jest.fn();
      const onSuccess = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockResolvedValue(undefined);

      harness.mount({ open: true, onOpenChange, onSuccess });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        expect(onSuccess).toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should not call onSuccess if not provided', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockResolvedValue(undefined);

      // Don't throw error when onSuccess is not provided
      expect(() => {
        harness.mount({ open: true, onOpenChange });
      }).not.toThrow();

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // Should complete without error
        expect(onOpenChange).toHaveBeenCalledWith(false);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Failed Sign-In Flow', () => {
    it('should not close modal on sign-in failure', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/popup-blocked' });

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // Modal should NOT be closed on failure
        // onOpenChange should not have been called with false due to sign-in
        // (It might be called from other interactions, but not from handleGoogleSignIn on failure)
        const closeCalls = onOpenChange.mock.calls.filter(call => call[0] === false);
        expect(closeCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should not show toast on sign-in failure', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/popup-blocked' });

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        // Toast should not be called on failure
        expect(mockToast).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should not call onSuccess on sign-in failure', async () => {
      const onOpenChange = jest.fn();
      const onSuccess = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });

      harness.mount({ open: true, onOpenChange, onSuccess });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        await act(async () => {
          googleButton!.click();
        });

        expect(onSuccess).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Component Props', () => {
    it('should accept open, onOpenChange, and onSuccess props', () => {
      const onOpenChange = jest.fn();
      const onSuccess = jest.fn();
      const harness = createTestHarness();

      expect(() => {
        harness.mount({ open: true, onOpenChange, onSuccess });
      }).not.toThrow();

      harness.unmount();
    });

    it('should work with onSuccess as undefined (optional prop)', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      expect(() => {
        harness.mount({ open: true, onOpenChange });
      }).not.toThrow();

      harness.unmount();
    });
  });

  describe('Dialog Structure', () => {
    it('should render Dialog with DialogContent', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should render DialogHeader with DialogTitle', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        // DialogTitle renders as h2
        const title = document.body.querySelector('h2');
        expect(title).not.toBeNull();
        expect(title?.textContent).toBe('Sign In');
      } finally {
        harness.unmount();
      }
    });

    it('should have max-width of 400px on sm breakpoint', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();
      harness.mount({ open: true, onOpenChange });

      try {
        const dialogContent = document.querySelector('[role="dialog"]');
        expect(dialogContent?.className).toContain('sm:max-w-[400px]');
      } finally {
        harness.unmount();
      }
    });
  });
});

describe('LoginModal Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthError = null;
    mockIsRTL = false;
  });

  it('should have proper dialog role', () => {
    const onOpenChange = jest.fn();
    const harness = createTestHarness();
    harness.mount({ open: true, onOpenChange });

    try {
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
    } finally {
      harness.unmount();
    }
  });

  it('should have close button with screen reader text', () => {
    const onOpenChange = jest.fn();
    const harness = createTestHarness();
    harness.mount({ open: true, onOpenChange });

    try {
      const srOnlyText = document.body.querySelector('.sr-only');
      expect(srOnlyText).not.toBeNull();
      expect(srOnlyText?.textContent).toBe('Close');
    } finally {
      harness.unmount();
    }
  });
});
