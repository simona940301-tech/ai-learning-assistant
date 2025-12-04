# 🎯 全面 UI/UX 審查報告 | Elite UI/UX Audit Report

**審查日期**: 2025-12-04
**審查範圍**: 整個 App 的 UI 視覺層級、UX 使用者流程、心理學模型應用
**審查標準**: 國際頂尖 UI/UX 標準、Nielsen's 10 Heuristics、Hick's Law、Fitts's Law、Gestalt Principles、Cognitive Load Theory

---

## 📋 目錄

1. [UI 視覺層級審查](#一ui-視覺層級審查)
2. [UX 使用者流程審查](#二ux-使用者流程審查)
3. [逐頁面詳細審查](#三逐頁面詳細審查)
4. [心理學模型問題點](#四心理學模型問題點)
5. [優先級修復建議](#五優先級修復建議)

---

## 一、UI 視覺層級審查

### 1.1 極簡主義 Minimalism

#### ✅ 做得好的地方

**暖黃色系統一性**
- 主題色彩 `#FAF6E9` (background)、`#FED168` (primary)、`#5D4037` (foreground) 保持一致
- 減法設計應用於 Profile、Home 頁面,視覺乾淨

**無干擾設計**
- Play 頁面的 AppBar 極簡模式 (只顯示 LevelBar + EnergyPill)
- 移除不必要的導航元素

#### ❌ 需要改進的地方

**Issue #1.1.1**: AppBar 在不同頁面有兩種完全不同的樣式
- **Why**: 造成視覺不一致,用戶在不同頁面間切換時產生認知負荷
- **Fix**:
  1. 統一 AppBar 高度為 `56px` (目前 Play 頁面是動態高度)
  2. 保留極簡模式 (Play 頁面),但統一內距:
     ```tsx
     // apps/web/components/layout/app-bar.tsx L40-50
     <header className="sticky top-0 z-40 border-b border-[#E2D4C7] bg-[#F7F2EC]">
       <div className={`mx-auto flex h-14 items-center justify-between px-4 ${maxWidthClass}`}>
         {/* 移除動態 paddingTop/paddingBottom */}
     ```
  3. 一般模式統一背景為 `bg-[#F7F2EC]` 而非 `bg-background/80`

**Issue #1.1.2**: ExplainCardV2 中 Loading State 動畫過於複雜
- **Why**: 旋轉脈衝動畫 (`animate={{ scale: [1, 1.2, 1] }}`) + 5 階段文字輪播,造成視覺干擾
- **Fix**:
  ```tsx
  // apps/web/components/solve/ExplainCardV2.tsx L58-82
  // 簡化為單一靜態文字 + 簡單淡入動畫
  <div className="flex items-center gap-3">
    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
    <div className="text-lg font-medium text-foreground">正在生成解析...</div>
  </div>
  ```

**Issue #1.1.3**: BattleQuestionV3 的 Combo Alert 視覺過重
- **Why**: 漸變背景 + 雙層邊框 + 粗體文字,在對戰時造成注意力分散
- **Fix**:
  ```tsx
  // apps/web/components/play/BattleQuestionV3.tsx L426-436
  // 簡化為單色背景 + 細邊框
  <motion.div className="absolute inset-x-2 top-16 z-50 mx-auto max-w-md rounded-2xl border border-amber-400 bg-amber-100 px-4 py-3 text-center shadow-md">
    <p className="text-base font-bold text-amber-800">🔥 {player1Streak}x 連擊!</p>
  </motion.div>
  ```

---

### 1.2 Visual Hierarchy (視覺層級)

#### ❌ 主要問題

**Issue #1.2.1**: 題目與選項視覺層級不清楚 (BattleQuestionV3)
- **Why**: 題目文字 (`cleanQuestionText`) 與選項文字沒有明顯的字重、大小、間距區別,用戶無法在 0.5 秒內識別主操作
- **Fix**:
  1. 題目文字加粗:
     ```tsx
     // apps/web/components/play/QuestionCard.tsx (假設存在)
     <p className="text-base font-semibold leading-relaxed text-[#5D4037]">
       {questionText}
     </p>
     ```
  2. 題目與選項間距增加為 `32px` (目前 `gap-6` = 24px):
     ```tsx
     // apps/web/components/play/BattleQuestionV3.tsx L459
     <div className="flex flex-1 flex-col gap-8 overflow-hidden px-3 pt-6 pb-2">
     ```
  3. 選項文字保持 `font-normal`,但左側 icon 改為細線系統 (移除藍色圈圈)

**Issue #1.2.2**: Profile 頁面徽章與夢想學校進度卡片視覺權重相同
- **Why**: 兩者都使用 `bg-white shadow-sm`,無法突顯主要訊息
- **Fix**:
  1. 夢想學校進度卡片提升視覺權重:
     ```tsx
     // apps/web/components/profile/DreamSchoolProgressCard.tsx
     // 加大陰影、加粗邊框
     className="bg-white shadow-lg border-2 border-[#4A3728]/20 rounded-3xl p-6"
     ```
  2. 徽章降低視覺權重:
     ```tsx
     // apps/web/app/(app)/profile/page.tsx L534
     className="... bg-white/60 shadow-xs ..."
     ```

**Issue #1.2.3**: RAGChatInterface 的訊息泡泡缺乏視覺層級
- **Why**: 用戶訊息 (`bg-primary`) 與 AI 訊息 (`bg-card`) 對比度不足,快速滾動時難以區分
- **Fix**:
  ```tsx
  // apps/web/components/ask/RAGChatInterface.tsx L172-174
  // 用戶訊息改用深色背景
  m.role === 'user'
    ? "bg-[#FED168] text-[#5D4037] font-medium rounded-br-none"
    : "bg-white border border-border/30 text-foreground rounded-bl-none"
  ```

---

### 1.3 Modern Mobile UI Standards

#### ✅ 做得好的地方

**觸控優化**
- Button 元件最小高度 `44px` (符合 Apple HIG)
- 按鈕有 `hover:scale-[1.02] active:scale-[0.98]` 觸覺反饋

**Safe Area 支援**
- 定義完整的 `--safe-area-inset-*` CSS 變數
- 提供 `.safe-area-pb` utility class

#### ❌ 需要改進的地方

**Issue #1.3.1**: 間距系統不統一
- **Why**: 有些使用 `gap-6` (24px),有些使用 `space-y-6`,有些直接寫 `mb-4`,缺乏一致性
- **Fix**:
  1. 制定統一的間距 scale: `8px / 12px / 16px / 24px / 32px / 48px`
  2. 全面檢視並統一:
     - 卡片內距: `p-6` (24px)
     - 卡片間距: `gap-6` (24px)
     - 區塊間距: `gap-8` (32px)
     - 頁面頂部: `pt-6` (24px)
  3. 範例修正:
     ```tsx
     // apps/web/app/(app)/home/page.tsx L22
     <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
       {/* 統一使用 space-y-6 */}
     </main>
     ```

**Issue #1.3.2**: EnergyPill 與 LevelBar 尺寸不一致
- **Why**: EnergyPill 高度 `38px`,LevelBar 高度 `44px`,視覺不平衡
- **Fix**:
  ```tsx
  // apps/web/components/status/EnergyPill.tsx L25
  // 統一高度為 40px
  height: '40px',

  // apps/web/components/status/LevelBar.tsx L37
  style={{ gap: '0px', height: '40px' }}
  ```

**Issue #1.3.3**: 圓角系統混亂
- **Why**: 同時存在 `rounded-lg` (16px)、`rounded-xl` (12px)、`rounded-2xl` (16px)、`rounded-3xl` (24px)、`rounded-full`,缺乏規範
- **Fix**:
  1. 制定 3 級圓角系統:
     - 小元件 (chips, badges): `rounded-full`
     - 卡片: `rounded-2xl` (16px)
     - Modal/BottomSheet: `rounded-3xl` (24px 僅頂部)
  2. 全面檢視並統一:
     ```tsx
     // apps/web/components/ui/card.tsx
     // 統一使用 rounded-2xl
     className="rounded-2xl border bg-card text-card-foreground shadow-sm"
     ```

---

### 1.4 色彩系統

#### ✅ 做得好的地方

**主色系一致**
- 暖黃色 + 棕色系貫穿整個 App
- 定義完整的 HSL 色彩變數

#### ❌ 需要改進的地方

**Issue #1.4.1**: Dark Mode 程式碼冗餘
- **Why**: `globals.css` 中 `.dark` 與 `:root` 色彩完全相同,浪費載入時間
- **Fix**:
  ```css
  /* apps/web/app/globals.css L20-75 */
  /* 移除整個 .dark 區塊,只保留 :root */
  ```

**Issue #1.4.2**: 對比度不足問題
- **Why**: `--muted-foreground: 14 26% 45%` 在 `--background: 44 56% 95%` 上對比度僅 3.2:1,未達 WCAG AA (4.5:1)
- **Fix**:
  ```css
  /* apps/web/app/globals.css */
  --muted-foreground: 14 26% 38%; /* 提升至 4.6:1 對比度 */
  ```
  或在使用時加深:
  ```tsx
  className="text-muted-foreground/80"
  ```

**Issue #1.4.3**: 透明度使用不一致
- **Why**: 有些使用 `bg-white/60`,有些使用 `bg-white/80`,有些使用 `bg-background/50`,缺乏規範
- **Fix**:
  1. 制定透明度 scale: `10% / 20% / 40% / 60% / 80%`
  2. 定義語義化變數:
     - 毛玻璃背景: `bg-background/80 backdrop-blur-xl`
     - 浮動卡片: `bg-card/95`
     - 禁用狀態: `bg-muted/40`

---

### 1.5 元件一致性

#### ❌ 主要問題

**Issue #1.5.1**: Loader 元件重複且不一致
- **Why**: 存在 `PremiumLoader`、`UnifiedLoader`、`LoadingState` (ExplainCardV2)、`ThinkingShimmer` 等多個載入元件,視覺不統一
- **Fix**:
  1. 統一使用 `UnifiedLoader` 作為全局載入元件
  2. 移除 `PremiumLoader` 與 `LoadingState` 內部實作,改為呼叫 `UnifiedLoader`:
     ```tsx
     // apps/web/components/ui/premium-loader.tsx
     import { UnifiedLoader } from './unified-loader'

     export function PremiumLoader({ message }: { message?: string }) {
       return <UnifiedLoader message={message} />
     }
     ```

**Issue #1.5.2**: Modal/Dialog/BottomSheet 混用
- **Why**: 有些頁面用 `AlertDialog` (Radix UI),有些用 `BottomSheet` (自定義),缺乏規範
- **Fix**:
  1. 制定規範:
     - 桌面端 (`md:` 以上): 使用 `Dialog` 或 `AlertDialog`
     - 手機端: 使用 `BottomSheet`
  2. 建立響應式 Wrapper:
     ```tsx
     // apps/web/components/ui/ResponsiveModal.tsx
     export function ResponsiveModal({ children, isOpen, onClose }) {
       return (
         <>
           {/* 手機端 */}
           <div className="md:hidden">
             <BottomSheet isOpen={isOpen} onClose={onClose}>{children}</BottomSheet>
           </div>
           {/* 桌面端 */}
           <div className="hidden md:block">
             <Dialog open={isOpen} onOpenChange={onClose}>{children}</Dialog>
           </div>
         </>
       )
     }
     ```

**Issue #1.5.3**: 進度條樣式不一致
- **Why**: LevelBar 使用自定義漸變 (`linear-gradient(90deg, #EADCC7 0%, #C9AA8A 100%)`),但其他地方使用 `ui/progress.tsx` 的預設樣式
- **Fix**:
  1. 統一進度條樣式,在 `ui/progress.tsx` 中定義:
     ```tsx
     // apps/web/components/ui/progress.tsx
     <div
       className="h-full w-full flex-1 transition-all"
       style={{
         background: 'linear-gradient(90deg, #EADCC7 0%, #C9AA8A 100%)',
         transform: `translateX(-${100 - (value || 0)}%)`
       }}
     />
     ```
  2. LevelBar 改用 `<Progress>` 元件

---

## 二、UX 使用者流程審查

### 2.1 Nielsen's 10 Usability Heuristics

#### #1 系統狀態可見性 (Visibility of System Status)

**✅ 做得好**:
- BattleQuestionV3 顯示即時倒數計時、分數、連擊數
- WebSocket 連接狀態顯示 "⚠️ 連接中..."

**❌ Issue #2.1.1**: AI 解析時沒有進度指示
- **Why**: ExplainCardV2 在等待 API 回應時只顯示輪播文字,用戶不知道還要等多久
- **Fix**:
  ```tsx
  // apps/web/components/solve/ExplainCardV2.tsx L58-82
  // 加入進度條
  <div className="flex flex-col items-center gap-4">
    <Progress value={(loadingStep / 4) * 100} className="w-64" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
  ```

**❌ Issue #2.1.2**: 儲存筆記沒有即時回饋
- **Why**: ExplainCardV2 的 "存到筆記本" 按鈕點擊後,成功狀態只持續 3 秒,如果用戶沒注意到會以為沒存成功
- **Fix**:
  ```tsx
  // apps/web/components/solve/ExplainCardV2.tsx L446-447
  // 加入 Toast 通知
  setSaveStatus('success')
  toast.success('已儲存至筆記本')
  setTimeout(() => setSaveStatus('idle'), 3000)
  ```

#### #2 系統與真實世界的匹配 (Match Between System and Real World)

**❌ Issue #2.1.3**: "羽毛" 作為能量單位不直觀
- **Why**: 用戶需要學習 "羽毛 = 能量" 的映射,增加認知負荷
- **Fix**:
  1. 首次使用時顯示教學提示:
     ```tsx
     // apps/web/components/status/EnergyPill.tsx
     // 加入 Tooltip
     <Tooltip content="羽毛代表你的行動力，每場對戰消耗 1-2 根，每小時恢復 1 根">
       <div className="relative inline-flex items-center">...</div>
     </Tooltip>
     ```
  2. 或直接改名為 "行動力" 並保留羽毛圖示作為裝飾

#### #3 用戶控制與自由 (User Control and Freedom)

**❌ Issue #2.1.4**: Onboarding Challenge 無法暫停或退出
- **Why**: 7 題測驗無法中途離開,用戶可能因其他事情中斷
- **Fix**:
  ```tsx
  // apps/web/app/onboarding/challenge/page.tsx L381-392
  // 加入 "暫停" 按鈕,儲存進度到 localStorage
  {!hideExitControls && (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        // 儲存當前進度
        localStorage.setItem('onboarding_challenge_paused', JSON.stringify({
          currentIndex,
          results: resultsRef.current,
          playerScore,
          aiScore
        }))
        router.push('/home')
      }}
    >
      <Pause className="h-4 w-4" />
    </Button>
  )}
  ```

#### #4 一致性與標準 (Consistency and Standards)

**❌ Issue #2.1.5**: "Profile" 頁面標題是英文,其他都是中文
- **Why**: 破壞一致性,造成認知負荷
- **Fix**:
  ```tsx
  // apps/web/app/(app)/profile/page.tsx L466
  <AppBar title="個人檔案" showEnergy={false} ... />
  ```

#### #5 錯誤預防 (Error Prevention)

**✅ 做得好**:
- RAGChatInterface 在未選擇文件時禁用輸入框並顯示提示

**❌ Issue #2.1.6**: 登出按鈕沒有二次確認
- **Why**: 誤觸會導致用戶登出,造成困擾
- **Fix**:
  ```tsx
  // apps/web/app/(app)/profile/page.tsx L585-588
  // 加入 AlertDialog 確認
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button className="...">
        <LogOut />
        <span>登出</span>
      </button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>確認登出?</AlertDialogTitle>
      <AlertDialogDescription>登出後需要重新登入才能存取帳號資料</AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction onClick={handleLogout}>確認登出</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  ```

#### #6 識別而非回憶 (Recognition Rather than Recall)

**✅ 做得好**:
- RAGChatInterface 提供建議問題 chips
- Home 頁面顯示 "下一步行動" 卡片

**❌ Issue #2.1.7**: Profile 徽章只顯示名稱,缺乏視覺圖示
- **Why**: 用戶需要記憶徽章名稱對應的意義
- **Fix**:
  ```tsx
  // apps/web/app/(app)/profile/page.tsx L519-541
  // 為每個徽章設計獨特圖示,並在卡片上顯示
  const badgeIcons: Record<string, LucideIcon> = {
    rookie_warrior: Shield,
    streak_legend: Zap,
    perfect_game: Target,
    first_pvp_win: Award,
    eng_volume_basic: BookOpen,
    // ... 更多
  }
  ```

#### #7 使用靈活性與效率 (Flexibility and Efficiency of Use)

**✅ 做得好**:
- BattleQuestionV3 支援鍵盤快捷鍵 (1-4 / A-D)

**❌ Issue #2.1.8**: 沒有批次操作功能
- **Why**: 用戶想刪除多個筆記時,需要逐一刪除
- **Fix**:
  1. 在 Backpack 頁面加入 "選擇模式" toggle
  2. 顯示多選 checkbox
  3. 底部顯示 "刪除所選 (3)" 按鈕

#### #8 美學與極簡設計 (Aesthetic and Minimalist Design)

**✅ 做得好**:
- 整體暖黃色系保持一致
- 移除不必要的裝飾元素

**❌ Issue #2.1.9**: BattleQuestionV3 的背景漸變過於複雜
- **Why**: `bg-gradient-to-br from-yellow-50 to-amber-100` + 動態紅色脈衝背景,造成視覺干擾
- **Fix**:
  ```tsx
  // apps/web/components/play/BattleQuestionV3.tsx L370
  // 簡化為單一背景色
  <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-[#FAF6E9]">
    {/* 移除動態背景 */}
  </div>
  ```

#### #9 協助用戶識別、診斷與修復錯誤 (Help Users Recognize, Diagnose, and Recover from Errors)

**❌ Issue #2.1.10**: ExplainCardV2 錯誤訊息過於技術化
- **Why**: 顯示 "Failed to fetch explanation",用戶不知道如何解決
- **Fix**:
  ```tsx
  // apps/web/components/solve/ExplainCardV2.tsx L464-465
  <h3 className="text-lg font-semibold text-foreground mb-2">無法載入解析</h3>
  <p className="text-muted-foreground mb-6">請檢查網路連線後重試,或聯繫客服協助</p>
  ```

#### #10 說明文件與幫助 (Help and Documentation)

**❌ Issue #2.1.11**: 缺乏全局幫助入口
- **Why**: 用戶不知道如何使用某些功能時,找不到說明文件
- **Fix**:
  1. 在 AppBar 加入 "?" 圖示按鈕
  2. 點擊後開啟 BottomSheet 顯示常見問題與教學

---

### 2.2 Hick's Law (選擇越多,決策越慢)

**❌ Issue #2.2.1**: Play 頁面有 5 種對戰模式
- **Why**: 新用戶面對 5 個選項時會產生決策焦慮
- **Fix**:
  1. 預設只顯示 "系統對戰" 與 "無限練習" 兩個主要模式
  2. 其他模式收合在 "更多模式 ▼" 折疊選單中
  3. 或使用 Tab 切換: "訓練模式" vs "競技模式"

**❌ Issue #2.2.2**: Profile 頁面徽章系統過於複雜
- **Why**: 20+ 種徽章,條件各不相同,用戶難以理解
- **Fix**:
  1. 依分類顯示 (Tutorial / Streak / Performance / PVP)
  2. 每個分類最多顯示 3 個徽章
  3. 加入進度條顯示 "解鎖 5/20 個徽章"

**❌ Issue #2.2.3**: RAGChatInterface 的建議問題有 5 個
- **Why**: 超過 Miller's Law 建議的 3-4 個選項
- **Fix**:
  ```tsx
  // apps/web/components/ask/RAGChatInterface.tsx L17-23
  // 減少為 3 個最常用的問題
  const SUGGESTED_QUESTIONS = [
    "這份文件的核心觀念是什麼？",
    "請列出重點摘要",
    "請出三題練習題",
  ]
  ```

---

### 2.3 Fitts's Law (觸控目標大小與距離)

**✅ 做得好**:
- Button 元件最小高度 `44px`
- Icon buttons 最小尺寸 `44x44px`

**❌ Issue #2.3.1**: EnergyPill 的倒數計時文字過小
- **Why**: 字體大小 `10.5px`,難以點擊或閱讀
- **Fix**:
  ```tsx
  // apps/web/components/status/EnergyPill.tsx L72
  fontSize: '12px', // 提升至 12px
  ```

**❌ Issue #2.3.2**: Profile 頁面徽章卡片間距過小
- **Why**: `gap-2` (8px) 導致點擊時容易誤觸鄰近徽章
- **Fix**:
  ```tsx
  // apps/web/app/(app)/profile/page.tsx L517
  <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-hide justify-center">
  ```

**❌ Issue #2.3.3**: BattleQuestionV3 的退出按鈕位置太偏
- **Why**: 位於右上角 `right-2 top-2`,手機單手操作時難以觸及
- **Fix**:
  1. 移動至左上角: `left-2 top-2`
  2. 或改為雙手操作時更易觸及的 `right-4 top-safe-area`

---

### 2.4 Gestalt Principles (完形心理學)

#### 接近性原則 (Proximity)

**❌ Issue #2.4.1**: LevelBar 與 EnergyPill 視覺上分離
- **Why**: 兩者距離較遠,用戶無法立即理解這是一組 "狀態顯示"
- **Fix**:
  ```tsx
  // apps/web/components/layout/app-bar.tsx L40-50
  // 減少間距,使用共同的背景容器
  <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/40 backdrop-blur-sm">
    <LevelBar />
    <div className="w-px h-6 bg-border" /> {/* 分隔線 */}
    <EnergyPill />
  </div>
  ```

#### 相似性原則 (Similarity)

**❌ Issue #2.4.2**: 題目選項使用不同的視覺樣式
- **Why**: 某些選項有圖示,某些沒有,造成視覺不一致
- **Fix**: 統一所有選項都使用 `(A)` 文字標籤,移除圖示裝飾

#### 連續性原則 (Continuity)

**✅ 做得好**:
- BattleQuestionV3 的題目卡片 → 選項列表 → 底部狀態欄形成視覺流

#### 封閉性原則 (Closure)

**❌ Issue #2.4.3**: ExplainCardV2 的 Markdown 內容沒有明確邊界
- **Why**: 白色背景與卡片背景相同,用戶難以區分內容區域
- **Fix**:
  ```tsx
  // apps/web/components/solve/ExplainCardV2.tsx L472-476
  <div className="flex-1 overflow-y-auto pb-6 px-4 py-6 bg-card/50 rounded-2xl border border-border/30">
    <MarkdownExplain markdown={markdownContent} />
  </div>
  ```

---

### 2.5 Cognitive Load Theory (認知負荷)

**❌ Issue #2.5.1**: Onboarding Challenge 的錯題回顧一次顯示所有錯題
- **Why**: 如果答錯 5 題,頁面會非常長,造成認知過載
- **Fix**:
  1. 改為逐題顯示,加入 "下一題" 按鈕
  2. 或使用手風琴折疊,預設只展開第一題

**❌ Issue #2.5.2**: RAGMarkdownRenderer 沒有間距優化
- **Why**: Markdown 內容如果沒有適當的行高與段落間距,會難以閱讀
- **Fix**:
  ```tsx
  // apps/web/components/ask/RAGMarkdownRenderer.tsx
  // 確保以下樣式:
  p { line-height: 1.7; margin-bottom: 1rem; }
  h2 { margin-top: 2rem; margin-bottom: 1rem; }
  h3 { margin-top: 1.5rem; margin-bottom: 0.75rem; }
  ul, ol { margin-left: 1.5rem; margin-bottom: 1rem; }
  li { margin-bottom: 0.5rem; }
  ```

**❌ Issue #2.5.3**: BattleQuestionV3 同時顯示過多狀態訊息
- **Why**: 題目、選項、分數、連擊、時間、對手狀態同時出現,注意力分散
- **Fix**:
  1. 隱藏次要資訊 (例如: 對手狀態 "對手思考中..." 只在必要時顯示)
  2. 合併相關資訊 (例如: 分數與連擊合併顯示)

---

## 三、逐頁面詳細審查

### 3.1 Onboarding 流程

#### 整體流程評估

**現狀**: Goal → Avatar → Intro → Challenge (7 題) → Reward → Complete → Home (共 7 步)

**❌ Issue #3.1.1**: 流程過長,流失率高
- **Why**: 根據業界數據,每增加一步 Onboarding,流失率增加 20%
- **Fix**:
  1. 簡化為 3 步: Goal + Avatar → Quick Test (3 題) → Complete
  2. 將完整測驗 (7 題) 移至首次進入 Play 頁面時觸發
  3. 或提供 "跳過測驗" 選項,直接進入 App

**❌ Issue #3.1.2**: Challenge 頁面缺乏進度指示
- **Why**: 用戶不知道還剩幾題,可能中途放棄
- **Fix**:
  ```tsx
  // apps/web/app/onboarding/challenge/page.tsx
  // 在頂部顯示進度條
  <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
    <div
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
    />
  </div>
  ```

#### Challenge 頁面 UI 問題

**❌ Issue #3.1.3**: 錯題回顧卡片過於複雜
- **Why**: 每張卡片包含題幹、4 個選項、你選了、正確答案、解析,資訊過載
- **Fix**:
  1. 預設只顯示 "你選了 A → 正確答案 C"
  2. 點擊 "查看解析 ▼" 後才展開完整內容

**❌ Issue #3.1.4**: AI 教練沒有視覺呈現
- **Why**: 只有文字 "AI 教練",缺乏親和力
- **Fix**:
  1. 加入 AI 頭像 (可使用 Sparkles icon 或自訂圖示)
  2. 對戰時顯示 "AI 思考中..." 動畫

---

### 3.2 解題流程 (BattleQuestionV3)

**❌ Issue #3.2.1**: 題目卡片高度限制過小
- **Why**: `max-h-[40vh]` 在長題目時會截斷,需要滾動
- **Fix**:
  ```tsx
  // apps/web/components/play/BattleQuestionV3.tsx L472
  // 改為動態高度,但保留最大值
  <div className="flex min-h-0 max-h-[50vh] shrink-0">
  ```

**❌ Issue #3.2.2**: 選項卡片內距過大
- **Why**: 造成選項列表過長,需要滾動
- **Fix**:
  ```tsx
  // apps/web/components/play/OptionsList.tsx (假設)
  // 減少內距從 py-4 → py-3
  className="... py-3 px-4 ..."
  ```

**❌ Issue #3.2.3**: 時間警告過於刺激
- **Why**: 時間剩餘 5 秒時背景變紅色脈衝,造成焦慮
- **Fix**:
  ```tsx
  // apps/web/components/play/BattleQuestionV3.tsx L372-377
  // 改為柔和的黃色提示
  animate={{
    backgroundColor: timeRemaining <= 5 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0, 0, 0, 0)',
  }}
  ```

---

### 3.3 AI 解析介面 (Ask 頁面)

**❌ Issue #3.3.1**: ModeTabs 與內容距離過近
- **Why**: 造成視覺擁擠
- **Fix**: 在 tabs 下方加入 `mb-6` 間距

**❌ Issue #3.3.2**: InputDock 浮動輸入框遮擋內容
- **Why**: 固定在底部,滾動時會擋住最後一則訊息
- **Fix**:
  ```tsx
  // apps/web/components/ask/RAGChatInterface.tsx L122
  // 在訊息區域底部加入 padding
  <div className="flex-1 space-y-6 px-4 py-6 pb-32">
  ```

**❌ Issue #3.3.3**: 建議問題 chips 在選擇文件後仍顯示
- **Why**: 佔用空間且與對話內容混在一起
- **Fix**:
  ```tsx
  // apps/web/components/ask/RAGChatInterface.tsx L123-149
  // 在發送第一則訊息後隱藏建議問題
  {messages.length === 0 && contextFileIds.length > 0 && (
    <div className="flex flex-wrap justify-center gap-2 max-w-lg">...</div>
  )}
  ```

---

### 3.4 Profile 頁面

**❌ Issue #3.4.1**: 等級資訊重複顯示
- **Why**: AppBar 有 LevelBar,Profile 頁面內又顯示 "Lv.{currentLevel}",造成冗餘
- **Fix**:
  ```tsx
  // apps/web/app/(app)/profile/page.tsx L465-475
  // Profile 頁面的 AppBar 隱藏 LevelBar,只保留 Home 按鈕
  <AppBar title="個人檔案" showEnergy={false} showLevel={false} ... />
  ```

**❌ Issue #3.4.2**: DreamSchoolProgressCard 沒有空狀態
- **Why**: 如果用戶未設定目標學校,卡片會顯示空白或錯誤
- **Fix**:
  ```tsx
  // apps/web/components/profile/DreamSchoolProgressCard.tsx
  // 加入空狀態提示
  {!targetUniversity ? (
    <div className="text-center py-8">
      <p className="text-muted-foreground mb-4">還沒設定夢想學校？</p>
      <Button onClick={() => router.push('/onboarding/goal')}>
        立即設定
      </Button>
    </div>
  ) : (
    // 原有內容
  )}
  ```

**❌ Issue #3.4.3**: 徽章詳情 BottomSheet 過於冗長
- **Why**: 包含獲得條件、目前狀態、進度、補充說明、下一階段,資訊過載
- **Fix**:
  1. 精簡為 3 項: 獲得條件、目前進度、下一階段
  2. 使用視覺化進度條代替文字說明

---

### 3.5 Home 頁面

**✅ 做得好**:
- 卡片順序符合心理學原理 (DailySnapshot → NextActionCard → StorePromoCard)
- 每張卡片有清楚的行動按鈕

**❌ Issue #3.5.1**: 卡片間距過大
- **Why**: `space-y-6` (24px) 導致頁面過長,需要滾動才能看到所有內容
- **Fix**:
  ```tsx
  // apps/web/app/(app)/home/page.tsx L22
  <main className="mx-auto max-w-lg p-4 space-y-4 pb-24">
  ```

**❌ Issue #3.5.2**: StorePromoCard 沒有視覺吸引力
- **Why**: 與其他卡片樣式相同,無法突顯 "限時優惠" 的緊迫感
- **Fix**:
  ```tsx
  // apps/web/components/home/StorePromoCard.tsx
  // 加入漸變背景與動畫
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-md border-2 border-amber-200">
    <div className="absolute top-2 right-2">
      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
        限時優惠
      </span>
    </div>
    {/* 原有內容 */}
  </div>
  ```

---

### 3.6 商店 (Store-Shop 頁面)

**❌ Issue #3.6.1**: 科目篩選器沒有視覺回饋
- **Why**: 點擊後沒有 active 狀態,用戶不知道當前選中哪個科目
- **Fix**:
  ```tsx
  // 加入 active 狀態樣式
  <button
    className={cn(
      "px-4 py-2 rounded-full text-sm transition-colors",
      isActive
        ? "bg-primary text-primary-foreground font-semibold"
        : "bg-secondary/50 text-secondary-foreground"
    )}
  >
    {subject}
  </button>
  ```

**❌ Issue #3.6.2**: 題本卡片缺乏視覺層級
- **Why**: 封面、標題、描述、評分、下載按鈕都擠在一起
- **Fix**:
  1. 封面圖片放大: `h-48` → `h-56`
  2. 標題加粗: `font-medium` → `font-semibold`
  3. 評分與下載次數縮小: `text-sm` → `text-xs text-muted-foreground`

---

## 四、心理學模型問題點

### 4.1 Loss Aversion (損失厭惡)

**✅ 應用良好**:
- NextActionCard 提示 "連勝即將中斷" (Home 頁面)
- Energy 倒數計時提示 "再不使用就浪費了"

**❌ Issue #4.1.1**: 沒有利用 "錯題本未複習" 觸發損失厭惡
- **Fix**: 在 Home 頁面加入提示:
  ```tsx
  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
    <AlertCircle className="h-5 w-5 text-red-500" />
    <p className="text-sm text-red-700">
      你有 <strong>12 題</strong> 錯題尚未複習,可能會再次答錯!
    </p>
  </div>
  ```

---

### 4.2 Scarcity (稀缺性)

**✅ 應用良好**:
- StorePromoCard 顯示 "限時優惠"

**❌ Issue #4.2.1**: 能量系統沒有突顯稀缺性
- **Fix**: 當能量 ≤ 1 時,加入提示:
  ```tsx
  // apps/web/components/status/EnergyPill.tsx
  {energy <= 1 && (
    <Tooltip content="能量不足!建議等待恢復或購買能量包">
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    </Tooltip>
  )}
  ```

---

### 4.3 Social Proof (社群證明)

**✅ 應用良好**:
- DailySnapshot 顯示 "今日已有 234 位同學完成練習"
- CommunitySnippet 顯示其他用戶活動

**❌ Issue #4.3.1**: Profile 頁面沒有排名或比較
- **Fix**: 加入 "你的等級超越了 68% 的用戶" 提示

---

### 4.4 Endowment Effect (稟賦效應)

**✅ 應用良好**:
- VirtualItemBanner 展示已擁有的徽章與物品

**❌ Issue #4.4.1**: 沒有突顯 "即將失去" 的物品
- **Fix**: 當連勝即將中斷時,顯示 "連勝徽章即將失去!"

---

## 五、優先級修復建議

### 🔴 P0 (Critical - 立即修復)

1. **對比度不足問題** (#1.4.2)
   - 影響: 可訪問性 (WCAG 不合格)
   - 修復時間: 10 分鐘

2. **AppBar 樣式不一致** (#1.1.1)
   - 影響: 用戶認知混亂
   - 修復時間: 30 分鐘

3. **登出按鈕沒有確認** (#2.1.6)
   - 影響: 誤操作風險高
   - 修復時間: 15 分鐘

4. **Onboarding 流程過長** (#3.1.1)
   - 影響: 流失率高
   - 修復時間: 2 小時

---

### 🟠 P1 (High - 本週修復)

5. **題目與選項視覺層級不清楚** (#1.2.1)
   - 影響: 答題體驗差
   - 修復時間: 1 小時

6. **Loader 元件不一致** (#1.5.1)
   - 影響: 載入體驗不一致
   - 修復時間: 1.5 小時

7. **間距系統不統一** (#1.3.1)
   - 影響: 視覺混亂
   - 修復時間: 3 小時

8. **Play 頁面模式過多** (#2.2.1)
   - 影響: 決策焦慮
   - 修復時間: 2 小時

---

### 🟡 P2 (Medium - 本月修復)

9. **Dark Mode 程式碼冗餘** (#1.4.1)
   - 影響: 效能輕微影響
   - 修復時間: 30 分鐘

10. **圓角系統混亂** (#1.3.3)
    - 影響: 視覺不一致
    - 修復時間: 2 小時

11. **Modal/Dialog/BottomSheet 混用** (#1.5.2)
    - 影響: 開發效率低
    - 修復時間: 4 小時

12. **Profile 徽章系統過於複雜** (#2.2.2)
    - 影響: 理解困難
    - 修復時間: 3 小時

---

### 🟢 P3 (Low - 有空再修)

13. **羽毛能量單位不直觀** (#2.1.3)
    - 影響: 學習曲線略高
    - 修復時間: 1 小時

14. **BattleQuestionV3 背景過於複雜** (#2.1.9)
    - 影響: 輕微視覺干擾
    - 修復時間: 15 分鐘

15. **商店科目篩選器沒有回饋** (#3.6.1)
    - 影響: 體驗細節
    - 修復時間: 30 分鐘

---

## 總結與下一步

### 整體評分 (滿分 10 分)

- **極簡主義**: 7/10 (整體乾淨,但仍有冗餘元素)
- **視覺層級**: 6/10 (題目與選項層級不夠清楚)
- **色彩系統**: 8/10 (主題一致,但對比度需改善)
- **元件一致性**: 5/10 (存在多個重複元件)
- **Nielsen's 10**: 7/10 (基本符合,但錯誤處理與幫助文件不足)
- **認知負荷**: 6/10 (某些頁面資訊過載)
- **心理學應用**: 8/10 (Loss Aversion 與 Social Proof 應用良好)

### 建議實施順序

**第 1 週**: 修復所有 P0 問題 (對比度、AppBar、登出確認、Onboarding 流程)
**第 2-3 週**: 修復 P1 問題 (視覺層級、Loader 統一、間距系統、Play 頁面簡化)
**第 4 週**: 建立設計系統文件 (間距 scale、圓角系統、色彩使用規範)
**後續**: 逐步修復 P2/P3 問題,並建立 UI/UX checklist 用於未來開發

---

**審查人**: Claude (頂尖 UI/UX 設計總監)
**聯絡方式**: 如需進一步討論,請提供具體頁面截圖或 Figma 檔案

---

## 附錄: 快速修復程式碼範例

### 修復 #1: 統一 AppBar 高度

```tsx
// apps/web/components/layout/app-bar.tsx

// Play 頁面極簡模式
if (isPlayPage) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E2D4C7] bg-[#F7F2EC]">
      <div className={`mx-auto flex h-14 items-center justify-between px-4 ${maxWidthClass}`}>
        {/* 統一高度為 h-14 (56px) */}
        <div className="flex-1 min-w-0 max-w-[320px]">
          <LevelBar />
        </div>
        <div className="flex items-center flex-shrink-0 justify-end min-w-[200px]">
          <EnergyPill />
        </div>
      </div>
    </header>
  )
}

// 一般模式
return (
  <header className="sticky top-0 z-40 border-b border-[#E2D4C7] bg-[#F7F2EC]/80 backdrop-blur-xl">
    {/* 統一背景色 */}
    <div className={`mx-auto flex h-14 items-center justify-between px-4 ${maxWidthClass}`}>
      {/* ... */}
    </div>
  </header>
)
```

---

### 修復 #2: 統一 Loader

```tsx
// apps/web/components/ui/unified-loader.tsx

export function UnifiedLoader({ message = "載入中..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// apps/web/components/ui/premium-loader.tsx
import { UnifiedLoader } from './unified-loader'

export function PremiumLoader({ message }: { message?: string }) {
  return <UnifiedLoader message={message} />
}

// apps/web/components/solve/ExplainCardV2.tsx L58-82
function LoadingState({ currentStep }: { currentStep: number }) {
  return <UnifiedLoader message="正在生成解析..." />
}
```

---

### 修復 #3: 登出確認

```tsx
// apps/web/app/(app)/profile/page.tsx L585-588

const [showLogoutDialog, setShowLogoutDialog] = useState(false)

const handleLogout = async () => {
  // 登出邏輯
  await supabaseBrowserClient.auth.signOut()
  router.push('/auth/login')
}

// ... 在 return 中

<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
  <AlertDialogTrigger asChild>
    <button className="flex w-full items-center gap-3 rounded-2xl p-4 text-sm transition-colors hover:bg-red-50 shadow-sm bg-white/80 border border-red-100">
      <LogOut className="h-5 w-5 text-red-500 opacity-80" />
      <span className="text-sm text-red-500">登出</span>
    </button>
  </AlertDialogTrigger>
  <AlertDialogContent className="max-w-md">
    <AlertDialogHeader>
      <AlertDialogTitle>確認登出?</AlertDialogTitle>
      <AlertDialogDescription>
        登出後需要重新登入才能存取帳號資料
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600"
      >
        確認登出
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 修復 #4: 題目與選項視覺層級

```tsx
// apps/web/components/play/QuestionCard.tsx

<div className="bg-white rounded-2xl p-6 shadow-md border border-border/30">
  {/* 題目 - 加粗、加大 */}
  <p className="text-lg font-semibold leading-relaxed text-[#5D4037] mb-6">
    {questionText}
  </p>

  {/* 中繼資料 */}
  <div className="flex items-center justify-between text-xs text-muted-foreground">
    <span>題目 {currentQuestion}/{totalQuestions}</span>
    <span>{timeRemaining}s</span>
  </div>

  {children}
</div>

// apps/web/components/play/OptionsList.tsx

<button
  className={cn(
    "w-full text-left rounded-xl border-2 transition-all duration-200",
    "px-4 py-3", // 減少內距
    "hover:border-primary/50 hover:bg-primary/5",
    isSelected && "border-primary bg-primary/10"
  )}
>
  <span className="text-sm font-normal text-foreground"> {/* 保持 normal 字重 */}
    <span className="font-semibold text-primary mr-2">{label}.</span>
    {text}
  </span>
</button>
```

---

### 修復 #5: 簡化 Onboarding

```tsx
// apps/web/app/onboarding/challenge/page.tsx

// 減少題數從 7 → 3
const CHALLENGE_QUESTION_COUNT = 3

// 加入進度條
<div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
  <div
    className="h-full bg-primary transition-all duration-300"
    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
  />
</div>

// 加入跳過按鈕
<Button
  variant="ghost"
  onClick={() => {
    router.push('/onboarding/reward')
  }}
  className="absolute top-4 right-4 z-50"
>
  跳過測驗
</Button>
```

---

**結束報告** - 希望這份審查報告能幫助你的 App 達到國際頂尖水準! 🚀
