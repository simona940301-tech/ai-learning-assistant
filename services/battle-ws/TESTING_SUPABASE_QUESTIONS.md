# 測試 Supabase Seeds 題目指南

## 📋 概述

本文檔說明如何配置和測試從 Supabase `seed_questions` 表獲取正式版本的題目。

## 🔧 配置步驟

### 1. 後端環境變量配置

在 `services/battle-ws` 目錄創建或更新 `.env` 文件：

```bash
# Next.js API URL（後端調用前端 API 的地址）
NEXTJS_API_URL=http://localhost:3000

# 可選：內部 API Key（用於 API 認證）
# 如果 Next.js API 配置了 INTERNAL_API_KEY，這裡也需要設置相同的值
INTERNAL_API_KEY=your-secret-key-here
# 或者
NEXTJS_INTERNAL_API_KEY=your-secret-key-here
```

### 2. 前端環境變量配置

確保 `apps/web/.env.local` 包含 Supabase 配置：

```bash
# Supabase 配置（應該已經存在）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# WebSocket 服務器地址
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws/battle
```

### 3. 確認 Supabase 數據

確保 `seed_questions` 表有數據：

```sql
-- 檢查 seed_questions 表是否有數據
SELECT COUNT(*) FROM seed_questions WHERE is_active = true AND has_explanation = true;

-- 查看示例題目
SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, subject
FROM seed_questions
WHERE is_active = true AND has_explanation = true
LIMIT 5;
```

## 🧪 測試流程

### 步驟 1: 啟動服務

1. **啟動 Next.js 前端**：
```bash
cd apps/web
pnpm dev
```

2. **啟動 Rust WebSocket 服務器**：
```bash
cd services/battle-ws
RUST_LOG=info cargo run
```

### 步驟 2: 測試 PVE 匹配

1. 訪問 `http://localhost:3000/play`
2. 點擊「系統對戰」→「PVE 訓練」
3. 點擊「開始匹配」
4. 確認匹配成功並進入對戰頁面

### 步驟 3: 驗證題目來源

查看後端日誌，應該看到：

```
[INFO] Fetching PVE questions: user=dev_user, subject=None, num=10
[INFO] Successfully fetched 10 PVE questions
```

查看前端控制台，應該看到：

```
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED! matchId=xxx, questions=10
[PlayProvider] ✅ All 10 questions have valid structure
```

### 步驟 4: 檢查題目數據

在後端日誌中查找：

```
[LobbyTimer] Match xxx has 10 questions
[LobbyTimer] Sending MATCH_FOUND to player dev_user with 10 questions
```

在前端控制台檢查題目內容：

```javascript
// 在瀏覽器控制台執行
console.log('Question List:', window.__battleState?.questionList)
```

## 🔍 調試指南

### 問題 1: 後端無法連接到 Next.js API

**症狀**：
```
[ERROR] Failed to fetch PVE questions: Request error: ...
```

**解決方案**：
1. 確認 Next.js 服務器正在運行（`http://localhost:3000`）
2. 檢查 `NEXTJS_API_URL` 環境變量是否正確
3. 檢查防火牆設置

### 問題 2: API 返回空題目

**症狀**：
```
[WARN] PVE questions API returned empty questions
```

**解決方案**：
1. 檢查 Supabase 連接是否正常
2. 確認 `seed_questions` 表有數據
3. 檢查 `mission-sampler.ts` 的取題邏輯
4. 查看 Next.js API 日誌：`/api/play/pve/questions`

### 問題 3: 題目格式不正確

**症狀**：
```
[WARN] Found X invalid questions in questionList
```

**解決方案**：
1. 檢查 `seed_questions` 表的數據結構
2. 確認字段映射正確：
   - `question_text` → `stem`
   - `option_a/b/c/d` → `choices`
   - `correct_answer` → `answer`
   - `difficulty_level` → `difficulty`

### 問題 4: API Key 驗證失敗

**症狀**：
```
[WARN] Invalid API key attempt
```

**解決方案**：
1. 確認 `INTERNAL_API_KEY` 在後端和前端都設置了相同的值
2. 或者暫時移除 API Key 驗證（開發環境）

## 📊 題目來源優先級

根據 `mission-sampler.ts` 的實現，題目來源優先級如下：

1. **Tier 0**: 用戶已安裝的題包 (`pack_questions`)
2. **Tier 1**: 相同科目、高置信度題包
3. **Tier 2**: 相同技能題包
4. **Tier 3**: 系統推薦題包
5. **Tier 4**: **Seed Questions（官方題庫）** ⭐
6. **Fallback**: 緊急補位題目

如果用戶沒有安裝題包或題包題目不足，系統會自動使用 `seed_questions` 作為 fallback。

## 🎯 強制使用 Seed Questions

如果想要強制使用 `seed_questions`（跳過題包），可以修改 `apps/web/app/api/play/pve/questions/route.ts`：

```typescript
// 修改取題比例，強制使用 seed questions
const errorBookRatio = 0.0  // 不使用錯題本
const packRatio = 0.0        // 不使用題包
// 這樣會直接進入 Tier 4 fallback，使用 seed_questions
```

或者修改 `mission-sampler.ts` 中的 `sampleFromPacksWithFallback` 函數，優先使用 `seed_questions`。

## 📝 日誌檢查清單

測試時檢查以下日誌：

- [ ] 後端：`Fetching PVE questions` - API 調用開始
- [ ] 後端：`Successfully fetched X PVE questions` - 成功獲取題目
- [ ] 後端：`Match xxx has X questions` - 題目數量確認
- [ ] 後端：`Sending MATCH_FOUND` - 發送題目列表
- [ ] 前端：`MATCH_FOUND EVENT RECEIVED` - 收到題目
- [ ] 前端：`All X questions have valid structure` - 題目結構驗證

## 🚀 快速測試命令

```bash
# 1. 檢查環境變量
cd services/battle-ws
echo "NEXTJS_API_URL: $NEXTJS_API_URL"

# 2. 測試 API 連接（需要 Next.js 運行）
curl -X POST http://localhost:3000/api/play/pve/questions \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: your-key" \
  -d '{"userId":"dev_user","numQuestions":10}'

# 3. 查看後端日誌
tail -f battle-ws.log | grep -E "PVE|questions|MATCH_FOUND"
```

## ✅ 成功標誌

測試成功的標誌：

1. ✅ 後端成功從 Next.js API 獲取題目
2. ✅ 題目數量 > 0
3. ✅ 前端收到 `MATCH_FOUND` 事件
4. ✅ 題目結構完整（有 `question_text`, `options`, `correct_answer`）
5. ✅ 對戰頁面正常顯示題目

## 📚 相關文件

- `services/battle-ws/src/pve_api_client.rs` - 後端 API 客戶端
- `apps/web/app/api/play/pve/questions/route.ts` - Next.js API 端點
- `apps/web/lib/mission-sampler.ts` - 題目取樣邏輯
- `services/battle-ws/src/ws_handler.rs` - WebSocket 處理器

