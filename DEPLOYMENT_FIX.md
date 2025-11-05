# 🚨 部署錯誤修正與預防措施

## ❌ 問題分析

**錯誤訊息：**
```
Module not found: Can't resolve '../TranslationExplain'
Import trace for requested module:
./components/solve/ExplainCardV2.tsx
./components/ask/AnySubjectSolver.tsx
./app/(app)/ask/page.tsx
./components/solve/explain/QuestionSetExplain.tsx
```

**根本原因：**
- `QuestionSetExplain.tsx` 位於 `apps/web/components/solve/explain/`
- 使用 `../TranslationExplain` 會嘗試從 `apps/web/components/solve/TranslationExplain` 導入
- 但實際文件在 `apps/web/components/solve/explain/TranslationExplain.tsx`
- 相對路徑 `../` 向上移動一層，導致路徑錯誤

## ✅ 修正方案

### 已修正的文件

1. **QuestionSetExplain.tsx**
   ```typescript
   // ❌ 修正前
   import { VocabularyExplain } from '../VocabularyExplain'
   import { TranslationExplain } from '../TranslationExplain'
   
   // ✅ 修正後
   import { VocabularyExplain } from '@/components/solve/explain/VocabularyExplain'
   import { TranslationExplain } from '@/components/solve/explain/TranslationExplain'
   ```

### 關鍵原則

**當文件位於 `explain/` 子目錄時：**
- ❌ 不要使用 `../` 嘗試導入同目錄的其他文件
- ✅ 使用 `@/components/solve/explain/...` 絕對路徑

**從子目錄導入父目錄的文件：**
- ⚠️ `../` 可以用，但建議統一使用絕對路徑
- ✅ 統一使用 `@/components/solve/...` 絕對路徑

## 🛡️ 預防措施

### 1. 建立規範文件
- ✅ 已建立 `IMPORT_PATH_RULES.md`
- ✅ 定義統一的導入路徑規範

### 2. 代碼審查檢查清單
提交 PR 前檢查：
- [ ] 所有組件導入使用 `@/components/...` 絕對路徑
- [ ] 所有庫文件導入使用 `@/lib/...` 絕對路徑
- [ ] `explain/` 目錄內的文件不使用 `../` 導入同目錄文件
- [ ] 沒有跨目錄的相對路徑導入組件

### 3. 本地測試
```bash
# 構建測試（模擬 Vercel 環境）
cd apps/web
pnpm build

# 如果構建成功，部署應該也會成功
```

### 4. 部署前驗證
```bash
# 檢查是否有相對路徑導入
grep -r "from '\.\./" apps/web/components/solve/explain --include="*.tsx" --include="*.ts"

# 應該只看到從子目錄導入父目錄的情況（如 Typewriter, ExtendedVocab）
# 不應該看到導入同目錄文件的相對路徑
```

## 📋 修正記錄

- **2024-01-XX**: 修正 `QuestionSetExplain.tsx` 的 import 路徑錯誤
- **2024-01-XX**: 建立 `IMPORT_PATH_RULES.md` 規範文件

## 🎯 未來避免重複錯誤

1. **新增文件時**：使用絕對路徑 `@/components/...`
2. **重構時**：檢查所有相對路徑導入
3. **部署前**：運行 `pnpm build` 確保構建成功
4. **代碼審查**：檢查 import 路徑是否符合規範

## ✅ 驗證

修正後，部署應該成功：
- ✅ 構建通過
- ✅ 所有模組正確解析
- ✅ 不再出現 "Module not found" 錯誤
