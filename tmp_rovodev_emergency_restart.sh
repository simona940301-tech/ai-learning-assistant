#!/bin/bash

echo "🚨 緊急修復前端渲染問題..."

# 1. 殺死所有 Next.js 進程
echo "🔪 終止所有開發服務器..."
pkill -f "next dev"

# 2. 清理緩存
echo "🧹 清理 Next.js 緩存..."
cd apps/web
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 3. 重建依賴
echo "🔄 重建依賴..."
npm install

# 4. 重啟開發服務
echo "🚀 重啟開發服務..."
npm run dev &

echo ""
echo "✅ 修復完成！"
echo ""
echo "📋 請檢查："
echo "   1. 瀏覽器控制台是否有認證錯誤"
echo "   2. CSS 是否正常載入"
echo "   3. 訪問 http://localhost:3000/onboarding 測試"
echo ""
echo "💡 如果仍有問題，請："
echo "   1. 清除瀏覽器緩存 (Ctrl+F5)"
echo "   2. 使用無痕模式測試"