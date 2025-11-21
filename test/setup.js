/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.ENABLE_SANDBOX = 'true';
process.env.ENABLE_GIT_COMMITS = 'false'; // Disable git commits in tests
process.env.ENABLE_AUTONOMOUS_EVOLUTION = 'false';
process.env.MAX_FILE_SIZE_KB = '100';
process.env.SANDBOX_TIMEOUT_MS = '5000';
process.env.ALLOW_NETWORK_ACCESS = 'false';
process.env.ALLOW_FS_ACCESS = 'false';

// Global test timeout
jest.setTimeout(10000);

// Suppress console output during tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Clean up function for tests
global.cleanupTestFiles = async (paths) => {
  const fs = require('fs').promises;
  
  for (const filePath of paths) {
    try {
      await fs.rm(filePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
};

// Helper to create temporary test directory
global.createTempDir = async (name = 'test-temp') => {
  const fs = require('fs').promises;
  const path = require('path');
  const os = require('os');
  
  const tempDir = path.join(os.tmpdir(), `autonomo-test-${name}-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  return tempDir;
};

// Mock Gemini AI responses
global.mockGeminiResponse = (text) => ({
  response: {
    text: () => text
  }
});
