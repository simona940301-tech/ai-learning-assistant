#!/bin/bash

# Batch 1.5 Fixes Verification Script
# This script checks if all fixes have been applied correctly

set -e

echo "🔍 Batch 1.5 Fixes Verification Script"
echo "======================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} File missing: $1"
        return 1
    fi
}

# Function to check pattern in file
check_pattern() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        ((FAIL++))
        return 1
    fi
}

echo "📋 Checking Fix #1: ExplanationCard Non-blocking Analytics"
echo "-----------------------------------------------------------"
check_pattern "apps/web/components/explain/ExplanationCard.tsx" \
    "Fire-and-forget analytics" \
    "Analytics marked as fire-and-forget"

check_pattern "apps/web/components/explain/ExplanationCard.tsx" \
    "console.log.*CTA clicked at" \
    "Click timestamp logging added"

check_pattern "apps/web/components/explain/ExplanationCard.tsx" \
    "console.log.*API responded in" \
    "API timing logging added"

check_pattern "apps/web/components/explain/ExplanationCard.tsx" \
    "console.log.*Total time:" \
    "Total timing logging added"

echo ""

echo "📋 Checking Fix #2: InputDock Controlled Input"
echo "-----------------------------------------------"
check_pattern "components/ask/InputDock.tsx" \
    "value={value}" \
    "Textarea using controlled value (not defaultValue)"

check_pattern "components/ask/InputDock.tsx" \
    "onChange('')" \
    "Immediate clear on submit"

check_pattern "components/ask/InputDock.tsx" \
    "console.log.*Submitting at" \
    "Submit timestamp logging added"

check_pattern "components/ask/InputDock.tsx" \
    "onChange={(event)" \
    "Using onChange (not onInput)"

echo ""

echo "📋 Checking Fix #3: MicroMissionCard Polling"
echo "---------------------------------------------"
check_pattern "apps/web/components/micro/MicroMissionCard.tsx" \
    "setInterval" \
    "Polling mechanism added"

check_pattern "apps/web/components/micro/MicroMissionCard.tsx" \
    "__refetchMissionData" \
    "Exposed refetch method to window"

check_pattern "apps/web/components/micro/MicroMissionCard.tsx" \
    "console.log.*Polling for mission" \
    "Polling logging added"

check_pattern "apps/web/components/micro/MicroMissionCard.tsx" \
    "Fire-and-forget analytics" \
    "Analytics marked as fire-and-forget"

echo ""

echo "📋 Checking Environment Configuration"
echo "--------------------------------------"
check_pattern ".env.local" \
    "NEXT_PUBLIC_HOTFIX_BATCH1_5=true" \
    "Batch 1.5 master flag enabled"

check_pattern ".env.local" \
    "NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=true" \
    "Single CTA flag enabled"

check_pattern ".env.local" \
    "NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY=true" \
    "Near difficulty flag enabled"

check_pattern ".env.local" \
    "NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API=true" \
    "Batch API flag enabled"

check_pattern ".env.local" \
    "NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF=true" \
    "Sampler performance flag enabled"

echo ""

echo "📊 Summary"
echo "----------"
echo -e "Passed: ${GREEN}${PASS}${NC}"
echo -e "Failed: ${RED}${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for local testing.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start dev server: npm run dev"
    echo "2. Open browser with DevTools (Console + Network)"
    echo "3. Test scenarios A, B, C (see BATCH_1_5_FIXES.md)"
    echo "4. Record evidence (video + screenshots)"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the fixes.${NC}"
    exit 1
fi
