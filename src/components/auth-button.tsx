// src/components/auth-button.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { LoginModal } from '@/components/login-modal';
import { Loader2, LogIn, LogOut, ChevronDown, User, Save, FolderOpen, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { SaveSessionModal } from '@/components/save-session-modal';
import { SessionsModal } from '@/components/sessions-modal';
import type { TrackedPoint } from '@/app/page';
import type { CurrentSessionState, SessionData, SessionMeta } from '@/types/session';

interface AuthButtonProps {
  className?: string;
  points: TrackedPoint[];
  area: number;
  currentSession: CurrentSessionState | null;
  sessionCount: number;
  onSaveComplete: (session: CurrentSessionState) => void;
  onLoadSession: (session: SessionData, meta: SessionMeta) => void;
  onNewSession: () => void;
}

export function AuthButton({
  className,
  points,
  area,
  currentSession,
  sessionCount,
  onSaveComplete,
  onLoadSession,
  onNewSession,
}: AuthButtonProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [newSessionConfirmOpen, setNewSessionConfirmOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

  // State for auto-save prompt after sign-in
  const [autoSaveModalOpen, setAutoSaveModalOpen] = useState(false);

  // Track if sign-in was triggered via modal (not page refresh)
  const justSignedInRef = useRef(false);
  const prevUserRef = useRef(user);

  // Show toast when user signs in (not on page refresh)
  // Also prompt to save localStorage points if they exist
  useEffect(() => {
    if (!prevUserRef.current && user && justSignedInRef.current) {
      // User just signed in via modal
      toast({
        title: t('auth.signedInAs', {
          name: user.displayName || user.email || 'User'
        }),
      });

      // Check localStorage for points and prompt to save
      try {
        const storedPoints = localStorage.getItem('recordedPoints');
        if (storedPoints) {
          const parsedPoints = JSON.parse(storedPoints);
          if (Array.isArray(parsedPoints) && parsedPoints.length > 0) {
            // Open save modal for auto-save prompt
            setAutoSaveModalOpen(true);
          }
        }
      } catch {
        // Ignore localStorage parsing errors
      }

      justSignedInRef.current = false;
    }
    prevUserRef.current = user;
  }, [user, t, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: t('auth.signedOut'),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('errors.unknownError'),
      });
    }
  };

  const handleSaveClick = () => {
    if (points.length === 0) {
      toast({
        variant: 'destructive',
        title: t('sessions.noPointsToSave'),
      });
      return;
    }
    setSaveModalOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        "bg-white rounded-lg shadow-md px-4 py-2",
        className
      )}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Signed out state
  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          className={cn(
            "bg-white shadow-md",
            className
          )}
          onClick={() => setLoginModalOpen(true)}
        >
          <LogIn className="h-4 w-4 mr-2" />
          {t('auth.signIn')}
        </Button>

        <LoginModal
          open={loginModalOpen}
          onOpenChange={setLoginModalOpen}
          onSuccess={() => {
            justSignedInRef.current = true;
          }}
        />
      </>
    );
  }

  // Signed in state
  const initials = user.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "bg-white shadow-md",
            className
          )}
        >
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate">
            {user.displayName || user.email}
          </span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setSessionsModalOpen(true)}>
          <FolderOpen className="h-4 w-4 mr-2" />
          {t('sessions.mySessions')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSaveClick}
          disabled={points.length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {t('sessions.saveCurrent')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (points.length > 0) {
              setNewSessionConfirmOpen(true);
            } else {
              onNewSession();
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('sessions.newSession')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>

      <SaveSessionModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        points={points}
        area={area}
        currentSession={currentSession}
        sessionCount={sessionCount}
        onSaveComplete={onSaveComplete}
      />

      <SessionsModal
        open={sessionsModalOpen}
        onOpenChange={setSessionsModalOpen}
        onLoadSession={onLoadSession}
        hasCurrentPoints={points.length > 0}
      />

      {/* Auto-save modal shown after sign-in when localStorage has points */}
      <SaveSessionModal
        open={autoSaveModalOpen}
        onOpenChange={setAutoSaveModalOpen}
        points={points}
        area={area}
        currentSession={currentSession}
        sessionCount={sessionCount}
        onSaveComplete={onSaveComplete}
      />

      <ConfirmDialog
        open={newSessionConfirmOpen}
        onOpenChange={setNewSessionConfirmOpen}
        title={t('sessions.newSessionConfirmTitle')}
        message={t('sessions.newSessionConfirmMessage')}
        confirmLabel={t('sessions.startNew')}
        variant="destructive"
        onConfirm={() => {
          onNewSession();
        }}
      />
    </DropdownMenu>
  );
}
