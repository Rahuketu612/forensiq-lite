#!/bin/bash

# PostgreSQL Backup Script for ForensiQ Lite
# Usage: ./scripts/backup.sh [backup_name]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-forensiq}"
POSTGRES_DB="${POSTGRES_DB:-forensiq}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-forensiq_backup_${TIMESTAMP}}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[Backup]${NC} Starting PostgreSQL backup..."

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Check if postgres is running
if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" > /dev/null 2>&1; then
    echo -e "${RED}[Error]${NC} PostgreSQL is not running or not accessible"
    exit 1
fi

# Perform backup
echo -e "${YELLOW}[Backup]${NC} Dumping database: ${POSTGRES_DB}"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --no-owner \
    --no-acl \
    | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}[Backup]${NC} Success! Backup saved to: ${BACKUP_FILE}"
    echo -e "${GREEN}[Backup]${NC} Backup size: ${BACKUP_SIZE}"
    
    # Keep only last 10 backups
    ls -t "${BACKUP_DIR}"/forensiq_backup_*.sql.gz | tail -n +11 | xargs -r rm
    echo -e "${YELLOW}[Backup]${NC} Cleaned up old backups (keeping last 10)"
else
    echo -e "${RED}[Error]${NC} Backup failed or file is empty"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

echo -e "${GREEN}[Backup]${NC} Backup completed successfully!"
