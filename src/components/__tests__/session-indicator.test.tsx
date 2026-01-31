/**
 * @jest-environment jsdom
 */

/**
 * Tests for SessionIndicator Component
 *
 * Test requirements from spec (Task 2.3):
 * - Returns null when currentSession is null
 * - Shows name when session exists
 * - Shows amber dot when hasUnsavedChanges is true
 * - Calls onNewSession when + button clicked (with confirmation when hasPoints)
 * - Long names truncate with ellipsis
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';

import type { CurrentSessionState } from '@/types/session';

// Track ConfirmDialog state
let mockConfirmDialogOpen = false;
let mockConfirmDialogOnConfirm: (() => void) | null = null;

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  FileIcon: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'file-icon', className }),
  PlusIcon: ({ className }: { className?: string }) =>
    React.createElement('svg', { 'data-testid': 'plus-icon', className }),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, title, variant, size, className }: {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
    variant?: string;
    size?: string;
    className?: string;
  }) =>
    React.createElement('button', {
      onClick,
      title,
      className,
      'data-testid': 'button',
      'data-variant': variant,
      'data-size': size,
    }, children),
}));

// Mock ConfirmDialog component
jest.mock('@/components/confirm-dialog', () => ({
  ConfirmDialog: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => {
    mockConfirmDialogOpen = open;
    mockConfirmDialogOnConfirm = onConfirm;
    return open ? React.createElement('div', { 'data-testid': 'confirm-dialog' }) : null;
  },
}));

// Mock useI18n
jest.mock('@/contexts/i18n-context', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Import component after mocks
import { SessionIndicator } from '@/components/session-indicator';

// Helper to create a test session
function createTestSession(overrides: Partial<CurrentSessionState> = {}): CurrentSessionState {
  return {
    id: 'test-session-id',
    name: 'Test Session',
    lastSavedAt: '2026-01-31T10:00:00Z',
    pointsHashAtSave: 'abc123',
    ...overrides,
  };
}

// Helper to render component
function createTestHarness() {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function mount(props: {
    currentSession: CurrentSessionState | null;
    hasUnsavedChanges: boolean;
    onNewSession: () => void;
    hasPoints: boolean;
  }) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<SessionIndicator {...props} />);
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
    currentSession: CurrentSessionState | null;
    hasUnsavedChanges: boolean;
    onNewSession: () => void;
    hasPoints: boolean;
  }) {
    act(() => {
      root!.render(<SessionIndicator {...props} />);
    });
  }

  return {
    mount,
    unmount,
    rerender,
    getContainer: () => container,
  };
}

describe('SessionIndicator Component', () => {
  let mockOnNewSession: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnNewSession = jest.fn();
    mockConfirmDialogOpen = false;
    mockConfirmDialogOnConfirm = null;
  });

  describe('Null Session Handling', () => {
    it('should return null when currentSession is null', () => {
      const harness = createTestHarness();
      harness.mount({
        currentSession: null,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Container should be empty (component returns null)
        const container = harness.getContainer();
        expect(container?.innerHTML).toBe('');
      } finally {
        harness.unmount();
      }
    });

    it('should not render any elements when no session', () => {
      const harness = createTestHarness();
      harness.mount({
        currentSession: null,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Should not find any icons, buttons, or spans
        expect(document.querySelector('[data-testid="file-icon"]')).toBeNull();
        expect(document.querySelector('[data-testid="plus-icon"]')).toBeNull();
        expect(document.querySelector('[data-testid="button"]')).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Session Display', () => {
    it('should show session name when session exists', () => {
      const session = createTestSession({ name: 'My Measurement' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Find the span with the session name
        const container = harness.getContainer();
        expect(container?.textContent).toContain('My Measurement');
      } finally {
        harness.unmount();
      }
    });

    it('should render FileIcon when session exists', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const fileIcon = document.querySelector('[data-testid="file-icon"]');
        expect(fileIcon).not.toBeNull();
        expect(fileIcon?.getAttribute('class')).toContain('h-4');
        expect(fileIcon?.getAttribute('class')).toContain('w-4');
      } finally {
        harness.unmount();
      }
    });

    it('should show title attribute for name tooltip', () => {
      const session = createTestSession({ name: 'Session With Long Name' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Find span with title attribute matching session name
        const span = document.querySelector('span[title="Session With Long Name"]');
        expect(span).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should have container with flex layout and gap', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const container = harness.getContainer();
        const indicatorDiv = container?.querySelector('div');
        expect(indicatorDiv?.className).toContain('flex');
        expect(indicatorDiv?.className).toContain('items-center');
        expect(indicatorDiv?.className).toContain('gap-2');
      } finally {
        harness.unmount();
      }
    });

    it('should have muted-foreground text styling', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const container = harness.getContainer();
        const indicatorDiv = container?.querySelector('div');
        expect(indicatorDiv?.className).toContain('text-sm');
        expect(indicatorDiv?.className).toContain('text-muted-foreground');
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Name Truncation', () => {
    it('should have truncate class for long names', () => {
      const session = createTestSession({ name: 'Very Long Session Name That Should Be Truncated' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Find the name span with truncate class
        const nameSpan = document.querySelector('span.truncate');
        expect(nameSpan).not.toBeNull();
        expect(nameSpan?.textContent).toBe('Very Long Session Name That Should Be Truncated');
      } finally {
        harness.unmount();
      }
    });

    it('should have max-width 150px for name', () => {
      const session = createTestSession({ name: 'Test' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Find the name span with max-w-[150px] class
        const nameSpan = document.querySelector('span.max-w-\\[150px\\]');
        expect(nameSpan).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should preserve full name in title attribute for tooltip', () => {
      const longName = 'This Is A Very Long Session Name That Exceeds 150 Pixels';
      const session = createTestSession({ name: longName });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const nameSpan = document.querySelector(`span[title="${longName}"]`);
        expect(nameSpan).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Unsaved Changes Indicator', () => {
    it('should show amber dot when hasUnsavedChanges is true', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: true,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Find the amber indicator dot
        const indicator = document.querySelector('span.bg-amber-500');
        expect(indicator).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should not show amber dot when hasUnsavedChanges is false', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Should not find the amber indicator dot
        const indicator = document.querySelector('span.bg-amber-500');
        expect(indicator).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should have rounded-full class for circular indicator', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: true,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const indicator = document.querySelector('span.rounded-full');
        expect(indicator).not.toBeNull();
        expect(indicator?.className).toContain('bg-amber-500');
      } finally {
        harness.unmount();
      }
    });

    it('should have 2x2 size for indicator dot', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: true,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const indicator = document.querySelector('span.h-2.w-2');
        expect(indicator).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should have title attribute on unsaved indicator for tooltip', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: true,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const indicator = document.querySelector('span[title="Unsaved changes"]');
        expect(indicator).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('New Session Button', () => {
    it('should show confirmation dialog when + button is clicked and hasPoints is true', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button).not.toBeNull();

        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Should open confirmation dialog, not call onNewSession directly
        expect(mockConfirmDialogOpen).toBe(true);
        expect(mockOnNewSession).not.toHaveBeenCalled();
      } finally {
        harness.unmount();
      }
    });

    it('should call onNewSession directly when + button is clicked and hasPoints is false', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: false,
      });

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button).not.toBeNull();

        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Should call onNewSession directly without confirmation
        expect(mockOnNewSession).toHaveBeenCalledTimes(1);
      } finally {
        harness.unmount();
      }
    });

    it('should call onNewSession when confirmation dialog is confirmed', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const button = document.querySelector('[data-testid="button"]');

        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Confirm the dialog
        expect(mockConfirmDialogOnConfirm).not.toBeNull();
        act(() => {
          mockConfirmDialogOnConfirm!();
        });

        expect(mockOnNewSession).toHaveBeenCalledTimes(1);
      } finally {
        harness.unmount();
      }
    });

    it('should render PlusIcon inside button', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const plusIcon = document.querySelector('[data-testid="plus-icon"]');
        expect(plusIcon).not.toBeNull();
        expect(plusIcon?.getAttribute('class')).toContain('h-4');
        expect(plusIcon?.getAttribute('class')).toContain('w-4');
      } finally {
        harness.unmount();
      }
    });

    it('should use ghost variant for button', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.getAttribute('data-variant')).toBe('ghost');
      } finally {
        harness.unmount();
      }
    });

    it('should use sm size for button', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const button = document.querySelector('[data-testid="button"]');
        expect(button?.getAttribute('data-size')).toBe('sm');
      } finally {
        harness.unmount();
      }
    });

    it('should have title attribute for button tooltip', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Button title is from i18n key
        const button = document.querySelector('button[title="sessions.startNew"]');
        expect(button).not.toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Component Re-rendering', () => {
    it('should update when session changes', () => {
      const session1 = createTestSession({ name: 'Session One' });
      const session2 = createTestSession({ name: 'Session Two' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session1,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Initially should show Session One
        expect(harness.getContainer()?.textContent).toContain('Session One');

        // Re-render with different session
        harness.rerender({
          currentSession: session2,
          hasUnsavedChanges: false,
          onNewSession: mockOnNewSession,
        hasPoints: true,
        });

        // Now should show Session Two
        expect(harness.getContainer()?.textContent).toContain('Session Two');
        expect(harness.getContainer()?.textContent).not.toContain('Session One');
      } finally {
        harness.unmount();
      }
    });

    it('should hide when session becomes null', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Initially should show content
        expect(document.querySelector('[data-testid="file-icon"]')).not.toBeNull();

        // Re-render with null session
        harness.rerender({
          currentSession: null,
          hasUnsavedChanges: false,
          onNewSession: mockOnNewSession,
        hasPoints: true,
        });

        // Now should be empty
        expect(document.querySelector('[data-testid="file-icon"]')).toBeNull();
        expect(harness.getContainer()?.innerHTML).toBe('');
      } finally {
        harness.unmount();
      }
    });

    it('should toggle unsaved indicator when hasUnsavedChanges changes', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Initially no indicator
        expect(document.querySelector('span.bg-amber-500')).toBeNull();

        // Re-render with unsaved changes
        harness.rerender({
          currentSession: session,
          hasUnsavedChanges: true,
          onNewSession: mockOnNewSession,
        hasPoints: true,
        });

        // Now should show indicator
        expect(document.querySelector('span.bg-amber-500')).not.toBeNull();

        // Re-render without unsaved changes
        harness.rerender({
          currentSession: session,
          hasUnsavedChanges: false,
          onNewSession: mockOnNewSession,
        hasPoints: true,
        });

        // Indicator should be gone
        expect(document.querySelector('span.bg-amber-500')).toBeNull();
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string session name', () => {
      const session = createTestSession({ name: '' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // Should still render the component
        expect(document.querySelector('[data-testid="file-icon"]')).not.toBeNull();
        // Name span should exist but be empty
        const nameSpan = document.querySelector('span.truncate');
        expect(nameSpan).not.toBeNull();
        expect(nameSpan?.textContent).toBe('');
      } finally {
        harness.unmount();
      }
    });

    it('should handle special characters in session name', () => {
      const session = createTestSession({ name: '<script>alert("xss")</script>' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        // React should escape the content properly
        const nameSpan = document.querySelector('span.truncate');
        expect(nameSpan?.textContent).toBe('<script>alert("xss")</script>');
        // Should not have an actual script element
        expect(document.querySelector('script')).toBeNull();
      } finally {
        harness.unmount();
      }
    });

    it('should handle session name with unicode characters', () => {
      const session = createTestSession({ name: 'מדידה בעברית' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const nameSpan = document.querySelector('span.truncate');
        expect(nameSpan?.textContent).toBe('מדידה בעברית');
      } finally {
        harness.unmount();
      }
    });

    it('should handle multiple rapid clicks on new session button without points', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: false,
      });

      try {
        const button = document.querySelector('[data-testid="button"]');

        act(() => {
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(mockOnNewSession).toHaveBeenCalledTimes(3);
      } finally {
        harness.unmount();
      }
    });
  });

  describe('Component Structure', () => {
    it('should render all elements in correct order', () => {
      const session = createTestSession({ name: 'Test' });

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: true,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const container = harness.getContainer();
        const indicatorDiv = container?.querySelector('div');
        const children = indicatorDiv?.children;

        expect(children).not.toBeNull();
        // FileIcon, name span, unsaved indicator span, Button, ConfirmDialog (when open)
        // ConfirmDialog is rendered but only shows when open
        expect(children?.length).toBeGreaterThanOrEqual(4);

        // First element should be the file icon
        expect(children?.[0].getAttribute('data-testid')).toBe('file-icon');

        // Second element should be the name span
        expect(children?.[1].tagName.toLowerCase()).toBe('span');
        expect(children?.[1].textContent).toBe('Test');

        // Third element should be the unsaved indicator span
        expect(children?.[2].className).toContain('bg-amber-500');

        // Fourth element should be the button
        expect(children?.[3].getAttribute('data-testid')).toBe('button');
      } finally {
        harness.unmount();
      }
    });

    it('should have at least 3 visible children when no unsaved changes', () => {
      const session = createTestSession();

      const harness = createTestHarness();
      harness.mount({
        currentSession: session,
        hasUnsavedChanges: false,
        onNewSession: mockOnNewSession,
        hasPoints: true,
      });

      try {
        const container = harness.getContainer();
        const indicatorDiv = container?.querySelector('div');
        const children = indicatorDiv?.children;

        // FileIcon, name span, Button (no unsaved indicator)
        // ConfirmDialog may also be rendered (but hidden)
        expect(children?.length).toBeGreaterThanOrEqual(3);
      } finally {
        harness.unmount();
      }
    });
  });
});
