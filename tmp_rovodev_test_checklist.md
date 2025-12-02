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
