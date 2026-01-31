/**
 * Tests for Storage Errors Module
 *
 * Test requirements from spec:
 * - Firebase `storage/object-not-found` -> `SESSION_NOT_FOUND`
 * - Firebase `storage/unauthorized` -> `PERMISSION_DENIED`
 * - Firebase `storage/network-error` -> `NETWORK_ERROR` with retry=true
 * - Unknown Firebase errors -> `UNKNOWN` with retry=true
 * - TypeError with 'fetch' -> `NETWORK_ERROR`
 * - Generic errors -> `UNKNOWN`
 */

import { FirebaseError } from 'firebase/app';
import {
  isStorageError,
  mapFirebaseError,
  notAuthenticatedError,
} from '@/lib/storage-errors';
import type { StorageError } from '@/types/storage-errors';

/**
 * Helper to create a mock FirebaseError
 */
function createFirebaseError(code: string, message: string = 'Test error'): FirebaseError {
  return new FirebaseError(code, message);
}

describe('Storage Errors Module', () => {
  describe('isStorageError', () => {
    it('should return true for FirebaseError instances', () => {
      const error = createFirebaseError('storage/object-not-found');

      const result = isStorageError(error);

      expect(result).toBe(true);
    });

    it('should return false for standard Error instances', () => {
      const error = new Error('Standard error');

      const result = isStorageError(error);

      expect(result).toBe(false);
    });

    it('should return false for TypeError instances', () => {
      const error = new TypeError('Type error');

      const result = isStorageError(error);

      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isStorageError(null);

      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = isStorageError(undefined);

      expect(result).toBe(false);
    });

    it('should return false for plain objects', () => {
      const plainObject = { code: 'storage/error', message: 'error' };

      const result = isStorageError(plainObject);

      expect(result).toBe(false);
    });

    it('should return false for strings', () => {
      const result = isStorageError('storage/error');

      expect(result).toBe(false);
    });
  });

  describe('mapFirebaseError', () => {
    describe('Firebase storage/object-not-found error', () => {
      it('should map to SESSION_NOT_FOUND with retry=false', () => {
        const error = createFirebaseError('storage/object-not-found');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('SESSION_NOT_FOUND');
        expect(result.message).toBe('Session not found');
        expect(result.retry).toBe(false);
      });
    });

    describe('Firebase storage/unauthorized error', () => {
      it('should map to PERMISSION_DENIED with retry=false', () => {
        const error = createFirebaseError('storage/unauthorized');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('PERMISSION_DENIED');
        expect(result.message).toBe('Access denied. Please sign in again.');
        expect(result.retry).toBe(false);
      });
    });

    describe('Firebase storage/quota-exceeded error', () => {
      it('should map to QUOTA_EXCEEDED with retry=false', () => {
        const error = createFirebaseError('storage/quota-exceeded');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('QUOTA_EXCEEDED');
        expect(result.message).toBe('Storage quota exceeded');
        expect(result.retry).toBe(false);
      });
    });

    describe('Firebase storage/network-error', () => {
      it('should map to NETWORK_ERROR with retry=true', () => {
        const error = createFirebaseError('storage/network-error');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.message).toBe('Network error. Please check your connection.');
        expect(result.retry).toBe(true);
      });
    });

    describe('Firebase storage/retry-limit-exceeded error', () => {
      it('should map to NETWORK_ERROR with retry=true', () => {
        const error = createFirebaseError('storage/retry-limit-exceeded');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.message).toBe('Network error. Please check your connection.');
        expect(result.retry).toBe(true);
      });
    });

    describe('Unknown Firebase errors', () => {
      it('should map to UNKNOWN with retry=true for unknown storage codes', () => {
        const error = createFirebaseError('storage/unknown-code');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.message).toBe('Something went wrong. Please try again.');
        expect(result.retry).toBe(true);
      });

      it('should map to UNKNOWN with retry=true for non-storage Firebase codes', () => {
        const error = createFirebaseError('auth/invalid-email');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.message).toBe('Something went wrong. Please try again.');
        expect(result.retry).toBe(true);
      });

      it('should map to UNKNOWN with retry=true for empty code', () => {
        const error = createFirebaseError('');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });
    });

    describe('TypeError with fetch message', () => {
      it('should map to NETWORK_ERROR with retry=true when message contains "fetch"', () => {
        const error = new TypeError('Failed to fetch');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.message).toBe('Network error. Please check your connection.');
        expect(result.retry).toBe(true);
      });

      it('should map to NETWORK_ERROR when message includes "fetch" anywhere', () => {
        const error = new TypeError('Network request to fetch data failed');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.retry).toBe(true);
      });

      it('should map to UNKNOWN when TypeError message does not contain "fetch"', () => {
        const error = new TypeError('Cannot read property of undefined');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.message).toBe('Something went wrong. Please try again.');
        expect(result.retry).toBe(true);
      });
    });

    describe('Generic errors', () => {
      it('should map standard Error to UNKNOWN with retry=true', () => {
        const error = new Error('Something unexpected happened');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.message).toBe('Something went wrong. Please try again.');
        expect(result.retry).toBe(true);
      });

      it('should map RangeError to UNKNOWN with retry=true', () => {
        const error = new RangeError('Out of range');

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });

      it('should map plain object to UNKNOWN with retry=true', () => {
        const error = { message: 'Plain object error' };

        const result = mapFirebaseError(error);

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });

      it('should map null to UNKNOWN with retry=true', () => {
        const result = mapFirebaseError(null);

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });

      it('should map undefined to UNKNOWN with retry=true', () => {
        const result = mapFirebaseError(undefined);

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });

      it('should map string to UNKNOWN with retry=true', () => {
        const result = mapFirebaseError('string error');

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });

      it('should map number to UNKNOWN with retry=true', () => {
        const result = mapFirebaseError(404);

        expect(result.code).toBe('UNKNOWN');
        expect(result.retry).toBe(true);
      });
    });

    describe('Return type validation', () => {
      it('should return an object conforming to StorageError interface', () => {
        const error = createFirebaseError('storage/object-not-found');

        const result: StorageError = mapFirebaseError(error);

        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('retry');
        expect(typeof result.code).toBe('string');
        expect(typeof result.message).toBe('string');
        expect(typeof result.retry).toBe('boolean');
      });

      it('should always return a valid StorageError regardless of input', () => {
        const testInputs = [
          null,
          undefined,
          'string',
          123,
          {},
          [],
          new Error(),
          new TypeError('fetch failed'),
          createFirebaseError('storage/unknown'),
        ];

        for (const input of testInputs) {
          const result = mapFirebaseError(input);

          expect(result).toHaveProperty('code');
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('retry');
          expect(typeof result.code).toBe('string');
          expect(typeof result.message).toBe('string');
          expect(typeof result.retry).toBe('boolean');
        }
      });
    });
  });

  describe('notAuthenticatedError', () => {
    it('should return NOT_AUTHENTICATED error with retry=false', () => {
      const result = notAuthenticatedError();

      expect(result.code).toBe('NOT_AUTHENTICATED');
      expect(result.message).toBe('Not authenticated');
      expect(result.retry).toBe(false);
    });

    it('should return an object conforming to StorageError interface', () => {
      const result: StorageError = notAuthenticatedError();

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('retry');
    });

    it('should return a new object on each call', () => {
      const result1 = notAuthenticatedError();
      const result2 = notAuthenticatedError();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('Retry flag semantics', () => {
    it('should mark non-retryable errors correctly', () => {
      const nonRetryableErrors = [
        createFirebaseError('storage/object-not-found'),
        createFirebaseError('storage/unauthorized'),
        createFirebaseError('storage/quota-exceeded'),
      ];

      for (const error of nonRetryableErrors) {
        const result = mapFirebaseError(error);
        expect(result.retry).toBe(false);
      }
    });

    it('should mark retryable errors correctly', () => {
      const retryableErrors = [
        createFirebaseError('storage/network-error'),
        createFirebaseError('storage/retry-limit-exceeded'),
        createFirebaseError('storage/some-unknown-error'),
        new TypeError('fetch failed'),
        new Error('generic error'),
      ];

      for (const error of retryableErrors) {
        const result = mapFirebaseError(error);
        expect(result.retry).toBe(true);
      }
    });

    it('should mark notAuthenticatedError as non-retryable', () => {
      const result = notAuthenticatedError();
      expect(result.retry).toBe(false);
    });
  });
});

describe('Storage Error Types', () => {
  describe('StorageErrorCode type', () => {
    it('should allow all valid error codes', () => {
      // This test verifies the import works and type is usable
      const validCodes: import('@/types/storage-errors').StorageErrorCode[] = [
        'NOT_AUTHENTICATED',
        'SESSION_NOT_FOUND',
        'INDEX_NOT_FOUND',
        'NETWORK_ERROR',
        'PERMISSION_DENIED',
        'QUOTA_EXCEEDED',
        'INVALID_DATA',
        'UNKNOWN',
      ];

      expect(validCodes).toHaveLength(8);
      expect(validCodes).toContain('NOT_AUTHENTICATED');
      expect(validCodes).toContain('SESSION_NOT_FOUND');
      expect(validCodes).toContain('INDEX_NOT_FOUND');
      expect(validCodes).toContain('NETWORK_ERROR');
      expect(validCodes).toContain('PERMISSION_DENIED');
      expect(validCodes).toContain('QUOTA_EXCEEDED');
      expect(validCodes).toContain('INVALID_DATA');
      expect(validCodes).toContain('UNKNOWN');
    });
  });

  describe('StorageError interface', () => {
    it('should allow creating an object with all required fields', () => {
      const error: StorageError = {
        code: 'SESSION_NOT_FOUND',
        message: 'Test message',
        retry: false,
      };

      expect(error.code).toBe('SESSION_NOT_FOUND');
      expect(error.message).toBe('Test message');
      expect(error.retry).toBe(false);
    });

    it('should have the expected structure with three properties', () => {
      const error: StorageError = {
        code: 'UNKNOWN',
        message: 'Test',
        retry: true,
      };

      const keys = Object.keys(error);
      expect(keys).toContain('code');
      expect(keys).toContain('message');
      expect(keys).toContain('retry');
      expect(keys).toHaveLength(3);
    });
  });
});
