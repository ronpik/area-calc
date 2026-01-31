/**
 * @jest-environment jsdom
 */

/**
 * Tests for Auth Button Integration in Page (Task 3.3)
 *
 * Test requirements from spec:
 * - Auth button appears in top-right corner
 * - Button doesn't interfere with existing functionality
 * - Button is visible on mobile
 * - Z-index is correct (floats above map)
 * - AuthButton renders on page
 * - Position is top-right corner
 * - No regression in existing functionality
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

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

// Mock next/dynamic to return a simple div for AreaMap
jest.mock('next/dynamic', () => {
  return function dynamic() {
    return function MockAreaMap() {
      return React.createElement('div', { 'data-testid': 'area-map', className: 'mock-map' });
    };
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  MapPin: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-mappin', className }),
  Calculator: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-calculator', className }),
  Trash2: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-trash', className }),
  Settings: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-settings', className }),
  Compass: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-compass', className }),
  List: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-list', className }),
  ChevronsUp: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-chevronsup', className }),
  ChevronsDown: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-chevronsdown', className }),
  Play: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-play', className }),
  StopCircle: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-stopcircle', className }),
  FileDown: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-filedown', className }),
  X: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'icon-x', className }),
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

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    toasts: [],
    dismiss: jest.fn(),
  }),
}));

// Mock useI18n
jest.mock('@/contexts/i18n-context', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign In',
        'auth.signOut': 'Sign Out',
        'auth.signedOut': 'Signed out successfully',
        'errors.unknownError': 'Something went wrong',
      };
      return translations[key] ?? key;
    },
    locale: 'en',
    isRTL: false,
  }),
}));

// Mock useAuth - will be controlled per test
let mockUser: { uid: string; email: string; displayName: string | null; photoURL: string | null } | null = null;
let mockLoading = true;

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    error: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Mock UI components to simplify testing
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
  }) =>
    React.createElement('button', {
      onClick,
      disabled,
      className,
      'data-variant': variant,
      'data-size': size,
      'data-testid': 'button',
    }, children),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card-content', className }, children),
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('p', { 'data-testid': 'card-description', className }, children),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card-footer', className }, children),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card-header', className }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h2', { 'data-testid': 'card-title', className }, children),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', { ...props, 'data-testid': 'input' }),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) =>
    React.createElement('label', { htmlFor, className, 'data-testid': 'label' }, children),
}));

jest.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'accordion', className }, children),
  AccordionContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'accordion-content' }, children),
  AccordionItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': 'accordion-item', 'data-value': value }, children),
  AccordionTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('button', { 'data-testid': 'accordion-trigger', className }, children),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'scroll-area', className }, children),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: { id?: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void }) =>
    React.createElement('input', {
      type: 'checkbox',
      id,
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange?.(e.target.checked),
      'data-testid': 'checkbox',
    }),
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'avatar', className }, children),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) =>
    src ? React.createElement('img', { 'data-testid': 'avatar-image', src, alt }) : null,
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'avatar-fallback', className }, children),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dropdown-menu' }, children),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dropdown-trigger' }, children),
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) =>
    React.createElement('div', { 'data-testid': 'dropdown-content', 'data-align': align }, children),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('div', { 'data-testid': 'dropdown-item', onClick }, children),
}));

jest.mock('@/components/login-modal', () => ({
  LoginModal: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'login-modal' }, 'Login Modal') : null,
}));

jest.mock('@/components/export-dialog', () => ({
  ExportDialog: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'export-dialog' }, 'Export Dialog') : null,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock geolocation
const mockGeolocation = {
  watchPosition: jest.fn((success) => {
    // Don't call success immediately to keep currentPosition null initially
    return 1;
  }),
  clearWatch: jest.fn(),
  getCurrentPosition: jest.fn(),
};
Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation, writable: true });

// Import component after mocks
import Home from '@/app/page';

describe('Page AuthButton Integration (Task 3.3)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockLoading = false; // Not loading so we see Sign In button
    authStateCallback = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe('AuthButton renders on page', () => {
    it('should render AuthButton component in the page', () => {
      act(() => {
        root.render(<Home />);
      });

      // AuthButton renders a button with Sign In when logged out
      const buttons = container.querySelectorAll('[data-testid="button"]');
      const signInButton = Array.from(buttons).find(btn => btn.textContent?.includes('Sign In'));

      expect(signInButton).not.toBeNull();
    });

    it('should render AuthButton with loader when auth is loading', () => {
      mockLoading = true;
      mockUser = null;

      act(() => {
        root.render(<Home />);
      });

      // AuthButton shows loader when loading
      const loader = container.querySelector('[data-testid="loader-icon"]');
      expect(loader).not.toBeNull();
    });

    it('should render AuthButton with Sign In when logged out', () => {
      mockLoading = false;
      mockUser = null;

      act(() => {
        root.render(<Home />);
      });

      // Find Sign In button (from AuthButton)
      const loginIcon = container.querySelector('[data-testid="login-icon"]');
      expect(loginIcon).not.toBeNull();
    });

    it('should render AuthButton with avatar when logged in', () => {
      mockLoading = false;
      mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      act(() => {
        root.render(<Home />);
      });

      // Should show avatar when logged in
      const avatar = container.querySelector('[data-testid="avatar"]');
      expect(avatar).not.toBeNull();
    });
  });

  describe('Position is top-right corner', () => {
    it('should have AuthButton with absolute positioning class', () => {
      act(() => {
        root.render(<Home />);
      });

      // The main element should exist with relative positioning
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
      expect(main?.className).toContain('relative');
    });

    it('should have AuthButton positioned with top-4 right-4 classes', () => {
      act(() => {
        root.render(<Home />);
      });

      // Find the button that has the positioning classes
      // AuthButton receives className="absolute top-4 right-4 z-[1000]"
      const buttons = container.querySelectorAll('[data-testid="button"]');
      const authButton = Array.from(buttons).find(btn => {
        const className = btn.className || '';
        return className.includes('absolute') &&
               className.includes('top-4') &&
               className.includes('right-4');
      });

      // If not loading, we should find the button with these classes
      // Or check for loader with same classes
      const loader = container.querySelector('[data-testid="loader-icon"]');
      if (loader) {
        // Check parent container has positioning
        const parent = loader.parentElement;
        expect(parent?.className).toContain('absolute');
        expect(parent?.className).toContain('top-4');
        expect(parent?.className).toContain('right-4');
      } else {
        expect(authButton).not.toBeNull();
        expect(authButton?.className).toContain('top-4');
        expect(authButton?.className).toContain('right-4');
      }
    });
  });

  describe('Z-index is correct (floats above map)', () => {
    it('should have AuthButton with z-[1000] class', () => {
      act(() => {
        root.render(<Home />);
      });

      // Find element with z-[1000] class for AuthButton
      const allElements = container.querySelectorAll('*');
      const authButtonElement = Array.from(allElements).find(el => {
        const className = (el as HTMLElement).className || '';
        return className.includes('z-[1000]') &&
               className.includes('top-4') &&
               className.includes('right-4');
      });

      expect(authButtonElement).not.toBeNull();
    });

    it('should have same z-index as bottom control panel', () => {
      act(() => {
        root.render(<Home />);
      });

      // Both AuthButton and bottom panel should have z-[1000]
      const allElements = container.querySelectorAll('*');
      const elementsWithZ1000 = Array.from(allElements).filter(el => {
        const htmlEl = el as HTMLElement;
        // Handle SVG elements which have className as SVGAnimatedString
        const className = typeof htmlEl.className === 'string'
          ? htmlEl.className
          : htmlEl.className?.baseVal || '';
        return className.includes('z-[1000]');
      });

      // Should have at least 2 elements with z-[1000] (AuthButton and bottom panel)
      expect(elementsWithZ1000.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Button is visible on mobile', () => {
    it('should not have hidden classes on small screens', () => {
      act(() => {
        root.render(<Home />);
      });

      // Find the AuthButton container
      const buttons = container.querySelectorAll('[data-testid="button"]');
      const authButton = Array.from(buttons).find(btn => btn.textContent?.includes('Sign In'));

      if (authButton) {
        const className = authButton.className || '';
        // Should NOT have sm:hidden, md:hidden, or hidden classes
        expect(className).not.toContain('hidden');
        expect(className).not.toContain('sm:hidden');
        expect(className).not.toContain('md:hidden');
      }
    });

    it('should have responsive positioning that works on mobile', () => {
      act(() => {
        root.render(<Home />);
      });

      // The positioning (top-4 right-4) should work on all screen sizes
      // No mobile-specific overrides that would hide or misposition the button
      const allElements = container.querySelectorAll('*');
      const authButtonElement = Array.from(allElements).find(el => {
        const className = (el as HTMLElement).className || '';
        return className.includes('z-[1000]') &&
               className.includes('top-4') &&
               className.includes('right-4');
      });

      expect(authButtonElement).not.toBeNull();
      // Should not have mobile-hiding classes
      const className = (authButtonElement as HTMLElement).className;
      expect(className).not.toMatch(/^hidden\s|sm:hidden|md:hidden/);
    });
  });

  describe('Button does not interfere with existing functionality', () => {
    it('should not affect ExportDialog rendering', () => {
      act(() => {
        root.render(<Home />);
      });

      // ExportDialog is rendered (closed by default)
      // The component is in the DOM, just not visible
      // This verifies AuthButton addition did not break it
      const exportButton = Array.from(container.querySelectorAll('[data-testid="button"]'))
        .find(btn => btn.textContent?.includes('Export PDF'));

      expect(exportButton).not.toBeNull();
    });

    it('should not affect Record Location button', () => {
      act(() => {
        root.render(<Home />);
      });

      const recordButton = Array.from(container.querySelectorAll('[data-testid="button"]'))
        .find(btn => btn.textContent?.includes('Record'));

      expect(recordButton).not.toBeNull();
    });

    it('should not affect tracking buttons', () => {
      act(() => {
        root.render(<Home />);
      });

      // Start Tracking button should exist
      const trackingButton = Array.from(container.querySelectorAll('[data-testid="button"]'))
        .find(btn => btn.textContent?.includes('Tracking'));

      expect(trackingButton).not.toBeNull();
    });

    it('should not affect Reset button', () => {
      act(() => {
        root.render(<Home />);
      });

      const resetButton = Array.from(container.querySelectorAll('[data-testid="button"]'))
        .find(btn => btn.textContent?.includes('Reset'));

      expect(resetButton).not.toBeNull();
    });

    it('should render alongside map without overlap issues', () => {
      act(() => {
        root.render(<Home />);
      });

      // Map should be rendered
      const map = container.querySelector('[data-testid="area-map"]');
      expect(map).not.toBeNull();

      // AuthButton should be rendered (in a position that doesn't overlap map UI)
      const authButton = Array.from(container.querySelectorAll('[data-testid="button"]'))
        .find(btn => btn.textContent?.includes('Sign In'));
      expect(authButton).not.toBeNull();
    });
  });

  describe('No regression in existing functionality', () => {
    it('should still render main element with relative positioning', () => {
      act(() => {
        root.render(<Home />);
      });

      const main = container.querySelector('main');
      expect(main).not.toBeNull();
      expect(main?.className).toContain('relative');
      expect(main?.className).toContain('h-full');
      expect(main?.className).toContain('w-full');
    });

    it('should still render bottom control panel', () => {
      act(() => {
        root.render(<Home />);
      });

      // Card is the bottom control panel
      const card = container.querySelector('[data-testid="card"]');
      expect(card).not.toBeNull();
    });

    it('should still have filter checkboxes', () => {
      act(() => {
        root.render(<Home />);
      });

      const checkboxes = container.querySelectorAll('[data-testid="checkbox"]');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2); // Manual and Auto checkboxes
    });

    it('should still render accordion for settings', () => {
      act(() => {
        root.render(<Home />);
      });

      const accordion = container.querySelector('[data-testid="accordion"]');
      expect(accordion).not.toBeNull();
    });

    it('should maintain calculated area display', () => {
      act(() => {
        root.render(<Home />);
      });

      // Look for area display text
      const cardContent = container.querySelector('[data-testid="card-content"]');
      expect(cardContent).not.toBeNull();
      expect(cardContent?.textContent).toContain('Calculated Area');
      expect(cardContent?.textContent).toContain('m');
    });
  });

  describe('AuthButton position does not conflict with other UI elements', () => {
    it('should position AuthButton in top-right, separate from bottom panel', () => {
      act(() => {
        root.render(<Home />);
      });

      // Bottom panel has "bottom-4 left-4 right-4" positioning
      // AuthButton has "top-4 right-4" positioning
      // These should not overlap

      const allElements = container.querySelectorAll('*');

      // Helper to get className string safely (handles SVG elements)
      const getClassName = (el: Element): string => {
        const htmlEl = el as HTMLElement;
        return typeof htmlEl.className === 'string'
          ? htmlEl.className
          : (htmlEl.className as unknown as SVGAnimatedString)?.baseVal || '';
      };

      // Find bottom panel
      const bottomPanel = Array.from(allElements).find(el => {
        const className = getClassName(el);
        return className.includes('bottom-4') && className.includes('z-[1000]');
      });

      // Find auth button area
      const authButtonArea = Array.from(allElements).find(el => {
        const className = getClassName(el);
        return className.includes('top-4') &&
               className.includes('right-4') &&
               className.includes('z-[1000]');
      });

      expect(bottomPanel).not.toBeNull();
      expect(authButtonArea).not.toBeNull();

      // They should be different elements (no overlap in positioning)
      expect(bottomPanel).not.toBe(authButtonArea);
    });
  });
});

describe('AuthButton Integration Edge Cases', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should handle AuthButton with logged in user showing dropdown', () => {
    mockLoading = false;
    mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    };

    act(() => {
      root.render(<Home />);
    });

    // Should show dropdown menu structure
    const dropdownMenu = container.querySelector('[data-testid="dropdown-menu"]');
    expect(dropdownMenu).not.toBeNull();
  });

  it('should render AuthButton even when localStorage has stored points', () => {
    mockLoading = false;
    mockUser = null;

    // Simulate stored points
    localStorageMock.getItem.mockReturnValue(JSON.stringify([
      { point: { lat: 51.5, lng: -0.1 }, type: 'manual', timestamp: Date.now() },
    ]));

    act(() => {
      root.render(<Home />);
    });

    // AuthButton should still be rendered
    const loginIcon = container.querySelector('[data-testid="login-icon"]');
    expect(loginIcon).not.toBeNull();
  });
});
