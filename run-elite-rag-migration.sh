#!/bin/bash
set -e

echo "🚀 Running Elite RAG System Migration..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

echo "📋 Executing migration: 023_elite_rag_system.sql"
echo ""

# Execute the migration
supabase db push --db-url "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --file apps/web/db/migrations/023_elite_rag_system.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Created tables:"
    echo "  - file_analysis"
    echo "  - exam_question_bank"
    echo ""
    echo "🎉 Elite RAG system is now ready!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
