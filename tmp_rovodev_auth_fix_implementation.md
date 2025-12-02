# 🔧 認證流程修復實施方案

## 🎯 修復策略

### Phase 1: 禁用 Mock User 進行真實測試
### Phase 2: 修復 Google OAuth 流程
### Phase 3: 統一認證檢查邏輯
### Phase 4: 強化 Play 頁面認證

## 實施步驟

### Step 1: 創建測試環境變數
```bash
# 禁用 Mock User 以測試真實認證流程
export NEXT_PUBLIC_DISABLE_MOCK_USER=true

# 確保不在 preview 模式
unset NEXT_PUBLIC_PREVIEW_FORCE_MOCK
```

### Step 2: 修復認證檢查邏輯
需要在關鍵節點增加真實 session 驗證

### Step 3: 測試流程
1. 訪問 /onboarding
2. 點擊 Google 登入
3. 完成 OAuth 流程
4. 確認導向 /onboarding/goal
5. 完成 goal 設定
6. 確認最終導向 /play 且正常顯示