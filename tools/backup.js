/**
 * 📦 Backup Tool
 * Creates comprehensive backups of the Autonomo system
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

async function createBackup() {
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                     📦 AUTONOMO BACKUP TOOL                   ║
╚═══════════════════════════════════════════════════════════════╝
  `));

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join('./logs', 'backups', `autonomo-backup-${timestamp}`);
    
    console.log(chalk.blue('📦 Creating comprehensive backup...'));
    
    await fs.mkdir(backupDir, { recursive: true });

    // Backup all important directories and files
    await backupDirectory('./dynamic', path.join(backupDir, 'dynamic'));
    await backupDirectory('./agents', path.join(backupDir, 'agents'));
    await backupDirectory('./core', path.join(backupDir, 'core'));
    await backupDirectory('./config', path.join(backupDir, 'config'));
    await backupDirectory('./logs', path.join(backupDir, 'logs'), ['backups']);

    // Backup important files
    await backupFile('./package.json', path.join(backupDir, 'package.json'));
    await backupFile('./index.js', path.join(backupDir, 'index.js'));
    await backupFile('./README.md', path.join(backupDir, 'README.md'));
    await backupFile('./.env.example', path.join(backupDir, '.env.example'));
    await backupFile('./.gitignore', path.join(backupDir, '.gitignore'));

    // Create backup manifest
    const manifest = await createBackupManifest();
    await fs.writeFile(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    // Create restore script
    await createRestoreScript(path.join(backupDir, 'restore.sh'), path.basename(backupDir));

    console.log(chalk.green.bold(`
✅ Backup completed successfully!

📦 Backup Location: ${backupDir}
📋 Backup Manifest: ${path.join(backupDir, 'manifest.json')}
🔄 Restore Script: ${path.join(backupDir, 'restore.sh')}

To restore this backup:
  chmod +x ${path.join(backupDir, 'restore.sh')}
  ./${path.join(backupDir, 'restore.sh')}

Or use the restore tool:
  node tools/restore.js ${path.basename(backupDir)}
    `));

    return backupDir;

  } catch (error) {
    console.error(chalk.red('❌ Backup failed:', error.message));
    throw error;
  }
}

async function backupDirectory(src, dest, excludeDirs = []) {
  try {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    console.log(chalk.blue(`  📁 Backing up ${src}...`));
    
    for (const file of files) {
      if (excludeDirs.includes(file)) {
        console.log(chalk.gray(`    ⏭️  Skipping ${file}`));
        continue;
      }
      
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stats = await fs.stat(srcPath);
      
      if (stats.isDirectory()) {
        await backupDirectory(srcPath, destPath, excludeDirs);
      } else {
        await fs.copyFile(srcPath, destPath);
        console.log(chalk.green(`    ✅ ${file}`));
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(chalk.gray(`  ⏭️  Directory ${src} does not exist, skipping...`));
    } else {
      console.warn(chalk.yellow(`  ⚠️  Could not backup directory ${src}: ${error.message}`));
    }
  }
}

async function backupFile(src, dest) {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    console.log(chalk.green(`  ✅ ${path.basename(src)}`));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(chalk.gray(`  ⏭️  File ${src} does not exist, skipping...`));
    } else {
      console.warn(chalk.yellow(`  ⚠️  Could not backup file ${src}: ${error.message}`));
    }
  }
}

async function createBackupManifest() {
  const stats = await gatherSystemStats();
  
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    autonomoVersion: require('../package.json').version,
    nodeVersion: process.version,
    platform: process.platform,
    backupType: 'full',
    systemStats: stats,
    contents: {
      directories: [
        'dynamic',
        'agents', 
        'core',
        'config',
        'logs'
      ],
      files: [
        'package.json',
        'index.js',
        'README.md',
        '.env.example',
        '.gitignore'
      ]
    },
    instructions: {
      restore: 'Run restore.sh or use node tools/restore.js',
      requirements: [
        'Node.js 18+',
        'npm packages from package.json',
        'API keys configured in .env'
      ]
    }
  };
}

async function gatherSystemStats() {
  try {
    const dynamicFiles = await fs.readdir('./dynamic').catch(() => []);
    const logFiles = await fs.readdir('./logs').catch(() => []);
    
    const totalDynamicSize = await calculateDirectorySize('./dynamic');
    const totalLogSize = await calculateDirectorySize('./logs');
    
    return {
      features: dynamicFiles.filter(f => f.endsWith('.js')).length,
      totalFiles: dynamicFiles.length + logFiles.length,
      diskUsage: {
        dynamic: totalDynamicSize,
        logs: totalLogSize,
        total: totalDynamicSize + totalLogSize
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function calculateDirectorySize(dirPath) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    let size = 0;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        size += await calculateDirectorySize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        size += stats.size;
      }
    }
    
    return size;
  } catch {
    return 0;
  }
}

async function createRestoreScript(scriptPath, backupDirName) {
  const script = `#!/bin/bash

# Autonomo Restore Script
# Generated: ${new Date().toISOString()}
# Backup: ${backupDirName}

echo "🔄 Restoring Autonomo from backup: ${backupDirName}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this script from the Autonomo root directory"
  exit 1
fi

# Create backup of current state
echo "📦 Creating backup of current state..."
CURRENT_BACKUP="backup-before-restore-$(date +%Y%m%d-%H%M%S)"
mkdir -p "logs/backups/$CURRENT_BACKUP"
cp -r dynamic "logs/backups/$CURRENT_BACKUP/" 2>/dev/null || true
cp -r logs "logs/backups/$CURRENT_BACKUP/" 2>/dev/null || true

# Restore from backup
echo "🔄 Restoring files..."
cp -r dynamic/* ../dynamic/ 2>/dev/null || true
cp -r logs/* ../logs/ 2>/dev/null || true
cp -r agents/* ../agents/ 2>/dev/null || true
cp -r core/* ../core/ 2>/dev/null || true
cp -r config/* ../config/ 2>/dev/null || true

echo "✅ Restore completed!"
echo "📦 Previous state backed up to: logs/backups/$CURRENT_BACKUP"
echo ""
echo "To start Autonomo:"
echo "  npm install"
echo "  npm start"
`;

  await fs.writeFile(scriptPath, script, 'utf8');
  
  // Make script executable on Unix systems
  try {
    await fs.chmod(scriptPath, 0o755);
  } catch (error) {
    // Ignore chmod errors on Windows
  }
}

if (require.main === module) {
  createBackup().catch(error => {
    console.error(chalk.red('Backup failed:', error.message));
    process.exit(1);
  });
}

module.exports = { createBackup };