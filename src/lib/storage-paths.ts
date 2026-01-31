// src/lib/storage-paths.ts

/**
 * LocalStorage key for points (existing, maintain compatibility)
 */
export const LOCALSTORAGE_KEY = 'recordedPoints';

/**
 * Path builders for Firebase Storage
 */
export const getUserBasePath = (uid: string) => `users/${uid}`;

export const getIndexPath = (uid: string) => `users/${uid}/index.json`;

export const getSessionPath = (uid: string, sessionId: string) =>
  `users/${uid}/sessions/${sessionId}.json`;
