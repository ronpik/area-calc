// src/components/session-indicator.tsx
'use client';

import { useState } from 'react';
import { FileIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useI18n } from '@/contexts/i18n-context';
import type { CurrentSessionState } from '@/types/session';

interface SessionIndicatorProps {
  currentSession: CurrentSessionState | null;
  hasUnsavedChanges: boolean;
  onNewSession: () => void;  // Start new measurement
  hasPoints: boolean;  // Whether there are points to warn about
}

export function SessionIndicator({
  currentSession,
  hasUnsavedChanges,
  onNewSession,
  hasPoints
}: SessionIndicatorProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { t } = useI18n();

  if (!currentSession) return null;

  const handleNewSessionClick = () => {
    if (hasPoints) {
      setConfirmOpen(true);
    } else {
      onNewSession();
    }
  };

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
        onClick={handleNewSessionClick}
        title={t('sessions.startNew')}
      >
        <PlusIcon className="h-4 w-4" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('sessions.newSessionConfirmTitle')}
        message={t('sessions.newSessionConfirmMessage')}
        confirmLabel={t('sessions.startNew')}
        variant="destructive"
        onConfirm={() => {
          onNewSession();
        }}
      />
    </div>
  );
}
