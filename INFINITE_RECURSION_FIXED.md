# 🚨 無限遞迴問題 - 已完全修復

**時間**: 2025-10-27T17:55:00+08:00  
**狀態**: ✅ **已修復**

---

## 📊 問題摘要

### 原始錯誤

```javascript
RangeError: Maximum call stack size exceeded
at guardedFetch (api-client.ts:93:10)
at window.fetch (api-client.ts:110:14)
at guardedFetch (api-client.ts:93:10)
at window.fetch (api-client.ts:110:14)
// ... 無限循環 3000+ 次
```

### 症狀

1. **Console 洗版**: `[API Guard] ✅ Allowed: /api/ai/route-solver` 重複 2979 次
2. **堆疊溢出**: Maximum call stack size exceeded
3. **頁面無法載入**: 提交題目後立即崩潰

---

## 🔍 根本原因

### 遞迴循環

```typescript
// ❌ 錯誤的實現 (舊代碼)
export function installGlobalFetchGuard() {
  const originalFetch = window.fetch;
  
  window.fetch = async (input, init) => {
    // ... guard logic ...
    return guardedFetch(input, init);  // 調用 guardedFetch
  };
}

export async function guardedFetch(input, init) {
  // ... guard logic ...
  return fetch(input, init);  // ← 調用被覆寫的 window.fetch!
}
```

### 遞迴鏈

```
用戶調用 fetch()
  → window.fetch (被覆寫)
    → guardedFetch()
      → fetch() (實際是被覆寫的 window.fetch)
        → window.fetch (被覆寫)
          → guardedFetch()
            → fetch() ...
              → 無限循環 ♻️
```

**問題**: `guardedFetch` 內部調用 `fetch()`，但 `fetch` 已被覆寫為調用 `guardedFetch`，形成無限遞迴！

---

## ✅ 修復方案

### 1. 保存原生 Fetch 引用

```typescript
// ✅ 正確的實現 (新代碼)
declare global {
  interface Window {
    __PLMS_FETCH_GUARD_INSTALLED__?: boolean
    __PLMS_NATIVE_FETCH__?: typeof fetch  // ← 保存原生 fetch
  }
}

export function installGlobalFetchGuard() {
  // Idempotent: 只安裝一次
  if (window.__PLMS_FETCH_GUARD_INSTALLED__) return

  // 保存原生 fetch（覆寫之前！）
  const nativeFetch = window.fetch.bind(window)
  window.__PLMS_NATIVE_FETCH__ = nativeFetch

  // 覆寫 window.fetch
  window.fetch = async (input, init) => {
    // ... guard logic ...
    
    // ✅ 調用原生 fetch，不會遞迴！
    return window.__PLMS_NATIVE_FETCH__!(input, init)
  }

  window.__PLMS_FETCH_GUARD_INSTALLED__ = true
}
```

### 2. 添加 Debug 模式

```typescript
// 只在 DEBUG 模式下輸出日誌
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_API_GUARD === 'true'

if (DEBUG) console.log('[API Guard] ✅ Allowed:', path)
```

**預設**: DEBUG 模式關閉，不會洗版 Console

---

## 🔧 完成的修復

### 修改的文件

1. ✅ `apps/web/lib/api-client.ts` - 修復遞迴問題
2. ✅ `lib/api-client.ts` - 同步修復到根目錄
3. ✅ `apps/web/.next/` - 清除緩存
4. ✅ 開發服務器 - 重新啟動

### 關鍵改動

| 項目 | 舊代碼 | 新代碼 |
|------|--------|--------|
| Fetch 引用 | `fetch()` (遞迴) | `window.__PLMS_NATIVE_FETCH__()` (原生) |
| 幂等性 | 無檢查 | `__PLMS_FETCH_GUARD_INSTALLED__` 檢查 |
| Debug 模式 | 總是輸出 | `DEBUG` flag 控制 |
| 卸載功能 | 無法卸載 | `uninstallGlobalFetchGuard()` |

---

## 🧪 驗證步驟

### Step 1: 清除瀏覽器緩存 🗑️

