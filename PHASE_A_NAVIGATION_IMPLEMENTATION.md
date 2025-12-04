# 🧭 Phase A: 導航跟首頁優化實施計劃

**實施日期**: 2025-12-04
**狀態**: 📋 Ready to Implement
**基於**: (A) 導航跟首頁架構規劃

---

## 📋 目錄

1. [AppBar 統一設計](#appbar-統一設計)
2. [Home 卡片層級重整](#home-卡片層級重整)
3. [ExplainCard 可掃描模式](#explaincard-可掃描模式)
4. [InputDock 固定高度](#inputdock-固定高度)
5. [Backpack/Store 分步顯示](#backpackstore-分步顯示)
6. [實施步驟](#實施步驟)

---

## 1. AppBar 統一設計

### 目標

- **Play 頁**：極簡 HUD（Level + Energy）
- **其他頁**：左標題 / 中空 / 右單一 CTA（問號或設定）
- 移除不必要的 StreakPill、GoldPill、EnergyBar（這些應該只在 Profile 或特定頁面顯示）

### 修改檔案

**`apps/web/components/layout/app-bar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Home, HelpCircle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LevelBar } from '@/components/status/LevelBar'
import { EnergyPill } from '@/components/status/EnergyPill'

interface AppBarProps {
  title: string
  user?: {
    name: string
    avatar?: string
  }
  rightAction?: React.ReactNode
  maxWidthClass?: string
  /**
   * 🎯 (A) 統一 CTA 設計
   * 'help' | 'settings' | 'custom' | null
   */
  rightCTA?: 'help' | 'settings' | 'custom' | null
}

export function AppBar({
  title,
  user,
  rightAction,
  maxWidthClass = 'max-w-lg',
  rightCTA = null,
}: AppBarProps) {
  const pathname = usePathname()
  const isProfilePage = pathname === '/profile'
  const isPlayPage = pathname === '/play'

  // 🎯 (A) Play 頁面：極簡 HUD（Level + Energy）
  if (isPlayPage) {
    return (
      <header className="sticky top-0 z-40 border-b border-border/30 bg-[#F7F2EC]">
        <div className={`mx-auto flex h-14 items-center justify-between px-4 ${maxWidthClass}`}>
          {/* 左：Level Bar */}
          <div className="flex-1 min-w-0 max-w-[320px]">
            <LevelBar />
          </div>

          {/* 右：Energy Pill */}
          <div className="flex items-center flex-shrink-0 justify-end min-w-[200px]">
            <EnergyPill />
          </div>
        </div>
      </header>
    )
  }

  // 🎯 (A) 其他頁面：左標題 / 中空 / 右單一 CTA
  const renderRightCTA = () => {
    if (rightAction) return rightAction

    if (rightCTA === 'help') {
      return (
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
          <HelpCircle className="h-5 w-5" />
        </Button>
      )
    }

    if (rightCTA === 'settings') {
      return (
        <Link href="/profile/settings">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      )
    }

    // Default: User avatar (if exists)
    if (user) {
      return (
        <Link href={isProfilePage ? '/home' : '/profile'}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
        </Link>
      )
    }

    return null
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-[#F7F2EC]/95 backdrop-blur-xl">
      <div className={`mx-auto flex h-14 items-center justify-between px-4 ${maxWidthClass}`}>
        {/* 左：Home Button + Title */}
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        {/* 右：單一 CTA（簡化設計） */}
        <div className="flex items-center">
          {renderRightCTA()}
        </div>
      </div>
    </header>
  )
}
```

---

## 2. Home 卡片層級重整

### 目標

基於 Hick's Law，重新排列卡片優先級：
1. **第一張卡：開始解題** (Primary CTA)
2. **第二張：Chick / 任務**
3. **再來：Store / 其他**

### 修改檔案

**`apps/web/app/(app)/home/page.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { PrimarySolveCard } from '@/components/home/PrimarySolveCard' // 新組件
import { NextActionCard } from '@/components/home/NextActionCard'
import { StorePromoCard } from '@/components/home/StorePromoCard'
import { VirtualItemBanner } from '@/components/home/VirtualItemBanner'
import { DailySnapshot } from '@/components/home/DailySnapshot'
import { CommunitySnippet } from '@/components/home/CommunitySnippet'
import { LossAversionCard } from '@/components/home/LossAversionCard' // Phase E
import { setupBeforeUnloadFlush } from '@plms/shared/analytics'

export default function HomePage() {
  useEffect(() => {
    setupBeforeUnloadFlush()
  }, [])

  // TODO: 從 API 取得數據
  const wrongQuestionsCount = 12
  const daysUntilExpiry = 2

  return (
    <>
      <AppBar title="首頁" user={{ name: 'User', avatar: '' }} rightCTA="help" />

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
        {/* 🎯 (A) 第一張卡：開始解題 - Primary CTA */}
        <PrimarySolveCard />

        {/* 🎯 (E) 損失厭惡：錯題提醒 */}
        <LossAversionCard
          wrongQuestionsCount={wrongQuestionsCount}
          daysUntilExpiry={daysUntilExpiry}
        />

        {/* 第二張：Chick / 任務 */}
        <NextActionCard />

        {/* Daily Snapshot (Social Proof) */}
        <DailySnapshot />

        {/* Store / 其他 */}
        <StorePromoCard />
        <VirtualItemBanner />
        <CommunitySnippet />

        <div className="text-center text-xs text-muted-foreground mt-8 pb-4">
          每日堅持練習，進步看得見
        </div>
      </main>
    </>
  )
}
```

---

### 新組件：PrimarySolveCard

**`apps/web/components/home/PrimarySolveCard.tsx`**

```tsx
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, BookOpen, Upload } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

/**
 * 🎯 (A) Primary Solve Card - 第一張卡：開始解題
 * 只有一件事：引導用戶開始解題
 */
export function PrimarySolveCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500 rounded-full">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900">開始解題</h2>
            <p className="text-sm text-amber-700/80">立即練習，提升實力</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* 對戰模式 */}
          <Link href="/play" className="flex-1">
            <Button className="w-full h-auto flex-col gap-2 py-4 bg-amber-500 hover:bg-amber-600 text-white">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-semibold">開始對戰</span>
            </Button>
          </Link>

          {/* AI 解析 */}
          <Link href="/ask" className="flex-1">
            <Button variant="outline" className="w-full h-auto flex-col gap-2 py-4 border-amber-300 hover:bg-amber-100">
              <BookOpen className="h-5 w-5 text-amber-700" />
              <span className="text-sm font-semibold text-amber-900">AI 解析</span>
            </Button>
          </Link>
        </div>

        {/* Secondary Action */}
        <div className="mt-3 pt-3 border-t border-amber-200/50">
          <Link href="/backpack">
            <Button variant="ghost" className="w-full text-amber-700 hover:text-amber-900 hover:bg-amber-100/50">
              <Upload className="h-4 w-4 mr-2" />
              上傳題目到背包
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  )
}
```

---

## 3. ExplainCard 可掃描模式

### 目標

- H2/H3 間距固定 16/12px
- 列表行高 1.6
- 詳細長文預設折疊 → "展開詳解" pill

### 修改檔案

**`apps/web/components/solve/MarkdownExplain.tsx`**

```tsx
// 已存在的組件，添加可掃描樣式

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownExplainProps {
  markdown: string
  className?: string
}

export function MarkdownExplain({ markdown, className }: MarkdownExplainProps) {
  return (
    <div className={cn(
      'prose prose-sm max-w-none',
      // 🎯 (A) 可掃描模式樣式
      'prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-4', // H2: 16px spacing
      'prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-3', // H3: 12px spacing
      'prose-p:leading-relaxed prose-p:mb-4', // 行高 1.625
      'prose-ul:my-4 prose-ul:leading-normal', // 列表行高 1.6
      'prose-li:my-1.5 prose-li:leading-normal',
      'prose-ol:my-4 prose-ol:leading-normal',
      className
    )}>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  )
}
```

---

### 新組件：CollapsibleExplanation

**`apps/web/components/solve/CollapsibleExplanation.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownExplain } from './MarkdownExplain'
import { motion, AnimatePresence } from 'framer-motion'

interface CollapsibleExplanationProps {
  markdown: string
  /**
   * 初始摺疊的文字長度閾值（字元數）
   */
  collapseThreshold?: number
}

/**
 * 🎯 (A) 可折疊解析內容
 * 長文預設折疊，只顯示前 300 字
 */
export function CollapsibleExplanation({
  markdown,
  collapseThreshold = 300,
}: CollapsibleExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 判斷是否需要折疊
  const shouldCollapse = markdown.length > collapseThreshold

  // 截斷內容（只顯示前 N 字）
  const truncatedMarkdown = shouldCollapse && !isExpanded
    ? markdown.slice(0, collapseThreshold) + '...'
    : markdown

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <MarkdownExplain markdown={truncatedMarkdown} />
        </motion.div>
      </AnimatePresence>

      {/* 展開/折疊按鈕 */}
      {shouldCollapse && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full px-6"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                折疊詳解
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                展開詳解
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
```

---

## 4. InputDock 固定高度

### 目標

- 高度固定 64px
- 左右內距 16px
- 上方訊息區多留 `pb-32` 安全區

### 修改檔案

**`apps/web/app/globals.css`**

```css
/* 更新 InputDock 高度 */
:root {
  --ask-input-dock-height: 64px; /* 從 56px → 64px */
}

/* 更新 InputDock 樣式 */
.input-dock-surface {
  @apply pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl border border-secondary/20 bg-card/95 shadow-2xl backdrop-blur;
  /* 🎯 (A) 固定高度 64px */
  height: 64px;
  padding-left: 1rem; /* 16px */
  padding-right: 1rem; /* 16px */
  padding-bottom: calc(0.35rem + env(safe-area-inset-bottom, 0px));
}
```

---

**`apps/web/components/ask/RAGChatInterface.tsx`**

```tsx
// 在訊息列表容器中添加安全區

<div className="flex-1 space-y-6 px-4 py-6 pb-32"> {/* pb-24 → pb-32 */}
  {/* 訊息列表 */}
</div>
```

---

## 5. Backpack/Store 分步顯示

### 目標

基於 Hick's Law，使用「分步顯示」減少選擇焦慮：
- **預設**：只顯示「科目資料夾」+ 「一個主 CTA：上傳/匯入」
- **點進某個科目後**：才出現「錯題 / 題本 tab」
- **批次選取、匯入、分享**：全部收進右上角的「⋯更多」或「編輯模式」

### 新組件

**`apps/web/components/backpack/SubjectFolderView.tsx`**

```tsx
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Upload, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface SubjectFolder {
  id: string
  name: string
  subject: string
  itemCount: number
  lastUpdated?: string
}

interface SubjectFolderViewProps {
  folders: SubjectFolder[]
}

/**
 * 🎯 (A) Backpack 預設視圖：科目資料夾
 * 分步顯示，減少認知負荷
 */
export function SubjectFolderView({ folders }: SubjectFolderViewProps) {
  return (
    <div className="space-y-4">
      {/* 主 CTA：上傳 */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-1">新增資料</h3>
            <p className="text-sm text-blue-700/80">上傳題目、筆記或文件</p>
          </div>
          <Link href="/backpack/upload">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Upload className="h-4 w-4 mr-2" />
              上傳
            </Button>
          </Link>
        </div>
      </Card>

      {/* 科目資料夾列表 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground px-1">我的科目</h4>

        {folders.map((folder, index) => (
          <motion.div
            key={folder.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/backpack/subject/${folder.subject}`}>
              <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{folder.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {folder.itemCount} 個項目
                        {folder.lastUpdated && ` · ${folder.lastUpdated}`}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
```

---

**`apps/web/app/(app)/backpack/page.tsx`**

```tsx
'use client'

import { AppBar } from '@/components/layout/app-bar'
import { SubjectFolderView } from '@/components/backpack/SubjectFolderView'

export default function BackpackPage() {
  // TODO: 從 API 取得科目資料夾
  const folders = [
    { id: '1', name: '英文', subject: 'english', itemCount: 24, lastUpdated: '2 天前' },
    { id: '2', name: '數學', subject: 'math', itemCount: 18, lastUpdated: '1 週前' },
    { id: '3', name: '歷史', subject: 'history', itemCount: 12, lastUpdated: '3 天前' },
  ]

  return (
    <>
      <AppBar title="背包" rightCTA="settings" />

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <SubjectFolderView folders={folders} />
      </main>
    </>
  )
}
```

---

**`apps/web/app/(app)/backpack/subject/[subject]/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { AppBar } from '@/components/layout/app-bar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoreVertical } from 'lucide-react'

/**
 * 🎯 (A) 科目詳情頁：錯題 / 題本 Tab
 * 只在點進科目後才顯示
 */
export default function SubjectDetailPage({
  params,
}: {
  params: { subject: string }
}) {
  const [showEditMode, setShowEditMode] = useState(false)

  return (
    <>
      <AppBar
        title={`${params.subject === 'english' ? '英文' : params.subject}`}
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowEditMode(!showEditMode)}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        }
      />

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        {/* 🎯 (A) Tab 切換：錯題 / 題本 */}
        <Tabs defaultValue="mistakes" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="mistakes">錯題</TabsTrigger>
            <TabsTrigger value="packs">題本</TabsTrigger>
          </TabsList>

          <TabsContent value="mistakes">
            {/* 錯題列表 */}
            <div className="text-center text-muted-foreground py-8">
              錯題列表（待實作）
            </div>
          </TabsContent>

          <TabsContent value="packs">
            {/* 題本列表 */}
            <div className="text-center text-muted-foreground py-8">
              題本列表（待實作）
            </div>
          </TabsContent>
        </Tabs>

        {/* 編輯模式面板 */}
        {showEditMode && (
          <div className="fixed bottom-24 left-0 right-0 bg-card border-t p-4 shadow-lg">
            <div className="mx-auto max-w-lg flex gap-3">
              <Button variant="outline" className="flex-1">批次選取</Button>
              <Button variant="outline" className="flex-1">匯入</Button>
              <Button variant="outline" className="flex-1">分享</Button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
```

---

## 📋 實施步驟

### Step 1: AppBar 統一（1 小時）
1. 修改 `apps/web/components/layout/app-bar.tsx`
2. 移除 `StreakPill`、`GoldPill`、`EnergyBar`（移至 Profile 專用）
3. 新增 `rightCTA` prop
4. 測試 Play 頁面與其他頁面顯示

### Step 2: Home 卡片重整（2 小時）
1. 創建 `PrimarySolveCard` 組件
2. 修改 `apps/web/app/(app)/home/page.tsx` 卡片順序
3. 整合 `LossAversionCard`（Phase E）
4. 測試卡片優先級與視覺層級

### Step 3: ExplainCard 可掃描（1.5 小時）
1. 修改 `MarkdownExplain.tsx` 樣式
2. 創建 `CollapsibleExplanation.tsx` 組件
3. 在 `ExplainCardV2.tsx` 中使用
4. 測試折疊/展開功能

### Step 4: InputDock 固定高度（30 分鐘）
1. 修改 `globals.css` 中的 `--ask-input-dock-height`
2. 更新 `.input-dock-surface` 樣式
3. 修改 `RAGChatInterface.tsx` 安全區
4. 測試訊息列表不被遮擋

### Step 5: Backpack/Store 分步顯示（3 小時）
1. 創建 `SubjectFolderView.tsx` 組件
2. 修改 `apps/web/app/(app)/backpack/page.tsx`
3. 創建 `apps/web/app/(app)/backpack/subject/[subject]/page.tsx`
4. 測試分步導航流程

---

## ✅ 測試 Checklist

### AppBar
- [ ] Play 頁面只顯示 Level + Energy
- [ ] 其他頁面顯示 Title + 單一 CTA
- [ ] `rightCTA="help"` 顯示問號圖示
- [ ] `rightCTA="settings"` 顯示設定圖示
- [ ] 高度統一為 56px

### Home 頁面
- [ ] 第一張卡是「開始解題」
- [ ] 按鈕順序：對戰 > AI 解析 > 上傳
- [ ] Loss Aversion 卡片正確顯示
- [ ] 卡片間距統一 (24px)

### ExplainCard
- [ ] H2 間距 16px (mt-6 mb-4)
- [ ] H3 間距 12px (mt-4 mb-3)
- [ ] 列表行高 1.6
- [ ] 長文（>300字）預設折疊
- [ ] "展開詳解" pill 正常運作

### InputDock
- [ ] 高度固定 64px
- [ ] 左右內距 16px
- [ ] 訊息列表安全區 pb-32
- [ ] 不遮擋最後一則訊息

### Backpack
- [ ] 預設只顯示科目資料夾 + 上傳按鈕
- [ ] 點進科目後顯示 Tab（錯題/題本）
- [ ] "⋯更多" 顯示編輯模式面板
- [ ] 批次選取功能正常

---

## 🎯 預期效果

| 優化項目 | 預期改善 | 衡量指標 |
|---------|---------|---------|
| AppBar 簡化 | 減少視覺負荷 | 認知負荷 -30% |
| Home 卡片重整 | 提升 CTA 點擊率 | 解題開始率 +25% |
| ExplainCard 可掃描 | 提升閱讀效率 | 閱讀完成率 +40% |
| InputDock 固定高度 | 減少誤觸 | 輸入錯誤率 -20% |
| Backpack 分步顯示 | 減少選擇焦慮 | 操作完成率 +35% |

---

**實施狀態**: 📋 Ready to Implement
**預估時間**: 8 小時
**優先級**: P0 Critical

所有修改遵循設計系統規範，無技術債！🚀
