/**
 * 🛡️ Safety Manager
 * Implements security measures and code validation to prevent malicious execution
 */

const { VM } = require('vm2');
const fs = require('fs').promises;
const path = require('path');
const Joi = require('joi');
const winston = require('winston');

class SafetyManager {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/safety.log' })
      ]
    });

    this.safetyRules = this.loadSafetyRules();
    this.bannedPatterns = this.loadBannedPatterns();
    this.allowedModules = this.loadAllowedModules();
  }

  async initialize() {
    this.logger.info('🛡️ Initializing Safety Manager...');
    
    // Ensure safety configurations are loaded
    await this.validateSafetyConfig();
    
    this.logger.info('✅ Safety Manager initialized');
  }

  loadSafetyRules() {
    return {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE_KB) * 1024 || 100 * 1024, // 100KB
      maxExecutionTime: parseInt(process.env.SANDBOX_TIMEOUT_MS) || 30000, // 30 seconds
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      allowNetworkAccess: process.env.ALLOW_NETWORK_ACCESS === 'true',
      allowFileSystemAccess: process.env.ALLOW_FS_ACCESS === 'true',
      enableSandbox: process.env.ENABLE_SANDBOX !== 'false'
    };
  }

  loadBannedPatterns() {
    return [
      // Dangerous Node.js modules and methods
      /require\(['"`]child_process['"`]\)/gi,
      /require\(['"`]fs['"`]\)(?!\.promises)/gi,
      /require\(['"`]net['"`]\)/gi,
      /require\(['"`]http['"`]\)/gi,
      /require\(['"`]https['"`]\)/gi,
      /require\(['"`]cluster['"`]\)/gi,
      /require\(['"`]worker_threads['"`]\)/gi,
      
      // Process manipulation
      /process\.exit/gi,
      /process\.kill/gi,
      /process\.abort/gi,
      
      // File system operations
      /\.writeFile/gi,
      /\.writeFileSync/gi,
      /\.unlink/gi,
      /\.unlinkSync/gi,
      /\.rmdir/gi,
      /\.rmdirSync/gi,
      
      // Network operations
      /fetch\(/gi,
      /axios\./gi,
      /XMLHttpRequest/gi,
      
      // Eval and code execution
      /eval\(/gi,
      /Function\(/gi,
      /setTimeout\(/gi,
      /setInterval\(/gi,
      
      // Global object access
      /global\./gi,
      /globalThis\./gi,
      
      // Dangerous patterns
      /while\s*\(\s*true\s*\)/gi, // Infinite loops
      /for\s*\(\s*;\s*;\s*\)/gi,  // Infinite loops
    ];
  }

  loadAllowedModules() {
    return [
      'crypto',
      'util',
      'events',
      'stream',
      'uuid',
      'joi',
      'lodash',
      'moment',
      'chalk',
      'winston'
    ];
  }

  async validatePlan(plan) {
    this.logger.info('🔍 Validating evolution plan...', { planId: plan.id });

    try {
      // Schema validation
      const planSchema = Joi.object({
        id: Joi.string().required(),
        title: Joi.string().min(3).max(100).required(),
        description: Joi.string().min(10).max(1000).required(),
        category: Joi.string().valid('api', 'utility', 'ui', 'integration', 'data').required(),
        complexity: Joi.string().valid('low', 'medium', 'high').required(),
        estimatedLOC: Joi.number().min(1).max(2000),
        dependencies: Joi.array().items(Joi.string()).max(10),
        files: Joi.array().items(Joi.object({
          path: Joi.string().required(),
          type: Joi.string().required(),
          purpose: Joi.string().required()
        })).max(5),
        safetyConsiderations: Joi.array().items(Joi.string())
      });

      const { error } = planSchema.validate(plan);
      if (error) {
        return {
          approved: false,
          reason: `Plan validation failed: ${error.details[0].message}`,
          severity: 'high'
        };
      }

      // Check for suspicious elements
      const suspiciousCheck = this.checkSuspiciousContent(plan);
      if (!suspiciousCheck.safe) {
        return {
          approved: false,
          reason: suspiciousCheck.reason,
          severity: 'high'
        };
      }

      // Validate dependencies
      const dependencyCheck = await this.validateDependencies(plan.dependencies || []);
      if (!dependencyCheck.safe) {
        return {
          approved: false,
          reason: dependencyCheck.reason,
          severity: 'medium'
        };
      }

      this.logger.info('✅ Plan validation passed', { planId: plan.id });

      return {
        approved: true,
        reason: 'Plan passed all safety checks',
        severity: 'none'
      };

    } catch (error) {
      this.logger.error('❌ Plan validation error:', error);
      return {
        approved: false,
        reason: `Validation error: ${error.message}`,
        severity: 'high'
      };
    }
  }

  checkSuspiciousContent(plan) {
    const textContent = JSON.stringify(plan).toLowerCase();

    // Check for suspicious keywords
    const suspiciousKeywords = [
      'delete', 'remove', 'destroy', 'hack', 'exploit',
      'malware', 'virus', 'backdoor', 'shell', 'exec',
      'password', 'secret', 'token', 'credential'
    ];

    for (const keyword of suspiciousKeywords) {
      if (textContent.includes(keyword)) {
        return {
          safe: false,
          reason: `Suspicious keyword detected: ${keyword}`
        };
      }
    }

    // Check file paths for suspicious locations
    if (plan.files) {
      for (const file of plan.files) {
        if (!file.path.startsWith('dynamic/')) {
          return {
            safe: false,
            reason: `Unsafe file path: ${file.path}. All files must be in dynamic/ directory`
          };
        }
      }
    }

    return { safe: true };
  }

  async validateDependencies(dependencies) {
    for (const dep of dependencies) {
      if (!this.allowedModules.includes(dep)) {
        return {
          safe: false,
          reason: `Dependency '${dep}' is not in the allowed modules list`
        };
      }
    }

    return { safe: true };
  }

  async testInSandbox(code) {
    this.logger.info('🧪 Testing code in sandbox...');

    try {
      // Static analysis first
      const staticCheck = this.performStaticAnalysis(code);
      if (!staticCheck.safe) {
        return staticCheck;
      }

      // Dynamic testing in VM2 sandbox
      const dynamicCheck = await this.performDynamicTesting(code);
      if (!dynamicCheck.safe) {
        return dynamicCheck;
      }

      this.logger.info('✅ Sandbox testing passed');

      return {
        safe: true,
        reason: 'Code passed all sandbox tests',
        metrics: {
          staticAnalysis: staticCheck.metrics,
          dynamicTesting: dynamicCheck.metrics
        }
      };

    } catch (error) {
      this.logger.error('❌ Sandbox testing failed:', error);
      return {
        safe: false,
        reason: `Sandbox testing error: ${error.message}`,
        error: error.message
      };
    }
  }

  performStaticAnalysis(code) {
    this.logger.info('🔍 Performing static code analysis...');

    // Check file size
    if (code.length > this.safetyRules.maxFileSize) {
      return {
        safe: false,
        reason: `Code size (${code.length}) exceeds maximum allowed (${this.safetyRules.maxFileSize})`
      };
    }

    // Check for banned patterns
    for (const pattern of this.bannedPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        return {
          safe: false,
          reason: `Banned pattern detected: ${matches[0]}`,
          pattern: pattern.toString()
        };
      }
    }

    // Check for excessive complexity
    const complexityMetrics = this.analyzeComplexity(code);
    if (complexityMetrics.risk === 'high') {
      return {
        safe: false,
        reason: `Code complexity too high: ${complexityMetrics.reason}`
      };
    }

    return {
      safe: true,
      metrics: complexityMetrics
    };
  }

  analyzeComplexity(code) {
    const lines = code.split('\n').length;
    const functionCount = (code.match(/function\s+\w+/g) || []).length;
    const loopCount = (code.match(/for\s*\(|while\s*\(|do\s*{/g) || []).length;
    const conditionalCount = (code.match(/if\s*\(|switch\s*\(/g) || []).length;

    let risk = 'low';
    let reason = 'Code complexity is acceptable';

    if (lines > 500) {
      risk = 'high';
      reason = 'Too many lines of code';
    } else if (functionCount > 20) {
      risk = 'high';
      reason = 'Too many functions';
    } else if (loopCount > 10) {
      risk = 'medium';
      reason = 'High number of loops';
    } else if (conditionalCount > 15) {
      risk = 'medium';
      reason = 'High number of conditionals';
    }

    return {
      lines,
      functionCount,
      loopCount,
      conditionalCount,
      risk,
      reason
    };
  }

  async performDynamicTesting(code) {
    this.logger.info('⚡ Performing dynamic testing...');

    return new Promise((resolve) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      try {
        const vm = new VM({
          timeout: this.safetyRules.maxExecutionTime,
          sandbox: this.createSandboxEnvironment(),
          eval: false,
          wasm: false
        });

        // Test execution
        const result = vm.run(`
          (() => {
            ${code}
            return { status: 'executed', timestamp: Date.now() };
          })()
        `);

        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const executionTime = endTime - startTime;
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        // Check resource usage
        if (executionTime > this.safetyRules.maxExecutionTime) {
          resolve({
            safe: false,
            reason: `Execution time (${executionTime}ms) exceeded limit (${this.safetyRules.maxExecutionTime}ms)`
          });
          return;
        }

        if (memoryDelta > this.safetyRules.maxMemoryUsage) {
          resolve({
            safe: false,
            reason: `Memory usage (${memoryDelta} bytes) exceeded limit (${this.safetyRules.maxMemoryUsage} bytes)`
          });
          return;
        }

        resolve({
          safe: true,
          metrics: {
            executionTime,
            memoryDelta,
            result
          }
        });

      } catch (error) {
        resolve({
          safe: false,
          reason: `Dynamic testing failed: ${error.message}`,
          error: error.message
        });
      }
    });
  }

  createSandboxEnvironment() {
    return {
      console: {
        log: (...args) => this.logger.info('Sandbox log:', ...args),
        error: (...args) => this.logger.error('Sandbox error:', ...args),
        warn: (...args) => this.logger.warn('Sandbox warn:', ...args)
      },
      setTimeout: (fn, delay) => {
        if (delay > 1000) throw new Error('Timeout too long');
        return setTimeout(fn, Math.min(delay, 1000));
      },
      Date,
      Math,
      JSON,
      Buffer,
      require: (module) => {
        if (this.allowedModules.includes(module)) {
          return require(module);
        }
        throw new Error(`Module '${module}' is not allowed in sandbox`);
      },
      process: {
        env: {}, // Empty environment for security
        version: process.version,
        platform: process.platform
      }
    };
  }

  async validateSafetyConfig() {
    // Validate safety configuration
    if (!this.safetyRules.enableSandbox) {
      this.logger.warn('⚠️ Sandbox is disabled - this is not recommended for production');
    }

    if (this.safetyRules.allowNetworkAccess) {
      this.logger.warn('⚠️ Network access is enabled - monitor for suspicious activity');
    }

    if (this.safetyRules.allowFileSystemAccess) {
      this.logger.warn('⚠️ File system access is enabled - ensure proper restrictions');
    }
  }

  getSecurityReport() {
    return {
      safetyRules: this.safetyRules,
      bannedPatterns: this.bannedPatterns.length,
      allowedModules: this.allowedModules,
      lastValidation: new Date(),
      status: 'active'
    };
  }

  async quarantineCode(code, reason) {
    const timestamp = Date.now();
    const quarantinePath = path.join('./logs', 'quarantine', `quarantine-${timestamp}.js`);
    
    await fs.mkdir(path.dirname(quarantinePath), { recursive: true });
    
    const quarantineContent = `
/**
 * ⚠️ QUARANTINED CODE
 * Reason: ${reason}
 * Timestamp: ${new Date().toISOString()}
 * DO NOT EXECUTE
 */

/*
${code}
*/
`;

    await fs.writeFile(quarantinePath, quarantineContent, 'utf8');
    
    this.logger.warn('🚨 Code quarantined', { reason, quarantinePath });
    
    return quarantinePath;
  }
}

module.exports = SafetyManager;