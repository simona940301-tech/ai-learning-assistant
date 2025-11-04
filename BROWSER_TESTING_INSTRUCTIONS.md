# 瀏覽器測試指南

## 問題診斷

從你的 screenshot，我看到：
```
kind: 'FALLBACK', hasOptions: 0, hasVocab: 0
translation: '此科目尚未支援詳細解析'
```

但是當我用 curl 測試同樣的題目時，API 返回了正確的 **E1 卡片**，包含：
- 完整的選項分析（4個選項，每個都有中文翻譯和理由）
- 詞彙表（5個詞）
- 解題線索
- 翻譯

這說明：
1. ✅ **後端代碼是正確的**（validators, templates, orchestrator 的修復都生效了）
2. ❌ **你的瀏覽器可能在使用舊版本的代碼**（緩存或舊的 dev server）

---

## 解決方案 1: 硬刷新瀏覽器

1. **打開 Chrome DevTools**
   - Mac: `Cmd + Option + I`
   - Windows: `F12`

2. **右鍵點擊瀏覽器刷新按鈕**
   - 選擇「清空緩存並硬性重新載入」(Empty Cache and Hard Reload)
   - 或者按 `Cmd + Shift + R` (Mac) / `Ctrl + Shift + R` (Windows)

3. **重新測試**
   ```
   題目: There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden
   ```

4. **檢查 Console**
   - 應該看到: `kind: 'E1'`（不是 FALLBACK！）
   - 應該看到: `hasOptions: 4`
   - 應該看到: `hasVocab: 5`

---

## 解決方案 2: 重啟 Dev Server

如果硬刷新沒用，重啟 dev server：

```bash
# 1. 停止所有 Next.js 進程
pkill -f "next dev"

# 2. 清除 build 緩存
cd /Users/simonac/Desktop/moonshot\ idea/apps/web
rm -rf .next

# 3. 重新啟動
pnpm dev
```

等待看到：
```
✓ Ready in 3.2s
```

然後在瀏覽器中：
1. 按 `Cmd + Shift + R` 硬刷新
2. 重新輸入測試題目

---

## 解決方案 3: 使用 curl 直接測試 API

如果你想確認 API 本身是否正確工作：

```bash
curl -X POST http://localhost:3000/api/ai/route-solver \
  -H "Content-Type: application/json" \
  -d '{"questionText": "There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden"}' \
  | jq '.explanation.card.kind, .explanation.card.options | length, .explanation.card.vocab | length'
```

**預期輸出：**
```json
"E1"
4
5
```

如果看到 `"FALLBACK"` `0` `0`，那說明 API 有問題。
如果看到 `"E1"` `4` `5`，那說明 API 正確，問題在瀏覽器緩存。

---

## 預期的正確行為

當你提交英文題目後，Console 應該顯示：

```
[AnySubjectSolver] request.start { reqId: '...', question: 'There are reports...' }
✅ Subject detection validated: english
[AnySubjectSolver] response.accepted { kind: 'E1', hasCard: true, ... }
[ExplainCard] render { hasCard: true, kind: 'E1', hasOptions: 4, hasVocab: 5 }
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
- ❌ **(A) access** (進入) — 與恐怖事件無關，無法描述事件的性質。
- ❌ **(B) supply** (供應) — 與恐怖事件無關，無法描述事件的性質。
- ✅ **(C) attack** (襲擊) — 直接描述了一個恐怖事件的性質，符合題意。
- ❌ **(D) burden** (負擔) — 與恐怖事件無關，無法描述事件的性質。

---

### 💡 學習要點
這題的關鍵在於語意搭配。記住 **attack** 的用法，它通常用於直接描述了一個恐怖事件的性質，符合題幹的語境。

---

**📚 重點詞彙** (可展開)

---

## 如果問題仍然存在

如果按照以上步驟仍然看到 FALLBACK，請提供：

1. **Chrome DevTools Console 的完整截圖**
   - 包含所有 `[AnySubjectSolver]` 和 `[ExplainCard]` logs

2. **Network tab 的截圖**
   - 找到 `/api/ai/route-solver` 請求
   - 查看 Response tab 中的 JSON
   - 確認 `explanation.card.kind` 是什麼

3. **運行這個測試**
   ```bash
   curl -s -X POST http://localhost:3000/api/ai/route-solver \
     -H "Content-Type: application/json" \
     -d '{"questionText": "There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden"}' \
     | grep -o '"kind":"[^"]*"'
   ```

   告訴我輸出是什麼。

---

## 技術細節

這次修復涉及三個核心變更：

1. **[validators.ts](apps/web/lib/english/validators.ts)** - 放寬驗證規則
   - 只要有 `correct` 和 `translation` 就允許通過
   - 只有 critical issues 才觸發 fallback

2. **[templates.ts](apps/web/lib/english/templates.ts)** - 確保完整輸出
   - 更明確的 LLM prompt
   - 防禦性的默認值處理

3. **[index.ts](apps/web/lib/english/index.ts)** - 調整 fallback 條件
   - 只有 critical validation failures 才 fallback
   - Partial cards 可以繼續渲染

這些變更確保即使 LLM 輸出不完美，我們也能生成可用的 E1 卡片，而不是直接 fallback 到「此科目尚未支援詳細解析」。

---

**我的 curl 測試已經確認 API 返回正確的 E1 卡片。現在需要確保你的瀏覽器也使用最新的代碼。請按照上面的步驟操作！**
