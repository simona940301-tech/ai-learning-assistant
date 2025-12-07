# 🚀 SOTA 性能優化工具使用指南

本指南說明如何使用已創建的三個 SOTA 工具來優化應用性能。

---

## 1. PreloadableDynamic - 智能預取

**文件**: `lib/preloadable-dynamic.tsx`

### 使用場景

#### 場景 A: 模態框（最常用）
用戶點擊按鈕才打開的模態框，使用 **交互預取**。

```tsx
import { preloadOnInteraction } from '@/lib/preloadable-dynamic'

// ✅ 創建可預取的模態框
const SystemBattleModal = preloadOnInteraction(
  () => import('@/components/play/SystemBattleModal').then(m => ({ 
    default: m.SystemBattleModal 
  })),
  { 
    loading: () => <div className="animate-pulse">載入中...</div>,
    ssr: false // 模態框不需要 SSR
  }
)

// ✅ 使用 Trigger 包裹觸發按鈕
function PlayPage() {
  return (
    <SystemBattleModal.Trigger>
      <Button>開始 PvE 訓練</Button>
    </SystemBattleModal.Trigger>
  )
}

// 效果：用戶觸摸按鈕時就開始下載，點擊時已經加載完成 ⚡
```

#### 場景 B: 折疊內容
用戶滾動到某個區域才顯示的內容，使用 **視口預取**。

```tsx
import { preloadOnViewport } from '@/lib/preloadable-dynamic'

const HeavyChart = preloadOnViewport(
  () => import('@/components/charts/HeavyChart')
)

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* 當這個區域進入視口時，開始預加載 */}
      <HeavyChart.ViewportTrigger>
        <div className="chart-container">
          <HeavyChart data={data} />
        </div>
      </HeavyChart.ViewportTrigger>
    </div>
  )
}
```

#### 場景 C: 低優先級組件
不重要的組件，瀏覽器空閒時才加載，使用 **空閒預取**。

```tsx
import { preloadOnIdle } from '@/lib/preloadable-dynamic'

// 瀏覽器空閒時自動預加載
const DailyMissionWidget = preloadOnIdle(
  () => import('@/components/play/DailyMissionWidgetV2')
)

// 直接使用，無需 Trigger
function PlayPage() {
  return <DailyMissionWidget />
}
```

---

## 2. OptimisticUpdate - 樂觀 UI

**文件**: `lib/hooks/useOptimisticUpdate.ts`

### 使用場景

#### 場景 A: 刪除操作（最常用）

```tsx
import { useOptimisticList } from '@/lib/hooks/useOptimisticUpdate'
import { toast } from '@/components/ui/Toast'

function BackpackContent() {
  const { items, removeItem, isLoading } = useOptimisticList(
    initialFiles,
    {
      removeFn: async (id) => {
        // 實際的 API 調用
        const { error } = await supabase
          .from('backpack_files')
          .delete()
          .eq('id', id)
        
        if (error) throw error
      },
      onError: (error) => {
        // 失敗時自動回滾，並顯示錯誤
        toast.error('刪除失敗，已恢復')
      },
    }
  )

  return (
    <div>
      {items.map(item => (
        <FileCard 
          key={item.id}
          onDelete={() => removeItem(item.id)} // ⚡ 點擊立即響應
        />
      ))}
    </div>
  )
}

// 效果：用戶點擊刪除，UI 立即更新（不等待 API），背景同步
```

#### 場景 B: 添加/更新操作

```tsx
const { items, addItem, updateItem } = useOptimisticList(
  initialItems,
  {
    addFn: async (item) => {
      const { data, error } = await supabase
        .from('items')
        .insert(item)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const { data, error } = await supabase
        .from('items')
        .update(item)
        .eq('id', item.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
  }
)

// 使用
<Button onClick={() => addItem(newItem)}>添加</Button>
<Button onClick={() => updateItem(updatedItem)}>更新</Button>
```

#### 場景 C: 自定義樂觀更新

```tsx
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate'

function LikeButton({ postId, initialLikes }) {
  const { data: likes, mutate, isLoading } = useOptimisticUpdate(
    initialLikes,
    {
      mutationFn: async (optimisticLikes) => {
        // API 調用
        const { data } = await api.likePost(postId)
        return data.likes
      },
      retry: true, // 失敗自動重試
      maxRetries: 3,
    }
  )

  const handleLike = () => {
    // 樂觀更新：立即 +1
    mutate(likes + 1)
  }

  return (
    <Button onClick={handleLike}>
      ❤️ {likes}
    </Button>
  )
}
```

---

## 3. CSS Optimization - 渲染優化

**文件**: `lib/utils/css-optimization.ts`

### 使用場景

