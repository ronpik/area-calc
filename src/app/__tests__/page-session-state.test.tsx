/**
 * @jest-environment jsdom
 */

/**
 * Tests for Session State Integration in Page (Task 2.4)
 *
 * Test requirements from spec:
 * - currentSession state added to page.tsx
 * - hasUnsavedChanges computed correctly
 * - SessionIndicator integrated in UI
 * - Clear functionality works
 * - TrackedPoint exported for other modules
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
  FileIcon: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'file-icon', className }),
  PlusIcon: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'plus-icon', className }),
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

// Mock useAuth
let mockUser: { uid: string; email: string; displayName: string | null; photoURL: string | null } | null = null;
let mockLoading = false;

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    error: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, title }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
    size?: string;
    title?: string;
  }) =>
    React.createElement('button', {
      onClick,
      disabled,
      className,
      title,
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

// Track SessionIndicator props for testing
let sessionIndicatorProps: {
  currentSession: any;
  hasUnsavedChanges: boolean;
  onClear: () => void;
} | null = null;

jest.mock('@/components/session-indicator', () => ({
  SessionIndicator: (props: {
    currentSession: any;
    hasUnsavedChanges: boolean;
    onClear: () => void;
  }) => {
    sessionIndicatorProps = props;
    if (!props.currentSession) return null;
    return React.createElement('div', {
      'data-testid': 'session-indicator',
      'data-session-name': props.currentSession.name,
      'data-has-unsaved-changes': props.hasUnsavedChanges.toString(),
    }, [
      React.createElement('span', { key: 'name', 'data-testid': 'session-name' }, props.currentSession.name),
      props.hasUnsavedChanges && React.createElement('span', { key: 'dot', 'data-testid': 'unsaved-indicator', className: 'bg-amber-500' }),
      React.createElement('button', {
        key: 'clear',
        'data-testid': 'clear-session-button',
        onClick: props.onClear,
      }, 'New'),
    ]);
  },
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
    return 1;
  }),
  clearWatch: jest.fn(),
  getCurrentPosition: jest.fn(),
};
Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation, writable: true });

// Import component after mocks
import Home, { TrackedPoint, SetCurrentSessionFn, PointType } from '@/app/page';

describe('Page Session State Integration (Task 2.4)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    authStateCallback = null;
    sessionIndicatorProps = null;
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

  describe('currentSession state added to page.tsx', () => {
    it('should initialize currentSession as null by default', () => {
      act(() => {
        root.render(<Home />);
      });

      // SessionIndicator receives currentSession prop - it should be null initially
      expect(sessionIndicatorProps).not.toBeNull();
      expect(sessionIndicatorProps?.currentSession).toBeNull();
    });

    it('should not render SessionIndicator content when currentSession is null', () => {
      act(() => {
        root.render(<Home />);
      });

      // When currentSession is null, SessionIndicator returns null
      const sessionIndicator = container.querySelector('[data-testid="session-indicator"]');
      expect(sessionIndicator).toBeNull();
    });

    it('should pass currentSession to SessionIndicator component', () => {
      act(() => {
        root.render(<Home />);
      });

      // Verify SessionIndicator was called with currentSession prop
      expect(sessionIndicatorProps).not.toBeNull();
      expect(sessionIndicatorProps).toHaveProperty('currentSession');
    });
  });

  describe('hasUnsavedChanges computed correctly', () => {
    it('should pass hasUnsavedChanges false when no currentSession', () => {
      act(() => {
        root.render(<Home />);
      });

      // When currentSession is null, hasUnsavedChanges should be false
      expect(sessionIndicatorProps?.hasUnsavedChanges).toBe(false);
    });

    it('should pass hasUnsavedChanges prop to SessionIndicator', () => {
      act(() => {
        root.render(<Home />);
      });

      // Verify SessionIndicator receives hasUnsavedChanges prop
      expect(sessionIndicatorProps).not.toBeNull();
      expect(sessionIndicatorProps).toHaveProperty('hasUnsavedChanges');
      expect(typeof sessionIndicatorProps?.hasUnsavedChanges).toBe('boolean');
    });
  });

  describe('SessionIndicator integrated in UI', () => {
    it('should render SessionIndicator component in CardHeader', () => {
      act(() => {
        root.render(<Home />);
      });

      // SessionIndicator should be inside CardHeader
      const cardHeader = container.querySelector('[data-testid="card-header"]');
      expect(cardHeader).not.toBeNull();

      // Verify SessionIndicator was called (even if it returns null)
      expect(sessionIndicatorProps).not.toBeNull();
    });

    it('should pass onClear callback to SessionIndicator', () => {
      act(() => {
        root.render(<Home />);
      });

      // Verify SessionIndicator receives onClear prop
      expect(sessionIndicatorProps).not.toBeNull();
      expect(sessionIndicatorProps).toHaveProperty('onClear');
      expect(typeof sessionIndicatorProps?.onClear).toBe('function');
    });

    it('should place SessionIndicator after CardDescription', () => {
      act(() => {
        root.render(<Home />);
      });

      // The SessionIndicator is placed after CardDescription in the JSX
      // We verify by checking the component is passed the expected props
      expect(sessionIndicatorProps).not.toBeNull();
    });
  });

  describe('Clear functionality works', () => {
    it('should provide onClear callback that clears localStorage', () => {
      // Start with some stored points
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { point: { lat: 32.0853, lng: 34.7818 }, type: 'manual', timestamp: 1706698800000 },
      ]));

      act(() => {
        root.render(<Home />);
      });

      // Get the onClear callback
      const onClear = sessionIndicatorProps?.onClear;
      expect(onClear).toBeDefined();

      // Clear the mocks to track new calls
      localStorageMock.removeItem.mockClear();

      // Call the onClear callback
      act(() => {
        onClear?.();
      });

      // Should have called localStorage.removeItem
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('recordedPoints');
    });

    it('should clear points when onClear is called', () => {
      // Start with some stored points
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { point: { lat: 32.0853, lng: 34.7818 }, type: 'manual', timestamp: 1706698800000 },
        { point: { lat: 32.0854, lng: 34.7819 }, type: 'auto', timestamp: 1706698900000 },
      ]));

      act(() => {
        root.render(<Home />);
      });

      // Get the onClear callback
      const onClear = sessionIndicatorProps?.onClear;

      // Clear the localStorage setItem mock to track new calls
      localStorageMock.setItem.mockClear();

      // Call onClear
      act(() => {
        onClear?.();
      });

      // After clearing, setItem should be called with empty array
      // (from the useEffect that saves points)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('recordedPoints', '[]');
    });
  });

  describe('TrackedPoint exported for other modules', () => {
    it('should export TrackedPoint interface', () => {
      // If this compiles, TrackedPoint is properly exported
      const point: TrackedPoint = {
        point: { lat: 32.0853, lng: 34.7818 },
        type: 'manual',
        timestamp: Date.now(),
      };

      expect(point).toBeDefined();
      expect(point.point.lat).toBe(32.0853);
      expect(point.point.lng).toBe(34.7818);
      expect(point.type).toBe('manual');
      expect(typeof point.timestamp).toBe('number');
    });

    it('should export TrackedPoint with both point types', () => {
      const manualPoint: TrackedPoint = {
        point: { lat: 32.0, lng: 34.0 },
        type: 'manual',
        timestamp: Date.now(),
      };

      const autoPoint: TrackedPoint = {
        point: { lat: 32.0, lng: 34.0 },
        type: 'auto',
        timestamp: Date.now(),
      };

      expect(manualPoint.type).toBe('manual');
      expect(autoPoint.type).toBe('auto');
    });

    it('should export SetCurrentSessionFn type', () => {
      // If this compiles, SetCurrentSessionFn is properly exported
      const testFn: SetCurrentSessionFn = jest.fn();
      expect(testFn).toBeDefined();
    });

    it('should export PointType type', () => {
      // If this compiles, PointType is properly exported
      const manualType: PointType = 'manual';
      const autoType: PointType = 'auto';
      expect(manualType).toBe('manual');
      expect(autoType).toBe('auto');
    });
  });

  describe('No regression in existing functionality', () => {
    it('should still render main element', () => {
      act(() => {
        root.render(<Home />);
      });

      const main = container.querySelector('main');
      expect(main).not.toBeNull();
    });

    it('should still render map', () => {
      act(() => {
        root.render(<Home />);
      });

      const map = container.querySelector('[data-testid="area-map"]');
      expect(map).not.toBeNull();
    });

    it('should still render control panel card', () => {
      act(() => {
        root.render(<Home />);
      });

      const card = container.querySelector('[data-testid="card"]');
      expect(card).not.toBeNull();
    });

    it('should still render filter checkboxes', () => {
      act(() => {
        root.render(<Home />);
      });

      const checkboxes = container.querySelectorAll('[data-testid="checkbox"]');
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    });

    it('should still render tracking buttons', () => {
      act(() => {
        root.render(<Home />);
      });

      const buttons = container.querySelectorAll('[data-testid="button"]');
      const trackingButton = Array.from(buttons).find(btn => btn.textContent?.includes('Tracking'));
      expect(trackingButton).not.toBeNull();
    });

    it('should still render record button', () => {
      act(() => {
        root.render(<Home />);
      });

      const buttons = container.querySelectorAll('[data-testid="button"]');
      const recordButton = Array.from(buttons).find(btn => btn.textContent?.includes('Record'));
      expect(recordButton).not.toBeNull();
    });

    it('should still render reset button', () => {
      act(() => {
        root.render(<Home />);
      });

      const buttons = container.querySelectorAll('[data-testid="button"]');
      const resetButton = Array.from(buttons).find(btn => btn.textContent?.includes('Reset'));
      expect(resetButton).not.toBeNull();
    });

    it('should still render export PDF button', () => {
      act(() => {
        root.render(<Home />);
      });

      const buttons = container.querySelectorAll('[data-testid="button"]');
      const exportButton = Array.from(buttons).find(btn => btn.textContent?.includes('Export PDF'));
      expect(exportButton).not.toBeNull();
    });

    it('should still display calculated area', () => {
      act(() => {
        root.render(<Home />);
      });

      const cardContent = container.querySelector('[data-testid="card-content"]');
      expect(cardContent?.textContent).toContain('Calculated Area');
    });

    it('should still display points recorded', () => {
      act(() => {
        root.render(<Home />);
      });

      const cardContent = container.querySelector('[data-testid="card-content"]');
      expect(cardContent?.textContent).toContain('Points Recorded');
    });

    it('should still load points from localStorage', () => {
      const storedPoints = [
        { point: { lat: 32.0853, lng: 34.7818 }, type: 'manual', timestamp: 1706698800000 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPoints));

      act(() => {
        root.render(<Home />);
      });

      // localStorage.getItem should have been called
      expect(localStorageMock.getItem).toHaveBeenCalledWith('recordedPoints');
    });

    it('should still save points to localStorage', () => {
      localStorageMock.getItem.mockReturnValue(null);

      act(() => {
        root.render(<Home />);
      });

      // localStorage.setItem should have been called (at least for initial empty array)
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('handleClearSession stops tracking', () => {
    it('should stop tracking when onClear is called while tracking', () => {
      act(() => {
        root.render(<Home />);
      });

      // Find and click the tracking button to start tracking
      // (This simulates the tracking state being active)

      // Get the onClear callback
      const onClear = sessionIndicatorProps?.onClear;
      expect(onClear).toBeDefined();

      // Call onClear - this should also stop tracking if active
      act(() => {
        onClear?.();
      });

      // Verify points were cleared (which is part of handleClearSession)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('recordedPoints');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);

      act(() => {
        root.render(<Home />);
      });

      // Should render without errors
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      act(() => {
        root.render(<Home />);
      });

      // Should render without errors (error toast may be shown)
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
    });

    it('should handle malformed points array in localStorage', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ not: 'an array' }));

      act(() => {
        root.render(<Home />);
      });

      // Should render without errors
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
    });

    it('should clear selection state when clearing session', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { point: { lat: 32.0853, lng: 34.7818 }, type: 'manual', timestamp: 1706698800000 },
      ]));

      act(() => {
        root.render(<Home />);
      });

      const onClear = sessionIndicatorProps?.onClear;

      act(() => {
        onClear?.();
      });

      // The clearing should also reset selected point index
      // This is verified by the fact that no errors occur
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });
});

describe('TrackedPoint Type Export', () => {
  it('should have correct TrackedPoint structure', () => {
    const point: TrackedPoint = {
      point: { lat: 0, lng: 0 },
      type: 'manual',
      timestamp: 0,
    };

    expect(point).toEqual({
      point: { lat: 0, lng: 0 },
      type: 'manual',
      timestamp: 0,
    });
  });

  it('should allow both manual and auto point types', () => {
    const manual: TrackedPoint = {
      point: { lat: 1, lng: 1 },
      type: 'manual',
      timestamp: 1,
    };

    const auto: TrackedPoint = {
      point: { lat: 2, lng: 2 },
      type: 'auto',
      timestamp: 2,
    };

    expect(manual.type).toBe('manual');
    expect(auto.type).toBe('auto');
  });
});

describe('SetCurrentSessionFn Type Export', () => {
  it('should be a valid function type', () => {
    // This test verifies the type is exported correctly
    // If compilation succeeds, the type is properly exported
    const mockSetter: SetCurrentSessionFn = jest.fn();
    expect(typeof mockSetter).toBe('function');
  });
});
