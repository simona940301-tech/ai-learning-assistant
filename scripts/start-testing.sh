#!/bin/bash
# Quick Test Session Startup Script
# Prepares the environment for Batch 1.5 testing

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Batch 1.5 Test Session Startup       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}→${NC} Checking if server is running..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -t -i:3000)
    echo -e "${GREEN}✓${NC} Server is running (PID: $PID)"
else
    echo -e "${RED}✗${NC} Server is not running"
    echo -e "${YELLOW}→${NC} Please run: ${GREEN}pnpm run dev${NC}"
    exit 1
fi

# Verify environment
echo -e "\n${BLUE}→${NC} Verifying Feature Flags..."
if [ -f .env.preview ]; then
    echo -e "${GREEN}✓${NC} .env.preview found"
    
    # Check key flags
    BATCH1_5=$(grep "NEXT_PUBLIC_HOTFIX_BATCH1_5=true" .env.preview || echo "")
    SINGLE_CTA=$(grep "NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA=true" .env.preview || echo "")
    BATCH_API=$(grep "NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API=true" .env.preview || echo "")
    
    if [ -n "$BATCH1_5" ] && [ -n "$SINGLE_CTA" ] && [ -n "$BATCH_API" ]; then
        echo -e "${GREEN}✓${NC} All critical flags enabled"
    else
        echo -e "${YELLOW}⚠${NC}  Some flags may not be enabled"
        echo -e "${YELLOW}  Check .env.preview manually${NC}"
    fi
else
    echo -e "${RED}✗${NC} .env.preview not found"
    echo -e "${YELLOW}→${NC} Using .env.local instead"
fi

# Check test documents
echo -e "\n${BLUE}→${NC} Checking test documents..."
if [ -f TEST_EXECUTION_GUIDE.md ]; then
    echo -e "${GREEN}✓${NC} TEST_EXECUTION_GUIDE.md"
else
    echo -e "${YELLOW}⚠${NC}  TEST_EXECUTION_GUIDE.md not found"
fi

if [ -f EVIDENCE_COLLECTION_TEMPLATE.md ]; then
    echo -e "${GREEN}✓${NC} EVIDENCE_COLLECTION_TEMPLATE.md"
else
    echo -e "${YELLOW}⚠${NC}  EVIDENCE_COLLECTION_TEMPLATE.md not found"
fi

if [ -f FINAL_DUTY_REPORT.md ]; then
    echo -e "${GREEN}✓${NC} FINAL_DUTY_REPORT.md"
else
    echo -e "${YELLOW}⚠${NC}  FINAL_DUTY_REPORT.md not found"
fi

# Test server connectivity
echo -e "\n${BLUE}→${NC} Testing server connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 307 ]; then
    echo -e "${GREEN}✓${NC} Server responding (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Server returned HTTP $HTTP_CODE"
fi

# Create evidence directory
echo -e "\n${BLUE}→${NC} Preparing evidence directory..."
mkdir -p evidence
echo -e "${GREEN}✓${NC} Created ./evidence/ directory"

# Summary
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Test Environment Ready!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo ""
echo -e "  ${YELLOW}1.${NC} Open browser: ${GREEN}http://localhost:3000${NC}"
echo -e "     Preview page: ${GREEN}http://localhost:3000/preview${NC}"
echo ""
echo -e "  ${YELLOW}2.${NC} Open DevTools: ${GREEN}F12${NC} or ${GREEN}Cmd+Opt+I${NC}"
echo -e "     • Enable ${GREEN}Console${NC} tab"
echo -e "     • Enable ${GREEN}Network${NC} tab"
echo -e "     • Check ${GREEN}Preserve log${NC}"
echo ""
echo -e "  ${YELLOW}3.${NC} Follow test guide: ${GREEN}TEST_EXECUTION_GUIDE.md${NC}"
echo ""
echo -e "  ${YELLOW}4.${NC} Record evidence in: ${GREEN}EVIDENCE_COLLECTION_TEMPLATE.md${NC}"
echo ""
echo -e "  ${YELLOW}5.${NC} Save screenshots to: ${GREEN}./evidence/${NC}"
echo ""

# Offer to open browser
echo -e "${BLUE}→${NC} Open browser now? [Y/n] "
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY]|)$ ]]; then
    echo -e "${GREEN}→${NC} Opening browser..."
    open http://localhost:3000/preview 2>/dev/null || echo "Could not open browser automatically"
fi

echo ""
echo -e "${GREEN}✓${NC} Ready to start testing!"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Display quick command reference
echo -e "${BLUE}Quick Commands:${NC}"
echo -e "  ${GREEN}window.__refetchMissionData()${NC}  - Manual mission refresh"
echo -e "  ${GREEN}clear()${NC}                        - Clear console"
echo ""

echo -e "${YELLOW}Happy Testing!${NC} 🎯"
echo ""

