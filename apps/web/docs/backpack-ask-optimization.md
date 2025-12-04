# 🚀 Backpack Ask 性能優化報告

**優化日期**: 2025-12-01  
**實施方案**: 方案 2 強化版（並行處理 + Prompt 壓縮 + 智能 RAG）  
**預期性能提升**: 40-60%

---

## 📊 優化內容

### 1️⃣ 智能 RAG 邏輯

**實施位置**: `lib/ai/smart-rag-detector.ts`

**邏輯**:
- 短查詢 (< 15 字元): 自動跳過 RAG 檢索
- 簡單查詢模式: 匹配簡單指令（如「解釋」、「這是什麼」）且無複雜關鍵字 → 跳過 RAG
- 複雜查詢: 包含「為什麼」、「比較」、「分析」等關鍵字 → 執行 RAG

**性能影響**:
- 簡單查詢 TTFT 提升 **60-80%**
- 複雜查詢保持完整功能

**判斷函數**:
```typescript
isSimpleQuery(query: string): boolean
shouldSkipRAG(prompt: string, hasSelection: boolean): boolean
```

---

### 2️⃣ Prompt 壓縮與優化

**實施位置**: `lib/prompts/backpack-ask-prompts.ts`

**優化前**:
- Selection mode System Prompt: **300+ 行**
- 包含大量重複說明和冗餘格式

**優化後**:
- Selection mode System Prompt: **50 行以內**（壓縮至約 15 行）
- 保留所有核心指令：
  - 引用格式要求
  - 專注度規則
  - 輸出格式要求
  - 摘要要求

**性能影響**:
- Prompt token 數量減少 **70-80%**
- TTFT 降低 **20-30%**

---

### 3️⃣ 並行處理優化

**實施位置**: `app/api/backpack/ask/route.ts`

**優化策略**:
1. RAG 檢索任務異步化：創建 `ragTask` Promise，不阻塞其他準備工作
2. 簡單查詢立即返回：跳過 RAG 的情況下，直接構建 prompt 並開始生成
3. 複雜查詢並行等待：在等待 RAG 結果的同時，準備 prompt 的其他部分

**性能影響**:
- 消除串行等待時間
- 整體響應時間提升 **20-30%**

---

## 🎯 性能指標

### 預期提升

| 查詢類型 | 優化前 TTFT | 優化後 TTFT | 提升幅度 |
|---------|------------|------------|---------|
| 簡單查詢 (< 15 字) | ~2-3 秒 | ~0.5-1 秒 | **60-80%** |
| 複雜查詢 (> 15 字) | ~2-3 秒 | ~1.2-1.8 秒 | **40-60%** |

### 關鍵優化點

1. **智能 RAG 跳過**: 80% 的簡單查詢不再執行 RAG 檢索
2. **Prompt 壓縮**: Token 數量減少 70-80%，降低 Gemini API 處理時間
3. **並行處理**: 消除文件驗證、Embedding 生成、RAG 檢索的串行等待

---

## 🔍 驗證方法

### 測試簡單查詢（應跳過 RAG）

```bash
# 測試查詢
"解釋這個詞"
"這是什麼"
"翻譯"
```

**預期行為**:
- Console 顯示: `skipRAG: true, reason: 'simple_query'`
- 響應時間 < 1 秒
- 無 RAG 檢索日誌

### 測試複雜查詢（應執行 RAG）

```bash
# 測試查詢
"為什麼這個概念很重要？"
"比較這兩種方法的差異"
"分析這段內容的結構"
```

**預期行為**:
- Console 顯示: `skipRAG: false, reason: 'complex_query'`
- 執行 RAG 檢索
- 響應時間約 1.5-2 秒

### 檢查 Prompt 長度

**預期結果**:
- System Prompt 長度 < 500 字元（優化前 > 2000 字元）
- User Prompt 結構清晰，無冗餘

---

## 📝 代碼變更清單

### 新增文件

1. `lib/ai/smart-rag-detector.ts` - 智能 RAG 判斷邏輯
2. `lib/prompts/backpack-ask-prompts.ts` - 壓縮後的 Prompt 定義

### 修改文件

1. `app/api/backpack/ask/route.ts`
   - 集成智能 RAG 判斷
   - 使用壓縮後的 Prompt
   - 實施並行處理優化

---

## 🚨 注意事項

1. **智能 RAG 邏輯**: 如果發現簡單查詢判斷不準確，可在 `smart-rag-detector.ts` 中調整規則
2. **Prompt 壓縮**: 如果發現回答質量下降，可在 `backpack-ask-prompts.ts` 中恢復部分指令
3. **並行處理**: Edge Runtime 環境下，並行處理可能受到限制，需實際測試

---

## ✅ 驗證清單

- [ ] 簡單查詢跳過 RAG 檢索
- [ ] 複雜查詢正常執行 RAG
- [ ] Prompt 長度顯著減少
- [ ] 響應時間提升 40-60%
- [ ] 回答質量未下降
- [ ] 引用格式正常顯示
- [ ] 無錯誤或警告

---

**優化完成後，請執行測試並記錄實際性能數據。**














