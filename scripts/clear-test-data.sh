#!/bin/bash
# clear-test-data.sh - Clear test data without dropping schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Clearing test data...${NC}"

# Check if we're in test environment
if [[ "$NODE_ENV" != "test" ]] && [[ "$1" != "--force" ]]; then
    echo -e "${RED}❌ Error: This script should only be run in test environment${NC}"
    echo -e "${YELLOW}Current NODE_ENV: ${NODE_ENV:-'not set'}${NC}"
    echo -e "${YELLOW}To force clear in non-test environment, use: $0 --force${NC}"
    exit 1
fi

# Load test environment variables
if [ -f .env.test ]; then
    echo -e "${BLUE}📝 Loading test environment variables from .env.test${NC}"
    export $(grep -v '^#' .env.test | xargs)
else
    echo -e "${RED}❌ Error: .env.test file not found${NC}"
    exit 1
fi

# Verify we're connecting to the test database
if [[ "$DATABASE_URL" != *"voice-agents-test"* ]]; then
    echo -e "${RED}❌ Error: DATABASE_URL does not point to test database${NC}"
    echo -e "${YELLOW}Current DATABASE_URL: $DATABASE_URL${NC}"
    echo -e "${YELLOW}Expected: should contain 'voice-agents-test'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Confirmed using test database: voice-agents-test${NC}"

# Extract database connection details
DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')

echo -e "${BLUE}🗑️  Clearing bookings table...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM bookings;" || echo -e "${YELLOW}⚠️  Failed to clear bookings (table may not exist)${NC}"

echo -e "${BLUE}🗑️  Clearing call_logs table...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM call_logs;" || echo -e "${YELLOW}⚠️  Failed to clear call_logs (table may not exist)${NC}"

echo -e "${GREEN}🎉 Test data cleared successfully!${NC}"
echo -e "${BLUE}📊 Database ready for fresh tests${NC}"