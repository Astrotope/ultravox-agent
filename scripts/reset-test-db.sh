#!/bin/bash
# reset-test-db.sh - Reset test database to clean state

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Resetting test database...${NC}"

# Check if we're in test environment
if [[ "$NODE_ENV" != "test" ]] && [[ "$1" != "--force" ]]; then
    echo -e "${RED}❌ Error: This script should only be run in test environment${NC}"
    echo -e "${YELLOW}Current NODE_ENV: ${NODE_ENV:-'not set'}${NC}"
    echo -e "${YELLOW}To force reset in non-test environment, use: $0 --force${NC}"
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

# Reset database by dropping and recreating schema
echo -e "${BLUE}🔄 Dropping and recreating database schema...${NC}"

# Run Prisma migrate reset in non-interactive mode
echo -e "${BLUE}📦 Running Prisma migrate reset...${NC}"
if npx prisma migrate reset --force --skip-seed; then
    echo -e "${GREEN}✅ Database schema reset successfully${NC}"
else
    echo -e "${RED}❌ Failed to reset database schema${NC}"
    exit 1
fi

# Run migrations to recreate tables
echo -e "${BLUE}🔄 Running database migrations...${NC}"
if npx prisma migrate deploy; then
    echo -e "${GREEN}✅ Database migrations applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply database migrations${NC}"
    exit 1
fi

# Seed test data
echo -e "${BLUE}🌱 Seeding test database...${NC}"
if npx prisma db seed; then
    echo -e "${GREEN}✅ Test database seeded successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Database seeding failed (continuing anyway)${NC}"
fi

echo -e "${GREEN}🎉 Test database reset complete!${NC}"
echo -e "${BLUE}📊 Database ready for testing${NC}"