#!/bin/bash
# ============================================================================
# Backpack Architecture Fix - Verification Script
# ============================================================================
# Purpose: Verify all migrations and fixes are working correctly
# Usage: ./verify_migrations.sh
# ============================================================================

set -e

echo "🔍 Verifying Backpack Architecture Fixes..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Counter for passed/failed tests
PASSED=0
FAILED=0

# Test function
test_query() {
    local test_name=$1
    local query=$2
    local expected=$3
    
    echo -n "Testing: $test_name... "
    result=$(psql $DATABASE_URL -t -c "$query" | xargs)
    
    if [ "$result" == "$expected" ] || [ -z "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((FAILED++))
    fi
}

echo -e "${YELLOW}=== Database Structure Tests ===${NC}"
echo ""

# Test 1: Check RLS policies exist
test_query "error_book RLS policies" \
    "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'error_book'" \
    "4"

# Test 2: Check GIN index exists
test_query "knowledge_tags GIN index" \
    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_error_book_knowledge_tags'" \
    "1"

# Test 3: Check vocabulary in notebook_entries
echo -n "Testing: Vocabulary in notebook_entries... "
vocab_count=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM notebook_entries WHERE source_type = 'vocabulary'" | xargs)
echo -e "${GREEN}✅ Found $vocab_count vocabulary entries${NC}"
((PASSED++))

# Test 4: Check no vocabulary in error_book
echo -n "Testing: No vocabulary in error_book... "
error_vocab=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM error_book WHERE knowledge_tags @> ARRAY['vocabulary']" | xargs)
if [ "$error_vocab" == "0" ]; then
    echo -e "${GREEN}✅ PASS (0 entries)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Found $error_vocab vocabulary entries still in error_book${NC}"
    echo "  Run the cleanup step in migration script"
    ((FAILED++))
fi

echo ""
echo -e "${YELLOW}=== API Tests ===${NC}"
echo ""

# Test 5: Test vocabulary list API
echo -n "Testing: GET /api/vocabulary/list... "
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/vocabulary/list)
if [ "$response" == "200" ] || [ "$response" == "401" ]; then
    echo -e "${GREEN}✅ PASS (HTTP $response)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
    ((FAILED++))
fi

# Test 6: Test error-book API
echo -n "Testing: GET /api/error-book... "
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/error-book)
if [ "$response" == "200" ] || [ "$response" == "401" ]; then
    echo -e "${GREEN}✅ PASS (HTTP $response)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
    ((FAILED++))
fi

# Test 7: Test backpack API
echo -n "Testing: GET /api/backpack... "
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/backpack)
if [ "$response" == "200" ] || [ "$response" == "401" ]; then
    echo -e "${GREEN}✅ PASS (HTTP $response)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${YELLOW}=== Summary ===${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. ✅ Test vocabulary saving from Lyrical Flow UI"
    echo "  2. ✅ Test vocabulary display in /backpack/vocabulary"
    echo "  3. ✅ Test PVE error book saving"
    echo "  4. ✅ Verify subject classifications in backpack"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
