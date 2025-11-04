# 🚀 快速驗證指南 - ExplainCard 修復

## 30 秒快速測試

### 1. 運行自動化測試
```bash
cd apps/web
npx tsx scripts/test-explain-card-fix.ts
```

**預期輸出**: `🎉 ALL TESTS PASSED!`

---

### 2. 瀏覽器測試（2 分鐘）

#### A. 打開頁面
```bash
# 確認 dev server 運行中
open http://localhost:3000/ask
```

#### B. 打開 DevTools Console
快捷鍵: `Cmd + Option + J` (Mac) 或 `F12` (Windows)

#### C. 貼上測試題目
```
There are reports coming in that a number of people have been injured in a terrorist ____.
(A) access (B) supply (C) attack (D) burden
```

#### D. 觀察 Console（應該看到）
```javascript
✅ [route-solver] Using English explanation pipeline...
✅ [explain_pipeline] type=E1 conf=0.8
✅ [explain_pipeline] card.accepted=true kind=E1 options=4 vocab=5
✅ [AnySubjectSolver] Card received: { kind:E1, ... }
✅ [ExplainCard] Rendering card kind: E1
✅ Solve preview updated

// ❌ 不應該看到：
❌ "card is null/undefined"
❌ "MCQ options detected — blocking render"
❌ "onChange is not a function"
```

#### E. 檢查 UI
- [ ] Tabs 出現：`詳解 (藍色)` | `相似題 (灰色)`
- [ ] **沒有**「重點」tab
- [ ] ExplainCard 顯示：
  - [ ] 🌐 題幹翻譯
  - [ ] 💡 解題線索
  - [ ] 📋 選項分析（A/B/C/D 帶 ✓/✗）
  - [ ] ✅ 正確答案: (C) attack
  - [ ] 📚 重點詞彙（可展開）

#### F. 切換 Tabs
點擊「相似題」→ 點回「詳解」
- [ ] 切換流暢，無錯誤
- [ ] ExplainCard 保持顯示

---

## ✅ 驗收清單

### Console 日誌
- [ ] 看到 `[explain_pipeline] card.accepted=true`
- [ ] 看到 `[ExplainCard] Rendering card kind: E1`
- [ ] **沒有** "card is null/undefined" 錯誤
- [ ] **沒有** "MCQ options detected" 錯誤
- [ ] **沒有** "onChange is not a function" 錯誤

### UI 顯示
- [ ] Tabs 只在卡片出現後顯示
- [ ] Tabs 只有「詳解」和「相似題」（無「重點」）
- [ ] ExplainCard 正常渲染，有選項分析
- [ ] 沒有空白或重複內容

### 功能測試
- [ ] 可以切換 Tabs
- [ ] 重複提交同一題目，仍正常顯示
- [ ] Loading skeleton 只出現一次

---

## 🐛 如果出現問題

### 問題 1: 自動化測試失敗
```bash
# 檢查 dev server 是否運行
lsof -ti:3000

# 如果沒有，啟動它
cd apps/web
npm run dev
```

### 問題 2: Console 仍看到 legacy 錯誤
```bash
# 清除快取並重啟
rm -rf apps/web/.next
cd apps/web
npm run dev
```

### 問題 3: UI 沒有 Tabs
- 檢查 Console: 是否有 `[AnySubjectSolver] Card received`?
- 如果沒有 → API 問題
- 如果有但 UI 無 → 前端渲染問題

### 問題 4: TypeScript 錯誤
```bash
# 運行 type check
npx tsc --noEmit

# 忽略 scripts/*.ts 的錯誤（不影響運行）
```

---

## 📞 回報格式

如果發現問題，請提供：

1. **Console 截圖**（完整日誌）
2. **UI 截圖**（顯示當前狀態）
3. **測試題目**
4. **預期行為 vs 實際行為**

範例：
```
❌ 問題: ExplainCard 不顯示

Console:
  [AnySubjectSolver] Card received: { kind:E1, ... }
  [ExplainCard] Render called: { hasCard:true, ... }
  [ExplainCard] Rendering card kind: E1

UI:
  - Tabs 有顯示
  - 但下方只有 loading skeleton

預期: 應該顯示 ExplainCard 內容
```

---

**驗證完成後**，請在 Slack/Discord 報告：
```
✅ ExplainCard 修復驗證通過
- 自動化測試: PASS
- 瀏覽器測試: PASS
- Console: 無錯誤
- UI: 正常顯示
```

或如有問題：
```
⚠️ ExplainCard 驗證發現問題
- 問題: [簡述]
- 截圖: [附上]
```
