#!/bin/bash

# 檢查 OAuth 配置腳本
# 用於確認手機測試的環境變數設定

echo "🔍 檢查 OAuth 配置..."
echo ""

# 檢查 .env.local
echo "1️⃣ 檢查本地環境變數 (.env.local):"
if [ -f apps/web/.env.local ]; then
    echo "✅ .env.local 存在"

    if grep -q "^NEXT_PUBLIC_SITE_URL=" apps/web/.env.local; then
        SITE_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" apps/web/.env.local | cut -d'=' -f2)
        echo "✅ NEXT_PUBLIC_SITE_URL = $SITE_URL"
    else
        echo "⚠️  NEXT_PUBLIC_SITE_URL 未設定"
        echo ""
        echo "📝 建議添加:"
        echo "   開發環境: NEXT_PUBLIC_SITE_URL=http://localhost:3000"
        echo "   生產環境: NEXT_PUBLIC_SITE_URL=https://plms-learning.vercel.app"
    fi

    if grep -q "^NEXT_PUBLIC_SUPABASE_URL=" apps/web/.env.local; then
        SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" apps/web/.env.local | cut -d'=' -f2)
        echo "✅ NEXT_PUBLIC_SUPABASE_URL = $SUPABASE_URL"
    else
        echo "❌ NEXT_PUBLIC_SUPABASE_URL 未設定"
    fi
else
    echo "❌ .env.local 不存在"
fi

echo ""
echo "2️⃣ 檢查 .env.example:"
if [ -f apps/web/.env.example ]; then
    echo "✅ .env.example 存在"
    cat apps/web/.env.example | grep -E "NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SITE_URL"
else
    echo "⚠️  .env.example 不存在"
fi

echo ""
echo "3️⃣ Vercel 環境變數設定 (需手動檢查):"
echo "   前往: https://vercel.com/dashboard → 你的專案 → Settings → Environment Variables"
echo "   確認以下變數存在:"
echo "   - NEXT_PUBLIC_SITE_URL = https://plms-learning.vercel.app"
echo "   - NEXT_PUBLIC_SUPABASE_URL = https://umzqjgxsetsmwzhniemw.supabase.co"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY = <你的 anon key>"

echo ""
echo "4️⃣ Supabase 設定 (需手動檢查):"
echo "   前往: https://supabase.com/dashboard → 你的專案 → Authentication → URL Configuration"
echo "   確認:"
echo "   - Site URL = https://plms-learning.vercel.app"
echo "   - Redirect URLs 包含:"
echo "     • https://plms-learning.vercel.app/auth/callback"
echo "     • https://plms-learning.vercel.app/*"
echo "     • http://localhost:3000/auth/callback (本地開發用)"

echo ""
echo "5️⃣ Google Cloud Console 設定 (需手動檢查):"
echo "   前往你的 Google Cloud Console OAuth 設定"
echo "   確認:"
echo "   - 已授權的 JavaScript 來源包含:"
echo "     • https://plms-learning.vercel.app"
echo "     • http://localhost:3000"
echo "   - 已授權的重新導向 URI 包含:"
echo "     • https://umzqjgxsetsmwzhniemw.supabase.co/auth/v1/callback"

echo ""
echo "✅ 檢查完成！"
echo ""
echo "📱 手機測試步驟:"
echo "1. 確保以上所有設定都正確"
echo "2. 在手機瀏覽器訪問: https://plms-learning.vercel.app"
echo "3. 點擊 Google 登入"
echo "4. 應該會正確重定向到你的應用"
echo ""
echo "🐛 如果遇到問題,檢查瀏覽器 Console 日誌"
echo "   - iOS Safari: 連接到 Mac 的 Safari → 開發 → 你的手機 → 網頁"
echo "   - Android Chrome: chrome://inspect → Remote devices"
