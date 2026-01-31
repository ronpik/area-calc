// src/components/save-session-modal.tsx

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/contexts/i18n-context';
import { useStorage } from '@/hooks/use-storage';
import { cn } from '@/lib/utils';
import { Loader2, Save, Copy } from 'lucide-react';
import type { CurrentSessionState } from '@/types/session';
import { SESSION_NAME_MAX_LENGTH } from '@/types/session';
import type { TrackedPoint } from '@/app/page';

type SaveMode =
  | 'new'           // Saving new session (no current session)
  | 'update'        // Updating existing session directly
  | 'choose';       // User chooses: update existing or save as new

interface SaveSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: TrackedPoint[];
  area: number;
  currentSession: CurrentSessionState | null;
  sessionCount: number;  // For default name generation
  onSaveComplete: (session: CurrentSessionState) => void;
}

export function SaveSessionModal({
  open,
  onOpenChange,
  points,
  area,
  currentSession,
  sessionCount,
  onSaveComplete,
}: SaveSessionModalProps) {
  const { t, isRTL } = useI18n();
  const { saveNewSession, updateSession, loading } = useStorage();

  // Internal mode state - derived from currentSession but can transition to 'new' or 'update'
  const [mode, setMode] = useState<SaveMode>('new');
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Derive initial mode when modal opens
  useEffect(() => {
    if (open) {
      // Clear previous errors
      setError(null);

      if (currentSession) {
        // Has current session - show choose mode
        setMode('choose');
        setSessionName('');
      } else {
        // No current session - go to new mode with default name
        setMode('new');
        setSessionName(t('sessions.defaultName', { n: sessionCount + 1 }));
      }
    }
  }, [open, currentSession, sessionCount, t]);

  // Validate session name
  // Unicode characters are allowed - we just validate length after trim
  const validateName = (name: string): string | null => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return t('sessions.sessionName'); // Use field name as error hint
    }
    if (trimmed.length > SESSION_NAME_MAX_LENGTH) {
      return t('sessions.nameTooLong', { max: SESSION_NAME_MAX_LENGTH });
    }
    return null;
  };

  // Handle choosing to update existing session
  const handleChooseUpdate = async () => {
    if (!currentSession) return;

    setError(null);
    try {
      const sessionMeta = await updateSession(currentSession.id, points, area);

      // Create updated current session state
      const updatedSession: CurrentSessionState = {
        id: sessionMeta.id,
        name: sessionMeta.name,
        lastSavedAt: sessionMeta.updatedAt,
        pointsHashAtSave: JSON.stringify(points.map(p => ({
          lat: p.point.lat,
          lng: p.point.lng,
          type: p.type
        }))),
      };

      onSaveComplete(updatedSession);
      onOpenChange(false);
    } catch (err) {
      setError(t('errors.saveFailed'));
    }
  };

  // Handle choosing to save as new
  const handleChooseSaveAsNew = () => {
    setMode('new');
    setSessionName(t('sessions.defaultName', { n: sessionCount + 1 }));
    setError(null);
  };

  // Handle saving new session
  const handleSaveNew = async () => {
    const validationError = validateName(sessionName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      const sessionMeta = await saveNewSession(sessionName.trim(), points, area);

      // Create current session state
      const newSession: CurrentSessionState = {
        id: sessionMeta.id,
        name: sessionMeta.name,
        lastSavedAt: sessionMeta.updatedAt,
        pointsHashAtSave: JSON.stringify(points.map(p => ({
          lat: p.point.lat,
          lng: p.point.lng,
          type: p.type
        }))),
      };

      onSaveComplete(newSession);
      onOpenChange(false);
    } catch (err) {
      setError(t('errors.saveFailed'));
    }
  };

  // Handle cancel - go back to choose mode if in new mode with existing session
  const handleCancel = () => {
    if (mode === 'new' && currentSession) {
      setMode('choose');
      setError(null);
    } else {
      onOpenChange(false);
    }
  };

  // Format area for display
  const formatArea = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[400px]",
          isRTL && "rtl"
        )}
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">
            {mode === 'choose' ? t('sessions.saveSession') : t('sessions.saveNewSession')}
          </DialogTitle>
        </DialogHeader>

        {/* Stats display - shown in all modes */}
        <div className="flex justify-around py-4 border-y">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatArea(area)}</p>
            <p className="text-sm text-muted-foreground">
              {t('sessions.area', { value: '' }).replace(' ', '')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{points.length}</p>
            <p className="text-sm text-muted-foreground">
              {t('sessions.points', { count: '' }).replace(' ', '')}
            </p>
          </div>
        </div>

        {/* Choose mode - two large buttons */}
        {mode === 'choose' && currentSession && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground text-center">
              {t('sessions.workingOn', { name: currentSession.name })}
            </p>

            {/* Error display */}
            {error && (
              <p className="text-sm text-destructive text-center">
                {error}
              </p>
            )}

            <Button
              className="w-full h-14 text-base flex flex-col items-center justify-center gap-0"
              onClick={handleChooseUpdate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {t('sessions.updateExisting', { name: currentSession.name })}
                  </span>
                  <span className="text-xs opacity-70">
                    {t('sessions.updateExistingHint')}
                  </span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 text-base flex flex-col items-center justify-center gap-0"
              onClick={handleChooseSaveAsNew}
              disabled={loading}
            >
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                {t('sessions.saveAsNew')}
              </span>
              <span className="text-xs opacity-70">
                {t('sessions.saveAsNewHint')}
              </span>
            </Button>
          </div>
        )}

        {/* New mode - name input */}
        {mode === 'new' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="session-name">{t('sessions.sessionName')}</Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => {
                  setSessionName(e.target.value);
                  setError(null); // Clear error on input change
                }}
                placeholder={t('sessions.defaultName', { n: sessionCount + 1 })}
                maxLength={SESSION_NAME_MAX_LENGTH}
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Error display */}
            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter className={cn(isRTL && "sm:space-x-reverse")}>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                {t('sessions.cancel')}
              </Button>
              <Button
                onClick={handleSaveNew}
                disabled={loading || sessionName.trim().length === 0}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('sessions.save')
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Update mode - direct update (used when transitioning from choose) */}
        {mode === 'update' && currentSession && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              {t('sessions.updateExistingHint')}
            </p>

            {/* Error display */}
            {error && (
              <p className="text-sm text-destructive text-center">
                {error}
              </p>
            )}

            <DialogFooter className={cn(isRTL && "sm:space-x-reverse")}>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('sessions.cancel')}
              </Button>
              <Button
                onClick={handleChooseUpdate}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('sessions.save')
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
