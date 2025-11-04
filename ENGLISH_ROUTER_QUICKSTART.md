# English Router - 快速開始

## 🚀 5 分鐘驗證

### 1. 確認環境變數

```bash
# apps/web/.env.local
OPENAI_API_KEY=sk-...           # 必須
EN_EXPLAIN_ROUTER_V1=true       # 預設 true，可省略
```

### 2. 安裝依賴（如需要）

```bash
cd apps/web
pnpm install
```

### 3. 啟動開發伺服器

```bash
pnpm run dev:web
```

### 4. 瀏覽器測試

打開 `http://localhost:3000/ask`，輸入：

```
There are reports coming in that a number of people have been injured in a terrorist ____.
(A) access (B) supply (C) attack (D) burden
```

### 5. 預期結果

#### ✅ Console 日誌

```javascript
[route-solver] Using English explanation pipeline...
[explain_pipeline] Type classified: { type: 'E1', confidence: 0.8, ... }
[event] explain_pipeline_routed
[event] explain_card_generated
✅ Solve preview updated ...
```

#### ✅ UI 顯示

1. **Loading Skeleton** (提交後立即顯示)
2. **ExplainCard** (逐段漸入，包含):
   - 題幹翻譯
   - 解題線索
   - 逐選項分析（✓/✗ + 理由）
   - 正確答案
   - 詞彙提示（attack, burden, supply, access...）

---

## 🧪 手動測試腳本

```bash
npx tsx apps/web/scripts/test-english-router.ts
```

測試 3 個案例：E1 (Vocabulary), E2 (Grammar), E3 (Logic)

---

## 📊 檢查點

| 項目 | 狀態 |
|------|------|
| Router 正確分類 E1 | ✅ |
| 詞彙提示顯示 3-5 個 | ✅ |
| Console 無錯誤 | ✅ |
| Loading skeleton 正常 | ✅ |
| ExplainCard 不崩潰 | ✅ |

---

## 🔧 停用新功能（如需要）

```bash
# apps/web/.env.local
EN_EXPLAIN_ROUTER_V1=false
```

重啟伺服器即可回退到原有流程。

---

## 📖 完整文檔

詳見 `ENGLISH_ROUTER_IMPLEMENTATION.md`

