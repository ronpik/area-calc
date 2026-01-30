// src/components/auth-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { LoginModal } from '@/components/login-modal';
import { Loader2, LogIn, LogOut, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthButtonProps {
  className?: string;
}

export function AuthButton({ className }: AuthButtonProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();

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
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
