# 🚀 快速開始：測試 Supabase Seeds 題目

## ✅ 配置檢查清單

### 1. 後端配置（已完成 ✅）

- [x] `.env` 文件已配置
  - `NEXTJS_API_URL=http://localhost:3000`
  - `INTERNAL_API_KEY=dev-internal-api-key-1762922305`

### 2. 前端配置（需要確認）

檢查 `apps/web/.env.local` 是否包含：
```bash
INTERNAL_API_KEY=dev-internal-api-key-1762922305
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Supabase 數據（需要確認）

確保 `seed_questions` 表有數據：
```sql
SELECT COUNT(*) FROM seed_questions 
WHERE is_active = true AND has_explanation = true;
```

## 🧪 測試步驟

### 步驟 1: 啟動服務

**終端 1 - 啟動 Next.js**：
```bash
cd apps/web
pnpm dev
```

等待看到：
```
✓ Ready in Xs
○ Compiling /api/play/pve/questions ...
```

**終端 2 - 啟動 Rust WebSocket 服務器**：
```bash
cd services/battle-ws
source .env  # 載入環境變量
RUST_LOG=info cargo run
```

等待看到：
```
[INFO] Battle WebSocket server starting on ws://0.0.0.0:8080/ws/battle
```

### 步驟 2: 測試 API 連接

**終端 3 - 運行測試腳本**：
```bash
cd services/battle-ws
./test_supabase_questions.sh
```

預期輸出：
```
✅ Next.js API 可訪問: http://localhost:3000
✅ API 請求成功
✅ 成功獲取 X 道題目
```

### 步驟 3: 測試完整流程

1. 訪問 `http://localhost:3000/play`
2. 點擊「系統對戰」→「PVE 訓練」
3. 點擊「開始匹配」
4. 確認匹配成功並進入對戰頁面

### 步驟 4: 驗證題目來源

**檢查後端日誌**：
```bash
tail -f battle-ws.log | grep -E "PVE|questions|MATCH_FOUND"
```

應該看到：
```
[INFO] Fetching PVE questions: user=dev_user, subject=None, num=10
[INFO] Successfully fetched 10 PVE questions
[INFO] Match xxx has 10 questions
[INFO] Sending MATCH_FOUND to player dev_user with 10 questions
```

**檢查前端控制台**：
打開瀏覽器開發者工具，應該看到：
```
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED! matchId=xxx, questions=10
[PlayProvider] ✅ All 10 questions have valid structure
```

## 🔍 調試常見問題

### 問題 1: Next.js API 無法訪問

**症狀**：
```
⚠️ Next.js API 無法訪問: http://localhost:3000
```

**解決方案**：
1. 確認 Next.js 服務器正在運行
2. 檢查端口是否被占用：`lsof -i :3000`
3. 確認 `.env.local` 配置正確

### 問題 2: API 返回空題目

**症狀**：
```
[WARN] PVE questions API returned empty questions
```

**解決方案**：
1. 檢查 Supabase 連接：
   ```bash
   # 在 Next.js 控制台查看 Supabase 連接日誌
   ```
2. 確認 `seed_questions` 表有數據
3. 檢查 Next.js API 日誌：`/api/play/pve/questions`

### 問題 3: 題目格式錯誤

**症狀**：
```
[WARN] Found X invalid questions in questionList
```

**解決方案**：
1. 檢查 `seed_questions` 表結構
2. 確認字段映射正確（見下方）

## 📊 題目字段映射

`seed_questions` 表 → 對戰格式：

| seed_questions | 對戰格式 |
|---------------|---------|
| `id` | `id` |
| `question_text` | `question_text` |
| `option_a/b/c/d` | `options` (數組) |
| `correct_answer` | `correct_answer` |
| `difficulty_level` | `difficulty` (1-4) |
| `knowledge_tags` | `skill_tags` |

## 🎯 強制使用 Seed Questions

如果想要優先使用 `seed_questions`，可以修改取題比例：

**修改 `apps/web/app/api/play/pve/questions/route.ts`**：
```typescript
// 降低題包比例，增加 seed questions 使用率
const errorBookRatio = focusOnWeakness ? 0.3 : 0.1  // 減少錯題本比例
const packRatio = 0.3  // 減少題包比例（剩餘的會用 seed questions 補齊）
```

或者直接修改 `mission-sampler.ts`，將 `seed_questions` 提升到 Tier 0。

## 📝 日誌檢查點

測試時檢查以下關鍵日誌：

- [ ] **後端**：`Fetching PVE questions` - API 調用開始
- [ ] **後端**：`Successfully fetched X PVE questions` - 成功獲取
- [ ] **後端**：`Match xxx has X questions` - 題目數量確認
- [ ] **後端**：`Sending MATCH_FOUND` - 發送題目列表
- [ ] **前端**：`MATCH_FOUND EVENT RECEIVED` - 收到題目
- [ ] **前端**：`All X questions have valid structure` - 結構驗證

## ✅ 成功標誌

測試成功的標誌：

1. ✅ 後端成功從 Next.js API 獲取題目
2. ✅ 題目數量 > 0
3. ✅ 前端收到 `MATCH_FOUND` 事件
4. ✅ 題目結構完整
5. ✅ 對戰頁面正常顯示題目

## 🚀 快速命令

```bash
# 1. 啟動所有服務（需要 3 個終端）
# 終端 1:
cd apps/web && pnpm dev

# 終端 2:
cd services/battle-ws && RUST_LOG=info cargo run

# 終端 3: 測試 API
cd services/battle-ws && ./test_supabase_questions.sh

# 2. 查看日誌
tail -f services/battle-ws/battle-ws.log | grep -E "PVE|questions"
```

## 📚 相關文檔

- `TESTING_SUPABASE_QUESTIONS.md` - 詳細測試指南
- `ERROR_ANALYSIS.md` - 錯誤分析文檔
- `apps/web/lib/mission-sampler.ts` - 題目取樣邏輯





