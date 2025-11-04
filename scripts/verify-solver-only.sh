#!/bin/bash

# Verification script for solver-only mode
# Checks that warmup endpoints are blocked and solver endpoints work

set -e

echo "🔍 Verifying Solver-Only Mode"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS_COUNT=0
FAIL_COUNT=0

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local description="$5"

  echo -n "Testing: $description... "

  response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}' 2>&1)

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed \$d)

  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $status_code)"
    echo "Response: $body"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "1️⃣  Checking warmup endpoints are blocked..."
echo "-------------------------------------------"
test_endpoint "warmup-post" "POST" "/api/warmup/keypoint-mcq-simple" "410" "Warmup POST should return 410"
test_endpoint "warmup-get" "GET" "/api/warmup/keypoint-mcq-simple" "410" "Warmup GET should return 410"
echo ""

echo "2️⃣  Checking solver endpoints are accessible..."
echo "-----------------------------------------------"
test_endpoint "health" "GET" "/api/health" "200" "Health endpoint should work"
test_endpoint "heartbeat" "GET" "/api/heartbeat" "200" "Heartbeat endpoint should work"
echo ""

echo "3️⃣  Summary"
echo "----------"
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Solver-only mode is active.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
  exit 1
fi
