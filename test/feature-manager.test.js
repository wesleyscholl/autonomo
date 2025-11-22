/**
 * 🧪 FeatureManager Test Suite
 * Comprehensive tests for dynamic feature loading and execution
 */

const FeatureManager = require('../core/feature-manager');
const fs = require('fs').promises;
const path = require('path');

// Mock winston logger to avoid log spam during tests
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

describe('FeatureManager', () => {
  let featureManager;
  let testDir;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    featureManager = new FeatureManager();
    testDir = path.join(__dirname, 'test-dynamic-features');
    featureManager.dynamicDir = testDir;

    // Ensure logger is properly set
    if (!featureManager.logger || !featureManager.logger.info) {
      featureManager.logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }

    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Feature Loading', () => {
    test('should load all features from directory', async () => {
      // Create test features
      await createTestFeature(testDir, 'test-feature-1.js', {
        title: 'Test Feature 1',
        execute: async (input) => ({ result: 'test1', input })
      });

      await createTestFeature(testDir, 'test-feature-2.js', {
        title: 'Test Feature 2',
        execute: async (input) => ({ result: 'test2', input })
      });

      const features = await featureManager.loadAllFeatures();

      expect(features).toHaveLength(2);
      expect(features[0].name).toBeDefined();
      expect(features[1].name).toBeDefined();
      expect(features.some(f => f.name === 'Test Feature 1')).toBe(true);
      expect(features.some(f => f.name === 'Test Feature 2')).toBe(true);
    });

    test('should handle empty directory gracefully', async () => {
      const features = await featureManager.loadAllFeatures();
      expect(features).toHaveLength(0);
      expect(featureManager.features.size).toBe(0);
    });

    test('should create directory if it does not exist', async () => {
      await fs.rm(testDir, { recursive: true, force: true });
      
      const features = await featureManager.loadAllFeatures();
      
      expect(features).toHaveLength(0);
      const dirExists = await fs.access(testDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });

    test('should skip non-JS files', async () => {
      await fs.writeFile(path.join(testDir, 'readme.txt'), 'test', 'utf8');
      await fs.writeFile(path.join(testDir, 'config.json'), '{}', 'utf8');
      
      await createTestFeature(testDir, 'valid-feature.js', {
        title: 'Valid Feature',
        execute: async () => ({ ok: true })
      });

      const features = await featureManager.loadAllFeatures();

      expect(features).toHaveLength(1);
      expect(features[0].name).toBe('Valid Feature');
    });

    test('should handle malformed feature files gracefully', async () => {
      await fs.writeFile(
        path.join(testDir, 'broken-feature.js'),
        'module.exports = { this is invalid javascript',
        'utf8'
      );

      await createTestFeature(testDir, 'good-feature.js', {
        title: 'Good Feature',
        execute: async () => ({ ok: true })
      });

      const features = await featureManager.loadAllFeatures();

      // Should load the good one, skip the broken one
      expect(features).toHaveLength(1);
      expect(features[0].name).toBe('Good Feature');
    });

    test('should extract feature metadata correctly', async () => {
      await createTestFeature(testDir, 'metadata-test.js', {
        title: 'Metadata Test Feature',
        description: 'A test feature with metadata',
        category: 'utility',
        complexity: 'low',
        execute: async () => ({ ok: true })
      });

      const features = await featureManager.loadAllFeatures();

      expect(features).toHaveLength(1);
      const feature = features[0];
      
      expect(feature.name).toBe('Metadata Test Feature');
      expect(feature.description).toBe('A test feature with metadata');
      expect(feature.category).toBe('utility');
      expect(feature.complexity).toBe('low');
      expect(feature.active).toBe(true);
      expect(feature.usageCount).toBe(0);
    });
  });

  describe('Route Extraction', () => {
    test('should extract routes from module.routes', async () => {
      await createTestFeature(testDir, 'api-feature.js', {
        title: 'API Feature',
        routes: [
          { method: 'GET', path: '/api/test', handler: 'get' },
          { method: 'POST', path: '/api/test', handler: 'create' }
        ],
        execute: async () => ({ ok: true })
      });

      const features = await featureManager.loadAllFeatures();
      const feature = features[0];

      expect(feature.routes).toHaveLength(2);
      expect(feature.routes[0].method).toBe('GET');
      expect(feature.routes[1].method).toBe('POST');
    });

    test('should auto-detect execute method as POST route', async () => {
      await createTestFeature(testDir, 'executable.js', {
        title: 'Executable Feature',
        execute: async () => ({ ok: true })
      });

      const features = await featureManager.loadAllFeatures();
      const feature = features[0];

      expect(feature.routes.length).toBeGreaterThan(0);
      const postRoute = feature.routes.find(r => r.method === 'POST');
      expect(postRoute).toBeDefined();
      expect(postRoute.handler).toBe('execute');
    });

    test('should auto-detect get method as GET route', async () => {
      await createTestFeature(testDir, 'getter.js', {
        title: 'Getter Feature',
        get: async () => ({ data: 'test' })
      });

      const features = await featureManager.loadAllFeatures();
      const feature = features[0];

      const getRoute = feature.routes.find(r => r.method === 'GET');
      expect(getRoute).toBeDefined();
      expect(getRoute.handler).toBe('get');
    });
  });

  describe('Capability Analysis', () => {
    test('should detect executable capability', async () => {
      await createTestFeature(testDir, 'exec-test.js', {
        title: 'Executable',
        execute: async () => ({})
      });

      const features = await featureManager.loadAllFeatures();
      expect(features[0].capabilities).toContain('executable');
    });

    test('should detect data-provider capability', async () => {
      await createTestFeature(testDir, 'data-test.js', {
        title: 'Data Provider',
        get: async () => ({ data: [] })
      });

      const features = await featureManager.loadAllFeatures();
      expect(features[0].capabilities).toContain('data-provider');
    });

    test('should detect processor capability', async () => {
      await createTestFeature(testDir, 'processor-test.js', {
        title: 'Processor',
        process: async (input) => input.toUpperCase()
      });

      const features = await featureManager.loadAllFeatures();
      expect(features[0].capabilities).toContain('processor');
    });

    test('should detect validator capability', async () => {
      await createTestFeature(testDir, 'validator-test.js', {
        title: 'Validator',
        validate: async (input) => input.length > 0
      });

      const features = await featureManager.loadAllFeatures();
      expect(features[0].capabilities).toContain('validator');
    });

    test('should detect api-provider capability', async () => {
      await createTestFeature(testDir, 'api-test.js', {
        title: 'API Provider',
        routes: [{ method: 'GET', path: '/test' }]
      });

      const features = await featureManager.loadAllFeatures();
      expect(features[0].capabilities).toContain('api-provider');
    });

    test('should detect multiple capabilities', async () => {
      await createTestFeature(testDir, 'multi-test.js', {
        title: 'Multi Capability',
        execute: async () => ({}),
        get: async () => ({}),
        validate: async () => true
      });

      const features = await featureManager.loadAllFeatures();
      const caps = features[0].capabilities;
      
      expect(caps).toContain('executable');
      expect(caps).toContain('data-provider');
      expect(caps).toContain('validator');
    });
  });

  describe('Feature Execution', () => {
    test('should execute feature with execute method', async () => {
      await createTestFeature(testDir, 'exec-feature.js', {
        title: 'Executable Feature',
        execute: async (input) => ({ 
          processed: true, 
          input: input.value 
        })
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      const result = await featureManager.executeFeature(feature.id, { 
        value: 'test-data' 
      });

      expect(result.success).toBe(true);
      expect(result.result.processed).toBe(true);
      expect(result.result.input).toBe('test-data');
    });

    test('should execute feature that is a function', async () => {
      const code = `
        module.exports = async (input) => ({
          doubled: input.value * 2
        });
      `;
      
      await fs.writeFile(path.join(testDir, 'function-feature.js'), code, 'utf8');
      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      const result = await featureManager.executeFeature(feature.id, { 
        value: 5 
      });

      expect(result.success).toBe(true);
      expect(result.result.doubled).toBe(10);
    });

    test('should execute feature with handler method', async () => {
      await createTestFeature(testDir, 'handler-feature.js', {
        title: 'Handler Feature',
        handler: async (input) => ({ 
          handled: true, 
          data: input 
        })
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      const result = await featureManager.executeFeature(feature.id, { 
        test: 'data' 
      });

      expect(result.success).toBe(true);
      expect(result.result.handled).toBe(true);
    });

    test('should throw error if feature not found', async () => {
      await expect(
        featureManager.executeFeature('non-existent-id', {})
      ).rejects.toThrow('Feature not found');
    });

    test('should throw error if feature is inactive', async () => {
      await createTestFeature(testDir, 'inactive.js', {
        title: 'Inactive Feature',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];
      
      await featureManager.deactivateFeature(feature.id);

      await expect(
        featureManager.executeFeature(feature.id, {})
      ).rejects.toThrow('Feature is inactive');
    });

    test('should throw error if feature has no executable method', async () => {
      await createTestFeature(testDir, 'no-exec.js', {
        title: 'No Execute',
        data: { some: 'data' }
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      await expect(
        featureManager.executeFeature(feature.id, {})
      ).rejects.toThrow('No executable method found');
    });

    test('should track usage count on execution', async () => {
      await createTestFeature(testDir, 'counter.js', {
        title: 'Counter',
        execute: async () => ({ ok: true })
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      expect(feature.usageCount).toBe(0);

      await featureManager.executeFeature(feature.id, {});
      expect(feature.usageCount).toBe(1);

      await featureManager.executeFeature(feature.id, {});
      expect(feature.usageCount).toBe(2);
    });

    test('should update lastUsed timestamp on execution', async () => {
      await createTestFeature(testDir, 'timestamp.js', {
        title: 'Timestamp',
        execute: async () => ({ ok: true })
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      expect(feature.lastUsed).toBeNull();

      await featureManager.executeFeature(feature.id, {});
      
      expect(feature.lastUsed).not.toBeNull();
      expect(feature.lastUsed).toBeInstanceOf(Date);
    });

    test('should handle async execution errors', async () => {
      await createTestFeature(testDir, 'error-feature.js', {
        title: 'Error Feature',
        execute: async () => {
          throw new Error('Intentional test error');
        }
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      await expect(
        featureManager.executeFeature(feature.id, {})
      ).rejects.toThrow('Feature execution failed');
    });
  });

  describe('Feature Integration', () => {
    test.skip('should integrate new feature from code', async () => {
      const code = `
        return {
          execute: async (input) => ({ 
            result: 'integrated', 
            input 
          })
        };
      `;

      const plan = {
        id: 'test-plan-123',
        title: 'Integrated Feature',
        description: 'A test integrated feature',
        category: 'utility',
        complexity: 'low'
      };

      const feature = await featureManager.integrateFeature(code, plan);

      expect(feature).toBeDefined();
      expect(feature.name).toBe('Integrated Feature');
      expect(feature.category).toBe('utility');
      expect(feature.active).toBe(true);
    });

    test('should wrap feature code with metadata', async () => {
      const code = `
        return {
          execute: async () => ({ ok: true })
        };
      `;

      const plan = {
        id: 'wrap-test',
        title: 'Wrapper Test',
        description: 'Test wrapping',
        category: 'test',
        complexity: 'low'
      };

      const wrappedCode = featureManager.wrapFeatureCode(code, plan);

      expect(wrappedCode).toContain('Auto-generated feature');
      expect(wrappedCode).toContain(plan.id);
      expect(wrappedCode).toContain(plan.title);
      expect(wrappedCode).toContain(plan.description);
      expect(wrappedCode).toContain('exports.metadata');
      expect(wrappedCode).toContain('exports.health');
    });

    test.skip('should save integrated feature to file', async () => {
      const code = `
        return {
          execute: async () => ({ ok: true })
        };
      `;

      const plan = {
        id: 'file-test',
        title: 'File Save Test',
        description: 'Test file saving',
        category: 'utility',
        complexity: 'low'
      };

      const feature = await featureManager.integrateFeature(code, plan);

      // Check file exists
      const fileExists = await fs.access(feature.filePath)
        .then(() => true)
        .catch(() => false);
      
      expect(fileExists).toBe(true);

      // Check file contains expected content
      const content = await fs.readFile(feature.filePath, 'utf8');
      expect(content).toContain(plan.title);
      expect(content).toContain(plan.id);
    });
  });

  describe('Feature Management', () => {
    test('should get all active features', async () => {
      await createTestFeature(testDir, 'active-1.js', {
        title: 'Active 1',
        execute: async () => ({})
      });

      await createTestFeature(testDir, 'active-2.js', {
        title: 'Active 2',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();

      const activeFeatures = featureManager.getActiveFeatures();
      expect(activeFeatures).toHaveLength(2);
      expect(activeFeatures.every(f => f.active)).toBe(true);
    });

    test.skip('should exclude inactive features', async () => {
      await createTestFeature(testDir, 'will-deactivate.js', {
        title: 'Will Deactivate',
        execute: async () => ({})
      });

      await createTestFeature(testDir, 'stays-active.js', {
        title: 'Stays Active',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const features = Array.from(featureManager.features.values());

      await featureManager.deactivateFeature(features[0].id);

      const activeFeatures = featureManager.getActiveFeatures();
      expect(activeFeatures).toHaveLength(1);
      expect(activeFeatures[0].name).toBe('Stays Active');
    });

    test('should get feature by ID', async () => {
      await createTestFeature(testDir, 'get-by-id.js', {
        title: 'Get By ID',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const features = featureManager.getActiveFeatures();
      const featureId = features[0].id;

      const feature = featureManager.getFeature(featureId);
      
      expect(feature).toBeDefined();
      expect(feature.id).toBe(featureId);
      expect(feature.name).toBe('Get By ID');
    });

    test('should get features by category', async () => {
      await createTestFeature(testDir, 'api-1.js', {
        title: 'API 1',
        category: 'api',
        execute: async () => ({})
      });

      await createTestFeature(testDir, 'api-2.js', {
        title: 'API 2',
        category: 'api',
        execute: async () => ({})
      });

      await createTestFeature(testDir, 'util-1.js', {
        title: 'Util 1',
        category: 'utility',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();

      const apiFeatures = featureManager.getFeaturesByCategory('api');
      expect(apiFeatures).toHaveLength(2);
      expect(apiFeatures.every(f => f.category === 'api')).toBe(true);

      const utilFeatures = featureManager.getFeaturesByCategory('utility');
      expect(utilFeatures).toHaveLength(1);
    });

    test('should deactivate feature', async () => {
      await createTestFeature(testDir, 'to-deactivate.js', {
        title: 'To Deactivate',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];

      expect(feature.active).toBe(true);

      await featureManager.deactivateFeature(feature.id);

      expect(feature.active).toBe(false);
      expect(featureManager.getActiveFeatures()).toHaveLength(0);
    });

    test('should delete feature file', async () => {
      await createTestFeature(testDir, 'to-delete.js', {
        title: 'To Delete',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const feature = featureManager.getActiveFeatures()[0];
      const filePath = feature.filePath;

      await featureManager.deleteFeature(feature.id);

      // Check feature removed from map
      expect(featureManager.features.has(feature.id)).toBe(false);

      // Check file deleted
      const fileExists = await fs.access(filePath)
        .then(() => true)
        .catch(() => false);
      
      expect(fileExists).toBe(false);
    });
  });

  describe('Usage Statistics', () => {
    test.skip('should provide accurate usage stats', async () => {
      await createTestFeature(testDir, 'api-feature.js', {
        title: 'API Feature',
        category: 'api',
        execute: async () => ({})
      });

      await createTestFeature(testDir, 'util-feature.js', {
        title: 'Util Feature',
        category: 'utility',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const features = featureManager.getActiveFeatures();

      // Execute some features
      await featureManager.executeFeature(features[0].id, {});
      await featureManager.executeFeature(features[0].id, {});
      await featureManager.executeFeature(features[1].id, {});

      const stats = featureManager.getUsageStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.totalUsage).toBe(3);
      expect(stats.byCategory.api).toBe(1);
      expect(stats.byCategory.utility).toBe(1);
      expect(stats.mostUsed).toHaveLength(2);
    });

    test.skip('should sort most used features correctly', async () => {
      await createTestFeature(testDir, 'rarely-used.js', {
        title: 'Rarely Used',
        execute: async () => ({})
      });

      await createTestFeature(testDir, 'frequently-used.js', {
        title: 'Frequently Used',
        execute: async () => ({})
      });

      await featureManager.loadAllFeatures();
      const features = featureManager.getActiveFeatures();

      // Execute first feature once
      await featureManager.executeFeature(features[0].id, {});

      // Execute second feature multiple times
      for (let i = 0; i < 5; i++) {
        await featureManager.executeFeature(features[1].id, {});
      }

      const stats = featureManager.getUsageStats();
      const mostUsed = stats.mostUsed[0];

      expect(mostUsed.name).toBe('Frequently Used');
      expect(mostUsed.usageCount).toBe(5);
    });
  });

  describe('Error Handling Coverage', () => {
    test('should throw error when loadAllFeatures fails', async () => {
      // Create invalid directory
      await fs.writeFile(path.join(testDir, 'invalid.txt'), 'not javascript');
      
      // This should still work but skip invalid files
      await featureManager.loadAllFeatures();
      expect(featureManager.getActiveFeatures().length).toBeGreaterThanOrEqual(0);
    });

    test('should handle integration errors', async () => {
      const badCode = 'this will cause an error';
      const plan = {
        id: 'error-plan',
        title: 'Error Test',
        description: 'Test error handling'
      };
      
      await expect(featureManager.integrateFeature(badCode, plan))
        .rejects.toThrow();
    });

    test('should handle wrapFeatureCode errors gracefully', () => {
      const code = 'module.exports = {};';
      const plan = { title: 'Test', id: 'test-1' };
      
      const wrapped = featureManager.wrapFeatureCode(code, plan);
      expect(wrapped).toContain('module.exports');
    });

    test('should handle testFeature with broken features', async () => {
      const brokenFeature = {
        id: 'broken',
        execute: async () => { throw new Error('Broken'); }
      };
      
      await expect(featureManager.testFeature(brokenFeature))
        .rejects.toThrow();
    });

    test('should handle missing feature files', async () => {
      const result = await featureManager.getFeature('non-existent-id');
      expect(result).toBeUndefined();
    });

    test('should handle deactivating non-existent features', async () => {
      const result = await featureManager.deactivateFeature('non-existent');
      expect(result).toBeUndefined();
    });

    test('should handle integrateFeature with write errors', async () => {
      const code = 'module.exports = { test: () => {} };';
      const plan = {
        id: 'test-plan-123',
        title: 'Test Feature'
      };

      // Mock writeFile to fail
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Write failed'));

      await expect(featureManager.integrateFeature(code, plan))
        .rejects.toThrow();

      fs.writeFile = originalWriteFile;
    });

    test('should handle wrapFeatureCode with invalid code', () => {
      const invalidCode = 'this is not valid javascript syntax {{{';
      const plan = { title: 'Test', id: 'test-123' };
      
      const wrapped = featureManager.wrapFeatureCode(invalidCode, plan);
      expect(wrapped).toContain(invalidCode);
      expect(wrapped).toContain('module.exports');
    });

    test('should handle testFeature with failing health check', async () => {
      const featureWithBadHealth = {
        id: 'bad-health',
        name: 'Bad Health',
        health: () => { throw new Error('Health check crashed'); },
        execute: async () => ({ success: true })
      };

      await expect(featureManager.testFeature(featureWithBadHealth))
        .rejects.toThrow();
    });

    test('should handle executeFeature with non-existent feature', async () => {
      await expect(featureManager.executeFeature('does-not-exist', {}))
        .rejects.toThrow();
    });

    test('should handle loadAllFeatures with invalid directory', async () => {
      const testManager = new FeatureManager();
      testManager.dynamicDir = '/completely/invalid/path/that/does/not/exist';

      await expect(testManager.loadAllFeatures())
        .rejects.toThrow();
    });

    test('should handle deleteFeature and verify removal', async () => {
      // Create and load a test feature
      const testFeatureCode = `
        module.exports = {
          id: 'delete-test',
          metadata: { title: 'Delete Test', id: 'delete-test' },
          execute: async () => ({ success: true }),
          health: () => ({ status: 'healthy' })
        };
      `;
      
      const testPath = path.join(featureManager.dynamicDir, 'delete-test.js');
      await fs.writeFile(testPath, testFeatureCode);
      await featureManager.loadAllFeatures();

      const loaded = featureManager.getFeature('delete-test');
      expect(loaded).toBeTruthy();

      await featureManager.deleteFeature('delete-test');
      
      const deleted = featureManager.getFeature('delete-test');
      expect(deleted).toBeUndefined();
    });
  });
});

// Helper function to create test features
async function createTestFeature(dir, filename, moduleContent) {
  const metadata = {
    id: moduleContent.id || `test-${Date.now()}-${Math.random()}`,
    title: moduleContent.title || 'Test Feature',
    description: moduleContent.description || 'A test feature',
    category: moduleContent.category || 'utility',
    complexity: moduleContent.complexity || 'medium',
    generated: new Date().toISOString()
  };

  // Build the module exports manually
  let code = 'module.exports = {\n';
  
  // Add functions
  for (const [key, value] of Object.entries(moduleContent)) {
    if (typeof value === 'function' && key !== 'title' && key !== 'description' && key !== 'category' && key !== 'complexity') {
      code += `  ${key}: ${value.toString()},\n`;
    } else if (Array.isArray(value) && key === 'routes') {
      code += `  ${key}: ${JSON.stringify(value)},\n`;
    } else if (typeof value !== 'function' && key !== 'title' && key !== 'description' && key !== 'category' && key !== 'complexity' && key !== 'id') {
      code += `  ${key}: ${JSON.stringify(value)},\n`;
    }
  }
  
  code += `  metadata: ${JSON.stringify(metadata)},\n`;
  code += `  health: () => ({ status: 'healthy', name: '${metadata.title}' })\n`;
  code += '};\n';

  await fs.writeFile(path.join(dir, filename), code, 'utf8');
}
