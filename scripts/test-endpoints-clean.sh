#!/bin/bash

# test-endpoints-clean.sh - Test endpoints with clean test database
# 
# Usage: 
#   ./scripts/test-endpoints-clean.sh [base_url]
#   
# Examples:
#   ./scripts/test-endpoints-clean.sh                    # Test localhost with test database reset
#   ./scripts/test-endpoints-clean.sh http://localhost:3001  # Test specific URL with test database reset
#
# This script:
# 1. Sets up test environment
# 2. Resets test database to clean state
# 3. Runs comprehensive endpoint tests
# 4. Uses test database (voice-agents-test) not production (voice-agents)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
BASE_URL="${1:-http://localhost:3001}"

echo -e "${BLUE}🧪 Clean Endpoint Testing for Twilio Ultravox Agent Server${NC}"
echo -e "${BLUE}Base URL: ${BASE_URL}${NC}"
echo ""

# Set test environment
export NODE_ENV=test

# Load test environment variables
if [ -f .env.test ]; then
    echo -e "${BLUE}📝 Loading test environment variables...${NC}"
    export $(grep -v '^#' .env.test | xargs)
else
    echo -e "${RED}❌ Error: .env.test file not found${NC}"
    exit 1
fi

# Verify test database
if [[ "$DATABASE_URL" != *"voice-agents-test"* ]]; then
    echo -e "${RED}❌ Error: Not using test database!${NC}"
    echo -e "${YELLOW}Current DATABASE_URL: $DATABASE_URL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using test database: voice-agents-test${NC}"

# Clear test data (faster than full reset for most cases)
echo -e "${BLUE}🧹 Clearing test data...${NC}"
if ./scripts/clear-test-data.sh; then
    echo -e "${GREEN}✅ Test data cleared${NC}"
else
    echo -e "${YELLOW}⚠️  Data clear failed, attempting full reset...${NC}"
    if ./scripts/reset-test-db.sh; then
        echo -e "${GREEN}✅ Test database reset complete${NC}"
    else
        echo -e "${RED}❌ Failed to reset test database${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🚀 Starting endpoint tests...${NC}"
echo ""

# Run the endpoint tests with test environment
ADMIN_API_KEY="$ADMIN_API_KEY" ./test-endpoints.sh "$BASE_URL"

echo ""
echo -e "${BLUE}🏁 Clean endpoint testing complete!${NC}"