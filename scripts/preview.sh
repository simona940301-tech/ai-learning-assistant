#!/bin/bash
# PLMS Preview Mode - Auto start dev server with Batch 1.5 flags

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PLMS Preview Mode - Batch 1.5        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Load preview environment
echo -e "${GREEN}✓${NC} Loading .env.preview configuration..."
export $(cat .env.preview | grep -v '^#' | grep -v '^$' | xargs)

# Show active flags
echo -e "\n${YELLOW}Active Batch 1.5 Flags:${NC}"
echo "  • HOTFIX_BATCH1_5: $NEXT_PUBLIC_HOTFIX_BATCH1_5"
echo "  • SINGLE_CTA: $NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA"
echo "  • NEAR_DIFFICULTY: $NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY"
echo "  • BATCH_API: $NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API"
echo "  • SAMPLER_PERF: $NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF"

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "\n${YELLOW}⚠${NC}  Port 3000 is already in use. Stopping existing process..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
    sleep 2
fi

# Start dev server
echo -e "\n${GREEN}✓${NC} Starting Next.js development server..."
echo -e "${BLUE}→${NC} HMR (Hot Module Replacement) enabled"
echo -e "${BLUE}→${NC} Auto-refresh on file save"
echo ""

# Open browser after 5 seconds (background)
(sleep 5 && open http://localhost:3000 2>/dev/null || echo "Browser not opened automatically") &

# Start Next.js with preview env
pnpm run dev

