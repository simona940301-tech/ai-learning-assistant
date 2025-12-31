#!/bin/bash

# 緊急修復認證問題腳本

echo "🚑 開始緊急修復認證問題..."

# 1. 備份當前環境配置
echo "📋 備份環境配置..."
cp apps/web/.env.local apps/web/.env.local.backup.$(date +%Y%m%d_%H%M%S)

# 2. 清理環境配置
echo "🧹 清理環境配置..."
sed -i.bak 's/^APP_USE_MOCK_USER=true/# APP_USE_MOCK_USER=true/' apps/web/.env.local
sed -i.bak 's/^NEXT_PUBLIC_PREVIEW_FORCE_MOCK=true/# NEXT_PUBLIC_PREVIEW_FORCE_MOCK=true/' apps/web/.env.local
sed -i.bak 's/^PREVIEW_FORCE_MOCK=true/# PREVIEW_FORCE_MOCK=true/' apps/web/.env.local

# 3. 確保真實認證設置
echo "✅ 設置真實認證..."
if ! grep -q "NEXT_PUBLIC_DISABLE_MOCK_USER=true" apps/web/.env.local; then
    echo "NEXT_PUBLIC_DISABLE_MOCK_USER=true" >> apps/web/.env.local
fi

if ! grep -q "NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST=true" apps/web/.env.local; then
    echo "NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST=true" >> apps/web/.env.local
fi

# 4. 清理瀏覽器狀態 (需要用戶手動執行)
echo "📱 請手動清理瀏覽器狀態："
echo "   1. 開啟開發者工具 (F12)"
echo "   2. Application > Storage > Clear storage"
echo "   3. 或使用無痕模式測試"

# 5. 重啟開發服務
echo "🔄 準備重啟開發服務..."
echo "請執行: cd apps/web && npm run dev"

echo "✅ 緊急修復完成！"
echo ""
echo "🔍 下一步檢查："
echo "   1. 訪問 Supabase Dashboard"
echo "   2. 檢查 Authentication > Providers" 
echo "   3. 確認 Google Provider 已啟用"
echo ""
echo "📋 測試步驟："
echo "   1. 清除瀏覽器 cookies"
echo "   2. 訪問 /onboarding/goal"
echo "   3. 完成挑戰測試"
echo "   4. 測試 Google 註冊"