# 手機 PDF 上傳 405 錯誤診斷與修復

## 🔍 問題分析

您遇到的 **Upload failed: 405** 錯誤主要發生在手機端,而電腦端正常工作。

### 問題截圖分析
從您的截圖看到:
- 文件: `Lec17Handout.pdf`
- 錯誤: `Upload failed: 405`
- 功能: 重點統整 (上傳講義)
- 環境: 手機瀏覽器 (plms-learning.vercel.app)

### 405 錯誤的含義
**405 Method Not Allowed** 通常表示:
1. 服務器不允許該 HTTP 方法 (例如 POST)
2. 認證失敗導致請求被攔截
3. CORS 問題或預檢請求失敗

## 🎯 根本原因

根據代碼分析,我發現以下可能原因:

### 1. **無痕模式導致認證失敗** (最可能)
- 您的問題描述提到"是因為我用無痕模式？"
- **無痕模式會清除所有 cookies**,導致 Supabase session 失效
- Middleware 要求 `/api/rag/` 必須認證 ([middleware.ts:42](apps/web/middleware.ts#L42))
- 認證失敗 → 可能被中間層返回 405

### 2. **手機瀏覽器 Cookie/LocalStorage 限制**
- iOS Safari 在跨域或隱私模式下會限制 cookies
- Android Chrome 也可能有類似限制
- Authorization header 可能未正確設置

### 3. **FormData 在手機上的處理差異**
- 手機瀏覽器可能對 `multipart/form-data` 有不同處理
- Content-Type header 可能不正確

### 4. **未下載 PWA 的影響**
您提到"還是因為我沒有下載" - PWA 安裝狀態不應該影響上傳功能,但:
- 未安裝 PWA = 在瀏覽器中運行
- 瀏覽器可能有更嚴格的安全限制

## 🔧 解決方案

### 解決方案 1: 使用正常模式 (最簡單)

**立即嘗試:**
1. 關閉無痕模式
2. 在正常瀏覽器模式下打開網站
3. 登入您的帳號
4. 嘗試上傳 PDF

**預期結果:** 如果問題解決 → 確認是認證問題

---

### 解決方案 2: 檢查登入狀態

**診斷步驟:**
1. 在手機上打開開發者工具:
   - **Android Chrome**: 連接電腦,使用 `chrome://inspect`
   - **iOS Safari**: 設定 → Safari → 進階 → 網頁檢閱器

2. 查看 Console 日誌:
   ```
   [RAG Upload] Has Authorization: true/false
   [RAG Upload] Auth Result: { hasUser: true/false, ... }
   ```

3. 查看 Network 標籤:
   - 找到失敗的 `/api/rag/upload` 請求
   - 檢查 Request Headers 是否包含 `Authorization: Bearer xxx`

---

### 解決方案 3: 清除緩存並重新登入

**步驟:**
1. 清除瀏覽器緩存和 cookies
2. 關閉所有標籤頁
3. 重新打開網站
4. 重新登入
5. 嘗試上傳

---

### 解決方案 4: 安裝 PWA (推薦)

**為什麼有幫助:**
- PWA 有獨立的 storage,不受瀏覽器隱私模式影響
- 更穩定的 session 管理
- 更好的離線支持

**安裝步驟:**
1. **iOS Safari**:
   - 點擊分享按鈕 (⬆️)
   - 選擇"加入主畫面"

2. **Android Chrome**:
   - 點擊右上角 ⋮ 選單
   - 選擇"安裝應用程式" 或 "加到主畫面"

---

## 🔬 開發者診斷 (進階)

我已經在代碼中添加了詳細的診斷日誌:

### 查看服務器日誌

如果您有訪問 Vercel logs 的權限:

1. 前往 Vercel Dashboard
2. 選擇項目
3. 查看 Functions → Logs
4. 上傳時查找包含 `[RAG Upload]` 的日誌

**關鍵診斷點:**
```log
[RAG Upload] Method: POST
[RAG Upload] Has Authorization: false  ← 如果是 false,就是認證問題
[RAG Upload] Auth Result: { hasUser: false, errorType: 'unauthenticated' }
```

---

## 🚀 代碼修復 (已應用)

我已經為您添加了診斷代碼:

### 修改位置: [apps/web/app/api/rag/upload/route.ts:26-50](apps/web/app/api/rag/upload/route.ts#L26-L50)

**新增功能:**
- ✅ 記錄請求的所有關鍵資訊 (User-Agent, Content-Type, Origin 等)
- ✅ 明確顯示是否有 Authorization header
- ✅ 顯示認證結果 (是否有用戶、錯誤類型)

這些日誌將幫助我們準確診斷問題。

---

## 📊 電腦 vs 手機差異

### 電腦端 (正常工作):
- ✅ 正常瀏覽器模式
- ✅ Cookies 正常保存
- ✅ Authorization header 正確設置
- ✅ Session 持久化

### 手機端 (失敗):
- ❌ **無痕模式** → Cookies 被清除
- ❌ **隱私限制** → LocalStorage/Session 受限
- ❌ **認證失敗** → 401/405 錯誤
- ❌ 請求被 middleware 攔截

---

## 🎯 測試計劃

### 測試 1: 無痕 vs 正常模式
```
1. 無痕模式 → 上傳 → 預期: 405 失敗 ❌
2. 正常模式 → 登入 → 上傳 → 預期: 成功 ✅
```

### 測試 2: 瀏覽器對比
```
1. iOS Safari 正常模式 → 上傳
2. iOS Safari 隱私模式 → 上傳
3. Android Chrome 正常模式 → 上傳
4. Android Chrome 無痕模式 → 上傳
```

### 測試 3: PWA vs 瀏覽器
```
1. 瀏覽器 → 上傳 → 記錄結果
2. 安裝 PWA → 上傳 → 記錄結果
3. 對比差異
```

---

## 📝 兼容性檢查清單

基於您的需求 "檢視我們所有電腦版本可以但是手機不行的功能並進行兼容":

### 需要檢查的功能:
- [ ] PDF 上傳 (重點統整)
- [ ] 圖片上傳 (重點統整)
- [ ] 文件選擇器
- [ ] 登入/登出流程
- [ ] Session 持久化
- [ ] Authorization headers
- [ ] FormData 處理
- [ ] File API 兼容性

### 常見手機兼容性問題:

1. **檔案選擇器**
   - iOS: 某些版本可能限制檔案類型
   - Android: 需要檔案存取權限

2. **FormData**
   - 確保 Content-Type 自動設置 (不手動設置)
   - File 對象必須正確構造

3. **認證**
   - Cookies 在跨域或隱私模式下可能失效
   - 需要使用 Authorization header 作為備用

4. **網絡請求**
   - 手機網絡可能較慢
   - 需要適當的 timeout 和重試機制

---

## 🔍 下一步行動

### 立即行動:
1. **在正常模式下測試** (非無痕)
2. **確認登入狀態**
3. **嘗試安裝 PWA**

### 如果問題持續:
1. 提供以下資訊:
   - 手機型號和操作系統版本
   - 瀏覽器名稱和版本
   - 是否在正常模式下測試
   - 是否已登入
   - 開發者工具的截圖 (Console + Network)

2. 我可以進一步:
   - 添加更多診斷代碼
   - 修改認證邏輯以支持無痕模式
   - 添加錯誤恢復機制
   - 改進手機端體驗

---

## 💡 建議的長期改進

### 1. 添加認證狀態檢查
在上傳前檢查用戶登入狀態,提供友好提示:
```typescript
if (!user) {
  return showLoginPrompt()
}
```

### 2. 改進錯誤訊息
將 405 轉換為更友好的訊息:
```
"請先登入後再上傳檔案"
"無痕模式下無法上傳,請使用正常模式"
```

### 3. 添加 Fallback 機制
如果 Authorization header 失敗,嘗試使用其他認證方式

### 4. 手機特定優化
- 添加檔案大小警告 (手機網絡較慢)
- 顯示上傳進度條
- 支持離線上傳隊列

---

## 📞 需要協助?

如果以上方案都無法解決問題,請提供:
1. 測試結果 (正常模式 vs 無痕模式)
2. 手機和瀏覽器資訊
3. 開發者工具截圖
4. 是否願意嘗試安裝 PWA

我會根據這些資訊提供更針對性的解決方案!
