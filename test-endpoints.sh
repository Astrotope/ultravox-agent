#!/bin/bash

# Test script for Twilio Ultravox Agent Server endpoints
# 
# Usage: 
#   ./test-endpoints.sh [base_url] [api_key]
#   
# Examples:
#   ./test-endpoints.sh                                    # Test localhost, API key from ADMIN_API_KEY env var
#   ./test-endpoints.sh http://localhost:3000             # Test localhost, API key from ADMIN_API_KEY env var
#   ./test-endpoints.sh https://myserver.com my-api-key   # Test remote server with custom API key
#   VERBOSE=true ./test-endpoints.sh                      # Show response details
#   ADMIN_API_KEY=your-key ./test-endpoints.sh           # Set API key via environment variable
#
# Environment variables:
#   ADMIN_API_KEY - Admin API key (recommended approach)
#   VERBOSE=true  - Show detailed responses for all tests

# Default configuration
BASE_URL="${1:-http://localhost:3000}"
API_KEY="${2:-${ADMIN_API_KEY:-your-admin-api-key-here}}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0

# Track test customer name for cleanup
TEST_CUSTOMER_NAME="TEST_USER_$(date +%s)_$$"

echo -e "${BLUE}🧪 Testing Twilio Ultravox Agent Server${NC}"
echo -e "${BLUE}Base URL: ${BASE_URL}${NC}"
echo -e "${BLUE}API Key: ${API_KEY:0:20}...${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing ${test_name}... "
    
    response=$(eval "$curl_command" 2>/dev/null)
    
    if [[ $response =~ $expected_pattern ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [[ "$VERBOSE" == "true" ]]; then
            echo -e "${YELLOW}Response: ${response}${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo -e "${RED}Expected pattern: ${expected_pattern}${NC}"
        echo -e "${RED}Actual response: ${response}${NC}"
    fi
    echo ""
}

# Function to run a test that expects failure
run_negative_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing ${test_name}... "
    
    # Extract URL from curl command
    local url=$(echo "$curl_command" | grep -o 'http[s]*://[^ ]*')
    local method=$(echo "$curl_command" | grep -o '\-X [A-Z]*' | cut -d' ' -f2)
    local headers=$(echo "$curl_command" | grep -o "\-H '[^']*'" | tr '\n' ' ')
    local data=$(echo "$curl_command" | grep -o "\-d '[^']*'" | cut -d"'" -f2)
    
    if [[ -n "$method" && -n "$data" ]]; then
        status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" $headers -d "$data" "$url")
    elif [[ -n "$method" ]]; then
        status_code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" $headers "$url")
    else
        status_code=$(curl -s -o /dev/null -w "%{http_code}" $headers "$url")
    fi
    
    response=$(eval "$curl_command" 2>/dev/null)
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ PASS (${status_code})${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [[ "$VERBOSE" == "true" ]]; then
            echo -e "${YELLOW}Response: ${response}${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo -e "${RED}Expected status: ${expected_status}${NC}"
        echo -e "${RED}Actual status: ${status_code}${NC}"
        echo -e "${RED}Response: ${response}${NC}"
    fi
    echo ""
}

echo -e "${BLUE}=== Health & System Tests ===${NC}"

run_test "Health endpoint" \
    "curl -s ${BASE_URL}/health" \
    '"success":true.*"status":"healthy"'

run_test "Health endpoint detailed" \
    "curl -s ${BASE_URL}/health/detailed" \
    '"success":true'

echo -e "${BLUE}=== API v1 Admin Tests ===${NC}"

run_test "Admin stats (with API key)" \
    "curl -s -H 'X-API-Key: ${API_KEY}' ${BASE_URL}/api/v1/admin/stats" \
    '"success":true.*"totalBookings"'

run_negative_test "Admin stats (without API key)" \
    "curl -s ${BASE_URL}/api/v1/admin/stats" \
    "401"

echo -e "${BLUE}=== API v1 Tools Tests ===${NC}"

run_test "Check availability" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"date\": \"2025-06-30\", \"partySize\": 4}' ${BASE_URL}/api/v1/tools/check-availability" \
    '"success":true.*"available":true.*"slots"'

run_test "Check availability validation" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{}' ${BASE_URL}/api/v1/tools/check-availability" \
    '"success":false.*"Validation failed"'

run_test "Make reservation" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"customerName\": \"'$TEST_CUSTOMER_NAME'\", \"date\": \"2025-12-25\", \"time\": \"7:30 PM\", \"partySize\": 2, \"phone\": \"+1234567890\", \"specialRequirements\": \"Endpoint test booking\"}' ${BASE_URL}/api/v1/tools/make-reservation" \
    '"success":true.*"confirmationCode".*"phoneticCode"'

run_test "Make reservation validation" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"customerName\": \"\", \"date\": \"invalid\"}' ${BASE_URL}/api/v1/tools/make-reservation" \
    '"success":false.*"Validation failed"'

echo -e "${BLUE}=== API v1 Webhook Tests ===${NC}"

run_test "Twilio webhook" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"CallSid\": \"CA12345\", \"CallStatus\": \"in-progress\", \"From\": \"+1234567890\", \"To\": \"+0987654321\"}' ${BASE_URL}/api/v1/webhook/twilio" \
    '"success":true.*"status":"in_progress"'

run_test "Twilio webhook validation" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{}' ${BASE_URL}/api/v1/webhook/twilio" \
    '"success":false.*"Validation failed"'

run_test "Ultravox webhook" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"event_type\": \"call_started\", \"call_id\": \"call_12345\"}' ${BASE_URL}/api/v1/webhook/ultravox" \
    '"success":true.*"status":"call_started"'

echo -e "${BLUE}=== Error Handling Tests ===${NC}"

run_negative_test "404 for unknown route" \
    "curl -s ${BASE_URL}/api/v1/unknown-endpoint" \
    "404"

run_test "CORS headers present" \
    "curl -s -I ${BASE_URL}/health" \
    "[xX]-[cC]orrelation-[iI][dD]"

echo -e "${BLUE}=== Test Results ===${NC}"
echo -e "Total tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

# Cleanup function
cleanup_test_data() {
    if [[ -n "$TEST_CUSTOMER_NAME" ]]; then
        echo -e "${BLUE}🧹 Cleaning up test booking for ${TEST_CUSTOMER_NAME}...${NC}"
        # Use the existing cleanup script
        if command -v node >/dev/null 2>&1 && [[ -f "scripts/cleanup-test-bookings.js" ]]; then
            cleanup_output=$(node scripts/cleanup-test-bookings.js 2>&1)
            if [[ $cleanup_output =~ "Cleaned up" ]]; then
                echo -e "${GREEN}✅ ${cleanup_output}${NC}"
            else
                echo -e "${YELLOW}⚠️  Cleanup script not available or failed${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Cleanup script not available${NC}"
        fi
    fi
}

# Set up cleanup trap
trap cleanup_test_data EXIT

if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    cleanup_test_data
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    cleanup_test_data
    exit 1
fi