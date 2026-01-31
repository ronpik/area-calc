// src/components/login-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToastAction } from '@/components/ui/toast';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { signIn, signInWithEmail, signUpWithEmail, resetPassword, error, clearError } = useAuth();
  const { t, isRTL } = useI18n();
  const { toast } = useToast();

  // Clear state when modal opens/closes or mode changes
  useEffect(() => {
    if (open) {
      clearError();
      setValidationError(null);
    }
  }, [open, clearError]);

  useEffect(() => {
    clearError();
    setValidationError(null);
    setResetEmailSent(false);
  }, [mode, clearError]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setMode('signIn');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      setShowPassword(false);
      setResetEmailSent(false);
      setValidationError(null);
    }
  }, [open]);

  // Client-side validation
  const validateForm = (): boolean => {
    setValidationError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('invalidEmail');
      return false;
    }

    // Password validation (not needed for forgot password)
    if (mode !== 'forgotPassword') {
      if (password.length < 6) {
        setValidationError('weakPassword');
        return false;
      }

      // Confirm password match (sign-up only)
      if (mode === 'signUp' && password !== confirmPassword) {
        setValidationError('passwordMismatch');
        return false;
      }
    }

    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(email, password);
        onOpenChange(false);
        onSuccess?.();
      } else if (mode === 'signUp') {
        await signUpWithEmail(email, password, displayName || undefined);
        onOpenChange(false);
        onSuccess?.();
      } else if (mode === 'forgotPassword') {
        await resetPassword(email);
        setResetEmailSent(true);
      }
    } catch (err: any) {
      // Error is set in auth context for inline display
      if (err.code === 'auth/network-request-failed') {
        toast({
          variant: 'destructive',
          title: t('errors.networkError'),
          action: (
            <ToastAction altText={t('common.retry')} onClick={() => handleEmailSubmit(e)}>
              {t('common.retry')}
            </ToastAction>
          ),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signIn();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      // Error is set in auth context for inline display
      // Only show toast for network errors (with Retry button)
      if (err.code === 'auth/network-request-failed') {
        toast({
          variant: 'destructive',
          title: t('errors.networkError'),
          action: (
            <ToastAction altText={t('common.retry')} onClick={() => handleGoogleSignIn()}>
              {t('common.retry')}
            </ToastAction>
          ),
        });
      }
      // popup-blocked: error shown inline (handled by error state display below)
      // popup-closed-by-user: silent, error is null from auth context
      // other errors: shown inline via generic error
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = validationError || error;

  // Forgot Password Mode
  if (mode === 'forgotPassword') {
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
            <div className="mx-auto mb-4">
              <MapPin className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {t('auth.forgotPasswordTitle')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('auth.forgotPasswordSubtitle')}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-green-600">
                  {t('auth.resetLinkSent')}
                </p>
                <Button
                  variant="link"
                  className="text-sm"
                  onClick={() => setMode('signIn')}
                >
                  {t('auth.backToSignIn')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {/* Error message */}
                {displayError && displayError !== 'networkError' && (
                  <p className="text-sm text-destructive text-center">
                    {t(`errors.${displayError}`)}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t('auth.email')}</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.sendResetLink')}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm"
                  onClick={() => setMode('signIn')}
                >
                  {t('auth.backToSignIn')}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Sign In / Sign Up Mode
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
          <div className="mx-auto mb-4">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {mode === 'signIn' ? t('auth.signInTitle') : t('auth.signUpTitle')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'signIn' ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            className={cn(
              "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
              mode === 'signIn'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode('signIn')}
          >
            {t('auth.signIn')}
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
              mode === 'signUp'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode('signUp')}
          >
            {t('auth.signUp')}
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4 py-4">
          {/* Error message */}
          {displayError && displayError !== 'networkError' && (
            <p className="text-sm text-destructive text-center">
              {t(`errors.${displayError}`)}
            </p>
          )}

          {/* Display Name (sign-up only) */}
          {mode === 'signUp' && (
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('auth.displayName')}</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSubmitting}
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (sign-up only) */}
          {mode === 'signUp' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Forgot Password Link (sign-in only) */}
          {mode === 'signIn' && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setMode('forgotPassword')}
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'signIn' ? t('auth.signInWithEmail') : t('auth.signUpWithEmail')}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-base"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {t('auth.continueWithGoogle')}
          </Button>
        </form>

        {/* Terms notice */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground text-center">
            {t('auth.termsNotice')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
