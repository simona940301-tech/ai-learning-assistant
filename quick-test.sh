#!/bin/bash

# Quick Test Script for Personalization System
# This script helps verify that everything is working

echo "🧪 Quick Test Script for Personalization System"
echo "================================================"
echo ""

# Check if server is running
echo "📡 Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running on http://localhost:3000"
else
    echo "❌ Server is not running!"
    echo "   Please run: pnpm --filter web dev"
    echo ""
    exit 1
fi

echo ""
echo "🎯 Testing Dashboard Access..."
echo ""

# Test original dashboard
echo "1. Testing original dashboard..."
ORIGINAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard)
if [ "$ORIGINAL_STATUS" = "200" ]; then
    echo "   ✅ Original Dashboard: http://localhost:3000/dashboard"
else
    echo "   ⚠️  Original Dashboard: Status $ORIGINAL_STATUS"
fi

# Test enhanced dashboard
echo "2. Testing enhanced dashboard..."
ENHANCED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/enhanced)
if [ "$ENHANCED_STATUS" = "200" ]; then
    echo "   ✅ Enhanced Dashboard: http://localhost:3000/dashboard/enhanced"
else
    echo "   ⚠️  Enhanced Dashboard: Status $ENHANCED_STATUS"
fi

echo ""
echo "📊 Dashboard URLs:"
echo "   • Original: http://localhost:3000/dashboard"
echo "   • Enhanced: http://localhost:3000/dashboard/enhanced"
echo ""

echo "🧪 To test APIs, run:"
echo "   npx tsx test-personalization-apis.ts"
echo ""

echo "📖 Next steps:"
echo "   1. Open browser and visit: http://localhost:3000/dashboard/enhanced"
echo "   2. Update test credentials in test-personalization-apis.ts"
echo "   3. Run API tests: npx tsx test-personalization-apis.ts"
echo ""

echo "✅ Quick test completed!"
