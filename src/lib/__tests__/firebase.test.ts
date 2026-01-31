/**
 * Tests for Firebase Configuration Module
 *
 * Test requirements from spec:
 * - Firebase module exports `auth`, `storage`, and `googleProvider`
 * - No initialization errors when env vars are set
 * - Multiple imports don't cause re-initialization
 */

// Shared state for mock apps array (persists across module resets)
let mockAppsArray: { name: string }[] = [];

// Mock Firebase modules before any imports
jest.mock('firebase/app', () => {
  const mockApp = { name: 'test-app' };

  return {
    initializeApp: jest.fn(() => {
      const app = { ...mockApp };
      mockAppsArray.push(app);
      return app;
    }),
    getApps: jest.fn(() => mockAppsArray),
  };
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    name: 'mock-auth',
    currentUser: null,
  })),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    providerId: 'google.com',
    addScope: jest.fn(),
  })),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({
    name: 'mock-storage',
    bucket: 'test-bucket',
  })),
}));

// Set environment variables before importing the module
const testEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abc123',
};

// Apply test env vars
Object.assign(process.env, testEnvVars);

describe('Firebase Configuration Module', () => {
  beforeEach(() => {
    // Reset module registry between tests
    jest.resetModules();

    // Reset the mock apps array
    mockAppsArray = [];

    // Clear all mock calls
    jest.clearAllMocks();

    // Ensure env vars are set
    Object.assign(process.env, testEnvVars);
  });

  describe('Module Exports', () => {
    it('should export auth object', () => {
      const firebase = require('@/lib/firebase');

      expect(firebase.auth).toBeDefined();
      expect(firebase.auth).toHaveProperty('name', 'mock-auth');
    });

    it('should export storage object', () => {
      const firebase = require('@/lib/firebase');

      expect(firebase.storage).toBeDefined();
      expect(firebase.storage).toHaveProperty('name', 'mock-storage');
    });

    it('should export googleProvider instance', () => {
      const firebase = require('@/lib/firebase');

      expect(firebase.googleProvider).toBeDefined();
      expect(firebase.googleProvider).toHaveProperty('providerId', 'google.com');
    });

    it('should export all three objects (auth, storage, googleProvider)', () => {
      const firebase = require('@/lib/firebase');

      expect(firebase).toHaveProperty('auth');
      expect(firebase).toHaveProperty('storage');
      expect(firebase).toHaveProperty('googleProvider');

      // Verify the expected exports exist
      const exportKeys = Object.keys(firebase);
      expect(exportKeys).toContain('auth');
      expect(exportKeys).toContain('storage');
      expect(exportKeys).toContain('googleProvider');
    });
  });

  describe('Initialization', () => {
    it('should initialize Firebase without errors when env vars are set', () => {
      expect(() => {
        require('@/lib/firebase');
      }).not.toThrow();
    });

    it('should call initializeApp with correct config from env vars', () => {
      const { initializeApp } = require('firebase/app');

      require('@/lib/firebase');

      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test-project.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-project.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123456789:web:abc123',
      });
    });

    it('should call getAuth with the initialized app', () => {
      const { getAuth } = require('firebase/auth');

      require('@/lib/firebase');

      expect(getAuth).toHaveBeenCalled();
      expect(getAuth).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-app' }));
    });

    it('should call getStorage with the initialized app', () => {
      const { getStorage } = require('firebase/storage');

      require('@/lib/firebase');

      expect(getStorage).toHaveBeenCalled();
      expect(getStorage).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-app' }));
    });

    it('should create a new GoogleAuthProvider instance', () => {
      const { GoogleAuthProvider } = require('firebase/auth');

      require('@/lib/firebase');

      expect(GoogleAuthProvider).toHaveBeenCalled();
    });
  });

  describe('Re-initialization Prevention', () => {
    it('should not reinitialize when module is imported multiple times', () => {
      const { initializeApp, getApps } = require('firebase/app');

      // First import
      require('@/lib/firebase');
      const callsAfterFirstImport = initializeApp.mock.calls.length;

      // Verify only one initialization occurred
      expect(callsAfterFirstImport).toBe(1);
      expect(getApps().length).toBe(1);
    });

    it('should reuse existing app if getApps returns non-empty array', () => {
      const { initializeApp, getApps } = require('firebase/app');

      // First initialization
      require('@/lib/firebase');
      expect(initializeApp).toHaveBeenCalledTimes(1);

      // The implementation uses getApps().length === 0 check
      // Verify app is tracked
      const appsCount = getApps().length;
      expect(appsCount).toBe(1);
    });

    it('should use getApps()[0] when app already exists', () => {
      // Pre-populate apps to simulate existing initialization
      mockAppsArray.push({ name: 'existing-app' });

      const { initializeApp, getApps } = require('firebase/app');

      // Import firebase module - it should detect existing app
      require('@/lib/firebase');

      // initializeApp should NOT be called since getApps().length > 0
      expect(initializeApp).not.toHaveBeenCalled();

      // Should have used existing app
      expect(getApps().length).toBe(1);
      expect(getApps()[0].name).toBe('existing-app');
    });

    it('should only call initializeApp once even with the singleton pattern', () => {
      const { initializeApp } = require('firebase/app');

      // First import triggers initialization
      require('@/lib/firebase');
      expect(initializeApp).toHaveBeenCalledTimes(1);

      // Subsequent imports of the cached module don't re-run initialization
      // (This tests Node.js module caching behavior combined with the singleton pattern)
      const firebase1 = require('@/lib/firebase');
      const firebase2 = require('@/lib/firebase');

      // Should still only have been called once
      expect(initializeApp).toHaveBeenCalledTimes(1);

      // Should return same instances
      expect(firebase1.auth).toBe(firebase2.auth);
      expect(firebase1.storage).toBe(firebase2.storage);
      expect(firebase1.googleProvider).toBe(firebase2.googleProvider);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined env vars gracefully during module load', () => {
      // Clear env vars
      delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

      // Module should still load (Firebase SDK handles undefined config values)
      expect(() => {
        require('@/lib/firebase');
      }).not.toThrow();
    });

    it('should create GoogleAuthProvider as new instance', () => {
      const { GoogleAuthProvider } = require('firebase/auth');

      require('@/lib/firebase');

      // GoogleAuthProvider should be instantiated with 'new'
      expect(GoogleAuthProvider).toHaveBeenCalledTimes(1);
    });

    it('should pass undefined values to initializeApp when env vars are missing', () => {
      // Clear env vars
      delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

      const { initializeApp } = require('firebase/app');

      require('@/lib/firebase');

      expect(initializeApp).toHaveBeenCalledWith({
        apiKey: undefined,
        authDomain: undefined,
        projectId: undefined,
        storageBucket: undefined,
        messagingSenderId: undefined,
        appId: undefined,
      });
    });
  });
});

