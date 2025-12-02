# 🔧 Phase 2 快速修復指南

**目標**: 解決關鍵技術債，提升代碼品質到 A+ (95+)
**預估時間**: 2-3 小時
**優先級**: HIGH

---

## ✅ 已完成的準備工作

1. ✅ **類型定義文件已創建**: `apps/web/lib/types/question-sets.ts`
2. ✅ **統一錯誤處理器已創建**: `apps/web/lib/error-handler.ts`

---

## 📋 修復清單

### Task 1: 整合類型定義 (30 分鐘)

#### 1.1 更新 Store API
**檔案**: `apps/web/app/api/store/question-sets/route.ts`

```typescript
// 在檔案開頭加入
import type { StoreQuestionSetsResponse, StoreQueryParams } from '@/lib/types/question-sets'

// 更新返回類型
export async function GET(req: NextRequest): Promise<NextResponse<StoreQuestionSetsResponse>> {
    // ... existing code

    return NextResponse.json({
        sets: setsWithDownloadStatus || [],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
        limit
    })
}
```

#### 1.2 更新 Download API
**檔案**: `apps/web/app/api/store/question-sets/download/route.ts`

```typescript
import type { DownloadQuestionSetRequest, DownloadQuestionSetResponse } from '@/lib/types/question-sets'

export async function POST(req: NextRequest): Promise<NextResponse<DownloadQuestionSetResponse>> {
    const body: DownloadQuestionSetRequest = await req.json()
    // ... existing code
}
```

#### 1.3 更新 User Sets API
**檔案**: `apps/web/app/api/user/question-sets/route.ts`

```typescript
import type { UserQuestionSetsResponse } from '@/lib/types/question-sets'

export async function GET(req: NextRequest): Promise<NextResponse<UserQuestionSetsResponse>> {
    // ... existing code
}
```

#### 1.4 更新 Store UI
**檔案**: `apps/web/app/(app)/store/page.tsx`

```typescript
import type { QuestionSetWithDownloadStatus, StoreQueryParams } from '@/lib/types/question-sets'
import { formatPrice } from '@/lib/types/question-sets'

export default function StorePage() {
  const [sets, setSets] = useState<QuestionSetWithDownloadStatus[]>([])
  // ... rest of the code
}
```

---

### Task 2: 替換 alert() 為 Toast (30 分鐘)

#### 2.1 BackpackContent.tsx
**檔案**: `apps/web/app/(app)/backpack/BackpackContent.tsx`

**查找位置**: Line 684, 941, 946

```typescript
// ❌ 刪除
alert('建立練習室失敗，請稍後再試')

// ✅ 替換為
import { handleApiError } from '@/lib/error-handler'

handleApiError(
    error,
    'Create Practice Room',
    {
        title: '建立失敗',
        description: error instanceof Error ? error.message : '無法建立練習室，請稍後再試'
    }
)
```

**具體修改**:

```typescript
// Line 682-686: 修改錯誤處理
} catch (error) {
    console.error('Failed to create practice room:', error)
    handleApiError(error, 'Create Practice Room from Question Set', {
        title: '建立失敗',
        description: '無法建立練習室，請稍後再試'
    })
}

// Line 936-948: 修改錯誤處理
try {
    const res = await fetch('/api/play/practice/create', { ... })
    const data = await res.json()

    if (!res.ok) {
        throw new Error(data.error || '無法建立練習室')
    }

    if (data.success && data.room?.room_code) {
        router.push(`/play/practice/${data.room.room_code}`)
    }
} catch (error) {
    handleApiError(error, 'Create Practice Room from Error Book', {
        title: '建立失敗',
        description: error instanceof Error ? error.message : '連線錯誤，請檢查網路連線'
    })
    setIsCreatingPractice(false)
}
```

---

### Task 3: 添加 Loading 狀態 (30 分鐘)

#### 3.1 BackpackContent.tsx - 題本卡片
**檔案**: `apps/web/app/(app)/backpack/BackpackContent.tsx`

**Line 628-696**: 修改 "開始練習" 按鈕

```typescript
// 在 BackpackContent 組件內添加狀態
const [creatingRoomId, setCreatingRoomId] = useState<string | null>(null)

// 修改按鈕區塊
<Button
    size="sm"
    disabled={creatingRoomId === item.id}
    onClick={async () => {
        setCreatingRoomId(item.id)
        try {
            const res = await fetch('/api/play/practice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceType: 'QUESTION_SET',
                    setId: item.id
                })
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create practice room')
            }

            if (data.success && data.room?.room_code) {
                router.push(`/play/practice/${data.room.room_code}`)
            } else {
                throw new Error('Invalid response from server')
            }
        } catch (error) {
            handleApiError(error, 'Create Practice Room', {
                title: '建立失敗'
            })
            setCreatingRoomId(null) // 只在錯誤時重置，成功時會跳轉
        }
    }}
>
    {creatingRoomId === item.id ? (
        <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            建立中...
        </>
    ) : (
        '開始練習'
    )}
</Button>
```

---

### Task 4: 進度條組件 (30 分鐘)

#### 4.1 確認 Progress 組件存在
**檔案**: `apps/web/components/ui/progress.tsx`

如果不存在，創建:

```typescript
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
```

#### 4.2 整合進度條到題本卡片
**檔案**: `apps/web/app/(app)/backpack/BackpackContent.tsx`

