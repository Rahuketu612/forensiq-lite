# ForensiQ Lite

Forensic audit intelligence platform with rule-based red flag detection.

## Product Principles

- **Rule-based detection**: Red flags must be explainable through configurable rules
- **AI optional**: AI assistance is local-first, optional, and never independently concludes fraud
- **MVP Architecture**: Simple, maintainable, audit-focused

## Vision

Reduce forensic investigation time using transaction intelligence and workflow automation.

## MVP Features

- Bank statement upload
- Transaction normalization
- Red flag detection
- Risk scoring
- Fund flow analysis
- Report generation

## Port Architecture

| Service | Port | Config Variable | Description |
|---------|------|-----------------|-------------|
| Frontend (Next.js) | 3000 | - | Web application UI |
| Backend API (NestJS) | 3001 | `API_PORT` | REST API server |
| PostgreSQL | 5432 | `POSTGRES_PORT` | Database |
| AI Service (Future) | 3002 | `AI_PORT` | Local AI assistance |
| Worker/Queue (Future) | 3003 | `WORKER_PORT` | Background jobs |
| OCR/Parser (Future) | 3004 | `OCR_PORT` | Document processing |

All ports are configurable via environment variables.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, ShadCN UI (Port 3000)
- **Backend**: NestJS, TypeScript (Port 3001)
- **Database**: PostgreSQL (Port 5432), Prisma ORM

## Project Structure

```
forensiq-lite/
├── apps/
│   ├── api/           # NestJS backend API
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   │   └── health/  # Health check endpoints
│   │   │   ├── common/      # Shared utilities
│   │   │   ├── config/      # Configuration
│   │   │   ├── main.ts      # Application entry
│   │   │   └── app.module.ts
│   │   ├── test/           # E2E tests
│   │   ├── prisma/         # (uses shared package)
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/           # Next.js frontend
│       ├── src/
│       │   ├── app/         # App router pages
│       │   ├── components/  # React components
│       │   │   └── ui/      # ShadCN UI components
│       │   ├── lib/         # Utilities
│       │   └── hooks/       # Custom React hooks
│       ├── public/          # Static assets
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── database/      # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts     # Prisma client export
│   │   │   └── seed.ts      # Database seeding
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/       # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/       # TypeScript types
│   │   │   ├── constants/    # Constants
│   │   │   └── utils/       # Utility functions
│   │   ├── package.json
│   │   └── tsconfig.json
│
├── docker/
│   └── postgres/
│       └── init.sql         # Database initialization
│
├── docs/
│   ├── architecture.md
│   └── roadmap.md
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
├── .env (development)
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (for PostgreSQL)

### Quick Start (Recommended)

The fastest way to get started on any platform:

```bash
# 1. Clone the repository
git clone https://github.com/Rahuketu612/forensiq-lite.git
cd forensiq-lite

# 2. Run the setup script (creates env files, installs deps, starts PostgreSQL)
pnpm setup:local

# 3. Start the application
pnpm dev:local
```

That's it! The app will be running at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs

### Manual Setup

If you prefer to set up manually:

1. **Install dependencies:**
```bash
pnpm install
```

2. **Create environment files:**
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. **Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

4. **Wait for PostgreSQL (or use db:push which waits automatically):**
```bash
pnpm db:push
```

5. **Start development:**
```bash
pnpm dev
```

### Database Commands

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema changes (development)
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed database with sample data
pnpm db:reset       # Reset database (WARNING: deletes all data)
pnpm db:studio      # Open Prisma Studio
```

### One-Command Development

```bash
pnpm dev:local      # Start services + API + frontend (all in one)
```

### Docker Services

```bash
pnpm services:start   # Start PostgreSQL container
pnpm services:stop    # Stop PostgreSQL container
```

### Build

```bash
# Build all packages
pnpm build

# Build individual packages
pnpm --filter @forensiq/api build
pnpm --filter @forensiq/web build
```

### Linting & Formatting

