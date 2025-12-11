#!/bin/bash
# Quick fix: Add subject column to notebook_entries
# Run this immediately to fix the schema issue

set -e

echo "🔧 Adding subject column to notebook_entries..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set"
    echo "Please set it with: export DATABASE_URL='your_database_url'"
    exit 1
fi

# Run the schema migration
psql $DATABASE_URL -f supabase/migrations/20251210_add_subject_to_notebook_entries.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema updated successfully!"
    echo ""
    echo "You can now run: ./execute_migrations.sh"
else
    echo "❌ Schema migration failed"
    exit 1
fi