**Line 634-649**: 在題本標題和描述之間添加進度條

```typescript
import { Progress } from '@/components/ui/progress'
import { calculateProgressPercent } from '@/lib/types/question-sets'

// 在 Card 內部
<Card className="overflow-hidden hover:shadow-md transition-shadow">
    <div className="p-4">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                </p>

                {/* 新增: 進度視覺化 */}
                {item.progress_data && item.practice_count > 0 && (
                    <div className="mt-3 space-y-1">
                        <Progress
                            value={calculateProgressPercent(item.progress_data)}
                            className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                                已練習: {item.progress_data.completed}/{item.progress_data.total}
                            </span>
                            <span>
                                正確率: {Math.round(item.progress_data.correct_rate * 100)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* 練習次數 */}
                {item.practice_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                        已練習 {item.practice_count} 次
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded ml-2">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {item.rating}
            </div>
        </div>

        {/* 按鈕區域 */}
        <div className="mt-4 flex items-center justify-between">
            {/* ... existing code ... */}
        </div>
    </div>
</Card>
```

---

## 🧪 測試檢查清單

完成修復後，執行以下測試:

### 類型檢查
```bash
cd apps/web
npx tsc --noEmit
```
✅ 應無 TypeScript 錯誤

### 功能測試

#### Store 頁面
- [ ] 載入題本列表正常
- [ ] 科目篩選功能正常
- [ ] 下載按鈕顯示正確狀態 (下載中/已下載)
- [ ] 下載成功顯示 Toast (不是 alert)
- [ ] 下載失敗顯示錯誤 Toast

#### Backpack 題本 Tab
- [ ] 已下載題本列表顯示正常
- [ ] 進度條正確顯示練習進度
- [ ] 練習次數和正確率正確顯示
- [ ] "開始練習" 按鈕點擊時顯示 "建立中..."
- [ ] 建立成功跳轉到練習室
- [ ] 建立失敗顯示錯誤 Toast (不是 alert)

#### 錯題本練習
- [ ] "練習錯題" 按鈕功能正常
- [ ] Modal 顯示錯題列表
- [ ] 建立練習室時顯示 Loading 狀態
- [ ] 錯誤處理使用 Toast (不是 alert)

---

## 📊 修復前後對比

### Before (A-, 90/100)
```typescript
// ❌ 無類型定義
const [sets, setSets] = useState<any[]>([])

// ❌ 使用 alert()
alert('建立練習室失敗')

// ❌ 無 Loading 狀態
<Button onClick={handleCreate}>開始練習</Button>

// ❌ 無進度顯示
<h3>{item.title}</h3>
```

### After (A+, 95/100)
```typescript
// ✅ 完整類型定義
const [sets, setSets] = useState<QuestionSetWithDownloadStatus[]>([])

// ✅ 統一錯誤處理
handleApiError(error, 'Context', { title: '建立失敗' })

// ✅ Loading 狀態
<Button disabled={isCreating}>
    {isCreating ? '建立中...' : '開始練習'}
</Button>

// ✅ 進度視覺化
<Progress value={calculateProgressPercent(item.progress_data)} />
```

---

## 🚀 執行步驟

### Step 1: 安裝依賴 (如需要)
```bash
cd apps/web
pnpm add @radix-ui/react-progress  # 如果 Progress 組件不存在
```

### Step 2: 應用修復
```bash
# 按照 Task 1-4 的順序逐一修改檔案
# 建議使用 Git 提交每個 Task，方便回滾

git add apps/web/lib/types/question-sets.ts
git commit -m "feat: add question sets type definitions"

git add apps/web/lib/error-handler.ts
git commit -m "feat: add unified error handler"

# ... 依此類推
```

### Step 3: 測試
```bash
# 類型檢查
cd apps/web && npx tsc --noEmit

# 啟動開發伺服器
cd /Users/simonac/Desktop/moonshot-idea
PORT=3000 pnpm --filter web dev

# 手動測試所有功能點
```

### Step 4: 提交
```bash
git add .
git commit -m "fix: apply Phase 2 quick fixes - improve type safety and error handling"
```

---

## 📝 額外改進 (Optional, +1 小時)

如果時間充裕，可以進一步優化:

### 1. 搜尋優化
```typescript
// store/question-sets/route.ts
// 使用全文搜索索引
if (search) {
    query = query.textSearch('fts', search, {
        type: 'websearch',
        config: 'simple'
    })
}
```

### 2. API 快取
```typescript
// store/question-sets/route.ts
export const revalidate = 300 // 5 分鐘快取
```

### 3. 骨架屏
```typescript
// components/ui/question-set-skeleton.tsx
export function QuestionSetSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className="h-32 bg-muted rounded-lg" />
                </div>
            ))}
        </div>
    )
}
```

---

## ✅ 完成標準

修復完成後，應滿足:

1. ✅ 無 TypeScript 錯誤
2. ✅ 無 `alert()` 使用
3. ✅ 所有異步操作有 Loading 狀態
4. ✅ 進度條正確顯示
5. ✅ 所有測試檢查清單通過

**預期評分**: A+ (95/100) 🎉

---

**開始修復**: 從 Task 1 開始，逐步執行 ✨
**預估完成時間**: 2-3 小時
**建議**: 每完成一個 Task 就提交一次 Git，方便追蹤和回滾
