#!/bin/bash

# PLMS Environment Variables Verification Script
# Checks if all required environment variables are set

echo "🔍 PLMS Environment Variables Check"
echo "════════════════════════════════════════════"
echo ""

ENV_FILE="apps/web/.env.local"
MISSING=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ $ENV_FILE not found!${NC}"
    echo ""
    echo "Create it from the template:"
    echo "  cp apps/web/.env.local.example apps/web/.env.local"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Found $ENV_FILE${NC}"
echo ""

# Function to check variable
check_var() {
    local var_name=$1
    local required=$2
    local value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2-)
    
    if [ -z "$value" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ MISSING${NC}: $var_name"
            MISSING=$((MISSING+1))
        else
            echo -e "${YELLOW}⚠️  OPTIONAL${NC}: $var_name (not set)"
            WARNINGS=$((WARNINGS+1))
        fi
    elif [[ "$value" == *"placeholder"* ]] || [[ "$value" == *"YOUR-PROJECT"* ]] || [[ "$value" == "sk-..." ]] || [[ "$value" == "AIza..."* ]] || [[ "$value" == "sk-ant-..."* ]]; then
        echo -e "${YELLOW}⚠️  PLACEHOLDER${NC}: $var_name (needs real value)"
        WARNINGS=$((WARNINGS+1))
    else
        # Truncate long values for display
        display_value="${value:0:50}"
        if [ ${#value} -gt 50 ]; then
            display_value="${display_value}..."
        fi
        echo -e "${GREEN}✅ OK${NC}: $var_name = $display_value"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Supabase Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "NEXT_PUBLIC_SUPABASE_URL" "true"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "true"
check_var "SUPABASE_SERVICE_ROLE_KEY" "true"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 AI Providers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "OPENAI_API_KEY" "true"
check_var "GOOGLE_API_KEY" "false"
check_var "ANTHROPIC_API_KEY" "false"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎤 ASR Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "ASR_PROVIDER" "false"
check_var "ASR_UPLOAD_CODEC" "false"
check_var "ASR_SAMPLE_RATE" "false"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌏 App Meta Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "NEXT_PUBLIC_APP_REGION" "true"
check_var "NEXT_PUBLIC_TIMEZONE" "true"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎛️  Feature Flags"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_var "NEXT_PUBLIC_ENABLE_ANALYTICS" "false"
check_var "NEXT_PUBLIC_ENABLE_DEBUG_LOGS" "false"

echo ""
echo "════════════════════════════════════════════"
echo "📊 Summary"
echo "════════════════════════════════════════════"

if [ $MISSING -gt 0 ]; then
    echo -e "${RED}❌ $MISSING required variables missing${NC}"
    echo ""
    echo "Please set all required variables in $ENV_FILE"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS variables need attention${NC}"
    echo ""
    echo "Replace placeholder values with real ones before deployment"
    exit 0
else
    echo -e "${GREEN}✅ All required variables configured${NC}"
    echo ""
    echo "Environment is ready!"
    exit 0
fi

