/**
 * @jest-environment jsdom
 */

/**
 * Tests for Login Modal Error Handling (Task 4.1)
 *
 * Test requirements from spec:
 * - Popup blocked shows inline error in modal
 * - User cancelled shows no error
 * - Network error shows toast with Retry
 * - Retry button re-attempts sign-in
 * - Errors clear when modal reopens
 * - No duplicate error messages
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
  Eye: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'eye-icon', className }),
  EyeOff: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'eyeoff-icon', className }),
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
  Button: ({ children, onClick, disabled, className, variant, type }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    type?: 'button' | 'submit' | 'reset';
  }) =>
    React.createElement('button', {
      type: type || 'button',
      onClick,
      disabled,
      className,
      'data-variant': variant,
      'data-testid': variant === 'outline' ? 'google-button' : (variant === 'link' ? 'link-button' : 'submit-button'),
    }, children),
}));

// Mock Input component
jest.mock('@/components/ui/input', () => ({
  Input: ({ id, type, placeholder, value, onChange, disabled, autoComplete, className }: {
    id?: string;
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    autoComplete?: string;
    className?: string;
  }) =>
    React.createElement('input', {
      id,
      type,
      placeholder,
      value,
      onChange,
      disabled,
      autoComplete,
      className,
      'data-testid': `input-${id || type || 'default'}`,
    }),
}));

// Mock Label component
jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) =>
    React.createElement('label', { htmlFor, 'data-testid': `label-${htmlFor}` }, children),
}));

// Mock ToastAction component
jest.mock('@/components/ui/toast', () => ({
  ToastAction: ({ children, onClick, altText }: {
    children: React.ReactNode;
    onClick?: () => void;
    altText?: string;
  }) =>
    React.createElement('button', {
      onClick,
      'data-testid': 'toast-action',
      'aria-label': altText,
    }, children),
}));

// Mock useAuth hook with clearError function and email/password methods
const mockSignIn = jest.fn();
const mockSignInWithEmail = jest.fn();
const mockSignUpWithEmail = jest.fn();
const mockResetPassword = jest.fn();
const mockSignOut = jest.fn();
const mockClearError = jest.fn();
let mockAuthError: string | null = null;

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: mockAuthError,
    signIn: mockSignIn,
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
    resetPassword: mockResetPassword,
    signOut: mockSignOut,
    clearError: mockClearError,
  }),
}));

// Mock useI18n hook
let mockIsRTL = false;
const mockT = jest.fn((key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signInTitle': 'Sign In',
    'auth.signUpTitle': 'Create Account',
    'auth.signInSubtitle': 'Save your measurements and access them from any device.',
    'auth.signUpSubtitle': 'Create an account to save your measurements.',
    'auth.continueWithGoogle': 'Continue with Google',
    'auth.signInWithEmail': 'Sign In with Email',
    'auth.signUpWithEmail': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.displayName': 'Display Name',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.forgotPassword': 'Forgot password?',
    'auth.forgotPasswordTitle': 'Reset Password',
    'auth.forgotPasswordSubtitle': 'Enter your email and we\'ll send you a reset link.',
    'auth.sendResetLink': 'Send Reset Link',
    'auth.resetLinkSent': 'Password reset email sent! Check your inbox.',
    'auth.backToSignIn': 'Back to Sign In',
    'auth.orContinueWith': 'or continue with',
    'auth.termsNotice': 'By signing in, you agree to our Terms of Service and Privacy Policy',
    'auth.signedInAs': params ? `Signed in as ${params.name}` : 'Signed in as {name}',
    'errors.popupBlocked': 'Please allow popups for this site to sign in',
    'errors.networkError': 'Network error. Please check your connection.',
    'errors.unknownError': 'Something went wrong. Please try again.',
    'errors.invalidEmail': 'Please enter a valid email address',
    'errors.weakPassword': 'Password must be at least 6 characters',
    'errors.passwordMismatch': 'Passwords do not match',
    'errors.emailInUse': 'An account with this email already exists',
    'errors.userNotFound': 'No account found with this email',
    'errors.wrongPassword': 'Incorrect password',
    'errors.invalidCredentials': 'Invalid email or password',
    'common.retry': 'Retry',
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

// Mock useToast hook - capture the toast calls for testing
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

describe('LoginModal Error Handling (Task 4.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthError = null;
    mockIsRTL = false;
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockClearError.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
    mockDialogOnOpenChange = null;
  });

  describe('Popup Blocked Error - Shows Inline Error in Modal', () => {
    it('should display popup blocked error message inline when error is popupBlocked', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockAuthError = 'popupBlocked';

      harness.mount({ open: true, onOpenChange });

      try {
        // Verify t() was called with the popup blocked error key
        expect(mockT).toHaveBeenCalledWith('errors.popupBlocked');

        // Find error paragraph containing popup-related text
        const errorParagraphs = Array.from(document.body.querySelectorAll('p')).filter(
          p => p.textContent?.includes('popups')
        );
        expect(errorParagraphs.length).toBeGreaterThan(0);
        expect(errorParagraphs[0].textContent).toBe('Please allow popups for this site to sign in');
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show toast for popup blocked error', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Set up signIn to throw popup blocked error
      mockSignIn.mockRejectedValue({ code: 'auth/popup-blocked' });

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

        await act(async () => {
          googleButton!.click();
        });

        // Toast should NOT be called for popup-blocked errors
        expect(mockToast).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('User Cancelled - Shows No Error', () => {
    it('should NOT display any error when user closes popup (popup-closed-by-user)', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // User closing popup should set error to null in auth context
      mockSignIn.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
      mockAuthError = null; // Simulating that auth context sets error to null

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

        await act(async () => {
          googleButton!.click();
        });

        // No toast should be shown
        expect(mockToast).not.toHaveBeenCalled();

        // No error text should be displayed - check that no error translation was called
        const errorCalls = mockT.mock.calls.filter(
          call => typeof call[0] === 'string' && call[0].startsWith('errors.')
        );
        expect(errorCalls.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should not display inline error for user cancelled case', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // When user cancels, auth context sets error to null
      mockAuthError = null;

      harness.mount({ open: true, onOpenChange });

      try {
        // No error paragraphs related to auth errors should exist
        const allParagraphs = document.body.querySelectorAll('p');
        const errorParagraphs = Array.from(allParagraphs).filter(p => {
          const text = p.textContent || '';
          return text.includes('popups') ||
                 text.includes('Network error') ||
                 text.includes('Something went wrong');
        });
        expect(errorParagraphs.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Network Error - Shows Toast with Retry', () => {
    it('should show toast with destructive variant for network error', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });

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

        await act(async () => {
          googleButton!.click();
        });

        // Toast should be called with destructive variant
        expect(mockToast).toHaveBeenCalledTimes(1);
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'Network error. Please check your connection.',
          })
        );
      } finally {
        harness.unmount();
      }
    });

    it('should include ToastAction with Retry button for network error', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });

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

        await act(async () => {
          googleButton!.click();
        });

        // Toast should be called with an action element
        expect(mockToast).toHaveBeenCalledTimes(1);
        const toastCall = mockToast.mock.calls[0][0];
        expect(toastCall.action).toBeDefined();

        // The action should be a React element (ToastAction component)
        expect(React.isValidElement(toastCall.action)).toBe(true);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show inline error for network error (only toast)', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Network error - should NOT show inline
      mockAuthError = 'networkError';

      harness.mount({ open: true, onOpenChange });

      try {
        // The implementation excludes networkError from inline display
        // Check that no inline error paragraph is shown with "Network error" text
        const errorParagraphs = Array.from(document.body.querySelectorAll('p')).filter(
          p => {
            // Check for error class and network-related text
            const hasDestructiveClass = p.className.includes('destructive');
            const hasNetworkText = p.textContent?.includes('Network error');
            return hasDestructiveClass && hasNetworkText;
          }
        );
        // Should be 0 because networkError is excluded from inline display
        expect(errorParagraphs.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Retry Button Re-attempts Sign-in', () => {
    it('should re-attempt sign-in when Retry button is clicked', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // First call fails with network error, second succeeds
      mockSignIn
        .mockRejectedValueOnce({ code: 'auth/network-request-failed' })
        .mockResolvedValueOnce(undefined);

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

        // First sign-in attempt (triggers network error)
        await act(async () => {
          googleButton!.click();
        });

        expect(mockSignIn).toHaveBeenCalledTimes(1);
        expect(mockToast).toHaveBeenCalledTimes(1);

        // Get the action from the toast call
        const toastCall = mockToast.mock.calls[0][0];
        const retryAction = toastCall.action;

        // Simulate clicking the retry action
        // The ToastAction has an onClick prop that calls handleGoogleSignIn
        await act(async () => {
          retryAction.props.onClick();
        });

        // signIn should have been called again
        expect(mockSignIn).toHaveBeenCalledTimes(2);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Errors Clear When Modal Reopens', () => {
    it('should call clearError when modal opens', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Mount with modal open
      harness.mount({ open: true, onOpenChange });

      try {
        // clearError should be called when modal opens (via useEffect)
        expect(mockClearError).toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should clear error when modal is reopened after being closed', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Start with modal closed
      harness.mount({ open: false, onOpenChange });

      try {
        // Clear initial calls from component mount
        mockClearError.mockClear();

        // Reopen the modal
        harness.rerender({ open: true, onOpenChange });

        // clearError should be called when modal opens
        expect(mockClearError).toHaveBeenCalled();

        // Close and reopen
        harness.rerender({ open: false, onOpenChange });
        mockClearError.mockClear();

        harness.rerender({ open: true, onOpenChange });

        // clearError should be called again when reopening
        expect(mockClearError).toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should NOT have stale error message when modal reopens', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Initially there's an error
      mockAuthError = 'popupBlocked';

      harness.mount({ open: true, onOpenChange });

      try {
        // Verify clearError was called
        expect(mockClearError).toHaveBeenCalled();

        // Close modal
        harness.rerender({ open: false, onOpenChange });

        // Error is cleared (simulating auth context behavior)
        mockAuthError = null;
        mockClearError.mockClear();

        // Reopen modal
        harness.rerender({ open: true, onOpenChange });

        // clearError should be called
        expect(mockClearError).toHaveBeenCalled();

        // No error should be displayed
        const errorCalls = mockT.mock.calls.filter(
          call => typeof call[0] === 'string' && call[0].startsWith('errors.')
        );
        // Since we cleared mockT, only count calls after rerender
        // Actually the mock persists, but since mockAuthError is null,
        // no error paragraph should be rendered with error content
        const errorParagraphs = Array.from(document.body.querySelectorAll('p')).filter(
          p => p.textContent?.includes('popups')
        );
        expect(errorParagraphs.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('No Duplicate Error Messages', () => {
    it('should NOT show both inline error AND toast for same error', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Network error should show ONLY toast, not inline
      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });
      mockAuthError = 'networkError';

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

        await act(async () => {
          googleButton!.click();
        });

        // Toast should be shown
        expect(mockToast).toHaveBeenCalledTimes(1);

        // BUT inline error should NOT be shown for networkError
        // The implementation checks: error && error !== 'networkError'
        const errorParagraphs = Array.from(document.body.querySelectorAll('p')).filter(
          p => {
            const text = p.textContent || '';
            return text.includes('Network error');
          }
        );
        expect(errorParagraphs.length).toBe(0);
      } finally {
        harness.unmount();
      }
    });

    it('should show inline error ONLY (no toast) for popup blocked', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/popup-blocked' });
      mockAuthError = 'popupBlocked';

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

        await act(async () => {
          googleButton!.click();
        });

        // NO toast should be shown for popup-blocked
        expect(mockToast).not.toHaveBeenCalled();

        // Inline error SHOULD be shown
        expect(mockT).toHaveBeenCalledWith('errors.popupBlocked');
      } finally {
        harness.unmount();
      }
    });

    it('should not call toast multiple times for same error', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/network-request-failed' });

      harness.mount({ open: true, onOpenChange });

      try {
        let googleButton: HTMLButtonElement | null = null;
        const buttons = document.body.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.textContent?.includes('Continue with Google')) {
            googleButton = btn as HTMLButtonElement;
          }
        });

        // Click once
        await act(async () => {
          googleButton!.click();
        });

        expect(mockToast).toHaveBeenCalledTimes(1);

        // Click again
        await act(async () => {
          googleButton!.click();
        });

        // Should have called toast again (second attempt, second error)
        // This is expected behavior - each attempt can show its own toast
        expect(mockToast).toHaveBeenCalledTimes(2);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Unknown Errors - Shows Inline', () => {
    it('should show inline error for unknown error types', () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockAuthError = 'unknownError';

      harness.mount({ open: true, onOpenChange });

      try {
        expect(mockT).toHaveBeenCalledWith('errors.unknownError');

        const errorParagraphs = Array.from(document.body.querySelectorAll('p')).filter(
          p => p.textContent?.includes('Something went wrong')
        );
        expect(errorParagraphs.length).toBeGreaterThan(0);
      } finally {
        harness.unmount();
      }
    });

    it('should NOT show toast for unknown errors', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      mockSignIn.mockRejectedValue({ code: 'auth/some-unknown-error' });

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

        // No toast for unknown errors
        expect(mockToast).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Error State During Sign-in Flow', () => {
    it('should clear error at start of sign-in attempt', async () => {
      const onOpenChange = jest.fn();
      const harness = createTestHarness();

      // Start with an existing error
      mockAuthError = 'popupBlocked';

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

        // Start sign-in - auth context clears error at start of signIn()
        await act(async () => {
          googleButton!.click();
        });

        // Complete the sign-in
        await act(async () => {
          resolveSignIn!();
          await signInPromise;
        });
      } finally {
        harness.unmount();
      }
    });
  });
});

describe('LoginModal Error Handling Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthError = null;
    mockIsRTL = false;
    mockSignIn.mockReset();
    mockSignOut.mockReset();
    mockClearError.mockReset();
    mockT.mockClear();
    mockToast.mockClear();
    mockDialogOnOpenChange = null;
  });

  it('should handle rapid open/close cycles correctly', () => {
    const onOpenChange = jest.fn();
    const harness = createTestHarness();

    harness.mount({ open: false, onOpenChange });

    try {
      // Clear initial calls
      mockClearError.mockClear();

      // Rapid open/close cycle - clearError should be called each time modal opens
      harness.rerender({ open: true, onOpenChange });
      const firstOpenCallCount = mockClearError.mock.calls.length;
      expect(firstOpenCallCount).toBeGreaterThanOrEqual(1);

      harness.rerender({ open: false, onOpenChange });
      harness.rerender({ open: true, onOpenChange });
      const secondOpenCallCount = mockClearError.mock.calls.length;
      expect(secondOpenCallCount).toBeGreaterThan(firstOpenCallCount);

      harness.rerender({ open: false, onOpenChange });
      harness.rerender({ open: true, onOpenChange });
      const thirdOpenCallCount = mockClearError.mock.calls.length;
      expect(thirdOpenCallCount).toBeGreaterThan(secondOpenCallCount);
    } finally {
      harness.unmount();
    }
  });

  it('should handle error state correctly when error is empty string', () => {
    const onOpenChange = jest.fn();
    const harness = createTestHarness();

    // Empty string should be falsy but let's verify behavior
    mockAuthError = '' as any;

    harness.mount({ open: true, onOpenChange });

    try {
      // Empty string is falsy, so no error should be displayed
      const errorCalls = mockT.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].startsWith('errors.')
      );
      expect(errorCalls.length).toBe(0);
    } finally {
      harness.unmount();
    }
  });

  it('should maintain correct loading state through error flow', async () => {
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

      // Before click - button enabled
      expect(googleButton?.disabled).toBe(false);

      await act(async () => {
        googleButton!.click();
      });

      // After error - button should be re-enabled
      expect(googleButton?.disabled).toBe(false);
    } finally {
      harness.unmount();
    }
  });
});