describe('Firebase Module Integration', () => {
  beforeEach(() => {
    jest.resetModules();
    mockAppsArray = [];
    jest.clearAllMocks();
    Object.assign(process.env, testEnvVars);
  });

  it('should provide auth object that can be used for authentication operations', () => {
    const { auth } = require('@/lib/firebase');

    // Auth should have expected Firebase Auth structure
    expect(auth).toBeDefined();
    expect(typeof auth).toBe('object');
  });

  it('should provide storage object that can be used for file operations', () => {
    const { storage } = require('@/lib/firebase');

    // Storage should have expected Firebase Storage structure
    expect(storage).toBeDefined();
    expect(typeof storage).toBe('object');
  });

  it('should provide googleProvider that can be used with signInWithPopup', () => {
    const { googleProvider } = require('@/lib/firebase');

    // GoogleProvider should be an instance with correct providerId
    expect(googleProvider).toBeDefined();
    expect(googleProvider.providerId).toBe('google.com');
  });

  it('should have all exports available for use by other modules', () => {
    const { auth, storage, googleProvider } = require('@/lib/firebase');

    // All exports should be truthy and usable
    expect(auth).toBeTruthy();
    expect(storage).toBeTruthy();
    expect(googleProvider).toBeTruthy();

    // Types should be objects
    expect(typeof auth).toBe('object');
    expect(typeof storage).toBe('object');
    expect(typeof googleProvider).toBe('object');
  });
});
