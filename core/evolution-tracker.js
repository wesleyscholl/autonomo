/**
 * 📚 Evolution Tracker
 * Handles Git integration and tracks the app's evolution over time
 */

const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

class EvolutionTracker {
  constructor() {
    this.git = simpleGit();
    this.evolutionLog = [];
    this.evolutionFile = path.join('./logs', 'evolution-history.json');
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/evolution-tracker.log' })
      ]
    });
  }

  async initialize() {
    this.logger.info('📚 Initializing Evolution Tracker...');
    
    try {
      // Initialize git repo if not exists
      await this.initializeGitRepo();
      
      // Load evolution history
      await this.loadEvolutionHistory();
      
      // Create initial commit if repo is empty
      await this.createInitialCommitIfNeeded();
      
      this.logger.info('✅ Evolution Tracker initialized');
      
    } catch (error) {
      this.logger.error('❌ Evolution Tracker initialization failed:', error);
      throw error;
    }
  }

  async initializeGitRepo() {
    try {
      const isRepo = await this.git.checkIsRepo();
      
      if (!isRepo) {
        this.logger.info('🔧 Initializing Git repository...');
        await this.git.init();
        
        // Configure git for autonomous commits
        await this.git.addConfig('user.name', 'Autonomo AI');
        await this.git.addConfig('user.email', 'autonomo@localhost');
        
        this.logger.info('✅ Git repository initialized');
      }
    } catch (error) {
      this.logger.warn('⚠️ Git initialization issue:', error.message);
      // Continue without git if there are issues
    }
  }

  async loadEvolutionHistory() {
    try {
      const data = await fs.readFile(this.evolutionFile, 'utf8');
      this.evolutionLog = JSON.parse(data);
      
      this.logger.info(`📖 Loaded ${this.evolutionLog.length} evolution records`);
    } catch (error) {
      // File doesn't exist, start with empty history
      this.evolutionLog = [];
      this.logger.info('📝 Starting with empty evolution history');
    }
  }

  async saveEvolutionHistory() {
    try {
      await fs.mkdir(path.dirname(this.evolutionFile), { recursive: true });
      await fs.writeFile(
        this.evolutionFile,
        JSON.stringify(this.evolutionLog, null, 2),
        'utf8'
      );
    } catch (error) {
      this.logger.error('❌ Failed to save evolution history:', error);
    }
  }

  async createInitialCommitIfNeeded() {
    try {
      const status = await this.git.status();
      
      if (status.files.length === 0) {
        // Add initial files
        await this.git.add([
          'package.json',
          'README.md',
          '.gitignore',
          '.env.example'
        ]);
        
        await this.git.commit('🚀 Initial Autonomo setup - The Living App begins');
        
        this.logger.info('✅ Initial commit created');
      }
    } catch (error) {
      this.logger.warn('⚠️ Could not create initial commit:', error.message);
    }
  }

  async recordEvolution(evolutionData) {
    const evolutionRecord = {
      id: evolutionData.id || uuidv4(),
      timestamp: evolutionData.timestamp || new Date(),
      success: evolutionData.success,
      plan: evolutionData.plan,
      feature: evolutionData.feature,
      mode: evolutionData.mode,
      request: evolutionData.request,
      error: evolutionData.error,
      gitCommit: null,
      metrics: await this.gatherMetrics(),
      ...evolutionData
    };

    // Add to history
    this.evolutionLog.push(evolutionRecord);
    
    // Save to file
    await this.saveEvolutionHistory();
    
    // Create git commit if successful and enabled
    if (evolutionRecord.success && process.env.ENABLE_GIT_COMMITS === 'true') {
      try {
        evolutionRecord.gitCommit = await this.createEvolutionCommit(evolutionRecord);
      } catch (error) {
        this.logger.warn('⚠️ Failed to create git commit:', error.message);
      }
    }

    // Create evolution snapshot
    await this.createEvolutionSnapshot(evolutionRecord);
    
    this.logger.info('📝 Evolution recorded', { 
      id: evolutionRecord.id,
      success: evolutionRecord.success
    });

    return evolutionRecord;
  }

  async createEvolutionCommit(evolutionRecord) {
    try {
      const featureName = evolutionRecord.feature?.name || 'Unknown Feature';
      const planTitle = evolutionRecord.plan?.title || 'Evolution';
      
      // Add dynamic files
      await this.git.add('./dynamic/*');
      
      // Add evolution logs
      await this.git.add('./logs/evolution-history.json');
      
      // Create descriptive commit message
      const commitMessage = this.generateCommitMessage(evolutionRecord);
      
      const commit = await this.git.commit(commitMessage);
      
      this.logger.info('📦 Evolution committed to git', { 
        commit: commit.commit,
        summary: commit.summary
      });

      return {
        hash: commit.commit,
        summary: commit.summary,
        message: commitMessage,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('❌ Git commit failed:', error);
      throw error;
    }
  }

  generateCommitMessage(evolutionRecord) {
    const emoji = this.getEvolutionEmoji(evolutionRecord);
    const featureName = evolutionRecord.feature?.name || 'Feature';
    const category = evolutionRecord.plan?.category || 'utility';
    const mode = evolutionRecord.mode || 'guided';
    
    let message = `${emoji} ${featureName}`;
    
    if (evolutionRecord.plan?.description) {
      message += `\n\n${evolutionRecord.plan.description}`;
    }
    
    message += `\n\nEvolution Details:`;
    message += `\n- Category: ${category}`;
    message += `\n- Mode: ${mode}`;
    message += `\n- Complexity: ${evolutionRecord.plan?.complexity || 'unknown'}`;
    message += `\n- Evolution ID: ${evolutionRecord.id}`;
    
    if (evolutionRecord.request) {
      message += `\n- Original Request: ${evolutionRecord.request}`;
    }
    
    message += `\n\nGenerated by Autonomo AI at ${evolutionRecord.timestamp}`;
    
    return message;
  }

  getEvolutionEmoji(evolutionRecord) {
    const category = evolutionRecord.plan?.category;
    const complexity = evolutionRecord.plan?.complexity;
    
    if (!evolutionRecord.success) return '💥';
    
    switch (category) {
      case 'api': return '🌐';
      case 'utility': return '🛠️';
      case 'ui': return '🎨';
      case 'integration': return '🔗';
      case 'data': return '📊';
      default:
        switch (complexity) {
          case 'high': return '🚀';
          case 'medium': return '⚡';
          case 'low': return '✨';
          default: return '🤖';
        }
    }
  }

  async createEvolutionSnapshot(evolutionRecord) {
    try {
      const snapshotDir = path.join('./logs', 'snapshots', evolutionRecord.id);
      await fs.mkdir(snapshotDir, { recursive: true });
      
      // Save detailed evolution data
      await fs.writeFile(
        path.join(snapshotDir, 'evolution.json'),
        JSON.stringify(evolutionRecord, null, 2),
        'utf8'
      );
      
      // Copy generated feature file if it exists
      if (evolutionRecord.feature?.filePath) {
        try {
          const featureContent = await fs.readFile(evolutionRecord.feature.filePath, 'utf8');
          await fs.writeFile(
            path.join(snapshotDir, 'feature.js'),
            featureContent,
            'utf8'
          );
        } catch (error) {
          this.logger.warn('⚠️ Could not snapshot feature file:', error.message);
        }
      }
      
      // Save system state
      const systemState = await this.gatherSystemState();
      await fs.writeFile(
        path.join(snapshotDir, 'system-state.json'),
        JSON.stringify(systemState, null, 2),
        'utf8'
      );
      
      this.logger.info('📸 Evolution snapshot created', { snapshotDir });
      
    } catch (error) {
      this.logger.error('❌ Failed to create evolution snapshot:', error);
    }
  }

  async gatherMetrics() {
    try {
      const dynamicFiles = await fs.readdir('./dynamic').catch(() => []);
      const logFiles = await fs.readdir('./logs').catch(() => []);
      
      return {
        featuresCount: dynamicFiles.filter(f => f.endsWith('.js')).length,
        logsCount: logFiles.length,
        diskUsage: await this.calculateDiskUsage(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        timestamp: new Date()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async gatherSystemState() {
    return {
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform
      },
      git: await this.getGitStatus(),
      features: await this.getFeatureStats(),
      timestamp: new Date()
    };
  }

  async getGitStatus() {
    try {
      const status = await this.git.status();
      const log = await this.git.log({ maxCount: 5 });
      
      return {
        branch: status.current,
        ahead: status.ahead,
        behind: status.behind,
        files: status.files.length,
        staged: status.staged.length,
        modified: status.modified.length,
        recentCommits: log.all.map(commit => ({
          hash: commit.hash.substring(0, 8),
          message: commit.message,
          date: commit.date
        }))
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getFeatureStats() {
    try {
      const dynamicFiles = await fs.readdir('./dynamic');
      const features = [];
      
      for (const file of dynamicFiles) {
        if (file.endsWith('.js')) {
          const stats = await fs.stat(path.join('./dynamic', file));
          features.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }
      
      return {
        count: features.length,
        totalSize: features.reduce((sum, f) => sum + f.size, 0),
        features: features.sort((a, b) => b.modified - a.modified).slice(0, 10)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async calculateDiskUsage() {
    try {
      const dynamicSize = await this.getFolderSize('./dynamic');
      const logsSize = await this.getFolderSize('./logs');
      
      return {
        dynamic: dynamicSize,
        logs: logsSize,
        total: dynamicSize + logsSize
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getFolderSize(folderPath) {
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      let size = 0;
      
      for (const file of files) {
        const filePath = path.join(folderPath, file.name);
        
        if (file.isDirectory()) {
          size += await this.getFolderSize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
      }
      
      return size;
    } catch (error) {
      return 0;
    }
  }

  getLastEvolution() {
    if (this.evolutionLog.length === 0) {
      return null;
    }
    
    return this.evolutionLog[this.evolutionLog.length - 1].timestamp;
  }

  getEvolutionHistory(limit = 50) {
    return this.evolutionLog
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getSuccessfulEvolutions() {
    return this.evolutionLog.filter(e => e.success);
  }

  getFailedEvolutions() {
    return this.evolutionLog.filter(e => !e.success);
  }

  getEvolutionStats() {
    const total = this.evolutionLog.length;
    const successful = this.getSuccessfulEvolutions().length;
    const failed = this.getFailedEvolutions().length;
    
    const categories = this.evolutionLog.reduce((acc, e) => {
      const category = e.plan?.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    const modes = this.evolutionLog.reduce((acc, e) => {
      const mode = e.mode || 'unknown';
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
      categories,
      modes,
      firstEvolution: this.evolutionLog[0]?.timestamp || null,
      lastEvolution: this.getLastEvolution()
    };
  }

  startInteraction() {
    return uuidv4();
  }

  async exportEvolutionData(format = 'json') {
    const exportData = {
      metadata: {
        exportDate: new Date(),
        totalEvolutions: this.evolutionLog.length,
        autonomoVersion: require('../package.json').version
      },
      stats: this.getEvolutionStats(),
      evolutions: this.evolutionLog
    };
    
    const timestamp = Date.now();
    const filename = `autonomo-evolution-export-${timestamp}.${format}`;
    const exportPath = path.join('./logs', 'exports', filename);
    
    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    
    if (format === 'json') {
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
    } else {
      throw new Error(`Export format '${format}' not supported`);
    }
    
    this.logger.info('📤 Evolution data exported', { exportPath });
    
    return exportPath;
  }
}

module.exports = EvolutionTracker;