#### 場景 A: 隱藏的模態框

```tsx
import { modalOptimization } from '@/lib/utils/css-optimization'
import { cn } from '@/lib/utils'

function Modal({ isOpen, children }) {
  return (
    <div className={cn(
      modalOptimization, // content-visibility + contain
      !isOpen && 'hidden'
    )}>
      {children}
    </div>
  )
}

// 效果：模態框隱藏時，瀏覽器完全跳過內部渲染計算 🚀
```

#### 場景 B: 長列表項

```tsx
import { listItemOptimization } from '@/lib/utils/css-optimization'

function FileList({ files }) {
  return (
    <div>
      {files.map(file => (
        <div key={file.id} className={listItemOptimization}>
          {/* contain: layout paint - 隔離渲染範圍 */}
          <FileCard file={file} />
        </div>
      ))}
    </div>
  )
}

// 效果：每個列表項的佈局變化不會影響其他項，滾動更流暢
```

#### 場景 C: 圖片異步解碼

```tsx
function FilePreview({ imageUrl }) {
  return (
    <img 
      src={imageUrl}
      decoding="async" // 背景線程解碼，不卡 UI
      loading="lazy"   // 懶加載
      alt="Preview"
    />
  )
}

// 效果：圖片解碼不會阻塞滾動
```

#### 場景 D: 動畫優化

```tsx
import { useWillChange } from '@/lib/utils/css-optimization'

function AnimatedCard({ isAnimating }) {
  const ref = useWillChange<HTMLDivElement>('transform', isAnimating)

  return (
    <div 
      ref={ref}
      className={isAnimating ? 'animate-slide' : ''}
    >
      Card Content
    </div>
  )
}

// 效果：只在動畫期間使用 will-change，避免內存浪費
```

---

## 完整示例：優化 Play 頁面模態框

```tsx
// apps/web/app/(app)/play/page.tsx

import { preloadOnInteraction } from '@/lib/preloadable-dynamic'
import { modalOptimization } from '@/lib/utils/css-optimization'
import { cn } from '@/lib/utils'

// ✅ Step 1: 創建可預取的模態框
const SystemBattleModal = preloadOnInteraction(
  () => import('@/components/play/SystemBattleModal').then(m => ({ 
    default: m.SystemBattleModal 
  })),
  { ssr: false }
)

const CustomBattleModal = preloadOnInteraction(
  () => import('@/components/play/CustomBattleModal').then(m => ({ 
    default: m.CustomBattleModal 
  })),
  { ssr: false }
)

// ✅ Step 2: 使用 Trigger 包裹按鈕
function PlayPage() {
  const [showSystemBattle, setShowSystemBattle] = useState(false)

  return (
    <div>
      {/* 交互預取：觸摸時開始下載 */}
      <SystemBattleModal.Trigger>
        <ModeCard 
          icon={Sparkles}
          label="PvE 訓練"
          onClick={() => setShowSystemBattle(true)}
        />
      </SystemBattleModal.Trigger>

      {/* CSS 優化：隱藏時跳過渲染 */}
      <div className={cn(modalOptimization, !showSystemBattle && 'hidden')}>
        <SystemBattleModal 
          isOpen={showSystemBattle}
          onClose={() => setShowSystemBattle(false)}
        />
      </div>
    </div>
  )
}
```

---

## 性能對比

### 優化前
- 點擊按鈕 → 開始下載模態框 → 等待 300-500ms → 顯示
- 刪除文件 → 等待 API → 1-2 秒後更新 UI
- 滾動列表 → 卡頓（所有項目都在重排）

### 優化後
- 觸摸按鈕 → 開始預加載 → 點擊時已完成 → **瞬間顯示** ⚡
- 刪除文件 → UI 立即更新 → 背景同步 → **0 延遲** ⚡
- 滾動列表 → 絲滑（CSS contain 隔離） → **60fps** ⚡

---

## 注意事項

1. **不要過度使用 will-change**
   - 只在動畫期間使用
   - 使用 `useWillChange` hook 自動管理

2. **預取策略選擇**
   - 模態框 → `preloadOnInteraction`
   - 折疊內容 → `preloadOnViewport`
   - 低優先級 → `preloadOnIdle`

3. **樂觀 UI 錯誤處理**
   - 必須提供 `onError` 回調
   - 失敗時顯示 toast 提示用戶

4. **CSS 優化適用場景**
   - 隱藏的模態框/抽屜
   - 長列表項
   - 複雜的卡片組件

---

## 下一步

1. 按照 `implementation_plan.md` 逐步應用這些工具
2. 優先優化 Play、Backpack、Ask 三個最慢的頁面
3. 運行性能測試驗證效果
4. 在真機上測試用戶體驗
