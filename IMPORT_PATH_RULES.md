# 📋 Import 路徑規範（防止部署錯誤）

## ❌ 問題根源

**問題：** 使用相對路徑 `../` 導入組件時，在不同目錄結構下可能解析失敗。

**案例：**
- `QuestionSetExplain.tsx` 位於 `apps/web/components/solve/explain/`
- 錯誤寫法：`import { VocabularyExplain } from '../VocabularyExplain'`
- 這會嘗試從 `apps/web/components/solve/VocabularyExplain` 導入（不存在）
- 實際文件在：`apps/web/components/solve/explain/VocabularyExplain.tsx`

## ✅ 解決方案：統一使用絕對路徑

### 規則 1：組件導入統一使用 `@/` 別名

**正確範例：**
```typescript
// ✅ 正確：使用絕對路徑
import { VocabularyExplain } from '@/components/solve/explain/VocabularyExplain'
import { GrammarExplain } from '@/components/solve/explain/GrammarExplain'
import { TranslationExplain } from '@/components/solve/explain/TranslationExplain'

// ❌ 錯誤：使用相對路徑
import { VocabularyExplain } from '../VocabularyExplain'
import { GrammarExplain } from './GrammarExplain'
```

### 規則 2：庫文件導入統一使用 `@/lib/` 別名

**正確範例：**
```typescript
// ✅ 正確：使用絕對路徑
import { toCanonicalKind } from '@/lib/explain/kind-alias'
import { toQuestionSetVM } from '@/lib/mapper/explain-presenter'
import type { QuestionSetVM } from '@/lib/mapper/vm/question-set'

// ❌ 錯誤：使用相對路徑
import { toCanonicalKind } from '../../lib/explain/kind-alias'
```

### 規則 3：UI 組件導入統一使用 `@/components/ui/` 別名

**正確範例：**
```typescript
// ✅ 正確：使用絕對路徑
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ❌ 錯誤：使用相對路徑
import { Card } from '../../../components/ui/card'
```

## 📝 例外情況

### 允許相對路徑的情況

1. **同目錄內的私有工具函數**
   ```typescript
   // 同一個文件夾內的工具函數
   import { helperFunction } from './utils'
   ```

2. **類型定義文件**
   ```typescript
   // 同目錄的類型定義
   import type { LocalType } from './types'
   ```

3. **從子目錄導入父目錄的文件（需謹慎）**
   ```typescript
   // 從 explain/ 導入父目錄 solve/ 的文件
   // ⚠️ 可用但建議改為絕對路徑
   import Typewriter from '../Typewriter'  // 當前可用
   import { ExtendedVocab } from '../ExtendedVocab'  // 當前可用
   
   // ✅ 建議改為絕對路徑（更安全）
   import Typewriter from '@/components/solve/Typewriter'
   import { ExtendedVocab } from '@/components/solve/ExtendedVocab'
   ```

   **注意：** 從子目錄導入父目錄雖然可行，但建議統一使用絕對路徑以避免未來重構時的問題。

## 🔍 檢查清單

在提交代碼前，請檢查：

- [ ] 所有組件導入使用 `@/components/...` 絕對路徑
- [ ] 所有庫文件導入使用 `@/lib/...` 絕對路徑
- [ ] 所有 UI 組件導入使用 `@/components/ui/...` 絕對路徑
- [ ] 沒有使用 `../` 跨目錄導入組件
- [ ] 沒有使用 `../../` 跨多層目錄導入組件

## 🛠️ 自動檢查腳本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "check-imports": "grep -r \"from '\\.\\./\" apps/web/components --include=\"*.tsx\" --include=\"*.ts\" | grep -v node_modules || echo '✅ No relative imports found'"
  }
}
```

## 📚 參考範例

**ExplainCardV2.tsx（正確範例）：**
```typescript
import { VocabularyExplain } from './explain/VocabularyExplain'  // ✅ 從父目錄導入
import { TranslationExplain } from './explain/TranslationExplain'
```

**QuestionSetExplain.tsx（正確範例）：**
```typescript
import { VocabularyExplain } from '@/components/solve/explain/VocabularyExplain'  // ✅ 使用絕對路徑
import { TranslationExplain } from '@/components/solve/explain/TranslationExplain'
```

## 🎯 關鍵原則

**當文件位於 `explain/` 子目錄時：**
- ❌ 不要使用 `../` 回到父目錄
- ✅ 使用 `@/components/solve/explain/...` 絕對路徑

**這樣可以確保：**
- ✅ 在不同環境下都能正確解析
- ✅ 重構目錄結構時不需要修改導入
- ✅ 避免部署時的路徑解析錯誤

