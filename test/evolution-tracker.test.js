/**
 * 🧪 EvolutionTracker Test Suite
 * Comprehensive tests for evolution tracking and Git integration
 */

const EvolutionTracker = require('../core/evolution-tracker');
const fs = require('fs').promises;
const path = require('path');

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

// Mock simple-git
jest.mock('simple-git', () => {
  return jest.fn(() => ({
    checkIsRepo: jest.fn().mockResolvedValue(false),
    init: jest.fn().mockResolvedValue({}),
    addConfig: jest.fn().mockResolvedValue({}),
    status: jest.fn().mockResolvedValue({
      files: [],
      staged: [],
      modified: [],
      current: 'main',
      ahead: 0,
      behind: 0
    }),
    add: jest.fn().mockResolvedValue({}),
    commit: jest.fn().mockResolvedValue({
      commit: 'abc123',
      summary: { changes: 1, insertions: 10, deletions: 0 }
    }),
    log: jest.fn().mockResolvedValue({
      all: [
        {
          hash: 'abc123def456',
          message: 'Test commit',
          date: new Date().toISOString()
        }
      ]
    })
  }));
});

describe('EvolutionTracker', () => {
  let evolutionTracker;
  let testLogDir;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    evolutionTracker = new EvolutionTracker();
    testLogDir = path.join(__dirname, 'test-logs');
    evolutionTracker.evolutionFile = path.join(testLogDir, 'evolution-history.json');

    // Ensure logger is properly set (it should be mocked but just in case)
    if (!evolutionTracker.logger || !evolutionTracker.logger.info) {
      evolutionTracker.logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
    }

    // Clean up test directory
    try {
      await fs.rm(testLogDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }

    await fs.mkdir(testLogDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testLogDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(evolutionTracker.initialize()).resolves.not.toThrow();
    });

    test('should start with empty evolution log', () => {
      expect(evolutionTracker.evolutionLog).toEqual([]);
    });

    test('should load existing evolution history', async () => {
      const existingHistory = [
        {
          id: 'evo-001',
          timestamp: new Date(),
          success: true,
          plan: { title: 'Test Evolution' }
        }
      ];

      await fs.writeFile(
        evolutionTracker.evolutionFile,
        JSON.stringify(existingHistory),
        'utf8'
      );

      await evolutionTracker.loadEvolutionHistory();

      expect(evolutionTracker.evolutionLog).toHaveLength(1);
      expect(evolutionTracker.evolutionLog[0].id).toBe('evo-001');
    });

    test('should handle missing evolution file gracefully', async () => {
      await evolutionTracker.loadEvolutionHistory();
      expect(evolutionTracker.evolutionLog).toEqual([]);
    });
  });

  describe('Evolution Recording', () => {
    test('should record successful evolution', async () => {
      const evolutionData = {
        success: true,
        plan: {
          id: 'plan-001',
          title: 'Test Feature',
          description: 'A test feature',
          category: 'utility',
          complexity: 'low'
        },
        feature: {
          id: 'feature-001',
          name: 'Test Feature',
          filePath: 'dynamic/test-feature.js'
        },
        mode: 'guided',
        request: 'Create a test feature'
      };

      const record = await evolutionTracker.recordEvolution(evolutionData);

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.success).toBe(true);
      expect(record.plan).toBeDefined();
      expect(record.feature).toBeDefined();
      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.metrics).toBeDefined();
    });

    test('should record failed evolution', async () => {
      const evolutionData = {
        success: false,
        error: 'Test error',
        mode: 'autonomous',
        request: 'Failed request'
      };

      const record = await evolutionTracker.recordEvolution(evolutionData);

      expect(record.success).toBe(false);
      expect(record.error).toBe('Test error');
    });

    test('should add evolution to history', async () => {
      const evolutionData = {
        success: true,
        plan: { title: 'Feature 1' }
      };

      await evolutionTracker.recordEvolution(evolutionData);

      expect(evolutionTracker.evolutionLog).toHaveLength(1);

      await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'Feature 2' }
      });

      expect(evolutionTracker.evolutionLog).toHaveLength(2);
    });

    test('should save evolution history to file', async () => {
      const evolutionData = {
        success: true,
        plan: { title: 'Saved Feature' }
      };

      await evolutionTracker.recordEvolution(evolutionData);

      const fileContent = await fs.readFile(
        evolutionTracker.evolutionFile,
        'utf8'
      );
      const savedData = JSON.parse(fileContent);

      expect(savedData).toHaveLength(1);
      expect(savedData[0].plan.title).toBe('Saved Feature');
    });

    test('should generate unique evolution IDs', async () => {
      const record1 = await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'Feature 1' }
      });

      const record2 = await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'Feature 2' }
      });

      expect(record1.id).toBeDefined();
      expect(record2.id).toBeDefined();
      expect(record1.id).not.toBe(record2.id);
    });

    test('should include metrics in evolution record', async () => {
      const record = await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'Metrics Test' }
      });

      expect(record.metrics).toBeDefined();
      expect(record.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(record.metrics.memoryUsage).toBeDefined();
      expect(record.metrics.nodeVersion).toBeDefined();
      expect(record.metrics.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Evolution Snapshots', () => {
    test.skip('should create evolution snapshot', async () => {
      const evolutionRecord = {
        id: 'snapshot-test',
        success: true,
        plan: { title: 'Snapshot Feature' },
        feature: {
          name: 'Test Feature',
          filePath: 'dynamic/test.js'
        },
        timestamp: new Date()
      };

      await evolutionTracker.createEvolutionSnapshot(evolutionRecord);

      const snapshotDir = path.join(testLogDir, 'snapshots', 'snapshot-test');
      const evolutionFile = path.join(snapshotDir, 'evolution.json');
      
      const fileExists = await fs.access(evolutionFile)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);

      const content = await fs.readFile(evolutionFile, 'utf8');
      const snapshot = JSON.parse(content);

      expect(snapshot.id).toBe('snapshot-test');
      expect(snapshot.plan.title).toBe('Snapshot Feature');
    });

    test.skip('should include system state in snapshot', async () => {
      const evolutionRecord = {
        id: 'system-state-test',
        success: true,
        timestamp: new Date()
      };

      await evolutionTracker.createEvolutionSnapshot(evolutionRecord);

      const snapshotDir = path.join(testLogDir, 'snapshots', 'system-state-test');
      const stateFile = path.join(snapshotDir, 'system-state.json');

      const content = await fs.readFile(stateFile, 'utf8');
      const systemState = JSON.parse(content);

      expect(systemState.process).toBeDefined();
      expect(systemState.git).toBeDefined();
      expect(systemState.timestamp).toBeDefined();
    });
  });

  describe('Git Integration', () => {
    test('should generate commit message with emoji', () => {
      const evolutionRecord = {
        success: true,
        plan: {
          title: 'Test Feature',
          description: 'Test description',
          category: 'api',
          complexity: 'low'
        },
        feature: {
          name: 'Test Feature'
        },
        mode: 'guided',
        id: 'test-123',
        timestamp: new Date()
      };

      const message = evolutionTracker.generateCommitMessage(evolutionRecord);

      expect(message).toContain('Test Feature');
      expect(message).toContain('Test description');
      expect(message).toContain('Category: api');
      expect(message).toContain('Mode: guided');
      expect(message).toContain('Evolution ID: test-123');
      expect(message).toContain('Generated by Autonomo AI');
    });

    test('should get appropriate emoji for categories', () => {
      const categories = [
        { category: 'api', expectedEmoji: '🌐' },
        { category: 'utility', expectedEmoji: '🛠️' },
        { category: 'ui', expectedEmoji: '🎨' },
        { category: 'integration', expectedEmoji: '🔗' },
        { category: 'data', expectedEmoji: '📊' }
      ];

      for (const { category, expectedEmoji } of categories) {
        const emoji = evolutionTracker.getEvolutionEmoji({
          success: true,
          plan: { category }
        });
        expect(emoji).toBe(expectedEmoji);
      }
    });

    test('should use complexity emoji for unknown category', () => {
      const complexities = [
        { complexity: 'high', expectedEmoji: '🚀' },
        { complexity: 'medium', expectedEmoji: '⚡' },
        { complexity: 'low', expectedEmoji: '✨' }
      ];

      for (const { complexity, expectedEmoji } of complexities) {
        const emoji = evolutionTracker.getEvolutionEmoji({
          success: true,
          plan: { category: 'unknown', complexity }
        });
        expect(emoji).toBe(expectedEmoji);
      }
    });

    test('should use failure emoji for failed evolution', () => {
      const emoji = evolutionTracker.getEvolutionEmoji({
        success: false,
        plan: { category: 'api' }
      });

      expect(emoji).toBe('💥');
    });
  });

  describe('Evolution Statistics', () => {
    beforeEach(async () => {
      // Create some test evolutions
      await evolutionTracker.recordEvolution({
        success: true,
        plan: { category: 'api' },
        mode: 'guided'
      });

      await evolutionTracker.recordEvolution({
        success: true,
        plan: { category: 'utility' },
        mode: 'autonomous'
      });

      await evolutionTracker.recordEvolution({
        success: false,
        plan: { category: 'api' },
        mode: 'guided'
      });
    });

    test('should calculate evolution stats correctly', () => {
      const stats = evolutionTracker.getEvolutionStats();

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe('66.67');
    });

    test('should count evolutions by category', () => {
      const stats = evolutionTracker.getEvolutionStats();

      expect(stats.categories.api).toBe(2);
      expect(stats.categories.utility).toBe(1);
    });

    test('should count evolutions by mode', () => {
      const stats = evolutionTracker.getEvolutionStats();

      expect(stats.modes.guided).toBe(2);
      expect(stats.modes.autonomous).toBe(1);
    });

    test('should track first and last evolution', () => {
      const stats = evolutionTracker.getEvolutionStats();

      expect(stats.firstEvolution).toBeDefined();
      expect(stats.lastEvolution).toBeDefined();
    });

    test('should handle empty evolution log', () => {
      const emptyTracker = new EvolutionTracker();
      const stats = emptyTracker.getEvolutionStats();

      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.firstEvolution).toBeNull();
    });
  });

  describe('Evolution History', () => {
    test('should get last evolution timestamp', async () => {
      expect(evolutionTracker.getLastEvolution()).toBeNull();

      await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'First' }
      });

      const lastEvo = evolutionTracker.getLastEvolution();
      expect(lastEvo).toBeDefined();
      expect(lastEvo).toBeInstanceOf(Date);
    });

    test('should get evolution history with limit', async () => {
      // Add 10 evolutions
      for (let i = 0; i < 10; i++) {
        await evolutionTracker.recordEvolution({
          success: true,
          plan: { title: `Feature ${i}` }
        });
      }

      const history = evolutionTracker.getEvolutionHistory(5);

      expect(history).toHaveLength(5);
    });

    test('should sort history by most recent first', async () => {
      await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'First' }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'Second' }
      });

      const history = evolutionTracker.getEvolutionHistory();

      expect(history[0].plan.title).toBe('Second');
      expect(history[1].plan.title).toBe('First');
    });

    test('should get only successful evolutions', async () => {
      await evolutionTracker.recordEvolution({ success: true });
      await evolutionTracker.recordEvolution({ success: false });
      await evolutionTracker.recordEvolution({ success: true });

      const successful = evolutionTracker.getSuccessfulEvolutions();

      expect(successful).toHaveLength(2);
      expect(successful.every(e => e.success)).toBe(true);
    });

    test('should get only failed evolutions', async () => {
      await evolutionTracker.recordEvolution({ success: true });
      await evolutionTracker.recordEvolution({ success: false });
      await evolutionTracker.recordEvolution({ success: false });

      const failed = evolutionTracker.getFailedEvolutions();

      expect(failed).toHaveLength(2);
      expect(failed.every(e => !e.success)).toBe(true);
    });
  });

  describe('System State and Metrics', () => {
    test('should gather system state', async () => {
      const state = await evolutionTracker.gatherSystemState();

      expect(state.process).toBeDefined();
      expect(state.process.uptime).toBeGreaterThanOrEqual(0);
      expect(state.process.memory).toBeDefined();
      expect(state.process.version).toBeDefined();
      expect(state.process.platform).toBeDefined();
      expect(state.git).toBeDefined();
      expect(state.timestamp).toBeInstanceOf(Date);
    });

    test('should gather metrics', async () => {
      const metrics = await evolutionTracker.gatherMetrics();

      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.nodeVersion).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    test('should calculate disk usage', async () => {
      const usage = await evolutionTracker.calculateDiskUsage();

      expect(usage).toBeDefined();
      expect(typeof usage.total).toBe('number');
    });

    test('should get folder size', async () => {
      // Create test files
      await fs.writeFile(path.join(testLogDir, 'test1.txt'), 'test content', 'utf8');
      await fs.writeFile(path.join(testLogDir, 'test2.txt'), 'more content', 'utf8');

      const size = await evolutionTracker.getFolderSize(testLogDir);

      expect(size).toBeGreaterThan(0);
    });

    test('should handle non-existent folder in size calculation', async () => {
      const size = await evolutionTracker.getFolderSize('/non/existent/path');

      expect(size).toBe(0);
    });
  });

  describe('Data Export', () => {
    test('should export evolution data', async () => {
      await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'Export Test' }
      });

      const exportPath = await evolutionTracker.exportEvolutionData('json');

      expect(exportPath).toBeDefined();
      expect(exportPath).toContain('autonomo-evolution-export');
      expect(exportPath).toContain('.json');

      const content = await fs.readFile(exportPath, 'utf8');
      const exportData = JSON.parse(content);

      expect(exportData.metadata).toBeDefined();
      expect(exportData.stats).toBeDefined();
      expect(exportData.evolutions).toHaveLength(1);
    });

    test('should include metadata in export', async () => {
      const exportPath = await evolutionTracker.exportEvolutionData('json');

      const content = await fs.readFile(exportPath, 'utf8');
      const exportData = JSON.parse(content);

      expect(exportData.metadata.exportDate).toBeDefined();
      expect(exportData.metadata.totalEvolutions).toBeDefined();
      expect(exportData.metadata.autonomoVersion).toBeDefined();
    });

    test('should throw error for unsupported format', async () => {
      await expect(
        evolutionTracker.exportEvolutionData('xml')
      ).rejects.toThrow("Export format 'xml' not supported");
    });
  });

  describe('Interaction Tracking', () => {
    test('should generate unique interaction IDs', () => {
      const id1 = evolutionTracker.startInteraction();
      const id2 = evolutionTracker.startInteraction();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test('should return UUID format for interaction ID', () => {
      const id = evolutionTracker.startInteraction();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });

  describe('Edge Cases', () => {
    test('should handle evolution with no plan', async () => {
      const record = await evolutionTracker.recordEvolution({
        success: true
      });

      expect(record).toBeDefined();
      expect(record.plan).toBeUndefined();
    });

    test('should handle evolution with no feature', async () => {
      const record = await evolutionTracker.recordEvolution({
        success: true,
        plan: { title: 'No Feature' }
      });

      expect(record).toBeDefined();
      expect(record.feature).toBeUndefined();
    });

    test('should handle missing evolution log file gracefully', async () => {
      await evolutionTracker.loadEvolutionHistory();
      expect(evolutionTracker.evolutionLog).toEqual([]);
    });

    test.skip('should handle corrupted evolution log file', async () => {
      await fs.writeFile(
        evolutionTracker.evolutionFile,
        'invalid json content',
        'utf8'
      );

      await expect(evolutionTracker.loadEvolutionHistory()).rejects.toThrow();
    });
  });
});