```javascript
// 在瀏覽器 Console 執行
localStorage.clear()
sessionStorage.clear()
```

### Step 2: 硬刷新 🔄

**Mac**: `Cmd + Shift + R`  
**Windows**: `Ctrl + Shift + F5`

或者：
1. 打開 DevTools (F12)
2. Application → Clear storage
3. 勾選所有選項 → Clear site data

### Step 3: 提交英文題目 ✍️

```
There are reports coming in that a number of people have been injured in a terrorist ___ . (A) access (B) supply (C) attack (D) burden
```

### Step 4: 驗證結果 ✅

#### Console 應該顯示:

```javascript
✅ [API Guard] Global fetch guard installed
✅ [ForceSolver] Solver-only mode active
✅ Guard: hard=none, experts=[english:0.69,...], chosen=english
✅ Subject detection validated: english
✅ Solve preview updated ...
```

#### 不應該出現:

```javascript
❌ [API Guard] ✅ Allowed: ... (重複 3000 次)
❌ Maximum call stack size exceeded
❌ [warmup-mcq] ...
```

---

## 📊 修復前後對比

### Before ❌

```
用戶提交題目
↓
fetch() 被調用
↓
❌ 無限遞迴循環 (3000+ 次)
↓
❌ Console 洗版
↓
❌ 堆疊溢出錯誤
↓
❌ 頁面崩潰
```

### After ✅

```
用戶提交題目
↓
fetch() 被調用
↓
✅ Guard 檢查 (1 次)
↓
✅ 調用原生 fetch
↓
✅ API 返回結果
↓
✅ 頁面正常顯示
```

---

## 🎯 預期行為

### 正常流程

1. **頁面載入**: 
   - Console: `✅ [API Guard] Global fetch guard installed` (僅 1 次)
   
2. **提交題目**:
   - API 調用: `/api/ai/route-solver` (1 次)
   - Console: 無重複日誌（DEBUG 模式關閉）
   
3. **顯示結果**:
   - UI: 詳解卡片
   - 內容: 英文相關解釋
   - Chips: [詳解｜相似題｜重點]

### Debug 模式（可選）

若要啟用詳細日誌：

```bash
# .env.local
NEXT_PUBLIC_DEBUG_API_GUARD=true
```

重啟服務器後，Console 會顯示：

```javascript
[API Guard] ✅ Allowed: /api/ai/route-solver
[API Guard] ✅ Allowed: /api/exec/similar
[API Guard] ✅ Allowed: /api/exec/keypoints
```

---

## 🔍 技術細節

### Fetch Guard 架構

```typescript
// 架構層次
┌─────────────────────────────────┐
│  Application Code               │
│  (AnySubjectSolver.tsx)         │
└─────────────┬───────────────────┘
              │ fetch('/api/...')
              ↓
┌─────────────────────────────────┐
│  window.fetch (Guard)           │
│  - Idempotent check             │
│  - Endpoint validation          │
│  - Block warmup APIs            │
└─────────────┬───────────────────┘
              │
              ↓
┌─────────────────────────────────┐
│  window.__PLMS_NATIVE_FETCH__   │
│  (Original browser fetch)       │
└─────────────┬───────────────────┘
              │
              ↓
┌─────────────────────────────────┐
│  Network Request                │
│  HTTP → Server → Response       │
└─────────────────────────────────┘
```

### 端點規則

#### 白名單（允許）

```typescript
const ALLOWED_ENDPOINTS = [
  /^\/api\/solve/,      // Solve API
  /^\/api\/ai\//,       // AI APIs
  /^\/api\/exec\//,     // Executor APIs
  /^\/api\/tutor\//,    // Tutor APIs
  /^\/api\/backpack\//  // Backpack APIs
]
```

#### 黑名單（阻擋）

```typescript
const BLOCKED_ENDPOINTS = [
  /^\/api\/warmup\//    // ← 返回 410 Gone
]
```

---

## 🚀 後續優化

### 可選改進

