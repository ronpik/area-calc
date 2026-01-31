// src/components/sessions-modal.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useI18n } from '@/contexts/i18n-context';
import { useStorage } from '@/hooks/use-storage';
import { cn } from '@/lib/utils';
import {
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  FolderOpen,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import type { SessionMeta, SessionData } from '@/types/session';
import { SESSION_NAME_MAX_LENGTH } from '@/types/session';

interface SessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSession: (session: SessionData, meta: SessionMeta) => void;
  hasCurrentPoints: boolean; // Whether user has points that would be replaced
}

export function SessionsModal({
  open,
  onOpenChange,
  onLoadSession,
  hasCurrentPoints,
}: SessionsModalProps) {
  const { t, isRTL } = useI18n();
  const { fetchIndex, loadSession, renameSession, deleteSession, loading, error, clearError } = useStorage();

  // Sessions list state
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete confirmation state
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<SessionMeta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load confirmation state
  const [loadConfirmSession, setLoadConfirmSession] = useState<SessionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sessions when modal opens
  const fetchSessions = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    clearError();

    try {
      const index = await fetchIndex();
      if (index) {
        // Sort by updatedAt descending (most recent first)
        const sorted = [...index.sessions].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setSessions(sorted);
      } else {
        setSessions([]);
      }
    } catch (err) {
      setFetchError(t('sessions.loadFailed'));
    } finally {
      setIsFetching(false);
    }
  }, [fetchIndex, clearError, t]);

  useEffect(() => {
    if (open) {
      fetchSessions();
    }
  }, [open, fetchSessions]);

  // Handle session load click
  const handleLoadClick = (session: SessionMeta) => {
    if (hasCurrentPoints) {
      // Show confirmation dialog
      setLoadConfirmSession(session);
    } else {
      // Load directly
      handleLoadConfirm(session);
    }
  };

  // Handle load confirmation
  const handleLoadConfirm = async (session: SessionMeta) => {
    setIsLoading(true);
    try {
      const sessionData = await loadSession(session.id);
      onLoadSession(sessionData, session);
      onOpenChange(false);
    } catch (err) {
      // Error is handled by useStorage hook
    } finally {
      setIsLoading(false);
      setLoadConfirmSession(null);
    }
  };

  // Start rename mode
  const handleStartRename = (session: SessionMeta) => {
    setRenamingId(session.id);
    setRenameValue(session.name);
    setRenameError(null);
  };

  // Cancel rename
  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setRenameError(null);
  };

  // Submit rename
  const handleSubmitRename = async (sessionId: string) => {
    const trimmed = renameValue.trim();

    // Validate
    if (trimmed.length === 0) {
      setRenameError(t('sessions.sessionName'));
      return;
    }
    if (trimmed.length > SESSION_NAME_MAX_LENGTH) {
      setRenameError(`Maximum ${SESSION_NAME_MAX_LENGTH} characters`);
      return;
    }

    setIsRenaming(true);
    try {
      await renameSession(sessionId, trimmed);

      // Update local state
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? { ...s, name: trimmed, updatedAt: new Date().toISOString() }
            : s
        )
      );

      handleCancelRename();
    } catch (err) {
      setRenameError(t('errors.renameFailed'));
    } finally {
      setIsRenaming(false);
    }
  };

  // Handle delete click - show confirmation
  const handleDeleteClick = (session: SessionMeta) => {
    setDeleteConfirmSession(session);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmSession) return;

    setIsDeleting(true);
    try {
      await deleteSession(deleteConfirmSession.id);

      // Update local state
      setSessions(prev => prev.filter(s => s.id !== deleteConfirmSession.id));
      setDeleteConfirmSession(null);
    } catch (err) {
      // Error is handled by useStorage hook
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date for display
  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format area for display
  const formatArea = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "sm:max-w-[500px]",
            isRTL && "rtl"
          )}
          style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl">
              {t('sessions.mySessions')}
            </DialogTitle>
          </DialogHeader>

          {/* Loading state */}
          {isFetching && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>{t('sessions.loadingSessions')}</p>
            </div>
          )}

          {/* Error state */}
          {!isFetching && fetchError && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
              <p className="mb-4 text-destructive">{fetchError}</p>
              <Button variant="outline" onClick={fetchSessions}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isFetching && !fetchError && sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p className="font-medium mb-2">{t('sessions.noSessions')}</p>
              <p className="text-sm text-center max-w-[280px]">
                {t('sessions.noSessionsHint')}
              </p>
            </div>
          )}

          {/* Sessions list */}
          {!isFetching && !fetchError && sessions.length > 0 && (
            <ScrollArea className="max-h-[400px] -mx-6 px-6">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      renamingId !== session.id && "cursor-pointer"
                    )}
                    onClick={() => {
                      if (renamingId !== session.id && !isLoading) {
                        handleLoadClick(session);
                      }
                    }}
                  >
                    {/* Session info */}
                    <div className="flex-1 min-w-0">
                      {renamingId === session.id ? (
                        // Rename mode
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={renameValue}
                            onChange={(e) => {
                              setRenameValue(e.target.value);
                              setRenameError(null);
                            }}
                            className={cn(
                              "h-8",
                              renameError && "border-destructive"
                            )}
                            maxLength={SESSION_NAME_MAX_LENGTH}
                            disabled={isRenaming}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSubmitRename(session.id);
                              } else if (e.key === 'Escape') {
                                handleCancelRename();
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleSubmitRename(session.id)}
                            disabled={isRenaming}
                          >
                            {isRenaming ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={handleCancelRename}
                            disabled={isRenaming}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        // Normal display mode
                        <>
                          <p className="font-medium truncate">{session.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{t('sessions.area', { value: formatArea(session.area) })}</span>
                            <span>-</span>
                            <span>{t('sessions.points', { count: session.pointCount })}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(session.updatedAt)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Three-dot menu - only show when not renaming */}
                    {renamingId !== session.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"}>
                          <DropdownMenuItem onClick={() => handleStartRename(session)}>
                            <Pencil className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('sessions.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(session)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('sessions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirmSession !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmSession(null);
        }}
        title={t('sessions.deleteConfirmTitle', { name: deleteConfirmSession?.name ?? '' })}
        message={t('sessions.deleteConfirmMessage')}
        confirmLabel={t('sessions.delete')}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />

      {/* Load confirmation dialog */}
      <ConfirmDialog
        open={loadConfirmSession !== null}
        onOpenChange={(open) => {
          if (!open) setLoadConfirmSession(null);
        }}
        title={t('sessions.loadConfirmTitle', { name: loadConfirmSession?.name ?? '' })}
        message={t('sessions.loadConfirmMessage')}
        confirmLabel={t('sessions.load')}
        variant="default"
        onConfirm={() => {
          if (loadConfirmSession) {
            handleLoadConfirm(loadConfirmSession);
          }
        }}
        loading={isLoading}
      />
    </>
  );
}
