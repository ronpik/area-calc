// Jest setup file

// Enable React 18 act() environment for tests
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Reset modules before each test to ensure clean state
beforeEach(() => {
  jest.resetModules();
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
