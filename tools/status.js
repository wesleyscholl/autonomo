/**
 * 📊 Status Tool
 * Displays comprehensive system status and statistics
 */

const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

async function displayStatus() {
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                    📊 AUTONOMO STATUS REPORT                  ║
╚═══════════════════════════════════════════════════════════════╝
  `));

  try {
    // Load core modules
    const FeatureManager = require('../core/feature-manager');
    const EvolutionTracker = require('../core/evolution-tracker');
    
    const features = new FeatureManager();
    const evolution = new EvolutionTracker();
    
    await features.loadAllFeatures();
    await evolution.loadEvolutionHistory();

    // System Overview
    console.log(chalk.yellow.bold('🏗️  SYSTEM OVERVIEW'));
    console.log(chalk.white('─'.repeat(50)));
    
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    console.log(`${chalk.green('•')} Uptime: ${formatUptime(uptime)}`);
    console.log(`${chalk.green('•')} Memory Usage: ${formatBytes(memory.heapUsed)} / ${formatBytes(memory.heapTotal)}`);
    console.log(`${chalk.green('•')} Node.js Version: ${process.version}`);
    console.log(`${chalk.green('•')} Platform: ${process.platform}`);
    console.log();

    // Feature Statistics
    console.log(chalk.yellow.bold('⚡ FEATURE STATISTICS'));
    console.log(chalk.white('─'.repeat(50)));
    
    const featureStats = features.getUsageStats();
    console.log(`${chalk.green('•')} Total Features: ${featureStats.total}`);
    console.log(`${chalk.green('•')} Active Features: ${featureStats.active}`);
    console.log(`${chalk.green('•')} Total Executions: ${featureStats.totalUsage}`);
    
    if (featureStats.mostUsed.length > 0) {
      console.log(`${chalk.green('•')} Most Used Feature: ${featureStats.mostUsed[0].name} (${featureStats.mostUsed[0].usageCount} uses)`);
    }
    
    console.log(`${chalk.green('•')} Features by Category:`);
    Object.entries(featureStats.byCategory).forEach(([category, count]) => {
      console.log(`  ${chalk.blue('  →')} ${category}: ${count}`);
    });
    console.log();

    // Evolution History
    console.log(chalk.yellow.bold('🧬 EVOLUTION HISTORY'));
    console.log(chalk.white('─'.repeat(50)));
    
    const evolutionStats = evolution.getEvolutionStats();
    console.log(`${chalk.green('•')} Total Evolutions: ${evolutionStats.total}`);
    console.log(`${chalk.green('•')} Successful: ${evolutionStats.successful} (${evolutionStats.successRate}%)`);
    console.log(`${chalk.green('•')} Failed: ${evolutionStats.failed}`);
    
    if (evolutionStats.lastEvolution) {
      const lastEvolution = new Date(evolutionStats.lastEvolution);
      console.log(`${chalk.green('•')} Last Evolution: ${lastEvolution.toLocaleString()}`);
    }
    
    console.log(`${chalk.green('•')} Evolution Modes:`);
    Object.entries(evolutionStats.modes).forEach(([mode, count]) => {
      console.log(`  ${chalk.blue('  →')} ${mode}: ${count}`);
    });
    console.log();

    // Recent Activity
    console.log(chalk.yellow.bold('📈 RECENT ACTIVITY'));
    console.log(chalk.white('─'.repeat(50)));
    
    const recentEvolutions = evolution.getEvolutionHistory(5);
    if (recentEvolutions.length > 0) {
      recentEvolutions.forEach((evo, index) => {
        const date = new Date(evo.timestamp).toLocaleString();
        const status = evo.success ? chalk.green('✅') : chalk.red('❌');
        const title = evo.plan?.title || 'Unknown Evolution';
        console.log(`${status} ${date} - ${title}`);
      });
    } else {
      console.log(`${chalk.gray('•')} No evolution history found`);
    }
    console.log();

    // Active Features
    console.log(chalk.yellow.bold('🔥 ACTIVE FEATURES'));
    console.log(chalk.white('─'.repeat(50)));
    
    const activeFeatures = features.getActiveFeatures().slice(0, 10);
    if (activeFeatures.length > 0) {
      activeFeatures.forEach(feature => {
        const lastUsed = feature.lastUsed ? 
          new Date(feature.lastUsed).toLocaleDateString() : 
          'Never';
        console.log(`${chalk.green('•')} ${feature.name}`);
        console.log(`  ${chalk.blue('  →')} Category: ${feature.category}`);
        console.log(`  ${chalk.blue('  →')} Used: ${feature.usageCount} times (last: ${lastUsed})`);
        console.log(`  ${chalk.blue('  →')} File: ${feature.filename}`);
        console.log();
      });
    } else {
      console.log(`${chalk.gray('•')} No active features found`);
    }

    // System Health
    console.log(chalk.yellow.bold('🏥 SYSTEM HEALTH'));
    console.log(chalk.white('─'.repeat(50)));
    
    const health = await checkSystemHealth();
    health.forEach(check => {
      const icon = check.status === 'healthy' ? chalk.green('✅') : 
                   check.status === 'warning' ? chalk.yellow('⚠️') : chalk.red('❌');
      console.log(`${icon} ${check.name}: ${check.message}`);
    });
    console.log();

    // File System Usage
    console.log(chalk.yellow.bold('💾 DISK USAGE'));
    console.log(chalk.white('─'.repeat(50)));
    
    const diskUsage = await calculateDiskUsage();
    console.log(`${chalk.green('•')} Dynamic Features: ${formatBytes(diskUsage.dynamic)}`);
    console.log(`${chalk.green('•')} Logs: ${formatBytes(diskUsage.logs)}`);
    console.log(`${chalk.green('•')} Total: ${formatBytes(diskUsage.total)}`);
    console.log();

    console.log(chalk.cyan.bold('📊 Status report complete! All systems operational.'));

  } catch (error) {
    console.error(chalk.red('❌ Error generating status report:', error.message));
    process.exit(1);
  }
}

async function checkSystemHealth() {
  const checks = [];

  // Check if core directories exist
  try {
    await fs.access('./dynamic');
    checks.push({ name: 'Dynamic Directory', status: 'healthy', message: 'Accessible' });
  } catch {
    checks.push({ name: 'Dynamic Directory', status: 'error', message: 'Not accessible' });
  }

  try {
    await fs.access('./logs');
    checks.push({ name: 'Logs Directory', status: 'healthy', message: 'Accessible' });
  } catch {
    checks.push({ name: 'Logs Directory', status: 'warning', message: 'Not found' });
  }

  // Check environment variables
  const requiredEnvVars = ['GEMINI_API_KEY', 'OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missingEnvVars.length === 0) {
    checks.push({ name: 'Environment Variables', status: 'healthy', message: 'All API keys configured' });
  } else {
    checks.push({ name: 'Environment Variables', status: 'warning', message: `Missing: ${missingEnvVars.join(', ')}` });
  }

  // Check memory usage
  const memory = process.memoryUsage();
  const memoryUsage = memory.heapUsed / memory.heapTotal;
  
  if (memoryUsage < 0.8) {
    checks.push({ name: 'Memory Usage', status: 'healthy', message: `${(memoryUsage * 100).toFixed(1)}%` });
  } else if (memoryUsage < 0.95) {
    checks.push({ name: 'Memory Usage', status: 'warning', message: `${(memoryUsage * 100).toFixed(1)}% - High usage` });
  } else {
    checks.push({ name: 'Memory Usage', status: 'error', message: `${(memoryUsage * 100).toFixed(1)}% - Critical` });
  }

  return checks;
}

async function calculateDiskUsage() {
  const getDirectorySize = async (dirPath) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      let size = 0;
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
          size += await getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
      }
      
      return size;
    } catch {
      return 0;
    }
  };

  const dynamic = await getDirectorySize('./dynamic');
  const logs = await getDirectorySize('./logs');

  return {
    dynamic,
    logs,
    total: dynamic + logs
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

if (require.main === module) {
  displayStatus();
}

module.exports = { displayStatus };