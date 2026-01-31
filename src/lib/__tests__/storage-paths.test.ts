/**
 * Tests for Storage Paths Module
 *
 * Test requirements from spec:
 * - getUserBasePath('uid123') returns 'users/uid123'
 * - getIndexPath('uid123') returns 'users/uid123/index.json'
 * - getSessionPath('uid123', 'sess456') returns 'users/uid123/sessions/sess456.json'
 * - LOCALSTORAGE_KEY constant exported correctly
 */

import {
  LOCALSTORAGE_KEY,
  getUserBasePath,
  getIndexPath,
  getSessionPath,
} from '@/lib/storage-paths';

describe('Storage Paths Module', () => {
  describe('LOCALSTORAGE_KEY constant', () => {
    it('should export LOCALSTORAGE_KEY as "recordedPoints"', () => {
      expect(LOCALSTORAGE_KEY).toBe('recordedPoints');
    });

    it('should have correct type (string)', () => {
      expect(typeof LOCALSTORAGE_KEY).toBe('string');
    });

    it('should be a non-empty string', () => {
      expect(LOCALSTORAGE_KEY.length).toBeGreaterThan(0);
    });
  });

  describe('getUserBasePath', () => {
    it('should return correct path for uid123', () => {
      expect(getUserBasePath('uid123')).toBe('users/uid123');
    });

    it('should return correct path for various uid values', () => {
      expect(getUserBasePath('user-abc')).toBe('users/user-abc');
      expect(getUserBasePath('12345')).toBe('users/12345');
      expect(getUserBasePath('a')).toBe('users/a');
    });

    it('should handle uid with special characters', () => {
      expect(getUserBasePath('user_123')).toBe('users/user_123');
      expect(getUserBasePath('user.name')).toBe('users/user.name');
      expect(getUserBasePath('user-name-123')).toBe('users/user-name-123');
    });

    it('should handle long uid values', () => {
      const longUid = 'a'.repeat(100);
      expect(getUserBasePath(longUid)).toBe(`users/${longUid}`);
    });

    it('should handle empty string uid', () => {
      expect(getUserBasePath('')).toBe('users/');
    });

    it('should be a function', () => {
      expect(typeof getUserBasePath).toBe('function');
    });

    it('should return a string', () => {
      const result = getUserBasePath('test');
      expect(typeof result).toBe('string');
    });
  });

  describe('getIndexPath', () => {
    it('should return correct path for uid123', () => {
      expect(getIndexPath('uid123')).toBe('users/uid123/index.json');
    });

    it('should return correct path for various uid values', () => {
      expect(getIndexPath('user-abc')).toBe('users/user-abc/index.json');
      expect(getIndexPath('12345')).toBe('users/12345/index.json');
      expect(getIndexPath('a')).toBe('users/a/index.json');
    });

    it('should handle uid with special characters', () => {
      expect(getIndexPath('user_123')).toBe('users/user_123/index.json');
      expect(getIndexPath('user.name')).toBe('users/user.name/index.json');
    });

    it('should handle long uid values', () => {
      const longUid = 'b'.repeat(100);
      expect(getIndexPath(longUid)).toBe(`users/${longUid}/index.json`);
    });

    it('should handle empty string uid', () => {
      expect(getIndexPath('')).toBe('users//index.json');
    });

    it('should always end with /index.json', () => {
      const result = getIndexPath('any-user');
      expect(result.endsWith('/index.json')).toBe(true);
    });

    it('should be a function', () => {
      expect(typeof getIndexPath).toBe('function');
    });

    it('should return a string', () => {
      const result = getIndexPath('test');
      expect(typeof result).toBe('string');
    });
  });

  describe('getSessionPath', () => {
    it('should return correct path for uid123 and sess456', () => {
      expect(getSessionPath('uid123', 'sess456')).toBe('users/uid123/sessions/sess456.json');
    });

    it('should return correct path for various uid and sessionId values', () => {
      expect(getSessionPath('user-abc', 'session-1')).toBe('users/user-abc/sessions/session-1.json');
      expect(getSessionPath('12345', 'xyz789')).toBe('users/12345/sessions/xyz789.json');
    });

    it('should handle uid with special characters', () => {
      expect(getSessionPath('user_123', 'session_456')).toBe('users/user_123/sessions/session_456.json');
    });

    it('should handle UUID-style session IDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(getSessionPath('user1', uuid)).toBe(`users/user1/sessions/${uuid}.json`);
    });

    it('should handle long values', () => {
      const longUid = 'c'.repeat(50);
      const longSessionId = 'd'.repeat(50);
      expect(getSessionPath(longUid, longSessionId)).toBe(`users/${longUid}/sessions/${longSessionId}.json`);
    });

    it('should handle empty string uid', () => {
      expect(getSessionPath('', 'sess123')).toBe('users//sessions/sess123.json');
    });

    it('should handle empty string sessionId', () => {
      expect(getSessionPath('uid123', '')).toBe('users/uid123/sessions/.json');
    });

    it('should handle both empty strings', () => {
      expect(getSessionPath('', '')).toBe('users//sessions/.json');
    });

    it('should always end with .json', () => {
      const result = getSessionPath('any-user', 'any-session');
      expect(result.endsWith('.json')).toBe(true);
    });

    it('should always contain /sessions/ in the path', () => {
      const result = getSessionPath('any-user', 'any-session');
      expect(result.includes('/sessions/')).toBe(true);
    });

    it('should be a function', () => {
      expect(typeof getSessionPath).toBe('function');
    });

    it('should return a string', () => {
      const result = getSessionPath('test', 'session');
      expect(typeof result).toBe('string');
    });
  });

  describe('Path Consistency', () => {
    it('should use consistent base path across all functions', () => {
      const uid = 'test-user';
      const basePath = getUserBasePath(uid);
      const indexPath = getIndexPath(uid);
      const sessionPath = getSessionPath(uid, 'session-1');

      // Index path should start with base path
      expect(indexPath.startsWith(basePath)).toBe(true);

      // Session path should start with base path
      expect(sessionPath.startsWith(basePath)).toBe(true);
    });

    it('should create valid Firebase Storage paths (no double slashes except edge cases)', () => {
      const uid = 'user123';
      const sessionId = 'session456';

      const basePath = getUserBasePath(uid);
      const indexPath = getIndexPath(uid);
      const sessionPath = getSessionPath(uid, sessionId);

      // No double slashes in normal paths
      expect(basePath.includes('//')).toBe(false);
      expect(indexPath.includes('//')).toBe(false);
      expect(sessionPath.includes('//')).toBe(false);
    });

    it('should follow the spec path structure: users/{uid}/...', () => {
      const uid = 'abc123';

      expect(getUserBasePath(uid)).toMatch(/^users\/[^/]+$/);
      expect(getIndexPath(uid)).toMatch(/^users\/[^/]+\/index\.json$/);
      expect(getSessionPath(uid, 'sess1')).toMatch(/^users\/[^/]+\/sessions\/[^/]+\.json$/);
    });
  });

  describe('Module Exports', () => {
    it('should export all expected functions and constants', () => {
      expect(LOCALSTORAGE_KEY).toBeDefined();
      expect(getUserBasePath).toBeDefined();
      expect(getIndexPath).toBeDefined();
      expect(getSessionPath).toBeDefined();
    });

    it('should export functions that are callable', () => {
      expect(() => getUserBasePath('test')).not.toThrow();
      expect(() => getIndexPath('test')).not.toThrow();
      expect(() => getSessionPath('test', 'session')).not.toThrow();
    });
  });

  describe('Path Structure Validation', () => {
    it('getUserBasePath should match spec: users/{uid}', () => {
      const result = getUserBasePath('myuid');
      expect(result).toBe('users/myuid');
    });

    it('getIndexPath should match spec: users/{uid}/index.json', () => {
      const result = getIndexPath('myuid');
      expect(result).toBe('users/myuid/index.json');
    });

    it('getSessionPath should match spec: users/{uid}/sessions/{sessionId}.json', () => {
      const result = getSessionPath('myuid', 'mysession');
      expect(result).toBe('users/myuid/sessions/mysession.json');
    });
  });
});
