# ⚡ 最短路徑修復 - 4 步驟解決所有問題

## 🎯 問題根源

1. **PDF 解析錯誤 (500)**: pdf-parse 已安裝，但開發伺服器還在跑舊快取
2. **資料庫錯誤 (403)**: rag_documents/notebook_entries 表未創建
3. **雜訊**: Sentry 403 和 WebSocket 錯誤與上傳無關

---

## 🚀 立即執行（5 分鐘）

### 1️⃣ 確認套件安裝（10 秒）

```bash
pnpm --filter web install
```

✅ 應該看到: `Already up to date` 或安裝完成

---

### 2️⃣ **強制重啟開發伺服器**（關鍵步驟！）

```bash
# 在開發伺服器終端：
# 1. Ctrl+C 停止
# 2. 重新啟動：
pnpm --filter web dev
```

**為什麼？** Next.js 必須重啟才能載入新安裝的 pdf-parse 模組

✅ 等待看到: `✓ Ready in X.Xs`

---

### 3️⃣ 補齊資料庫（2 分鐘）

**打開 Supabase SQL Editor:**
```
https://supabase.com/dashboard/project/umzqjgxsetsmwzhniemw/sql/new
```

**執行:**
- 複製 `supabase/migrations/20251123_create_rag_notebook_schema.sql` 完整內容
- 貼到 SQL Editor
- 點擊 "Run"

✅ 應該看到: 類似 "Migration completed successfully!" 的訊息

---

### 4️⃣ 驗證流程（1 分鐘）

1. 訪問 http://localhost:3000/ask
2. 切換到「重點統整」Tab
3. 上傳 `test-summary-upload.txt`
4. 點擊「開始分析」

**✅ 成功日誌:**
```
[PDF Extract] Starting PDF extraction...
[PDF Extract] ✅ Success! Pages: 1, Text length: XXX
[RAG Upload] Extracted text length: XXX characters
```

**❌ 不應再看到:**
```
PDF 解析模組未正確安裝
403 Forbidden (from /api/rag/upload)
500 Internal Server Error
```

---

## 🔕 降噪（可選）

忽略這些與上傳無關的雜訊：

```bash
# 如果想關閉 WebSocket 錯誤提示
echo "NEXT_PUBLIC_BATTLE_WS_ENABLED=false" >> apps/web/.env.local

# 重啟伺服器使其生效
```

**說明:**
- **Sentry 403**: 錯誤回報 DSN 被拒，不影響功能
- **WebSocket 失敗**: 對戰伺服器 (port 8080) 未啟動，與 PDF 上傳無關

---

## 📊 完成檢查清單

- [ ] 執行 `pnpm --filter web install`
- [ ] **Ctrl+C 停止舊伺服器**
- [ ] **重啟: `pnpm --filter web dev`**
- [ ] 在 Supabase 執行 migration SQL
- [ ] 測試上傳 test-summary-upload.txt
- [ ] 確認看到 "✅ Success!" 日誌

---

## 🎯 預期結果

完成 4 步驟後：

1. ✅ PDF 解析正常工作
2. ✅ 摘要和關鍵詞成功生成
3. ✅ 資料寫入 rag_documents 表
4. ✅ 可以存到 notebook_entries 表
5. ✅ 無 403/500 錯誤

---

**重點: 步驟 2 (重啟伺服器) 是關鍵！** 🔑

不重啟的話，Next.js 會繼續使用舊快取，pdf-parse 導入會失敗。

**總時間:** 5 分鐘
**難度:** 極簡單

立即執行，問題馬上解決！🚀
