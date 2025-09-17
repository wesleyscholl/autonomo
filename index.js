#!/usr/bin/env node

/**
 * 🧠 Autonomo - The Living App
 * Core Orchestrator & Lifecycle Manager
 * 
 * This is the heart of the self-evolving system that coordinates
 * AI agents and manages the application lifecycle.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Command } = require('commander');
const chalk = require('chalk');
const winston = require('winston');
require('dotenv').config();

// Core systems
const AgentOrchestrator = require('./agents/orchestrator');
const FeatureManager = require('./core/feature-manager');
const SafetyManager = require('./core/safety-manager');
const EvolutionTracker = require('./core/evolution-tracker');

class Autonomo {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.agents = new AgentOrchestrator();
    this.features = new FeatureManager();
    this.safety = new SafetyManager();
    this.evolution = new EvolutionTracker();
    this.logger = this.setupLogger();
    
    this.setupExpress();
    this.setupRoutes();
  }

  setupLogger() {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}] ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/evolution.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 5242880,
          maxFiles: 3,
        })
      ]
    });
  }

  setupExpress() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Custom middleware for evolution tracking
    this.app.use((req, res, next) => {
      req.evolutionId = this.evolution.startInteraction();
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'alive',
        version: require('./package.json').version,
        uptime: process.uptime(),
        features: this.features.getActiveFeatures().length,
        lastEvolution: this.evolution.getLastEvolution()
      });
    });

    // Evolution endpoints
    this.app.post('/evolve', async (req, res) => {
      try {
        const { request, mode = 'guided' } = req.body;
        
        this.logger.info('🧬 Evolution requested', { request, mode });
        
        const result = await this.evolve(request, mode);
        
        res.json({
          success: true,
          evolution: result,
          message: '🎉 Successfully evolved new capabilities!'
        });
      } catch (error) {
        this.logger.error('❌ Evolution failed', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Feature management
    this.app.get('/features', (req, res) => {
      const features = this.features.getActiveFeatures();
      res.json({
        count: features.length,
        features: features.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          created: f.created,
          lastUsed: f.lastUsed,
          usageCount: f.usageCount
        }))
      });
    });

    this.app.post('/features/:id/execute', async (req, res) => {
      try {
        const { id } = req.params;
        const { input } = req.body;
        
        const result = await this.features.executeFeature(id, input);
        
        res.json({
          success: true,
          result,
          featureId: id
        });
      } catch (error) {
        this.logger.error('❌ Feature execution failed', { 
          featureId: req.params.id, 
          error: error.message 
        });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Agent status and interaction
    this.app.get('/agents/status', (req, res) => {
      res.json(this.agents.getStatus());
    });

    this.app.post('/agents/collaborate', async (req, res) => {
      try {
        const { task, agents = ['planner', 'coder'] } = req.body;
        
        const result = await this.agents.collaborate(task, agents);
        
        res.json({
          success: true,
          collaboration: result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Dynamic route mounting for evolved features
    this.mountDynamicRoutes();
  }

  async mountDynamicRoutes() {
    const features = await this.features.loadAllFeatures();
    
    features.forEach(feature => {
      if (feature.routes) {
        feature.routes.forEach(route => {
          this.app[route.method.toLowerCase()](
            route.path, 
            async (req, res) => {
              try {
                const result = await this.features.executeFeature(
                  feature.id, 
                  { req, res }
                );
                
                if (!res.headersSent) {
                  res.json(result);
                }
              } catch (error) {
                if (!res.headersSent) {
                  res.status(500).json({ error: error.message });
                }
              }
            }
          );
        });
      }
    });
  }

  async evolve(request = null, mode = 'autonomous') {
    this.logger.info('🚀 Starting evolution cycle', { request, mode });
    
    try {
      // Step 1: Planning
      const plan = await this.agents.plan(request, {
        mode,
        currentFeatures: this.features.getActiveFeatures(),
        systemState: await this.getSystemState()
      });

      this.logger.info('📋 Evolution plan created', { plan });

      // Step 2: Safety validation
      const safetyCheck = await this.safety.validatePlan(plan);
      if (!safetyCheck.approved) {
        throw new Error(`Safety validation failed: ${safetyCheck.reason}`);
      }

      // Step 3: Code generation
      const generatedCode = await this.agents.generateCode(plan);
      
      this.logger.info('💻 Code generated', { 
        linesOfCode: generatedCode.split('\n').length 
      });

      // Step 4: Safety sandbox testing
      const sandboxResult = await this.safety.testInSandbox(generatedCode);
      if (!sandboxResult.safe) {
        throw new Error(`Code failed sandbox test: ${sandboxResult.reason}`);
      }

      // Step 5: Feature integration
      const feature = await this.features.integrateFeature(generatedCode, plan);
      
      this.logger.info('⚡ Feature integrated', { featureId: feature.id });

      // Step 6: Evolution tracking
      const evolutionRecord = await this.evolution.recordEvolution({
        plan,
        feature,
        mode,
        request,
        timestamp: new Date(),
        success: true
      });

      // Step 7: Self-reflection and learning
      await this.agents.reflect(evolutionRecord);

      return {
        evolutionId: evolutionRecord.id,
        feature: {
          id: feature.id,
          name: feature.name,
          description: feature.description
        },
        plan,
        learnings: evolutionRecord.learnings
      };

    } catch (error) {
      this.logger.error('💥 Evolution failed', { error: error.message });
      
      await this.evolution.recordEvolution({
        request,
        mode,
        error: error.message,
        timestamp: new Date(),
        success: false
      });

      throw error;
    }
  }

  async getSystemState() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: this.features.getActiveFeatures().length,
      lastEvolution: this.evolution.getLastEvolution(),
      agentStatus: this.agents.getStatus()
    };
  }

  async autonomousEvolution() {
    this.logger.info('🤖 Starting autonomous evolution mode');
    
    setInterval(async () => {
      try {
        // Analyze usage patterns and system state
        const insights = await this.agents.analyzeUsagePatterns();
        
        if (insights.shouldEvolve) {
          this.logger.info('🧬 Autonomous evolution triggered', { 
            reason: insights.reason 
          });
          
          await this.evolve(insights.suggestion, 'autonomous');
        }
      } catch (error) {
        this.logger.error('🚨 Autonomous evolution error', { 
          error: error.message 
        });
      }
    }, (process.env.EVOLUTION_INTERVAL_HOURS || 24) * 60 * 60 * 1000);
  }

  async start() {
    try {
      // Initialize core systems
      await this.agents.initialize();
      await this.features.loadAllFeatures();
      await this.safety.initialize();
      await this.evolution.initialize();

      // Start Express server
      this.app.listen(this.port, () => {
        console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                    🧠 AUTONOMO - LIVING APP                   ║
║                                                              ║
║  🚀 Server running on http://localhost:${this.port}               ║
║  🤖 AI Agents: ${this.agents.getActiveAgents().join(', ')}                     ║
║  ⚡ Features loaded: ${this.features.getActiveFeatures().length}                             ║
║  🔒 Safety mode: ${process.env.ENABLE_SANDBOX ? 'ENABLED' : 'DISABLED'}                     ║
║                                                              ║
║  Ready to evolve! Try:                                       ║
║  • POST /evolve {"request": "Add a weather API"}             ║
║  • GET  /features                                            ║
║  • GET  /health                                              ║
╚═══════════════════════════════════════════════════════════════╝
        `));
      });

      // Start autonomous evolution if enabled
      if (process.env.ENABLE_AUTONOMOUS_EVOLUTION === 'true') {
        await this.autonomousEvolution();
      }

      this.logger.info('🎉 Autonomo fully initialized and ready to evolve!');

    } catch (error) {
      this.logger.error('💥 Failed to start Autonomo', { error: error.message });
      process.exit(1);
    }
  }
}

// CLI Interface
const program = new Command();

program
  .name('autonomo')
  .description('🧠 The Living App - Self-evolving AI application')
  .version(require('./package.json').version);

program
  .command('start')
  .description('Start the Autonomo server')
  .option('-a, --autonomous', 'Enable autonomous evolution')
  .action(async (options) => {
    if (options.autonomous) {
      process.env.ENABLE_AUTONOMOUS_EVOLUTION = 'true';
    }
    
    const app = new Autonomo();
    await app.start();
  });

program
  .command('evolve')
  .description('Request manual evolution')
  .option('-r, --request <request>', 'Specific evolution request')
  .option('-m, --mode <mode>', 'Evolution mode (guided, autonomous)', 'guided')
  .action(async (options) => {
    const app = new Autonomo();
    await app.agents.initialize();
    
    const result = await app.evolve(options.request, options.mode);
    
    console.log(chalk.green('✨ Evolution completed!'));
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('status')
  .description('Show current system status')
  .action(async () => {
    const app = new Autonomo();
    await app.features.loadAllFeatures();
    
    console.log(chalk.cyan('📊 Autonomo Status:'));
    console.log(`Features: ${app.features.getActiveFeatures().length}`);
    console.log(`Last Evolution: ${app.evolution.getLastEvolution()}`);
  });

// Handle direct execution
if (require.main === module) {
  if (process.argv.length === 2) {
    // No CLI args, start the server
    const app = new Autonomo();
    app.start();
  } else {
    // Parse CLI commands
    program.parse();
  }
}

module.exports = Autonomo;