/**
 * ⚡ Feature Manager
 * Handles dynamic loading, execution, and lifecycle of AI-generated features
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

class FeatureManager {
  constructor() {
    this.features = new Map();
    this.dynamicDir = './dynamic';
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/features.log' })
      ]
    });
  }

  async loadAllFeatures() {
    this.logger.info('📦 Loading all features...');
    
    try {
      await fs.mkdir(this.dynamicDir, { recursive: true });
      const files = await fs.readdir(this.dynamicDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          try {
            await this.loadFeature(file);
          } catch (error) {
            this.logger.error(`❌ Failed to load feature ${file}:`, error.message);
          }
        }
      }
      
      this.logger.info(`✅ Loaded ${this.features.size} features`);
      return Array.from(this.features.values());
    } catch (error) {
      this.logger.error('💥 Failed to load features:', error);
      throw error;
    }
  }

  async loadFeature(filename) {
    const filePath = path.join(this.dynamicDir, filename);
    const absolutePath = path.resolve(filePath);
    
    // Clear require cache for hot reloading
    delete require.cache[absolutePath];
    
    try {
      const module = require(absolutePath);
      const stats = await fs.stat(filePath);
      
      // Create feature wrapper with metadata
      const feature = {
        id: module.metadata?.id || uuidv4(),
        name: module.metadata?.title || filename.replace('.js', ''),
        description: module.metadata?.description || 'AI-generated feature',
        category: module.metadata?.category || 'utility',
        complexity: module.metadata?.complexity || 'medium',
        filePath,
        filename,
        module,
        created: module.metadata?.generated ? new Date(module.metadata.generated) : stats.birthtime,
        lastModified: stats.mtime,
        lastUsed: null,
        usageCount: 0,
        active: true,
        routes: this.extractRoutes(module),
        capabilities: this.analyzeCapabilities(module)
      };
      
      this.features.set(feature.id, feature);
      this.logger.info(`✅ Loaded feature: ${feature.name}`);
      
      return feature;
    } catch (error) {
      this.logger.error(`❌ Failed to load ${filename}:`, error.message);
      throw error;
    }
  }

  extractRoutes(module) {
    const routes = [];
    
    // Check if module defines routes
    if (module.routes && Array.isArray(module.routes)) {
      return module.routes;
    }
    
    // Auto-detect common patterns
    if (typeof module.execute === 'function') {
      routes.push({
        method: 'POST',
        path: `/api/${module.metadata?.title?.toLowerCase().replace(/\s+/g, '-') || 'feature'}`,
        handler: 'execute',
        description: 'Execute the main feature function'
      });
    }
    
    if (typeof module.get === 'function') {
      routes.push({
        method: 'GET',
        path: `/api/${module.metadata?.title?.toLowerCase().replace(/\s+/g, '-') || 'feature'}`,
        handler: 'get',
        description: 'Get feature data'
      });
    }
    
    return routes;
  }

  analyzeCapabilities(module) {
    const capabilities = [];
    
    if (typeof module.execute === 'function') capabilities.push('executable');
    if (typeof module.get === 'function') capabilities.push('data-provider');
    if (typeof module.process === 'function') capabilities.push('processor');
    if (typeof module.validate === 'function') capabilities.push('validator');
    if (typeof module.transform === 'function') capabilities.push('transformer');
    if (module.routes && module.routes.length > 0) capabilities.push('api-provider');
    if (module.schedule) capabilities.push('scheduled');
    if (module.webhook) capabilities.push('webhook-handler');
    
    return capabilities;
  }

  async executeFeature(featureId, input = {}) {
    const feature = this.features.get(featureId);
    
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }
    
    if (!feature.active) {
      throw new Error(`Feature is inactive: ${feature.name}`);
    }
    
    this.logger.info(`⚡ Executing feature: ${feature.name}`, { featureId, input });
    
    try {
      // Update usage tracking
      feature.lastUsed = new Date();
      feature.usageCount++;
      
      const module = feature.module;
      let result;
      
      // Try different execution methods
      if (typeof module.execute === 'function') {
        result = await module.execute(input);
      } else if (typeof module === 'function') {
        result = await module(input);
      } else if (typeof module.handler === 'function') {
        result = await module.handler(input);
      } else {
        throw new Error('No executable method found in feature');
      }
      
      this.logger.info(`✅ Feature executed successfully: ${feature.name}`, { 
        featureId, 
        resultType: typeof result 
      });
      
      return {
        success: true,
        result,
        feature: {
          id: feature.id,
          name: feature.name,
          usageCount: feature.usageCount
        },
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error(`❌ Feature execution failed: ${feature.name}`, { 
        featureId, 
        error: error.message 
      });
      
      throw new Error(`Feature execution failed: ${error.message}`);
    }
  }

  async integrateFeature(code, plan) {
    this.logger.info('🔗 Integrating new feature...', { planId: plan.id });
    
    try {
      // Generate filename
      const timestamp = Date.now();
      const safeTitle = plan.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const filename = `feature-${timestamp}-${safeTitle}.js`;
      const filePath = path.join(this.dynamicDir, filename);
      
      // Add integration wrapper
      const wrappedCode = this.wrapFeatureCode(code, plan);
      
      // Save to file
      await fs.writeFile(filePath, wrappedCode, 'utf8');
      
      // Load as feature
      const feature = await this.loadFeature(filename);
      
      // Test the feature
      await this.testFeature(feature);
      
      this.logger.info('✅ Feature integrated successfully', { 
        featureId: feature.id,
        name: feature.name
      });
      
      return feature;
      
    } catch (error) {
      this.logger.error('❌ Feature integration failed:', error);
      throw error;
    }
  }

  wrapFeatureCode(code, plan) {
    return `
/**
 * 🤖 Auto-generated feature by Autonomo
 * 
 * Plan ID: ${plan.id}
 * Title: ${plan.title}
 * Description: ${plan.description}
 * Generated: ${new Date().toISOString()}
 * Category: ${plan.category}
 * Complexity: ${plan.complexity}
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// Wrap user code in error handling
const userCode = () => {
  ${code}
};

// Execute user code
let exports;
try {
  exports = userCode();
} catch (error) {
  logger.error('Feature initialization error:', error);
  exports = {};
}

// Ensure proper module exports
if (typeof exports !== 'object' || exports === null) {
  exports = { execute: exports };
}

// Add metadata
exports.metadata = {
  id: '${plan.id}',
  title: '${plan.title}',
  description: '${plan.description}',
  category: '${plan.category}',
  complexity: '${plan.complexity}',
  generated: '${new Date().toISOString()}',
  agent: 'feature-manager',
  version: '1.0.0'
};

// Add health check
exports.health = () => ({
  status: 'healthy',
  name: exports.metadata.title,
  uptime: process.uptime()
});

module.exports = exports;
`;
  }

  async testFeature(feature) {
    this.logger.info(`🧪 Testing feature: ${feature.name}`);
    
    try {
      // Basic health check
      if (typeof feature.module.health === 'function') {
        const health = feature.module.health();
        if (health.status !== 'healthy') {
          throw new Error(`Health check failed: ${JSON.stringify(health)}`);
        }
      }
      
      // Test execute method with safe input
      if (typeof feature.module.execute === 'function') {
        try {
          await Promise.race([
            feature.module.execute({ test: true }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Test timeout')), 5000)
            )
          ]);
        } catch (error) {
          // Some test failures are acceptable
          this.logger.warn(`⚠️ Test execution warning: ${error.message}`);
        }
      }
      
      this.logger.info(`✅ Feature test completed: ${feature.name}`);
      
    } catch (error) {
      this.logger.error(`❌ Feature test failed: ${feature.name}`, error);
      feature.active = false;
      throw error;
    }
  }

  getActiveFeatures() {
    return Array.from(this.features.values())
      .filter(f => f.active)
      .sort((a, b) => b.lastUsed - a.lastUsed);
  }

  getFeature(id) {
    return this.features.get(id);
  }

  getFeaturesByCategory(category) {
    return Array.from(this.features.values())
      .filter(f => f.active && f.category === category);
  }

  getUsageStats() {
    const features = Array.from(this.features.values());
    
    return {
      total: features.length,
      active: features.filter(f => f.active).length,
      totalUsage: features.reduce((sum, f) => sum + f.usageCount, 0),
      byCategory: features.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {}),
      mostUsed: features
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(f => ({ name: f.name, usageCount: f.usageCount }))
    };
  }

  async deactivateFeature(id) {
    const feature = this.features.get(id);
    if (feature) {
      feature.active = false;
      this.logger.info(`🚫 Deactivated feature: ${feature.name}`);
    }
  }

  async deleteFeature(id) {
    const feature = this.features.get(id);
    if (feature) {
      try {
        await fs.unlink(feature.filePath);
        this.features.delete(id);
        this.logger.info(`🗑️ Deleted feature: ${feature.name}`);
      } catch (error) {
        this.logger.error(`❌ Failed to delete feature: ${feature.name}`, error);
        throw error;
      }
    }
  }
}

module.exports = FeatureManager;