```bash
# Lint all packages
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## API Documentation

Once the API is running, access Swagger documentation at:
- http://localhost:3001/docs

### Health Check Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Full health check with service status |
| `GET /api/v1/health/live` | Liveness probe |
| `GET /api/v1/health/ready` | Readiness probe |

## Database Management

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Push schema to database (development)
pnpm db:push

# Open Prisma Studio
pnpm db:studio

# Seed database
pnpm db:seed
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | API server port | `3001` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost:3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |

## Roadmap

See [docs/roadmap.md](./docs/roadmap.md) for development phases.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run lint and tests
5. Submit a pull request

## How to Run Locally on Windows

### Option 1: PowerShell (Recommended)

1. **Open PowerShell as Administrator**

2. **Enable Docker Desktop:**
   ```powershell
   # Start Docker Desktop and wait for it to be ready
   ```

3. **Clone and set up:**
   ```powershell
   git clone https://github.com/Rahuketu612/forensiq-lite.git
   cd forensiq-lite
   
   # Run the setup script
   node scripts\setup-local.js
   
   # Or use the batch file
   .\setup.bat
   ```

4. **Start the app:**
   ```powershell
   pnpm dev:local
   ```

### Option 2: Windows Subsystem for Linux (WSL2)

For the best experience, use WSL2:

1. **Install WSL2:**
   ```powershell
   wsl --install
   ```

2. **Open Ubuntu terminal and run:**
   ```bash
   git clone https://github.com/Rahuketu612/forensiq-lite.git
   cd forensiq-lite
   pnpm setup:local
   pnpm dev:local
   ```

### Option 3: Git Bash

Works with the same commands as Linux/macOS:

1. **Open Git Bash**

2. **Run setup:**
   ```bash
   git clone https://github.com/Rahuketu612/forensiq-lite.git
   cd forensiq-lite
   pnpm setup:local
   pnpm dev:local
   ```

### Windows-Specific Notes

- **Line endings:** The project uses Unix line endings. If you see issues, run:
  ```bash
  git config core.autocrlf true
  ```

- **Paths:** Use forward slashes in scripts or PowerShell paths.

- **Docker Desktop:** Ensure Docker Desktop is running before starting PostgreSQL.

- **Ports:** If ports 3000, 3001, or 5432 are in use, update the `.env` file.

## Troubleshooting

### pnpm not installed

**Error:** `'pnpm' is not recognized` or `command not found: pnpm`

**Solution:**
```bash
# Windows (PowerShell)
npm install -g pnpm

# Or using Corepack (Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Docker not running

**Error:** `docker: Cannot connect to the Docker daemon`

**Solution:**

1. **Start Docker Desktop:**
   - Click the Docker Desktop icon in your system tray
   - Wait until it says "Docker Desktop is running"

2. **Check Docker status:**
   ```bash
   docker info
   ```

3. **Windows-specific:**
   ```powershell
   # Open PowerShell as Administrator
   Start-Service Docker
   ```

### Port already in use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**

1. **Find what's using the port:**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3000
   
   # Linux/macOS
   lsof -i :3000
   ```

2. **Stop the process or use a different port:**
   
   Update `.env` files:
   ```
   # Frontend
   PORT=3002
   
   # Backend
   API_PORT=3003
   ```

3. **Kill the process (Windows):**
   ```powershell
   taskkill /PID <process_id> /F
   ```

### Database connection failed

**Error:** `Error: P1001: Can't reach database server`

**Solution:**

1. **Check PostgreSQL is running:**
   ```bash
   docker-compose ps
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

3. **Wait for it to be ready:**
   ```bash
   # Windows
   node scripts\wait-for-postgres.js
   
   # Linux/macOS
   pnpm services:wait
   ```

4. **Check DATABASE_URL in `.env`:**
   ```
   DATABASE_URL="postgresql://forensiq:forensiq_secure_password@localhost:5432/forensiq"
   ```

5. **Reset and retry:**
   ```bash
   pnpm db:push
   ```

### Prisma client out of sync

**Error:** `Error: @prisma/client did not initialize properly`

**Solution:**
```bash
pnpm db:generate
```

### Module not found errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Build errors

**Solution:**
```bash
# Clean build artifacts
pnpm clean

# Rebuild
pnpm build
```

### Other Issues

1. **Clear all caches:**
   ```bash
   rm -rf node_modules .next .turbo apps/*/dist packages/*/dist
   pnpm install
   pnpm db:generate
   ```

2. **Check Node.js version:**
   ```bash
   node -v  # Should be >= 20.0.0
   ```

3. **Check pnpm version:**
   ```bash
   pnpm -v  # Should be >= 9.0.0
   ```

## License

See [LICENSE](./LICENSE)
