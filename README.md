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

### Installation

1. **Clone and install dependencies:**
```bash
pnpm install
```

2. **Start PostgreSQL with Docker:**
```bash
docker-compose up -d
```

3. **Copy environment files:**
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

4. **Generate Prisma client:**
```bash
pnpm db:generate
```

5. **Run database migrations:**
```bash
pnpm db:migrate
```

6. **Seed the database (optional):**
```bash
pnpm db:seed
```

### Development

Start all services in development mode:

```bash
pnpm dev
```

Or start individually:

```bash
# API (NestJS)
pnpm --filter @forensiq/api dev

# Web (Next.js)
pnpm --filter @forensiq/web dev
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

## License

See [LICENSE](./LICENSE)
