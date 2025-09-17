/**
 * ⚡ Executor Agent
 * Safely executes AI-generated code in controlled environments
 */

const { VM } = require('vm2');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

class ExecutorAgent {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/executor.log' })
      ]
    });
  }

  async initialize() {
    // Ensure dynamic directory exists
    await fs.mkdir('./dynamic', { recursive: true });
  }

  async executeCode(code, plan) {
    this.logger.info('⚡ Executing generated code...', { planId: plan.id });

    try {
      // First, validate the code in a sandbox
      const sandboxResult = await this.validateInSandbox(code);
      
      if (!sandboxResult.valid) {
        throw new Error(`Code validation failed: ${sandboxResult.error}`);
      }

      // Save the code to the dynamic directory
      const filePath = await this.saveCodeToFile(code, plan);

      // Load and test the module
      const loadedModule = await this.loadAndTestModule(filePath);

      return {
        success: true,
        filePath,
        module: loadedModule,
        validation: sandboxResult
      };

    } catch (error) {
      this.logger.error('❌ Code execution failed:', error);
      throw error;
    }
  }

  async validateInSandbox(code) {
    const timeout = parseInt(process.env.SANDBOX_TIMEOUT_MS) || 30000;
    
    try {
      const vm = new VM({
        timeout,
        sandbox: {
          console: {
            log: () => {}, // Suppress sandbox console output
            error: () => {},
            warn: () => {},
            info: () => {}
          },
          require: (module) => {
            // Allow only safe modules
            const allowedModules = [
              'crypto', 'util', 'events', 'stream',
              'uuid', 'joi', 'lodash', 'moment'
            ];
            
            if (allowedModules.includes(module)) {
              return require(module);
            }
            
            throw new Error(`Module '${module}' is not allowed in sandbox`);
          },
          Buffer,
          process: {
            env: {}, // Empty env for security
            version: process.version
          }
        }
      });

      // Test compilation
      vm.run(code);

      return { valid: true, message: 'Code validation successful' };

    } catch (error) {
      return { 
        valid: false, 
        error: error.message,
        details: 'Code failed sandbox validation'
      };
    }
  }

  async saveCodeToFile(code, plan) {
    const timestamp = Date.now();
    const safeTitle = plan.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const fileName = `feature-${timestamp}-${safeTitle}.js`;
    const filePath = path.join('./dynamic', fileName);

    // Add file header with metadata
    const fileContent = `
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

${code}

// Export metadata for feature management
if (typeof module !== 'undefined' && module.exports) {
  module.exports.metadata = {
    id: '${plan.id}',
    title: '${plan.title}',
    description: '${plan.description}',
    category: '${plan.category}',
    complexity: '${plan.complexity}',
    generated: '${new Date().toISOString()}',
    filePath: '${filePath}',
    agent: 'executor'
  };
}
`;

    await fs.writeFile(filePath, fileContent, 'utf8');
    
    this.logger.info('💾 Code saved to file', { filePath });
    
    return filePath;
  }

  async loadAndTestModule(filePath) {
    try {
      // Clear require cache to ensure fresh load
      const absolutePath = path.resolve(filePath);
      delete require.cache[absolutePath];

      // Load the module
      const loadedModule = require(absolutePath);

      // Basic functionality test
      if (typeof loadedModule === 'object') {
        this.logger.info('✅ Module loaded successfully', {
          exports: Object.keys(loadedModule),
          hasMetadata: !!loadedModule.metadata
        });

        // Test execute method if it exists
        if (typeof loadedModule.execute === 'function') {
          try {
            // Test with empty input
            await loadedModule.execute({});
            this.logger.info('✅ Execute method tested successfully');
          } catch (error) {
            this.logger.warn('⚠️ Execute method test failed (may be expected):', error.message);
          }
        }

        return loadedModule;
      } else {
        throw new Error('Module does not export an object');
      }

    } catch (error) {
      this.logger.error('❌ Module loading failed:', error);
      throw new Error(`Failed to load module: ${error.message}`);
    }
  }

  async process(input, collaborationContext) {
    // For agent collaboration - execute the generated code
    const code = input.result || input;
    const plan = collaborationContext.iterations[0]?.output || { 
      id: 'collab-' + Date.now(), 
      title: 'Collaborative Feature' 
    };

    return await this.executeCode(code, plan);
  }

  async listGeneratedFeatures() {
    try {
      const files = await fs.readdir('./dynamic');
      const features = [];

      for (const file of files) {
        if (file.endsWith('.js')) {
          try {
            const filePath = path.join('./dynamic', file);
            const module = require(path.resolve(filePath));
            
            if (module.metadata) {
              features.push({
                file,
                ...module.metadata
              });
            }
          } catch (error) {
            this.logger.warn('⚠️ Could not load feature metadata:', file);
          }
        }
      }

      return features;
    } catch (error) {
      this.logger.error('❌ Failed to list features:', error);
      return [];
    }
  }

  async cleanupOldFeatures(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const files = await fs.readdir('./dynamic');
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join('./dynamic', file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          this.logger.info('🗑️ Cleaned up old feature:', file);
        }
      }
    } catch (error) {
      this.logger.error('❌ Cleanup failed:', error);
    }
  }
}

module.exports = ExecutorAgent;