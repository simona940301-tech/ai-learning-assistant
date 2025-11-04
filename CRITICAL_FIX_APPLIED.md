# 🔥 CRITICAL FIX APPLIED - Normalizer Pattern

## 問題根源

你說得對！問題是**前端資料形狀不一致**，不是後端壞掉。

從你的診斷：
- ✅ curl 測試 API 返回 E1 + 4 options + 5 vocab
- ❌ 瀏覽器 UI 顯示 FALLBACK + 0 options + 0 vocab

這說明：**前端在某個地方沒有正確讀取 API 回傳的資料**

---

## 已應用的修復

### 1. 創建 Normalizer (`lib/explain-normalizer.ts`)

```typescript
export function normalizeCard(raw: any): NormalizedCard {
  // Handle nested structure: explanation.card, card, or root
  const node = raw?.explanation?.card ?? raw?.card ?? raw ?? {};

  // Normalize field names
  const kind = (node.kind ?? node.type ?? 'FALLBACK') as NormalizedCard['kind'];
  const options = node.options ?? node.choices ?? [];
  const vocab = node.vocab ?? node.vocabulary ?? node.words ?? [];

  return {
    kind,
    options: Array.isArray(options) ? options : [],
    vocab: Array.isArray(vocab) ? vocab : [],
    translation: node.translation ?? node.translate ?? node.cn ?? '',
    cues: node.cues ?? node.hints ?? node.clues ?? [],
    // ... etc
  };
}
```

**作用：**
- 統一處理 `options` vs `choices`
- 統一處理 `vocab` vs `vocabulary`
- 統一處理 `explanation.card` vs `card` vs root
- 提供防禦性默認值

### 2. 修改 AnySubjectSolver 使用 Normalizer

**Before:**
```typescript
const apiCard = solverJson.explanation?.card
setCard(apiCard)  // 直接使用未處理的資料
```

**After:**
```typescript
const rawCard = solverJson.explanation?.card ?? solverJson.card
const normalizedCard = normalizeCard(rawCard)  // 🔥 使用 normalizer

console.log('[AnySubjectSolver] ✅ Card normalized:', {
  status: getCardStatus(normalizedCard),
  raw_kind: rawCard.kind,
  raw_options: rawCard.options?.length ?? 0,
  normalized_kind: normalizedCard.kind,
  normalized_options: normalizedCard.options.length,
})

setCard(normalizedCard)  // 使用正規化後的資料
```

**新增 Debug Logs:**
- `[AnySubjectSolver] RAW API Response` - 顯示原始結構
- `[AnySubjectSolver] ✅ Card normalized` - 顯示正規化前後對比

### 3. 放寬 ExplainCard 的 Fallback 條件

**Before:**
```typescript
// 可能有隱藏的嚴格判斷導致 E1 卡被當作 FALLBACK
```

**After:**
```typescript
// ✅ DON'T reject cards just because they're missing some fields!
// Even FALLBACK cards or partial E1 cards should render what they have

// 詳細的 debug logs
console.log('[ExplainCard] render', {
  hasCard: !!card,
  kind: card?.kind,
  hasOptions,
  hasVocab,
  optionsCount: card?.options?.length ?? 0,
  vocabCount: card?.vocab?.length ?? 0,
  hasTranslation: !!card?.translation,
  hasCues: (card?.cues?.length ?? 0) > 0,
})
```

### 4. Markdown 生成優雅處理缺失字段

