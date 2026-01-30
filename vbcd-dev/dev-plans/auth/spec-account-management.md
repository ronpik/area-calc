# Account Management - Design Specification (Phase 4)

**Status:** Ready for Implementation
**Version:** 1.0
**Last Updated:** 2025-01-30
**Scope:** Phase 4 - Account Deletion
**Depends On:**
- [Auth Spec (Phase 1)](./spec-auth-feature.md) - Firebase Auth setup
- [Persistence Spec (Phase 2/3)](../persistent/spec-session-persistence.md) - `deleteAllSessions()` function

---

## 1. Overview

Enable authenticated users to permanently delete their account and all associated data.

**Features:**
- Delete Account option in user dropdown menu
- Confirmation dialog with destructive action warning
- Re-authentication flow when required by Firebase
- Complete data cleanup (storage + auth account)

---

## 2. User Flow

```
User clicks "Delete Account"
         │
         ▼
┌─────────────────────────────┐
│   Confirmation Dialog       │
│   "Delete Account?"         │
│   [Cancel]  [Delete Account]│
└─────────────────────────────┘
         │
         ▼ (confirms)
┌─────────────────────────────┐
│   Loading state             │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 1. deleteAllSessions()      │──► Firebase Storage cleanup
│ 2. user.delete()            │──► Firebase Auth account
│ 3. Sign out                 │
│ 4. Toast: "Account deleted" │
└─────────────────────────────┘
         │
         ▼ (if auth/requires-recent-login)
┌─────────────────────────────┐
│   Re-auth Dialog            │
│   "Sign in again to         │
│    delete your account"     │
│   [Cancel] [Sign In]        │
└─────────────────────────────┘
         │
         ▼ (re-auth success)
         │
    Retry deletion
```

---

## 3. UI Components

### 3.1 Auth Button Dropdown (Update)

Add "Delete Account" menu item:

```
┌──────────────────────────┐
│ 📁 My Sessions           │
├──────────────────────────┤
│ 💾 Save Current          │
├──────────────────────────┤
│ 🚪 Sign Out              │
├──────────────────────────┤
│ 🗑️ Delete Account        │  ← NEW (destructive, red text)
└──────────────────────────┘
```

### 3.2 Delete Account Confirmation

Uses `ConfirmDialog` from persistence spec (section 6.6):

```typescript
<ConfirmDialog
  title={t('auth.deleteAccountConfirmTitle')}
  message={t('auth.deleteAccountConfirmMessage')}
  confirmLabel={t('auth.deleteAccount')}
  variant="destructive"
  onConfirm={handleDeleteAccount}
/>
```

### 3.3 Re-auth Dialog

Simple modal when `auth/requires-recent-login` error occurs:

```
┌─────────────────────────────────────────┐
│  Sign In Required                  [X]  │
├─────────────────────────────────────────┤
│                                         │
│  For security, please sign in again     │
│  to delete your account.                │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Cancel    │  │    Sign In      │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. Implementation

### 4.1 useAuth Hook Extension

```typescript
// Add to src/contexts/auth-context.tsx

interface UseAuth {
  // ... existing Phase 1 methods
  deleteAccount: () => Promise<void>;
}

async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    // 1. Delete all user data from storage
    await deleteAllSessions();

    // 2. Delete Firebase Auth account
    await user.delete();

    // 3. Toast success (auth state auto-updates via onAuthStateChanged)
    toast({ title: t('auth.accountDeleted') });

  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      // Trigger re-auth flow
      throw new ReAuthRequiredError();
    }
    throw error;
  }
}
```

### 4.2 Re-authentication Handler

```typescript
async function handleReAuthAndRetry(
  operation: () => Promise<void>
): Promise<void> {
  try {
    // Re-authenticate with Google popup
    await signInWithPopup(auth, googleProvider);

    // Retry the operation
    await operation();
  } catch (error) {
    // Handle re-auth failure
    toast({
      variant: 'destructive',
      title: t('errors.reAuthFailed')
    });
  }
}
```

---

## 5. Error Handling

| Error | User Message | Action |
|-------|--------------|--------|
| `auth/requires-recent-login` | "For security, please sign in again" | Show re-auth dialog |
| Network error | "Network error. Please try again." | Retry button |
| Storage deletion failed | "Failed to delete data. Please try again." | Retry button |
| Auth deletion failed | "Failed to delete account. Please try again." | Retry button |

---

## 6. i18n Keys

```json
// English
{
  "auth": {
    "deleteAccount": "Delete Account",
    "deleteAccountConfirmTitle": "Delete Account?",
    "deleteAccountConfirmMessage": "All your data will be permanently deleted. This action cannot be undone.",
    "accountDeleted": "Account deleted",
    "reAuthRequired": "Sign In Required",
    "reAuthMessage": "For security, please sign in again to delete your account."
  },
  "errors": {
    "reAuthFailed": "Sign in failed. Please try again.",
    "deleteAccountFailed": "Failed to delete account. Please try again."
  }
}
```

```json
// Hebrew
{
  "auth": {
    "deleteAccount": "מחק חשבון",
    "deleteAccountConfirmTitle": "למחוק את החשבון?",
    "deleteAccountConfirmMessage": "כל הנתונים שלך יימחקו לצמיתות. פעולה זו לא ניתנת לביטול.",
    "accountDeleted": "החשבון נמחק",
    "reAuthRequired": "נדרשת התחברות מחדש",
    "reAuthMessage": "מטעמי אבטחה, אנא התחבר שוב כדי למחוק את החשבון."
  },
  "errors": {
    "reAuthFailed": "ההתחברות נכשלה. אנא נסה שוב.",
    "deleteAccountFailed": "מחיקת החשבון נכשלה. אנא נסה שוב."
  }
}
```

---

## 7. Testing

### 7.1 Test Cases

| Test | Steps | Expected |
|------|-------|----------|
| Delete account - success | Click Delete Account → Confirm → Complete | All data deleted, signed out, toast shown |
| Delete account - cancel | Click Delete Account → Cancel | Dialog closes, no action |
| Re-auth required | Trigger `requires-recent-login` | Re-auth dialog shown, can retry |
| Re-auth cancelled | Re-auth dialog → Cancel | Returns to app, account not deleted |
| Network error | Disconnect → Delete Account | Error toast with retry |

### 7.2 Manual Checklist

- [ ] Delete Account appears in dropdown (red/destructive style)
- [ ] Confirmation dialog shows correct warning text
- [ ] Loading state during deletion
- [ ] All sessions deleted from Firebase Storage
- [ ] Firebase Auth account deleted
- [ ] Redirected to signed-out state
- [ ] Re-auth flow works when required
- [ ] Hebrew translations display correctly
- [ ] RTL layout for Hebrew

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `auth-context.tsx` | Add `deleteAccount()` method |
| `auth-button.tsx` | Add "Delete Account" menu item |
| `i18n/translations/en.json` | Add Phase 4 auth keys |
| `i18n/translations/he.json` | Add Phase 4 auth keys |

**New file (optional):**
- `src/components/reauth-dialog.tsx` - Re-authentication modal

---

*End of Specification*
