/**
 * Wait for PostgreSQL to be ready
 * 
 * This script waits for the PostgreSQL container to be ready
 * before proceeding with database operations.
 * 
 * Uses native Node.js net module - no external dependencies.
 */

const net = require('net');

const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 2000; // 2 seconds

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function waitForPostgres() {
  console.log('⏳ Waiting for PostgreSQL to be ready...');
  console.log(`   Host: ${POSTGRES_HOST}`);
  console.log(`   Port: ${POSTGRES_PORT}`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const isReady = await checkPort(POSTGRES_HOST, parseInt(POSTGRES_PORT, 10));
      
      if (isReady) {
        console.log('✅ PostgreSQL is ready!');
        return true;
      }
      
      console.log(`   Attempt ${attempt}/${MAX_RETRIES}: Connection refused`);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      }
    } catch (error) {
      console.log(`   Attempt ${attempt}/${MAX_RETRIES}: ${error.message}`);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  }
  
  console.error('❌ Failed to connect to PostgreSQL after maximum retries');
  console.error('   Please check that:');
  console.error('   1. Docker is running');
  console.error('   2. PostgreSQL container is started: docker-compose up -d postgres');
  console.error('   3. PostgreSQL is accessible at the configured host/port');
  process.exit(1);
}

waitForPostgres();
