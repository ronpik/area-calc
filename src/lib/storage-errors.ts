// src/lib/storage-errors.ts

import { FirebaseError } from 'firebase/app';
import type { StorageError, StorageErrorCode } from '@/types/storage-errors';

/**
 * Check if error is a Firebase storage error
 */
export function isStorageError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError;
}

/**
 * Map Firebase errors to StorageError
 */
export function mapFirebaseError(error: unknown): StorageError {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'storage/object-not-found':
        return {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found',
          retry: false
        };
      case 'storage/unauthorized':
        return {
          code: 'PERMISSION_DENIED',
          message: 'Access denied. Please sign in again.',
          retry: false
        };
      case 'storage/quota-exceeded':
        return {
          code: 'QUOTA_EXCEEDED',
          message: 'Storage quota exceeded',
          retry: false
        };
      case 'storage/retry-limit-exceeded':
      case 'storage/network-error':
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          retry: true
        };
      default:
        return {
          code: 'UNKNOWN',
          message: 'Something went wrong. Please try again.',
          retry: true
        };
    }
  }

  if (error instanceof TypeError && (error as Error).message?.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
      retry: true
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Something went wrong. Please try again.',
    retry: true
  };
}

/**
 * Create a "not authenticated" error
 */
export function notAuthenticatedError(): StorageError {
  return {
    code: 'NOT_AUTHENTICATED',
    message: 'Not authenticated',
    retry: false
  };
}
