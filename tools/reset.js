/**
 * 🔄 Reset Tool
 * Safely resets the application state while preserving important data
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

async function resetApplication() {
  console.log(chalk.yellow.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                     🔄 AUTONOMO RESET TOOL                    ║
║                                                              ║
║  This tool will help you reset various aspects of Autonomo    ║
║  while preserving important data and configurations.          ║
╚═══════════════════════════════════════════════════════════════╝
  `));

  try {
    const resetOptions = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'resetItems',
        message: 'What would you like to reset?',
        choices: [
          { name: '🔥 Clear all generated features (./dynamic/)', value: 'features' },
          { name: '📝 Clear evolution history', value: 'evolution' },
          { name: '📊 Clear logs (keep current session)', value: 'logs' },
          { name: '🧠 Clear AI agent memory/reflections', value: 'reflections' },
          { name: '📸 Clear evolution snapshots', value: 'snapshots' },
          { name: '🗄️ Clear quarantined code', value: 'quarantine' },
          new inquirer.Separator(),
          { name: '💥 DANGER: Full reset (everything except config)', value: 'full' }
        ]
      }
    ]);

    if (resetOptions.resetItems.length === 0) {
      console.log(chalk.gray('No items selected for reset. Exiting...'));
      return;
    }

    // Confirm dangerous operations
    if (resetOptions.resetItems.includes('full') || resetOptions.resetItems.includes('features')) {
      const confirm = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDangerous',
          message: chalk.red('⚠️  This will permanently delete generated features. Are you sure?'),
          default: false
        }
      ]);

      if (!confirm.confirmDangerous) {
        console.log(chalk.gray('Reset cancelled by user.'));
        return;
      }
    }

    // Create backup before reset
    const backupPath = await createBackup(resetOptions.resetItems);
    console.log(chalk.blue(`📦 Backup created at: ${backupPath}`));

    // Perform reset operations
    await performReset(resetOptions.resetItems);

    console.log(chalk.green.bold(`
✅ Reset completed successfully!

📦 Backup Location: ${backupPath}
🔄 You can now restart Autonomo with a clean state.

To restore from backup if needed:
  node tools/restore.js ${path.basename(backupPath)}
    `));

  } catch (error) {
    console.error(chalk.red('❌ Reset failed:', error.message));
    process.exit(1);
  }
}

async function createBackup(resetItems) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('./logs', 'backups', `reset-backup-${timestamp}`);
  
  await fs.mkdir(backupDir, { recursive: true });

  console.log(chalk.blue('📦 Creating backup...'));

  // Backup based on what's being reset
  if (resetItems.includes('features') || resetItems.includes('full')) {
    await copyDirectory('./dynamic', path.join(backupDir, 'dynamic'));
  }

  if (resetItems.includes('evolution') || resetItems.includes('full')) {
    await copyFileIfExists('./logs/evolution-history.json', path.join(backupDir, 'evolution-history.json'));
  }

  if (resetItems.includes('logs') || resetItems.includes('full')) {
    await copyDirectory('./logs', path.join(backupDir, 'logs'), ['backups', 'quarantine']);
  }

  if (resetItems.includes('reflections') || resetItems.includes('full')) {
    await copyFileIfExists('./logs/reflections.json', path.join(backupDir, 'reflections.json'));
  }

  if (resetItems.includes('snapshots') || resetItems.includes('full')) {
    await copyDirectory('./logs/snapshots', path.join(backupDir, 'snapshots'));
  }

  // Create backup manifest
  const manifest = {
    timestamp: new Date(),
    resetItems,
    autonomoVersion: require('../package.json').version,
    nodeVersion: process.version,
    platform: process.platform
  };

  await fs.writeFile(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  return backupDir;
}

async function performReset(resetItems) {
  console.log(chalk.yellow('🔄 Performing reset operations...'));

  if (resetItems.includes('full')) {
    // Full reset includes everything except config
    await clearDirectory('./dynamic');
    await clearFile('./logs/evolution-history.json');
    await clearFile('./logs/reflections.json');
    await clearDirectory('./logs/snapshots');
    await clearDirectory('./logs/quarantine');
    await clearLogFiles();
    console.log(chalk.green('✅ Full reset completed'));
    return;
  }

  // Individual reset operations
  if (resetItems.includes('features')) {
    await clearDirectory('./dynamic');
    console.log(chalk.green('✅ Generated features cleared'));
  }

  if (resetItems.includes('evolution')) {
    await clearFile('./logs/evolution-history.json');
    console.log(chalk.green('✅ Evolution history cleared'));
  }

  if (resetItems.includes('logs')) {
    await clearLogFiles();
    console.log(chalk.green('✅ Log files cleared'));
  }

  if (resetItems.includes('reflections')) {
    await clearFile('./logs/reflections.json');
    console.log(chalk.green('✅ AI reflections cleared'));
  }

  if (resetItems.includes('snapshots')) {
    await clearDirectory('./logs/snapshots');
    console.log(chalk.green('✅ Evolution snapshots cleared'));
  }

  if (resetItems.includes('quarantine')) {
    await clearDirectory('./logs/quarantine');
    console.log(chalk.green('✅ Quarantined code cleared'));
  }
}

async function clearDirectory(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        await clearDirectory(filePath);
        await fs.rmdir(filePath);
      } else {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(chalk.yellow(`⚠️ Could not clear directory ${dirPath}: ${error.message}`));
    }
  }
}

async function clearFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(chalk.yellow(`⚠️ Could not clear file ${filePath}: ${error.message}`));
    }
  }
}

async function clearLogFiles() {
  const logFiles = [
    './logs/evolution.log',
    './logs/agents.log',
    './logs/features.log',
    './logs/safety.log',
    './logs/evolution-tracker.log',
    './logs/executor.log'
  ];

  for (const logFile of logFiles) {
    await clearFile(logFile);
  }
}

async function copyDirectory(src, dest, excludeDirs = []) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    for (const file of files) {
      if (excludeDirs.includes(file)) continue;
      
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stats = await fs.stat(srcPath);
      
      if (stats.isDirectory()) {
        await copyDirectory(srcPath, destPath, excludeDirs);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(chalk.yellow(`⚠️ Could not copy directory ${src}: ${error.message}`));
    }
  }
}

async function copyFileIfExists(src, dest) {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(chalk.yellow(`⚠️ Could not copy file ${src}: ${error.message}`));
    }
  }
}

if (require.main === module) {
  resetApplication();
}

module.exports = { resetApplication };