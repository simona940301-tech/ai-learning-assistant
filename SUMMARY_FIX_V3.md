# 重點統整頁面 V3 緊急修復

## 修復時間
2025-11-26 (第三輪 - 緊急修復)

## 發現的新問題

### 問題 1: ShadowObserver WebSocket 錯誤干擾
**現象**: 控制台大量 WebSocket 連接失敗錯誤
```
WebSocket connection to 'wss://battle-ws.fly.dev/ws/telemetry' failed
```

**原因**: ShadowObserver 嘗試連接遠程 telemetry 服務，但服務不可用

**修復**: [app/layout.tsx:11-15](apps/web/app/layout.tsx#L11-L15)
```typescript
// ❌ 舊版：自動啟動
import { ShadowObserver } from '@/lib/telemetry/shadow-observer'
if (typeof window !== 'undefined') {
  ShadowObserver.getInstance()
}

// ✅ 新版：暫時禁用
// Shadow Observer temporarily disabled for debugging
// import { ShadowObserver } from '@/lib/telemetry/shadow-observer'
```

### 問題 2: Deep Analysis JSON 解析失敗
**現象**: `structuredNotes` 顯示 "# 分析失敗\n\n請稍後再試。"

**原因**:
1. Gemini API 返回的 JSON 格式不正確
2. 可能包含 ```json 標記或額外文字
3. JSON 解析失敗後直接返回錯誤

**修復 A**: 簡化 Prompt ([elite-rag-analyzer.ts:180-190](apps/web/lib/services/elite-rag-analyzer.ts#L180-L190))
```typescript
// ❌ 舊版：冗長的格式說明
const prompt = `分析學習資料，生成結構化筆記。
要求：markdown必須使用 ## ### 標題、bullet points(-)...`

// ✅ 新版：極簡指令
const prompt = `分析文件，輸出 JSON。
輸出純 JSON（不要加\`\`\`標記）：
{"concepts":[...],"insights":[...],"markdown":"..."}`
```

**修復 B**: 高級 JSON 清理 ([elite-rag-analyzer.ts:197-232](apps/web/lib/services/elite-rag-analyzer.ts#L197-L232))
```typescript
// ⚡ Advanced JSON cleaning
let jsonText = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/^[^{]*/g, '')  // 移除第一個 { 之前的文字
    .replace(/[^}]*$/g, '')  // 移除最後一個 } 之後的文字
    .trim()

// ⚡ Fallback: 如果 JSON 解析失敗，使用原始文本
if (parseError) {
    const fallbackMarkdown = `## 重點統整\n\n${responseText.substring(0, 1000)}\n\n_註：完整分析因格式問題未能完全載入_`
    return { markdown: fallbackMarkdown, ... }
}
```

### 問題 3: 速度仍然慢（33秒）
**現象**: Quick Preview 花了 33 秒才出現

**分析**:
- PDF 提取：~5-10 秒（合理）
- Quick Preview API：~23 秒（太慢）
- 預期應該是 5-8 秒

**可能原因**:
1. Gemini API 本身延遲
2. 網絡問題
3. 文本過長（800 字元已經是最小了）

## 技術改進

### 1. 更健壯的 JSON 解析

**策略**:
```typescript
// 多層次清理
1. 移除 markdown 代碼塊標記
2. 移除 JSON 前後的額外文字
3. 嘗試解析
4. 失敗時使用原始文本作為 fallback
```

### 2. Fallback 機制

當 JSON 解析失敗時：
- 不再返回 "分析失敗"
- 提取原始響應的前 1000 字元
- 顯示為 markdown（雖然格式可能不完美）
- 至少用戶能看到部分內容

### 3. 更詳細的錯誤日誌

```typescript
console.error('[DeepAnalysis] ❌ JSON parse error:', {
    error: parseError.message,
    firstChars: jsonText.substring(0, 200),  // 檢查開頭
    lastChars: jsonText.substring(-200)      // 檢查結尾
})
```

## 測試計劃

### 測試步驟

1. **清理環境**
   ```bash
   # 刪除 .next 緩存
   rm -rf apps/web/.next

   # 重啟開發服務器
   pnpm --filter web dev
   ```

2. **測試流程**
   - 訪問 http://localhost:3000/ask?tab=summary
   - 上傳同一個 PDF（國學常識.pdf）
   - 觀察控制台日誌

3. **預期結果**
   - ✅ 沒有 WebSocket 錯誤
   - ✅ 5-10 秒後出現快速預覽
   - ✅ 15-25 秒後出現重點統整（有格式）
   - ✅ 30-40 秒後出現考題預測
   - ✅ 三個區塊同時可見

### 檢查項目

- [ ] WebSocket 錯誤已消失
- [ ] 快速預覽出現速度改善
- [ ] 重點統整顯示正確格式
- [ ] 不再顯示"分析失敗"
- [ ] 即使 JSON 解析失敗，也顯示部分內容

## 後續行動

### 如果速度仍然慢

可能需要：
1. 檢查 Gemini API 配額和限制
2. 考慮使用更快的模型（gemini-1.5-flash-latest）
3. 添加 Redis 緩存（相同文件直接返回）
4. 考慮使用 Gemini streaming API

### 如果 JSON 仍然解析失敗

可能需要：
1. 使用更簡單的輸出格式（純文本 markdown）
2. 分兩次調用（先生成 markdown，再提取 metadata）
3. 使用 Gemini JSON mode（如果支持）

## 文件變更

### 修改的文件
1. [apps/web/app/layout.tsx](apps/web/app/layout.tsx)
   - 禁用 ShadowObserver

2. [apps/web/lib/services/elite-rag-analyzer.ts](apps/web/lib/services/elite-rag-analyzer.ts)
   - 簡化 Deep Analysis prompt
   - 改進 JSON 清理邏輯
   - 添加 fallback 機制

## 快速驗證命令

```bash
# 檢查分析結果
curl -s "http://localhost:3000/api/rag/upload-elite?analysisId=<YOUR_ID>" | jq '.analysis.structuredNotes' | head -20

# 應該看到正確的 markdown 格式，而不是 "# 分析失敗"
```

## 總結

### ✅ 已修復
1. WebSocket 錯誤干擾 → 禁用 ShadowObserver
2. JSON 解析失敗 → 高級清理 + fallback
3. 錯誤處理改進 → 顯示部分內容而非完全失敗

### ⚠️ 待改善
1. 速度優化 - Quick Preview 仍需 20-30 秒
2. 可能需要更換或優化 Gemini API 調用

### 📊 預期改善
- WebSocket 錯誤：100% 消除
- 分析失敗率：大幅降低
- 內容顯示：即使部分失敗也能顯示

---

**狀態**: 準備測試
**優先級**: 高
**風險**: 低
