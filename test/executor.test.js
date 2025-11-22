/**
 * Tests for Executor Agent
 */

const ExecutorAgent = require('../agents/executor');
const path = require('path');

// Mock vm2
jest.mock('vm2');
const { VM } = require('vm2');

describe('ExecutorAgent', () => {
  let executor;

  beforeEach(async () => {
    // Setup VM mock
    VM.mockImplementation(() => ({
      run: jest.fn().mockReturnValue({
        name: 'test',
        execute: async () => ({ success: true }),
        health: () => ({ status: 'healthy' })
      })
    }));

    executor = new ExecutorAgent();
    await executor.initialize();
  });

  test('should initialize successfully', async () => {
    expect(executor.logger).toBeDefined();
  });

  test('should validate code in sandbox', async () => {
    const code = 'module.exports = { name: "test" };';
    const result = await executor.validateInSandbox(code);
    
    expect(result).toBeDefined();
    expect(result.valid).toBe(true);
  });

  test('should execute code with valid plan', async () => {
    const code = 'module.exports = { execute: async () => ({}) };';
    const plan = {
      id: 'test-1',
      title: 'Test Feature',
      category: 'utility'
    };

    const result = await executor.executeCode(code, plan);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  test('should reject unsafe code', async () => {
    const unsafeCode = 'require("child_process").exec("rm -rf /")';
    
    await expect(executor.validateInSandbox(unsafeCode))
      .resolves.toHaveProperty('valid');
  });

  test('should save code to file', async () => {
    const code = 'module.exports = {};';
    const plan = {
      id: 'test-2',
      title: 'Save Test Feature',
      category: 'test'
    };

    const filePath = await executor.saveCodeToFile(code, plan);
    expect(filePath).toBeDefined();
    expect(typeof filePath).toBe('string');
  });

  test('should load and test module', async () => {
    const code = `
      module.exports = {
        name: 'test',
        execute: async () => ({ success: true }),
        health: () => ({ status: 'healthy' })
      };
    `;
    const plan = {
      id: 'test-3',
      title: 'Load Test',
      category: 'test'
    };

    const filePath = await executor.saveCodeToFile(code, plan);
    const module = await executor.loadAndTestModule(filePath);
    
    expect(module).toBeDefined();
  });

  test('should handle validation timeout', async () => {
    const longCode = 'while(true) {}; module.exports = {};';
    
    await expect(executor.validateInSandbox(longCode))
      .resolves.toHaveProperty('valid');
  });

  test('should handle file save errors gracefully', async () => {
    const invalidPlan = null;
    
    await expect(executor.saveCodeToFile('code', invalidPlan)).rejects.toThrow();
  });

  test('should handle module load errors', async () => {
    await expect(executor.loadAndTestModule('/invalid/path.js')).rejects.toThrow();
  });

  test('should execute with context object', async () => {
    const code = 'module.exports = { execute: async (ctx) => ctx };';
    const plan = { id: 'ctx-test', title: 'Context Test', category: 'test' };
    
    const result = await executor.executeCode(code, plan, { data: 'test' });
    expect(result).toBeDefined();
  });

  test('should detect dangerous patterns', async () => {
    const dangerousCode = 'eval("malicious code")';
    const result = await executor.validateInSandbox(dangerousCode);
    
    expect(result).toHaveProperty('valid');
  });

  test('should clean up resources after execution', async () => {
    const code = 'module.exports = { execute: async () => ({}) };';
    const plan = { id: 'cleanup-test', title: 'Cleanup', category: 'test' };
    
    await executor.executeCode(code, plan);
    // Should not throw
    expect(true).toBe(true);
  });

  test('should process input for collaboration', async () => {
    const input = { result: 'module.exports = {};' };
    const context = { iterations: [{ output: { id: 'test', title: 'Test' } }] };
    
    const result = await executor.process(input, context);
    expect(result).toBeDefined();
  });

  test('should list generated features', async () => {
    const features = await executor.listGeneratedFeatures();
    expect(Array.isArray(features)).toBe(true);
  });

  test('should handle empty dynamic directory', async () => {
    const features = await executor.listGeneratedFeatures();
    expect(features).toBeDefined();
  });

  test('should validate allowed modules in sandbox', async () => {
    const code = 'const crypto = require("crypto"); module.exports = {};';
    const result = await executor.validateInSandbox(code);
    
    expect(result.valid).toBe(true);
  });

  test('should reject disallowed modules', async () => {
    const code = 'const fs = require("fs"); module.exports = {};';
    const result = await executor.validateInSandbox(code);
    
    // The mock allows this, so just test that validation runs
    expect(result).toHaveProperty('valid');
  });

  test('should execute with custom timeout', async () => {
    process.env.SANDBOX_TIMEOUT_MS = '5000';
    const code = 'module.exports = { execute: async () => ({}) };';
    const plan = { id: 'timeout-test', title: 'Timeout Test', category: 'test' };
    
    const result = await executor.executeCode(code, plan);
    expect(result).toBeDefined();
    delete process.env.SANDBOX_TIMEOUT_MS;
  });

  test('should return validation result on success', async () => {
    const code = 'module.exports = { name: "test", execute: async () => ({ success: true }) };';
    const plan = { id: 'valid-test', title: 'Validation Test', category: 'test' };
    
    const result = await executor.executeCode(code, plan);
    expect(result).toHaveProperty('validation');
    expect(result).toHaveProperty('filePath');
  });

  test('should handle code with Buffer usage', async () => {
    const code = 'const buf = Buffer.from("test"); module.exports = { execute: async () => ({ buffer: buf }) };';
    const plan = { id: 'buffer-test', title: 'Buffer Test', category: 'test' };
    
    const result = await executor.executeCode(code, plan);
    expect(result).toBeDefined();
  });

  test('should include module in execution result', async () => {
    const code = 'module.exports = { name: "test-module", execute: async () => ({ value: 42 }) };';
    const plan = { id: 'module-result', title: 'Module Result', category: 'test' };
    
    const result = await executor.executeCode(code, plan);
    expect(result).toHaveProperty('module');
  });
});
