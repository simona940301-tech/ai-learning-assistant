# ✅ 修復 401 Unauthorized 錯誤

## 🔍 問題診斷

API 返回 401 Unauthorized 錯誤：
```
GET http://localhost:3000/api/onboarding/questions?difficulties=1,2,3&count=7 401 (Unauthorized)
```

錯誤響應：
```json
{
  "success": false,
  "error": "AUTHENTICATION_ERROR",
  "message": "Authentication error occurred",
  "code": "middleware_auth_error"
}
```

## 🎯 根本原因

**Middleware 攔截了 API 請求**：
- `middleware.ts` 中，`/api/onboarding/` 被列在 `PROTECTED_API_ROUTES` 中（第 50 行）
- 這導致所有以 `/api/onboarding/` 開頭的 API 都需要認證
- 但 onboarding challenge 頁面支持匿名訪問，所以 API 也應該允許匿名訪問

## ✅ 解決方案

已將 `/api/onboarding/questions` 添加到 `PUBLIC_API_ROUTES` 中：

**文件**: `apps/web/middleware.ts`

```typescript
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/docs',
  '/api/heartbeat',
  '/api/qr/',
  '/api/packs',
  '/api/auth/',
  '/api/onboarding/questions', // ✅ 新增：允許匿名訪問
]
```

## 🔄 修復後的流程

1. Middleware 檢查路由（第 125 行）
2. `/api/onboarding/questions` 匹配 `PUBLIC_API_ROUTES`
3. 允許匿名訪問，不需要認證 ✅
4. API 端點執行查詢並返回數據

## 📋 驗證步驟

### 步驟 1: 確認 Middleware 已更新

檢查 `apps/web/middleware.ts` 第 65 行應該包含：
```typescript
'/api/onboarding/questions', // Onboarding questions - allow anonymous access
```

### 步驟 2: 重新啟動開發服務器

Middleware 的更改需要重啟服務器才能生效。

```bash
# 停止當前服務器（Ctrl+C）
# 然後重新啟動
pnpm dev:web
```

### 步驟 3: 測試 API

在瀏覽器控制台執行：

```javascript
fetch('/api/onboarding/questions?difficulties=1,2,3&count=7')
  .then(res => res.json())
  .then(data => {
    console.log('API 響應:', data);
    if (data.success) {
      console.log('✅ API 正常返回！');
      console.log('題目數量:', data.questions?.length || 0);
    } else {
      console.error('❌ API 仍然失敗:', data.error);
    }
  });
```

### 步驟 4: 測試 Challenge 頁面

1. 清除瀏覽器緩存（Cmd+Shift+R 或 Ctrl+Shift+R）
2. 訪問 `/onboarding/challenge`
3. 應該能看到真正的題目，而不是 fallback 測試題

## 🔐 安全考慮

**為什麼這樣做是安全的**：
- `/api/onboarding/questions` 只是**讀取**公開的測驗題目
- 不涉及用戶數據的創建或修改
- 題目內容本身是公開的（類似於公開的題庫）
- 與 onboarding 頁面允許匿名訪問的設計一致

**受保護的 onboarding API**：
- `/api/onboarding/session` - 仍然需要認證（涉及用戶 session）
- `/api/onboarding/complete` - 仍然需要認證（完成 onboarding）

## 📝 相關文件

- Middleware: `apps/web/middleware.ts`
- API 端點: `apps/web/app/api/onboarding/questions/route.ts`
- Challenge 頁面: `apps/web/app/onboarding/challenge/page.tsx`

## ✅ 預期結果

修復後應該：
- ✅ API 不再返回 401 錯誤
- ✅ API 正常返回題目數據
- ✅ Challenge 頁面顯示真正的題目
- ✅ 不再使用 fallback 測試題

