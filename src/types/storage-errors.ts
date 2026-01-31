// src/types/storage-errors.ts

export type StorageErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'SESSION_NOT_FOUND'
  | 'INDEX_NOT_FOUND'
  | 'INDEX_CORRUPTED'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_DATA'
  | 'UNKNOWN';

export interface StorageError {
  code: StorageErrorCode;
  message: string;
  retry: boolean;  // Can this operation be retried?
}
