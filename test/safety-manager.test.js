/**
 * 🧪 SafetyManager Test Suite
 * Comprehensive tests for code validation and security
 */

const SafetyManager = require('../core/safety-manager');

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })),
  format: {
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

describe('SafetyManager', () => {
  let safetyManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    safetyManager = new SafetyManager();
    
    // Ensure logger is properly set
    if (!safetyManager.logger || !safetyManager.logger.info) {
      safetyManager.logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
    }
    
    await safetyManager.initialize();
  });

  describe('Initialization', () => {
    test('should initialize with default safety rules', () => {
      expect(safetyManager.safetyRules).toBeDefined();
      expect(safetyManager.safetyRules.maxFileSize).toBeGreaterThan(0);
      expect(safetyManager.safetyRules.maxExecutionTime).toBeGreaterThan(0);
      expect(safetyManager.safetyRules.maxMemoryUsage).toBeGreaterThan(0);
    });

    test('should load banned patterns', () => {
      expect(safetyManager.bannedPatterns).toBeDefined();
      expect(safetyManager.bannedPatterns.length).toBeGreaterThan(0);
      expect(Array.isArray(safetyManager.bannedPatterns)).toBe(true);
    });

    test('should load allowed modules', () => {
      expect(safetyManager.allowedModules).toBeDefined();
      expect(safetyManager.allowedModules.length).toBeGreaterThan(0);
      expect(safetyManager.allowedModules).toContain('crypto');
      expect(safetyManager.allowedModules).toContain('uuid');
    });
  });

  describe('Plan Validation', () => {
    test('should approve valid plan', async () => {
      const validPlan = {
        id: 'test-plan-001',
        title: 'Valid Feature',
        description: 'A safe and valid feature plan',
        category: 'utility',
        complexity: 'low',
        estimatedLOC: 50,
        dependencies: ['crypto'],
        files: [
          {
            path: 'dynamic/test-feature.js',
            type: 'main',
            purpose: 'Main feature implementation'
          }
        ],
        safetyConsiderations: ['Input validation', 'Error handling']
      };

      const result = await safetyManager.validatePlan(validPlan);

      expect(result.approved).toBe(true);
      expect(result.reason).toContain('passed all safety checks');
      expect(result.severity).toBe('none');
    });

    test('should reject plan with missing required fields', async () => {
      const invalidPlan = {
        id: 'incomplete-plan',
        title: 'No',
        // Missing description, category, complexity
      };

      const result = await safetyManager.validatePlan(invalidPlan);

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('validation failed');
      expect(result.severity).toBe('high');
    });

    test('should reject plan with title too short', async () => {
      const plan = {
        id: 'short-title',
        title: 'ab', // Too short
        description: 'Valid description here',
        category: 'utility',
        complexity: 'low'
      };

      const result = await safetyManager.validatePlan(plan);

      expect(result.approved).toBe(false);
      expect(result.severity).toBe('high');
    });

    test('should reject plan with invalid category', async () => {
      const plan = {
        id: 'bad-category',
        title: 'Valid Title',
        description: 'Valid description',
        category: 'invalid-category',
        complexity: 'low'
      };

      const result = await safetyManager.validatePlan(plan);

      expect(result.approved).toBe(false);
    });

    test('should reject plan with suspicious keywords', async () => {
      const suspiciousPlans = [
        {
          id: 'hack-plan',
          title: 'Hack the system',
          description: 'This will hack something',
          category: 'utility',
          complexity: 'low'
        },
        {
          id: 'delete-plan',
          title: 'Delete Everything',
          description: 'Delete all files',
          category: 'utility',
          complexity: 'low'
        },
        {
          id: 'exploit-plan',
          title: 'Exploit Finder',
          description: 'Find exploits in the system',
          category: 'utility',
          complexity: 'low'
        }
      ];

      for (const plan of suspiciousPlans) {
        const result = await safetyManager.validatePlan(plan);
        expect(result.approved).toBe(false);
        expect(result.reason).toContain('Suspicious keyword');
      }
    });

    test('should reject plan with unsafe file paths', async () => {
      const plan = {
        id: 'unsafe-path',
        title: 'Unsafe Path Feature',
        description: 'Feature with unsafe file path',
        category: 'utility',
        complexity: 'low',
        files: [
          {
            path: '../../../etc/passwd', // Unsafe path
            type: 'main',
            purpose: 'Bad intentions'
          }
        ]
      };

      const result = await safetyManager.validatePlan(plan);

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('Unsafe file path');
    });

    test('should reject plan with disallowed dependencies', async () => {
      const plan = {
        id: 'bad-deps',
        title: 'Bad Dependencies',
        description: 'Feature with disallowed dependencies',
        category: 'utility',
        complexity: 'low',
        dependencies: ['child_process', 'fs']
      };

      const result = await safetyManager.validatePlan(plan);

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('not in the allowed modules list');
    });

    test('should limit number of dependencies', async () => {
      const plan = {
        id: 'too-many-deps',
        title: 'Too Many Dependencies',
        description: 'Feature with excessive dependencies',
        category: 'utility',
        complexity: 'low',
        dependencies: Array(15).fill('crypto') // More than max allowed
      };

      const result = await safetyManager.validatePlan(plan);

      expect(result.approved).toBe(false);
    });

    test('should limit number of files', async () => {
      const plan = {
        id: 'too-many-files',
        title: 'Too Many Files',
        description: 'Feature with too many files',
        category: 'utility',
        complexity: 'low',
        files: Array(10).fill({
          path: 'dynamic/test.js',
          type: 'main',
          purpose: 'test'
        })
      };

      const result = await safetyManager.validatePlan(plan);

      expect(result.approved).toBe(false);
    });
  });

  describe('Static Code Analysis', () => {
    test('should pass safe code', () => {
      const safeCode = `
        const crypto = require('crypto');
        
        function calculateHash(input) {
          return crypto.createHash('sha256').update(input).digest('hex');
        }
        
        module.exports = { calculateHash };
      `;

      const result = safetyManager.performStaticAnalysis(safeCode);

      expect(result.safe).toBe(true);
      expect(result.metrics).toBeDefined();
    });

    test('should reject code exceeding max file size', () => {
      const hugeCode = 'x'.repeat(safetyManager.safetyRules.maxFileSize + 1000);

      const result = safetyManager.performStaticAnalysis(hugeCode);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });

    test('should detect child_process usage', () => {
      const dangerousCode = `
        const { exec } = require('child_process');
        exec('rm -rf /');
      `;

      const result = safetyManager.performStaticAnalysis(dangerousCode);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Banned pattern detected');
    });

    test('should detect eval usage', () => {
      const dangerousCode = `
        const userInput = getUserInput();
        eval(userInput);
      `;

      const result = safetyManager.performStaticAnalysis(dangerousCode);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('eval');
    });

    test('should detect Function constructor', () => {
      const dangerousCode = `
        const fn = new Function('return process.exit()');
        fn();
      `;

      const result = safetyManager.performStaticAnalysis(dangerousCode);

      expect(result.safe).toBe(false);
    });

    test('should detect infinite loops', () => {
      const dangerousCodes = [
        'while (true) { console.log("infinite"); }',
        'for (;;) { console.log("infinite"); }',
        'do { console.log("infinite"); } while (true);'
      ];

      for (const code of dangerousCodes) {
        const result = safetyManager.performStaticAnalysis(code);
        expect(result.safe).toBe(false);
      }
    });

    test('should detect process.exit usage', () => {
      const dangerousCode = `
        if (error) {
          process.exit(1);
        }
      `;

      const result = safetyManager.performStaticAnalysis(dangerousCode);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('process.exit');
    });

    test('should detect file system write operations', () => {
      const dangerousCodes = [
        'fs.writeFile("/etc/passwd", "hacked");',
        'fs.writeFileSync("/important.txt", "data");',
        'fs.unlink("/critical.log");',
        'fs.unlinkSync("/app.js");'
      ];

      for (const code of dangerousCodes) {
        const result = safetyManager.performStaticAnalysis(code);
        expect(result.safe).toBe(false);
      }
    });

    test('should analyze code complexity', () => {
      const complexCode = `
        function complex() {
          if (a) {
            if (b) {
              if (c) {
                for (let i = 0; i < 10; i++) {
                  while (condition) {
                    switch (value) {
                      case 1:
                        break;
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const result = safetyManager.performStaticAnalysis(complexCode);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.loopCount).toBeGreaterThan(0);
      expect(result.metrics.conditionalCount).toBeGreaterThan(0);
    });

    test('should flag high complexity code', () => {
      const lines = Array(600).fill('console.log("test");').join('\n');

      const result = safetyManager.performStaticAnalysis(lines);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Too many lines');
    });
  });

  describe('Dynamic Code Testing (Sandbox)', () => {
    test('should execute safe code in sandbox', async () => {
      const safeCode = `
        const result = 2 + 2;
        return { calculated: result };
      `;

      const result = await safetyManager.testInSandbox(safeCode);

      expect(result.safe).toBe(true);
      expect(result.metrics).toBeDefined();
    });

    test('should pass both static and dynamic checks for safe code', async () => {
      const safeCode = `
        function add(a, b) {
          return a + b;
        }
        
        return { sum: add(5, 10) };
      `;

      const result = await safetyManager.testInSandbox(safeCode);

      expect(result.safe).toBe(true);
      expect(result.metrics.staticAnalysis).toBeDefined();
      expect(result.metrics.dynamicTesting).toBeDefined();
    });

    test('should fail dynamic test for code with errors', async () => {
      const brokenCode = `
        throw new Error('Intentional error');
      `;

      const result = await safetyManager.testInSandbox(brokenCode);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Dynamic testing failed');
    });

    test('should measure execution time', async () => {
      const slowCode = `
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return { sum };
      `;

      const result = await safetyManager.testInSandbox(slowCode);

      if (result.safe) {
        expect(result.metrics.dynamicTesting.executionTime).toBeGreaterThanOrEqual(0);
        expect(typeof result.metrics.dynamicTesting.executionTime).toBe('number');
      }
    });

    test('should create isolated sandbox environment', () => {
      const sandbox = safetyManager.createSandboxEnvironment();

      expect(sandbox.console).toBeDefined();
      expect(sandbox.Math).toBeDefined();
      expect(sandbox.JSON).toBeDefined();
      expect(sandbox.Date).toBeDefined();
      expect(sandbox.process).toBeDefined();
      expect(sandbox.process.env).toEqual({});
    });

    test('should allow only whitelisted modules in sandbox', () => {
      const sandbox = safetyManager.createSandboxEnvironment();

      // Should allow crypto
      expect(() => sandbox.require('crypto')).not.toThrow();

      // Should reject child_process
      expect(() => sandbox.require('child_process')).toThrow();
      expect(() => sandbox.require('fs')).toThrow();
      expect(() => sandbox.require('net')).toThrow();
    });

    test('should limit setTimeout duration in sandbox', () => {
      const sandbox = safetyManager.createSandboxEnvironment();

      // Should not allow long timeouts
      expect(() => sandbox.setTimeout(() => {}, 5000)).toThrow();
    });
  });

  describe('Security Features', () => {
    test('should provide security report', () => {
      const report = safetyManager.getSecurityReport();

      expect(report).toBeDefined();
      expect(report.safetyRules).toBeDefined();
      expect(report.bannedPatterns).toBeGreaterThan(0);
      expect(report.allowedModules).toBeDefined();
      expect(report.status).toBe('active');
      expect(report.lastValidation).toBeInstanceOf(Date);
    });

    test('should quarantine dangerous code', async () => {
      const dangerousCode = `
        const { exec } = require('child_process');
        exec('rm -rf /');
      `;

      const quarantinePath = await safetyManager.quarantineCode(
        dangerousCode,
        'Contains child_process usage'
      );

      expect(quarantinePath).toBeDefined();
      expect(quarantinePath).toContain('quarantine');
      expect(quarantinePath).toContain('.js');
    });

    test('should validate allowed module list contains safe packages', () => {
      const allowedModules = safetyManager.allowedModules;

      // Should contain utility modules
      expect(allowedModules).toContain('crypto');
      expect(allowedModules).toContain('util');
      expect(allowedModules).toContain('uuid');

      // Should NOT contain dangerous modules
      expect(allowedModules).not.toContain('child_process');
      expect(allowedModules).not.toContain('fs');
      expect(allowedModules).not.toContain('net');
      expect(allowedModules).not.toContain('http');
    });
  });

  describe('Dependency Validation', () => {
    test('should approve allowed dependencies', async () => {
      const dependencies = ['crypto', 'uuid', 'joi'];

      const result = await safetyManager.validateDependencies(dependencies);

      expect(result.safe).toBe(true);
    });

    test('should reject disallowed dependencies', async () => {
      const dependencies = ['crypto', 'child_process'];

      const result = await safetyManager.validateDependencies(dependencies);

      expect(result.safe).toBe(false);
      expect(result.reason).toContain('child_process');
      expect(result.reason).toContain('not in the allowed modules list');
    });

    test('should validate empty dependency list', async () => {
      const result = await safetyManager.validateDependencies([]);

      expect(result.safe).toBe(true);
    });
  });

  describe('Complexity Analysis', () => {
    test('should analyze simple code as low risk', () => {
      const simpleCode = `
        function add(a, b) {
          return a + b;
        }
      `;

      const metrics = safetyManager.analyzeComplexity(simpleCode);

      expect(metrics.risk).toBe('low');
      expect(metrics.lines).toBeLessThan(10);
      expect(metrics.functionCount).toBe(1);
    });

    test('should detect high complexity from many lines', () => {
      const longCode = Array(600).fill('console.log("test");').join('\n');

      const metrics = safetyManager.analyzeComplexity(longCode);

      expect(metrics.risk).toBe('high');
      expect(metrics.reason).toContain('Too many lines');
    });

    test('should detect high complexity from many functions', () => {
      const manyFunctions = Array(25)
        .fill(null)
        .map((_, i) => `function func${i}() { return ${i}; }`)
        .join('\n');

      const metrics = safetyManager.analyzeComplexity(manyFunctions);

      expect(metrics.risk).toBe('high');
      expect(metrics.reason).toContain('Too many functions');
    });

    test('should detect medium complexity from loops', () => {
      const loopyCode = Array(12)
        .fill(null)
        .map((_, i) => `for (let i = 0; i < 10; i++) { console.log(${i}); }`)
        .join('\n');

      const metrics = safetyManager.analyzeComplexity(loopyCode);

      expect(metrics.risk).toBe('medium');
      expect(metrics.loopCount).toBeGreaterThanOrEqual(10);
    });

    test('should count various code elements', () => {
      const code = `
        function test1() {}
        function test2() {}
        
        for (let i = 0; i < 10; i++) {}
        while (true) {}
        
        if (condition) {}
        if (other) {}
        switch (value) {}
      `;

      const metrics = safetyManager.analyzeComplexity(code);

      expect(metrics.functionCount).toBe(2);
      expect(metrics.loopCount).toBeGreaterThanOrEqual(2);
      expect(metrics.conditionalCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty code', async () => {
      const result = await safetyManager.testInSandbox('');

      expect(result.safe).toBe(true);
    });

    test('should handle code with comments', () => {
      const codeWithComments = `
        // This is a comment
        /* Multi-line
           comment */
        const x = 5;
        return { x };
      `;

      const result = safetyManager.performStaticAnalysis(codeWithComments);

      expect(result.safe).toBe(true);
    });

    test('should handle plan with minimal fields', async () => {
      const minimalPlan = {
        id: 'minimal',
        title: 'Minimal Plan',
        description: 'Just the basics',
        category: 'utility',
        complexity: 'low'
      };

      const result = await safetyManager.validatePlan(minimalPlan);

      expect(result.approved).toBe(true);
    });
  });
});
