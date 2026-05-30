#!/bin/bash

# PostgreSQL Restore Script for ForensiQ Lite
# Usage: ./scripts/restore.sh <backup_file.sql.gz>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[Restore]${NC} Starting PostgreSQL restore..."

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}[Usage]${NC} ./restore.sh <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -la ./backups/*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}[Error]${NC} Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-forensiq}"
POSTGRES_DB="${POSTGRES_DB:-forensiq}"

# Check if postgres is running
if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" > /dev/null 2>&1; then
    echo -e "${RED}[Error]${NC} PostgreSQL is not running or not accessible"
    exit 1
fi

# Confirm before restore
echo -e "${YELLOW}[Restore]${NC} About to restore from: $BACKUP_FILE"
echo -e "${YELLOW}[Restore]${NC} Target database: $POSTGRES_DB"
echo -e "${YELLOW}[Restore]${NC} Target host: $POSTGRES_HOST:$POSTGRES_PORT"
echo ""
read -p "This will overwrite the current database. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[Restore]${NC} Restore cancelled"
    exit 0
fi

# Drop existing connections
echo -e "${YELLOW}[Restore]${NC} Terminating existing connections..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# Drop and recreate database
echo -e "${YELLOW}[Restore]${NC} Resetting database..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" \
    -c "CREATE DATABASE ${POSTGRES_DB};" \
    2>/dev/null || true

# Restore from backup
echo -e "${YELLOW}[Restore]${NC} Restoring database..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}"

echo -e "${GREEN}[Restore]${NC} Database restored successfully!"
