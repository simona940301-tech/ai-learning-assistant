#!/bin/bash

# 🧪 完整認證流程測試腳本

echo "🚀 開始認證流程測試..."

# Step 1: 設置測試環境
echo "📋 Step 1: 設置測試環境"
export NEXT_PUBLIC_DISABLE_MOCK_USER=true
export NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST=true
echo "✅ Mock User 已停用"
echo "✅ 真實認證測試模式已啟用"

# Step 2: 檢查當前環境變數
echo "📋 Step 2: 檢查環境變數"
echo "NODE_ENV: $NODE_ENV"
echo "NEXT_PUBLIC_DISABLE_MOCK_USER: $NEXT_PUBLIC_DISABLE_MOCK_USER"
echo "NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST: $NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST"
echo "NEXT_PUBLIC_PREVIEW_FORCE_MOCK: $NEXT_PUBLIC_PREVIEW_FORCE_MOCK"

# Step 3: 備份原始文件
echo "📋 Step 3: 備份原始文件"
cp apps/web/lib/auth-context.tsx apps/web/lib/auth-context.tsx.backup
cp apps/web/app/onboarding/page.tsx apps/web/app/onboarding/page.tsx.backup
echo "✅ 原始文件已備份"

# Step 4: 應用修復
echo "📋 Step 4: 應用認證修復"
cp tmp_rovodev_auth_context_fixed.tsx apps/web/lib/auth-context.tsx
echo "✅ AuthContext 已更新"

# Step 5: 啟動開發服務器進行測試
echo "📋 Step 5: 準備測試指示"
echo ""
echo "🎯 測試指示:"
echo "1. 開啟 http://localhost:3000/onboarding"
echo "2. 確認頁面顯示 'Mock User = 停用'"
echo "3. 點擊 'Google 登入' 按鈕"
echo "4. 完成 Google OAuth 認證"
echo "5. 應該導向到 /auth/callback 然後到 /onboarding/goal"
echo "6. 完成目標設定"
echo "7. 最終導向到 /play 且正常顯示內容"
echo ""
echo "🚨 預期結果:"
echo "- 不會出現 '請先登入' 錯誤"
echo "- 整個流程從 onboarding 到 play 無中斷"
echo "- 用戶狀態在所有頁面保持一致"
echo ""

# Step 6: 創建測試檢查點
cat > tmp_rovodev_test_checklist.md << 'EOF'
# 🧪 認證流程測試檢查清單

## 測試環境確認
- [ ] NEXT_PUBLIC_DISABLE_MOCK_USER=true
- [ ] 開發服務器運行中
- [ ] 瀏覽器開發者工具已開啟

## 測試步驟
### 1. 初始狀態檢查
- [ ] 訪問 `/onboarding` 
- [ ] 頁面顯示登入表單
- [ ] 控制台顯示 "Mock User = 停用"
- [ ] 沒有自動登入的用戶

### 2. Google OAuth 測試
- [ ] 點擊 "Google 登入" 按鈕
- [ ] 成功跳轉到 Google 認證頁面
- [ ] 完成 Google 認證
- [ ] 回到應用程式

### 3. 認證後流程
- [ ] 導向到 `/auth/callback`
- [ ] 載入頁面顯示 "正在處理登入..."
- [ ] 自動導向到 `/onboarding/goal`
- [ ] 目標設定頁面正常載入

### 4. Onboarding 完成
- [ ] 完成大學/科系選擇
- [ ] 完成年級選擇
- [ ] 提交後導向到 `/play`

### 5. Play 頁面驗證
- [ ] Play 頁面正常載入
- [ ] 沒有 "請先登入" 錯誤
- [ ] 用戶狀態正確顯示
- [ ] 所有功能可正常使用

## 問題排查
如果遇到問題，檢查:
1. 控制台的錯誤訊息
2. Network 標籤的 API 請求
3. Supabase Auth 狀態
4. Session 和 Access Token

## 測試完成後
- [ ] 恢復原始文件: `./tmp_rovodev_restore_auth.sh`
- [ ] 清理測試文件
EOF

echo "📋 測試檢查清單已創建: tmp_rovodev_test_checklist.md"

# Step 7: 創建恢復腳本
cat > tmp_rovodev_restore_auth.sh << 'EOF'
#!/bin/bash
echo "🔄 恢復原始認證文件..."
cp apps/web/lib/auth-context.tsx.backup apps/web/lib/auth-context.tsx
cp apps/web/app/onboarding/page.tsx.backup apps/web/app/onboarding/page.tsx
rm -f tmp_rovodev_*
echo "✅ 原始文件已恢復，測試文件已清理"
EOF

chmod +x tmp_rovodev_restore_auth.sh

echo "✅ 認證測試環境準備完成!"
echo ""
echo "🚀 下一步: 啟動開發服務器並按照檢查清單進行測試"
echo "   npm run dev"
echo ""
echo "🔄 測試完成後執行: ./tmp_rovodev_restore_auth.sh"