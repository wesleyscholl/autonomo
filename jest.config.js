module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'core/**/*.js',
    'agents/**/*.js',
    'index.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/logs/**',
    '!**/dynamic/**'
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Timeout for tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Max workers for parallel execution
  maxWorkers: '50%'
};