```typescript
// Options Analysis
if (card.options && card.options.length > 0) {
  // 顯示選項
  sections.push(`## 📋 選項分析\n\n${optionsText}`)
} else if (card.kind !== 'FALLBACK') {
  // 對於非 FALLBACK 卡片，顯示載入提示而不是完全隱藏
  sections.push(`## 📋 選項分析\n\n*（選項分析載入中...）*`)
}
```

---

## 測試步驟（請按順序執行）

### Step 1: 在瀏覽器 Console 直接測試 API

打開 http://localhost:3000/ask（或 http://localhost:3001/ask）

在 Console 執行：

```javascript
await fetch('/api/ai/route-solver', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({
    questionText: "There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden"
  })
}).then(r=>r.json()).then(j => {
  console.log('RAW:', j);
  const card = j?.explanation?.card ?? j?.card ?? j;
  console.log('kind:', card?.kind, 'options.len:', card?.options?.length, 'vocab.len:', card?.vocab?.length);
});
```

**預期輸出：**
```
RAW: { subject: "english", explanation: { card: {...} }, ... }
kind: E1 options.len: 4 vocab.len: 5
```

**如果看到 `kind: FALLBACK options.len: 0 vocab.len: 0`：**
- 你的瀏覽器可能連到舊的 port/server
- 檢查 URL 是 localhost:3000 還是 3001

### Step 2: 清除瀏覽器緩存

1. **Chrome DevTools** → **Application** tab
2. **Service Workers** → 勾選 "Bypass for network"
3. **Storage** → "Clear site data"（全選）
4. 關閉分頁，重新打開
5. **硬刷新**: `Cmd + Shift + R` (Mac) 或 `Ctrl + Shift + R` (Windows)

### Step 3: 在 UI 提交題目

輸入：
```
There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden
```

**檢查 Console Logs（預期輸出）：**

```
[AnySubjectSolver] request.start { reqId: '...', question: 'There are reports...' }
[AnySubjectSolver] RAW API Response: { hasExplanation: true, hasCard: true, ... }
[AnySubjectSolver] ✅ Card normalized: {
  status: "kind:E1 options:4 vocab:5 has_translation cues:3",
  raw_kind: "E1",
  raw_options: 4,
  normalized_kind: "E1",
  normalized_options: 4
}
✅ Subject detection validated: english
[ExplainCard] render {
  hasCard: true,
  kind: "E1",
  hasOptions: true,
  hasVocab: true,
  optionsCount: 4,
  vocabCount: 5,
  hasTranslation: true,
  hasCues: true
}
✅ Solve preview updated
```

**UI 應該顯示：**

### 🌐 題幹翻譯
有報導指出有多人在恐怖襲擊中受傷。

---

### 🧩 解題線索
- 恐怖主題
- 受傷
- 事件類型

---

### 📋 選項分析
- ❌ **(A) access** (進入) — 與恐怖事件無關
- ❌ **(B) supply** (供應) — 與恐怖事件無關
- ✅ **(C) attack** (襲擊) — 符合題意
- ❌ **(D) burden** (負擔) — 與恐怖事件無關

---

### 💡 學習要點
...

---

## 如果仍然看到 FALLBACK

### 檢查 Port（最常見問題）

```bash
# 檢查哪些 port 在運行
lsof -i :3000
lsof -i :3001

# 你的瀏覽器可能連到錯的 port！
```

### 檢查 Service Worker

```javascript
// 在 Console 執行
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('SW count:', registrations.length);
  registrations.forEach(r => r.unregister());
  console.log('All SW unregistered');
});
```

### 檢查 API Endpoint

```javascript
// 確認前端打的 URL
// 在提交時，Console 應該顯示：
[AnySubjectSolver] request.start { reqId: '...', question: '...' }

// 然後在 Network tab 檢查：
// POST /api/ai/route-solver
// 檢查 Response 的 JSON
```

---

## 技術原理

### 為什麼需要 Normalizer？

**問題：** API 和前端之間有 "impedance mismatch"

| 後端可能返回 | 前端期望 | Normalizer 處理 |
|------------|---------|----------------|
| `explanation.card` | `card` | ✅ 兩者都支援 |
| `options` | `choices` | ✅ 統一為 `options` |
| `vocab` | `vocabulary` | ✅ 統一為 `vocab` |
| `kind: undefined` | `kind: 'FALLBACK'` | ✅ 提供默認值 |
| `options: null` | `options: []` | ✅ 確保陣列 |

### Normalizer Pattern 的優勢

1. **Single Source of Truth**: 所有資料都經過同一個 normalizer
2. **Defensive Programming**: 處理各種邊界情況
3. **Debug Visibility**: 可以看到正規化前後的差異
4. **Future Proof**: 新增字段時只需修改一個地方

---

## 相關文件

- [lib/explain-normalizer.ts](apps/web/lib/explain-normalizer.ts) - Normalizer 實現
- [components/ask/AnySubjectSolver.tsx](apps/web/components/ask/AnySubjectSolver.tsx) - 使用 normalizer
- [components/solve/ExplainCard.tsx](apps/web/components/solve/ExplainCard.tsx) - 放寬渲染條件

---

## Dev Server 狀態

現在 dev server 可能在：
- http://localhost:3000 或
- http://localhost:3001

請檢查你的瀏覽器 URL！

如果需要重啟：
```bash
# 停止所有 Next.js
pkill -f "next dev"

# 清除緩存
cd apps/web
rm -rf .next

# 重啟
pnpm dev
```

---

**現在請在瀏覽器測試並告訴我 Console 顯示什麼！特別是 `[AnySubjectSolver] ✅ Card normalized` 這一行。**
