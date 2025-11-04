# E4 閱讀題詳解修復總結

## 📋 修復內容

### 1. 三層邊界檢查日誌

#### API 出口邊界 (`apps/web/app/api/ai/route-solver/route.ts`)
- 在返回前記錄 `[API boundary] explain.keys` 和 `[API boundary] sample meta.questions`
- 顯示每個問題的 `reasoning`、`counterpoints`、`common_mistake`、`evidence` 預覽

#### 前端進口邊界 (`apps/web/components/solve/ExplainCard.tsx`)
- 在接收到卡片資料時記錄 `[FE boundary] raw.explain keys` 和 `[FE boundary] preview meta.questions`
- 驗證網路/串流過程沒有丟失鍵值

#### Presenter 邊界 (`apps/web/lib/mapper/explain-presenter.ts`)
- 記錄 `[Presenter boundary] reasoningRaw`、`counterpointsRaw keys`、`evidenceRaw preview`
- 記錄 `[Presenter boundary] reasoningExtracted`、`counterpointsExtracted`、`keys after mapping`
- 顯示 `hasReasoning`、`hasCounterpoints`、`counterKeys` 狀態

### 2. 鍵名兼容性 (`explain-presenter.ts`)

支援以下鍵名變體：
- `reasoning` / `Reasoning` / `REASONING`
- `counterpoints` / `counterPoints` / `COUNTERPOINTS`
- `common_mistake` / `commonMistake` / `COMMON_MISTAKE`
- `evidence_zh` / `evidenceZh` / `EVIDENCE_ZH`
- `error_tag` / `errorTag` / `ERROR_TAG`
- `strategy` / `Strategy` / `STRATEGY`
- `summary` / `Summary` / `SUMMARY`

### 3. 溫和清洗機制 (`gentleSanitize`)

新增 `gentleSanitize` 函數：
- 移除 markdown code fences (` ``` `)
- 移除前後引號
- 標準化空白字元（保留單空格）
- **保留中文、標點、內容**

**原值回退機制**：
- 如果清洗後為空但原始值 > 10 字（reasoning）或 > 5 字（counterpoints），使用原始值

### 4. 改進 LLM Prompt (`templates.ts`)

- 要求嚴格 JSON 輸出（無 markdown fences、無註解）
- 明確要求所有欄位必須填寫（無空字串）
- 要求 `counterpoints` 僅包含錯誤選項（排除正確答案）
- 新增擴展補齊機制：如果第一次回應缺少或過短，自動觸發一次補齊

### 5. Counterpoints 過濾

- 自動移除 `counterpoints` 中包含的正確答案字母
- 確保只顯示錯誤選項的解釋

### 6. 可切換的 Debug 日誌

所有邊界日誌由環境變數控制：
- **後端（Server）**：`DEBUG=1` 或 `DEBUG=true`
- **前端（Client）**：`NEXT_PUBLIC_DEBUG=1` 或 `NEXT_PUBLIC_DEBUG=true`

### 7. 隱藏開發提示

- 環境變數：`NEXT_PUBLIC_HIDE_DEV_BANNER=1` 或 `NEXT_PUBLIC_HIDE_DEV_BANNER=true`
- 隱藏頂部系統提示（kind、questions count、warnings）

## 🛠️ 如何使用

### 啟用 Debug 日誌

**開發環境（.env.local）：**
```bash
# 後端日誌
DEBUG=1

# 前端日誌
NEXT_PUBLIC_DEBUG=1

# 隱藏開發提示（可選）
NEXT_PUBLIC_HIDE_DEV_BANNER=1
```

**生產環境：**
- 不設置或設置為 `0`/`false` 即可關閉所有 debug 日誌

### 查看日誌

1. **伺服器端日誌**（終端）：
   - `[API boundary]` - API 返回前的資料檢查
   - `[Presenter boundary]` - Presenter 抽取/映射過程
   - `[extractExplanation]` - 提取函數內部日誌

2. **瀏覽器控制台**：
   - `[FE boundary]` - 前端接收到的原始資料
   - `[ReadingExplain]` - 最終渲染狀態

## ✅ 驗收標準

### 控制台日誌檢查

1. **API 出口**：
   ```
   [API boundary] explain.keys: [...]
   [API boundary] sample meta.questions: [{reasoning: "...", counterpoints: {...}, ...}]
   ```

2. **前端進口**：
   ```
   [FE boundary] raw.explain keys: [...]
   [FE boundary] preview meta.questions: [{reasoning: "...", counterpoints: {...}, ...}]
   ```

3. **Presenter 抽取**：
   ```
   [Presenter boundary] Q1 reasoningRaw: "..."
   [Presenter boundary] Q1 counterpointsRaw keys: ["B", "C", "D"]
   [Presenter boundary] Q1 reasoningExtracted: true "..."
   [Presenter boundary] Q1 counterpointsExtracted: true ["B", "C", "D"]
   [Presenter boundary] Q1 keys after mapping: {hasReasoning: true, hasCounterpoints: true, ...}
   ```

4. **最終狀態**：
   ```
   [ReadingExplain] render group: ... hasExplanation: true
   [ReadingExplain] Q1 explanation status: {hasReasoning: true, hasCounterpoints: true, ...}
   ```

### UI 顯示檢查

✅ **必須顯示**：
- 📖 為什麼選這個？（reasoning 1-2 句）
- 🔍 為什麼其他不對？（counterpoints 對每個錯誤選項各 1 句）
- ⚠️ 常見誤區（如果有值）
- 📚 引用證據（英文一句 + 中文翻譯）

## 🔍 故障排除

### 如果詳解仍不顯示

1. **檢查 API 出口日誌**：
   - 如果 `[API boundary]` 顯示 `reasoning: "missing"`，問題在 LLM 生成階段
   - 檢查 `templates.ts` 的 prompt 和擴展機制

2. **檢查前端進口日誌**：
   - 如果 `[FE boundary]` 顯示 `reasoning: "missing"`，可能是網路/串流問題
   - 檢查 API 回應是否正確

3. **檢查 Presenter 日誌**：
   - 如果 `reasoningRaw` 有值但 `reasoningExtracted` 為 false，可能是清洗過度
   - 檢查 `gentleSanitize` 函數和原值回退機制

4. **檢查鍵名**：
   - 如果 `[extractExplanation] raw keys` 顯示不同的鍵名，確認鍵名兼容邏輯是否正確

## 📝 修改檔案清單

1. `apps/web/app/api/ai/route-solver/route.ts` - API 出口邊界日誌
2. `apps/web/components/solve/ExplainCard.tsx` - 前端進口邊界日誌 + 隱藏開發提示
3. `apps/web/lib/mapper/explain-presenter.ts` - Presenter 邊界日誌 + 鍵名兼容 + 溫和清洗 + counterpoints 過濾
4. `apps/web/lib/english/templates.ts` - 改進 LLM prompt + 擴展補齊機制

## 🚫 未修改的檔案

- Router (`apps/web/lib/english/router.ts`)
- Parser (`apps/web/lib/english/reading-parser.ts`)
- UI 元件（僅添加環境變數控制）
- 串流機制
- API schema

## 🎯 下一步

1. 測試閱讀理解題，確認三層日誌正常顯示
2. 檢查 UI 是否正確顯示所有詳解欄位
3. 如果仍有問題，根據日誌定位資料丟失的層級
4. 根據診斷結果決定是否需要修補 API/Parser/串流層