1. **Performance Monitoring**
```typescript
const startTime = performance.now()
const response = await window.__PLMS_NATIVE_FETCH__(input, init)
const duration = performance.now() - startTime
if (DEBUG) console.log(`[API Guard] ${path} took ${duration.toFixed(2)}ms`)
```

2. **Request Deduplication**
```typescript
const pendingRequests = new Map<string, Promise<Response>>()
// Dedupe同時發起的相同請求
```

3. **Error Recovery**
```typescript
try {
  return await window.__PLMS_NATIVE_FETCH__(input, init)
} catch (error) {
  console.error('[API Guard] Fetch failed:', error)
  // Fallback logic
}
```

---

## 📋 驗收清單

### Backend ✅

- [x] `apps/web/lib/api-client.ts` 已修復
- [x] `lib/api-client.ts` 已同步
- [x] `.next` 緩存已清除
- [x] 開發服務器已重啟
- [x] 服務器運行在 Port 3000

### Frontend ⏳

- [ ] 瀏覽器緩存已清除
- [ ] 頁面已硬刷新
- [ ] 提交英文題目成功
- [ ] Console 無遞迴錯誤
- [ ] Console 無洗版日誌
- [ ] UI 顯示詳解卡片

---

## 🔧 故障排查

### 問題 1: 仍然看到遞迴錯誤

**解決方案**:

```bash
# 1. 完全停止服務器
lsof -ti:3000 | xargs kill -9

# 2. 清除所有緩存
rm -rf apps/web/.next
rm -rf .next

# 3. 重新啟動
pnpm run dev:web

# 4. 瀏覽器端
# - 清除 Application → Clear site data
# - 關閉所有視窗
# - 重新打開瀏覽器
# - 訪問 http://localhost:3000/ask
```

### 問題 2: Console 仍有重複日誌

**解決方案**:

確認 DEBUG 模式已關閉：

```bash
# 檢查 .env.local
grep DEBUG_API_GUARD apps/web/.env.local

# 如果存在且為 true，刪除或設為 false
# NEXT_PUBLIC_DEBUG_API_GUARD=false

# 重啟服務器
```

### 問題 3: Guard 未安裝

**Console 顯示**:
```
❌ 沒有看到 "[API Guard] Global fetch guard installed"
```

**解決方案**:

檢查 ask/page.tsx 是否調用了 `installGlobalFetchGuard()`:

```typescript
useEffect(() => {
  installGlobalFetchGuard()  // ← 確保這行存在
  console.log('✅ [ForceSolver] Solver-only mode active')
}, [])
```

---

## 📝 相關文檔

- ✅ `SOLVER_ONLY_MODE_VERIFIED.md` - Solver 模式驗證
- ✅ `CRITICAL_SUBJECT_FIX.md` - 科目檢測修復
- ✅ `FINAL_FIX_SUMMARY.md` - 完整修復總結
- ✅ `INFINITE_RECURSION_FIXED.md` - 本文件

---

## 🎉 修復完成

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  ✅ 無限遞迴問題已完全修復！                            ║
║                                                        ║
║  🔧 API Guard: 修復完成                                 ║
║  🚫 遞迴循環: 已消除                                    ║
║  📦 緩存: 已清除                                        ║
║  🔄 服務器: 已重啟                                      ║
║  ⏳ 用戶測試: 待驗證                                    ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 📞 下一步行動

### 立即執行

1. **清除瀏覽器緩存**:
   ```
   DevTools → Application → Clear site data
   ```

2. **硬刷新**:
   ```
   Mac: Cmd + Shift + R
   Windows: Ctrl + Shift + F5
   ```

3. **測試英文題目**:
   ```
   There are reports coming in that a number of people 
   have been injured in a terrorist ___ . 
   (A) access (B) supply (C) attack (D) burden
   ```

4. **驗證成功標準**:
   ```
   ✅ Console 無遞迴錯誤
   ✅ Console 無洗版日誌
   ✅ UI 顯示詳解卡片
   ✅ 內容是英文相關
   ```

---

**服務器狀態**: 🟢 運行中 (Port 3000)  
**修復狀態**: ✅ 完成  
**下一步**: **請立即硬刷新瀏覽器並測試！** 🚀


