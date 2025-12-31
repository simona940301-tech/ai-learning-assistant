#!/bin/bash
# ============================================================================
# Backpack Architecture Fix - Migration Execution Script
# ============================================================================
# Purpose: Execute all database migrations for backpack fixes
# Usage: ./execute_migrations.sh
# ============================================================================

set -e  # Exit on error

echo "🚀 Starting Backpack Architecture Migrations..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the correct directory
if [ ! -f "supabase/migrations/20251210_fix_error_book_rls.sql" ]; then
    echo -e "${RED}❌ Error: Migration files not found${NC}"
    echo "Please run this script from the apps/web directory"
    exit 1
fi

echo -e "${YELLOW}📋 Migration Plan:${NC}"
echo "  1. Add subject column to notebook_entries"
echo "  2. Add knowledge_tags column to error_book"
echo "  3. Fix error_book RLS policies"
echo "  4. Migrate vocabulary from error_book to notebook_entries"
echo ""

read -p "Continue with migration? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 1: Adding subject column to notebook_entries...${NC}"
psql $DATABASE_URL -f supabase/migrations/20251210_add_subject_to_notebook_entries.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema updated successfully${NC}"
else
    echo -e "${RED}❌ Schema migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Adding knowledge_tags column to error_book...${NC}"
psql $DATABASE_URL -f supabase/migrations/20251210_add_knowledge_tags_to_error_book.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ knowledge_tags column added${NC}"
else
    echo -e "${RED}❌ knowledge_tags migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Fixing error_book RLS policies...${NC}"
psql $DATABASE_URL -f supabase/migrations/20251210_fix_error_book_rls.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ RLS policies fixed successfully${NC}"
else
    echo -e "${RED}❌ RLS migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Migrating vocabulary data...${NC}"
echo -e "${YELLOW}⚠️  This will move vocabulary from error_book to notebook_entries${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Vocabulary migration skipped"
    exit 0
fi

psql $DATABASE_URL -f supabase/migrations/20251210_migrate_vocabulary_back.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Vocabulary migrated successfully${NC}"
else
    echo -e "${RED}❌ Vocabulary migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All migrations completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test vocabulary saving from Lyrical Flow"
echo "  2. Test vocabulary display in /backpack/vocabulary"
echo "  3. Test PVE error book saving"
echo "  4. Verify all subject classifications"
echo ""
echo "Run ./verify_migrations.sh to verify the changes"
