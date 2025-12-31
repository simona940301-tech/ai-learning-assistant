#!/bin/bash

# Hatching Ceremony Verification Script
# Tests the complete hatching flow

echo "🥚 Hatching Ceremony Verification Tests"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}: $2"
    ((FAILED++))
  fi
}

echo ""
echo "📊 Test 1: Database Migration"
echo "------------------------------"
# Check if columns exist
COLUMNS=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('chick_name', 'user_nickname', 'chick_hatched_at', 'last_seen_at');" | wc -l)
if [ "$COLUMNS" -eq 4 ]; then
  test_result 0 "All hatching columns exist in profiles table"
else
  test_result 1 "Missing hatching columns (found $COLUMNS/4)"
fi

echo ""
echo "🔌 Test 2: API Endpoints"
echo "------------------------------"
# Test hatch endpoint exists
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/chick/hatch \
  -H "Content-Type: application/json" \
  -d '{"chickName": "TestChick", "userNickname": "TestUser"}')

if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 200 ]; then
  test_result 0 "Hatch API endpoint exists (returned $HTTP_CODE)"
else
  test_result 1 "Hatch API endpoint not found (returned $HTTP_CODE)"
fi

# Test status endpoint returns new fields
STATUS_RESPONSE=$(curl -s http://localhost:3000/api/chick/status)
if echo "$STATUS_RESPONSE" | grep -q "chickName"; then
  test_result 0 "Status API returns chickName field"
else
  test_result 1 "Status API missing chickName field"
fi

echo ""
echo "📦 Test 3: Component Files"
echo "------------------------------"
# Check if component files exist
COMPONENTS=(
  "components/chick/EggAnimation.tsx"
  "components/chick/NamingForm.tsx"
  "components/chick/FirstFeedTutorial.tsx"
  "components/chick/PurposeDeclaration.tsx"
  "components/chick/HatchingCeremony.tsx"
)

for component in "${COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    test_result 0 "Component exists: $component"
  else
    test_result 1 "Component missing: $component"
  fi
done

echo ""
echo "📝 Test 4: TypeScript Compilation"
echo "------------------------------"
# Check if TypeScript compiles without errors
if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
  test_result 1 "TypeScript compilation has errors"
else
  test_result 0 "TypeScript compilation successful"
fi

echo ""
echo "========================================"
echo -e "Test Results: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}"
echo "========================================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✨ All tests passed! Hatching ceremony is ready.${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Please review the errors above.${NC}"
  exit 1
fi
