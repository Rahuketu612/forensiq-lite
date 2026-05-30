/**
 * ForensiQ Lite - Local Setup Script
 * 
 * This script sets up the entire development environment with one command.
 * Works on Windows, macOS, and Linux.
 * 
 * Usage: pnpm setup:local
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

function log(message, type = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };
  console.log(`${icons[type] || '📋'} ${message}`);
}

function run(command, options = {}) {
  try {
    log(`Running: ${command}`);
    execSync(command, {
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (error) {
    log(`Failed: ${command}`, 'error');
    return false;
  }
}

function checkDocker() {
  log('Checking Docker...', 'info');
  try {
    execSync('docker --version', { stdio: 'pipe' });
    execSync('docker-compose --version', { stdio: 'pipe' });
    log('Docker is installed', 'success');
    return true;
  } catch (error) {
    log('Docker is not installed or not running', 'error');
    return false;
  }
}

function checkDockerRunning() {
  log('Checking if Docker is running...', 'info');
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch (error) {
    log('Docker daemon is not running', 'error');
    return false;
  }
}

async function main() {
  console.log('\n===========================================');
  log('ForensiQ Lite - Local Setup', 'info');
  console.log('===========================================\n');

  // Step 1: Check prerequisites
  log('Step 1: Checking prerequisites...', 'info');
  
  // Check Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
    if (majorVersion < 20) {
      log(`Node.js ${nodeVersion} detected. Node.js >= 20 required.`, 'error');
      process.exit(1);
    }
    log(`Node.js ${nodeVersion} ✓`, 'success');
  } catch (error) {
    log('Node.js is not installed', 'error');
    log('Please install Node.js >= 20: https://nodejs.org/', 'info');
    process.exit(1);
  }

  // Check pnpm
  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    log(`pnpm ${pnpmVersion} ✓`, 'success');
  } catch (error) {
    log('pnpm is not installed, installing...', 'warning');
    try {
      execSync('npm install -g pnpm', { stdio: 'inherit' });
      log('pnpm installed successfully', 'success');
    } catch (error) {
      log('Failed to install pnpm', 'error');
      process.exit(1);
    }
  }

  // Step 2: Install dependencies
  log('\nStep 2: Installing dependencies...', 'info');
  if (!run('pnpm install')) {
    process.exit(1);
  }

  // Step 3: Create environment files
  log('\nStep 3: Setting up environment files...', 'info');
  
  const envFiles = [
    { from: '.env.example', to: '.env' },
    { from: 'apps/api/.env.example', to: 'apps/api/.env' },
    { from: 'apps/web/.env.example', to: 'apps/web/.env.local' },
  ];

  for (const file of envFiles) {
    if (!fs.existsSync(file.to)) {
      if (fs.existsSync(file.from)) {
        fs.copyFileSync(file.from, file.to);
        log(`Created ${file.to}`, 'success');
      } else {
        log(`Warning: ${file.from} not found`, 'warning');
      }
    } else {
      log(`${file.to} already exists`, 'info');
    }
  }

  // Step 4: Start PostgreSQL
  log('\nStep 4: Starting PostgreSQL...', 'info');
  
  if (!checkDocker()) {
    log('\nDocker is required to run PostgreSQL.', 'error');
    log('Please install Docker: https://docs.docker.com/get-docker/', 'info');
    log('\nAlternatively, you can:');
    log('1. Install PostgreSQL locally', 'info');
    log('2. Update DATABASE_URL in .env to point to your local PostgreSQL', 'info');
    log('3. Skip this step and manually run: docker-compose up -d postgres', 'info');
  } else if (!checkDockerRunning()) {
    log('\nDocker daemon is not running.', 'error');
    if (isWindows) {
      log('Please start Docker Desktop and wait for it to be ready.', 'info');
    } else {
      log('Please start Docker and wait for it to be ready.', 'info');
    }
    log('\nAlternatively, skip PostgreSQL setup and configure a local database.', 'info');
  } else {
    // Start PostgreSQL container
    try {
      execSync('docker-compose up -d postgres', { stdio: 'inherit' });
      log('PostgreSQL container started', 'success');
      
      // Wait for PostgreSQL to be ready
      log('\nWaiting for PostgreSQL to be ready...', 'info');
      run('node scripts/wait-for-postgres.js');
    } catch (error) {
      log('Failed to start PostgreSQL container', 'error');
    }
  }

  // Step 5: Generate Prisma client
  log('\nStep 5: Generating Prisma client...', 'info');
  if (!run('pnpm db:generate')) {
    log('Warning: Failed to generate Prisma client', 'warning');
    log('You may need to run: pnpm db:generate', 'info');
  }

  // Step 6: Run migrations
  log('\nStep 6: Setting up database...', 'info');
  const migrateChoice = 'push'; // Default to db:push for faster setup
  
  if (!run('pnpm db:push')) {
    log('Warning: Failed to push database schema', 'warning');
    log('You may need to:', 'info');
    log('1. Ensure PostgreSQL is running', 'info');
    log('2. Check DATABASE_URL in .env', 'info');
    log('3. Run: pnpm db:push', 'info');
  }

  // Step 7: Seed database (optional)
  log('\nStep 7: Seeding database (optional)...', 'info');
  log('To seed the database, run: pnpm db:seed', 'info');

  console.log('\n===========================================');
  log('Setup Complete!', 'success');
  console.log('===========================================\n');
  
  log('Next steps:', 'info');
  log('1. Start the application: pnpm dev:local', 'info');
  log('   (Or manually: docker-compose up -d postgres && pnpm dev)', 'info');
  log('', 'info');
  log('2. Access the application:', 'info');
  log('   - Frontend: http://localhost:3000', 'info');
  log('   - Backend API: http://localhost:3001', 'info');
  log('   - API Docs: http://localhost:3001/docs', 'info');
  log('', 'info');
  log('3. Default login:', 'info');
  log('   - Admin: admin@forensiq.local / admin123', 'info');
  log('   - Auditor: auditor@forensiq.local / auditor123', 'info');
  
  console.log('\n===========================================\n');
}

main().catch((error) => {
  log(`Setup failed: ${error.message}`, 'error');
  process.exit(1);
});
