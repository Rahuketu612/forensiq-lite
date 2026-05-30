# ForensiQ Lite - Setup Guide for CA Firms

This guide helps CA (Chartered Accountant) firms set up ForensiQ Lite for evaluation and pilot testing.

---

## Overview

ForensiQ Lite is a **local-first** forensic audit intelligence platform. Your data stays on your servers - no cloud dependency, no subscription fees.

### Key Benefits for CA Firms

- **Local deployment:** All data stays in your office
- **Explainable AI:** Rule-based detection, not black-box
- **Fast setup:** Docker one-liner installation
- **Cost effective:** Open source, no per-case fees

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| CPU | 4 cores |
| RAM | 8 GB |
| Storage | 50 GB free |
| OS | Windows 10+, macOS 12+, Ubuntu 22.04+ |
| Docker | Latest stable version |

### Recommended Requirements

| Component | Requirement |
|-----------|-------------|
| CPU | 8 cores |
| RAM | 16 GB |
| Storage | 200 GB SSD |
| OS | Windows 11, macOS 14+, Ubuntu 22.04 LTS |
| Docker | Latest stable version |

---

## Step-by-Step Setup

### Step 1: Install Prerequisites

#### Windows

1. **Install Docker Desktop:**
   - Download from: https://www.docker.com/products/docker-desktop
   - Run installer, follow prompts
   - Restart computer if required
   - Verify: `docker --version`

2. **Install Node.js 20+:**
   - Download from: https://nodejs.org/
   - Run installer
   - Verify: `node --version`

3. **Install pnpm:**
   ```powershell
   npm install -g pnpm
   ```

#### macOS

1. **Install Docker Desktop:**
   ```bash
   brew install --cask docker
   ```

2. **Install Node.js:**
   ```bash
   brew install node@20
   ```

3. **Install pnpm:**
   ```bash
   npm install -g pnpm
   ```

#### Linux (Ubuntu)

```bash
# Install Docker
sudo apt update
sudo apt install docker.io docker-compose

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Install pnpm
npm install -g pnpm
```

### Step 2: Clone Repository

```bash
git clone https://github.com/Rahuketu612/forensiq-lite.git
cd forensiq-lite
```

### Step 3: Quick Setup

Run the automated setup script:

```bash
# Windows (PowerShell)
node scripts/setup-local.js

# macOS/Linux
node scripts/setup-local.js
```

This script will:
- Create environment files
- Install dependencies
- Start PostgreSQL container
- Initialize database

### Step 4: Verify Installation

```bash
# Check services are running
docker-compose ps

# Check database connection
pnpm db:generate

# Build the application
pnpm build

# Seed demo data
pnpm db:seed
```

### Step 5: Start Application

```bash
# Start everything
pnpm dev:local
```

Or start manually:

```bash
# Terminal 1: Start database
docker-compose up -d postgres

# Terminal 2: Start API
cd apps/api
npm run start:dev

# Terminal 3: Start frontend
cd apps/web
npm run dev
```

### Step 6: Access Application

Open your browser:

- **Frontend:** http://localhost:3000
- **API Health:** http://localhost:3001/api/v1/health
- **API Docs:** http://localhost:3001/docs

---

## Demo Login

| Email | Password | Access |
|-------|----------|--------|
| demo@forensiq.io | Demo@1234 | Demo auditor |
| admin@forensiq.io | Admin@1234 | Admin |

---

## First-Time Walkthrough

### 1. Dashboard Overview

The dashboard shows:
- Total cases
- Active investigations
- Red flags detected
- Recent activity

### 2. Creating a Case

1. Click "New Case"
2. Enter case name and description
3. Set priority (Low/Medium/High)
4. Click "Create"

### 3. Importing Transactions

1. Open a case
2. Click "Import Transactions"
3. Upload CSV file
4. Wait for parsing
5. Review imported data

### 4. Analyzing Red Flags

1. Go to "Red Flags" tab
2. Review detected flags
3. Click each flag for details
4. Mark flags as reviewed

### 5. Fund Flow Analysis

1. Go to "Fund Trail" tab
2. View money flow diagram
3. Click nodes for details
4. Export if needed

---

## Optional: Enable AI Features

For AI-powered analysis, install Ollama:

### Windows/macOS

```bash
# Install Ollama
# Download from: https://ollama.ai/

# Or via command line (macOS)
brew install ollama

# Start Ollama
ollama serve

# Pull the model
ollama pull phi4
```

### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve &
ollama pull phi4
```

Once Ollama is running, the AI Intelligence tab in the application will activate.

---

## Backup & Restore

### Backup Database

```bash
# Create backup
pnpm db:backup

# Backup file location: ./backups/
```

### Restore Database

```bash
# List available backups
ls ./backups/

# Restore from backup
pnpm db:restore ./backups/forensiq_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## Troubleshooting

### "Docker not running"

```bash
# Windows
Start Docker Desktop

# Linux
sudo systemctl start docker
```

### "Port already in use"

```bash
# Find process using port
netstat -ano | findstr :3000

# Kill or change port in .env
```

### "Database connection failed"

```bash
# Restart PostgreSQL
docker-compose down
docker-compose up -d postgres

# Wait 10 seconds, then retry
```

### "Build errors"

```bash
# Clean everything
rm -rf node_modules .next apps/*/dist packages/*/dist

# Reinstall
pnpm install
pnpm build
```

---

## Security Recommendations

### For Production Use

1. **Change default passwords:**
   ```bash
   # Edit .env file
   JWT_SECRET=your-secure-random-string-here
   POSTGRES_PASSWORD=your-secure-db-password
   ```

2. **Enable firewall:**
   ```bash
   # Block external access to ports 3000, 3001
   # Only allow internal network access
   ```

3. **Regular backups:**
   ```bash
   # Schedule daily backups
   crontab -e
   # Add: 0 2 * * * /path/to/forensiq-lite/scripts/backup.sh
   ```

4. **Keep software updated:**
   ```bash
   git pull origin main
   pnpm install
   pnpm build
   ```

---

## Uninstall / Reset

To reset the entire installation:

```bash
# Stop all services
docker-compose down
pkill -f "node"

# Remove data (CAREFUL - deletes all data!)
docker volume rm forensiq-lite_postgres_data

# Clean project
rm -rf node_modules .next apps/*/dist packages/*/dist

# Fresh start
pnpm install
pnpm setup:local
```

---

## Support & Resources

| Resource | Link |
|----------|------|
| Documentation | README.md in project root |
| Demo Script | docs/pilot-demo/DEMO_SCRIPT.md |
| Known Issues | docs/pilot-demo/KNOWN_LIMITATIONS.md |
| GitHub Issues | github.com/Rahuketu612/forensiq-lite/issues |
| Support Email | support@forensiq.io |

---

## Next Steps After Setup

1. **Run the demo script** (docs/pilot-demo/DEMO_SCRIPT.md)
2. **Review the pilot checklist** (docs/pilot-demo/PILOT_CHECKLIST.md)
3. **Share feedback** via GitHub Issues
4. **Schedule a trial** with a real case

---

*ForensiQ Lite v0.1.0 - Built for CA Firms*