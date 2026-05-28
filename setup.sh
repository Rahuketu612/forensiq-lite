#!/bin/bash
# ForensiQ Lite - Quick Setup Script

set -e

echo "🔧 ForensiQ Lite - Setup"
echo "========================"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
REQUIRED_NODE=20

if [ "$NODE_VERSION" -lt "$REQUIRED_NODE" ]; then
  echo "❌ Node.js >= $REQUIRED_NODE required. Found: $(node -v)"
  exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm
fi

echo "✓ Node.js $(node -v)"
echo "✓ pnpm $(pnpm -v)"

# Install dependencies
echo ""
echo "📥 Installing dependencies..."
pnpm install

# Copy environment files
echo ""
echo "📝 Setting up environment files..."
[ ! -f .env ] && cp .env.example .env && echo "  ✓ Created .env"
[ ! -f apps/api/.env ] && cp apps/api/.env.example apps/api/.env && echo "  ✓ Created apps/api/.env"
[ ! -f apps/web/.env.local ] && cp apps/web/.env.example apps/web/.env.local && echo "  ✓ Created apps/web/.env.local"

# Start Docker PostgreSQL
echo ""
echo "🐳 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Generate Prisma client
echo ""
echo "⚙️  Generating Prisma client..."
pnpm db:generate

# Run migrations
echo ""
echo "🔄 Running database migrations..."
pnpm db:migrate

echo ""
echo "========================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start development: pnpm dev"
echo "  2. API running at: http://localhost:3001"
echo "  3. Web app at: http://localhost:3000"
echo "  4. API docs at: http://localhost:3001/docs"
echo ""
echo "Default seed users:"
echo "  Admin:   admin@forensiq.local / admin123"
echo "  Auditor: auditor@forensiq.local / auditor123"