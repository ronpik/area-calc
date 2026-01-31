// src/components/session-indicator.tsx
'use client';

import { FileIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CurrentSessionState } from '@/types/session';

interface SessionIndicatorProps {
  currentSession: CurrentSessionState | null;
  hasUnsavedChanges: boolean;
  onClear: () => void;  // Start new measurement
}

export function SessionIndicator({
  currentSession,
  hasUnsavedChanges,
  onClear
}: SessionIndicatorProps) {
  if (!currentSession) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <FileIcon className="h-4 w-4" />
      <span className="truncate max-w-[150px]" title={currentSession.name}>
        {currentSession.name}
      </span>
      {hasUnsavedChanges && (
        <span className="h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        title="Start new measurement"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
