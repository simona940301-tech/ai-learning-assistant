# E4 Reading - Troubleshooting Guide

## 症狀：頁面一直顯示 "正在彙整詳解字義..." 無法載入

### 可能原因與解決方案

#### 1. 檢查 API 請求狀態

**在瀏覽器 DevTools > Network 標籤檢查：**

- 是否有失敗的請求（紅色）
- 是否有請求一直 pending（灰色）
- 檢查 `/api/tutor/answer` 或類似的 API endpoint

**如果請求 pending：**
```bash
# 重啟開發服務器
pkill -f "next dev"
pnpm dev:web
```

#### 2. 檢查 React Console 錯誤

**在瀏覽器 DevTools > Console 標籤檢查：**

- 是否有紅色錯誤訊息
- 是否有 hydration errors
- 是否有 import/export errors

**常見錯誤：**

**錯誤 A: Cannot find module '@/data/enDictLite.json'**
```bash
# 檢查文件是否存在
ls -la apps/web/data/enDictLite.json

# 如果不存在，字典檔案可能沒有正確創建
# 臨時解決：註解掉字典相關代碼
```

**錯誤 B: TypeError in ReadingPassage**
```typescript
// 在 apps/web/components/solve/explain/ReadingExplain.tsx
// 暫時使用簡化版本
import { ReadingPassageSimple as ReadingPassage } from './ReadingPassage.simple'
```

#### 3. 臨時回退到原始版本

如果新版本有問題，可以暫時回退：

**A. 回退 ReadingExplain.tsx**

```typescript
// 在 apps/web/components/solve/explain/ReadingExplain.tsx
// 註解掉新的 ReadingPassage，使用舊的渲染方式

// Old way (uncomment if needed):
/*
<div className="space-y-3 pr-2">
  {paragraphs.map((para, idx) => (
    <p key={idx} className="text-sm">{para}</p>
  ))}
</div>
*/

// New way (comment out if causing issues):
// <ReadingPassage ... />
```

**B. 回退 explain-presenter.ts dictionary**

```typescript
// 在 apps/web/lib/mapper/explain-presenter.ts
// 如果字典載入有問題，可以暫時移除

function enrichVocab(items) {
  return items.map((item) => ({
    word: sanitizeText(item.word) || '-',
    pos: normalizePos(item.pos) || '-',  // 移除 dictEntry
    zh: sanitizeText(item.zh) || '-',    // 移除 dictEntry
    example: sanitizeText(item.note) || undefined,
  }))
}
```

#### 4. 清除 Next.js 快取

```bash
cd /Users/simonac/Desktop/moonshot\ idea

# 停止服務器
pkill -f "next dev"

# 清除 .next 快取
rm -rf apps/web/.next

# 重新啟動
pnpm dev:web
```

#### 5. 檢查特定的錯誤

**在 Console 中查找這些錯誤：**

```javascript
// Error 1: Maximum update depth exceeded
// 原因：useState 或 useEffect 造成無限循環
// 解決：檢查 ReadingPassage 的 useMemo dependencies

// Error 2: Cannot read property 'paragraphs' of undefined
// 原因：view.passage 可能是 undefined
// 解決：已有 ?? EMPTY_PARAGRAPHS fallback

// Error 3: Hydration error
// 原因：Server/Client 渲染不一致
// 解決：確保 className 沒有動態值在初始渲染時改變
```

#### 6. 快速診斷腳本

```bash
# 運行診斷
cd /Users/simonac/Desktop/moonshot\ idea

# 測試 parser
npx tsx scripts/test-reading-parser.ts

# 測試 presenter
npx tsx scripts/test-explain-presenter.ts

# 檢查編譯錯誤
cd apps/web && npx tsc --noEmit | grep -E "(ReadingPassage|ReadingExplain|explain-presenter)"
```

### 最簡單的修復方案

**如果以上都不行，使用這個最小化版本：**

1. **使用簡化的 ReadingPassage：**

```bash
# 編輯 ReadingExplain.tsx，改用簡化版
# Line 7: import { ReadingPassageSimple as ReadingPassage } from './ReadingPassage.simple'
```

2. **移除字典功能：**

```bash
# 如果字典有問題，暫時不用
# 在 explain-presenter.ts 中，lookupWord 永遠返回 {}
```

3. **重啟服務器：**

```bash
pkill -f "next dev"
pnpm dev:web
```

### 檢查清單

- [ ] Network tab: 沒有 failed requests
- [ ] Network tab: 沒有 pending requests
- [ ] Console: 沒有紅色錯誤
- [ ] Console: 沒有 React warnings
- [ ] Parser tests: 11/11 passing
- [ ] Dev server: 正常運行在 port 3000
- [ ] 頁面: 可以看到 passage 和 questions

### 成功標誌

當修復成功時，你應該看到：

```
✅ Passage 顯示（有左側細線）
✅ Questions 顯示（Q1, Q2...）
✅ 沒有 console errors
✅ Dev banner: kind=E4 • questions=N
```

### 需要更多幫助？

如果問題持續：

1. 截圖 Console 的完整錯誤訊息
2. 截圖 Network tab 的請求狀態
3. 分享具體的錯誤堆棧
4. 檢查是否是 API endpoint 的問題（不是前端問題）

---

**快速回復指令：**

```bash
# 完全回退到原始版本
git stash

# 只保留 parser 修復
git stash
git checkout apps/web/lib/english/reading-parser.ts
```
