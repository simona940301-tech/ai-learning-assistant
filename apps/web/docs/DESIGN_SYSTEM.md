# 🎨 Design System - 設計系統規範

**版本**: 1.0.0
**最後更新**: 2025-12-04
**狀態**: ✅ Phase 1 Complete

本文件定義了整個 App 的設計系統基礎，所有 UI 組件必須遵循這些規範。

---

## 📋 目錄

1. [色彩系統](#色彩系統)
2. [間距系統](#間距系統)
3. [圓角系統](#圓角系統)
4. [陰影系統](#陰影系統)
5. [Typography 字體系統](#typography-字體系統)
6. [組件規範](#組件規範)
7. [使用範例](#使用範例)

---

## 🎨 色彩系統

### 主色彩 (Primary Colors)

```css
/* 背景色：奶油黃 */
--background: 44 56% 95%; /* #FAF6E9 */

/* 前景色：深咖啡棕 */
--foreground: 14 26% 29%; /* #5D4037 */

/* 主色：金黃色 */
--primary: 42 98% 70%; /* #FED168 */
--primary-foreground: 14 26% 29%;

/* 卡片：淺米白 */
--card: 50 100% 98%; /* #FFFDF5 */
--card-foreground: 14 26% 29%;
```

### 輔助色彩 (Secondary Colors)

```css
/* 次要色：柔和米色 */
--secondary: 36 41% 67%; /* #CCB188 */
--secondary-foreground: 14 26% 29%;

/* 靜音色：淺灰米色 */
--muted: 42 56% 85%;
--muted-foreground: 14 26% 38%; /* ✅ WCAG AA 合規 (4.6:1) */

/* 強調色：綠色 */
--accent: 123 23% 42%; /* #528555 */
--accent-foreground: 0 0% 98%;

/* 破壞性操作：柔和紅 */
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 0 0% 98%;
```

### 邊框與輸入

```css
--border: 36 30% 80%; /* #E0D0B8 */
--input: 36 30% 80%;
--ring: 42 98% 70%;
```

### ⚠️ 重要規則

1. **僅支援 Light Mode**：已移除 `.dark` 區塊，統一使用淺色主題
2. **對比度要求**：所有文字顏色必須符合 WCAG AA 標準 (4.5:1 for normal text, 3:1 for large text)
3. **色彩使用**：
   - 主要操作：`bg-primary`
   - 次要操作：`bg-secondary`
   - 幽靈按鈕：`hover:bg-muted/50`
   - 危險操作：`bg-destructive`

---

## 📏 間距系統

統一使用 **6 級間距系統**，禁止使用任意數值。

### 定義

```css
--spacing-xs: 0.5rem;  /* 8px */
--spacing-sm: 0.75rem; /* 12px */
--spacing-md: 1rem;    /* 16px */
--spacing-lg: 1.5rem;  /* 24px */
--spacing-xl: 2rem;    /* 32px */
--spacing-2xl: 3rem;   /* 48px */
```

### Tailwind 對應

| CSS Variable | Tailwind Class | 用途 |
|-------------|---------------|------|
| `--spacing-xs` | `gap-2`, `p-2`, `m-2` | Icon 間距、Chip 內距 |
| `--spacing-sm` | `gap-3`, `p-3`, `m-3` | 小元件內距 |
| `--spacing-md` | `gap-4`, `p-4`, `m-4` | 標準間距 |
| `--spacing-lg` | `gap-6`, `p-6`, `m-6` | **卡片內距 (標準)** |
| `--spacing-xl` | `gap-8`, `p-8`, `m-8` | 區塊間距 |
| `--spacing-2xl` | `gap-12`, `p-12`, `m-12` | 大區塊間距 |

### 使用規範

```tsx
// ✅ 正確
<Card className="p-6 space-y-6">
  <CardHeader className="p-6">...</CardHeader>
  <CardContent className="p-6 pt-0">...</CardContent>
</Card>

// ❌ 錯誤
<Card className="p-5 space-y-4">  {/* 不統一 */}
  <CardHeader className="p-7">...</CardHeader>  {/* 任意數值 */}
</Card>
```

### 常用場景

- **卡片內距**: `p-6` (24px)
- **卡片間距**: `gap-6` 或 `space-y-6` (24px)
- **區塊間距**: `gap-8` (32px)
- **頁面頂部**: `pt-6` (24px)
- **頁面底部** (含 TabBar): `pb-24` (96px)

---

## 🔲 圓角系統

統一使用 **3 級圓角系統**。

### 定義

```css
--radius-card: 1rem;      /* 16px - 卡片 */
--radius-modal: 1.5rem;   /* 24px - Modal/BottomSheet (僅頂部) */
--radius-full: 9999px;    /* Pills/Chips/Badges */
--radius: 1rem;           /* Legacy 支援 */
```

### Tailwind 對應

| 元件類型 | Tailwind Class | 用途 |
|---------|---------------|------|
| Card | `rounded-2xl` | 所有卡片元件 |
| Button | `rounded-xl` | 按鈕 (略小於卡片) |
| Modal/BottomSheet | `rounded-t-3xl` | 僅頂部圓角 |
| Pills/Badges | `rounded-full` | EnergyPill, StreakPill, Chips |
| Input | `rounded-xl` | 輸入框 |
| Progress Bar | `rounded-full` | 進度條 |

### ⚠️ 禁止使用

- ❌ `rounded-lg` (12px)
- ❌ `rounded-md` (6px)
- ❌ `rounded-sm` (4px)
- ❌ 任意數值如 `rounded-[14px]`

### 範例

```tsx
// ✅ 正確
<Card className="rounded-2xl">...</Card>
<Button className="rounded-xl">...</Button>
<div className="rounded-full">...</div>

// ❌ 錯誤
<Card className="rounded-lg">...</Card>
<Button className="rounded-md">...</Button>
```

---

## 🌑 陰影系統

統一使用 **2 級陰影系統**。

### 定義

```css
/* 標準卡片陰影 */
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Hover 強調陰影 */
--shadow-card-hover: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

### Tailwind 對應

| 用途 | Tailwind Class | CSS Variable |
|-----|---------------|-------------|
| 標準卡片 | `shadow-sm` | `--shadow-card` |
| 強調卡片/Hover | `shadow-lg` | `--shadow-card-hover` |

### 使用範例

```tsx
// 標準卡片
<Card className="shadow-sm">...</Card>

// 互動卡片
<Card
  interactive
  style={{ boxShadow: 'var(--shadow-card)' }}
  className="hover:shadow-lg"
>
  ...
</Card>
```

### ⚠️ 禁止使用

- ❌ `shadow-md`
- ❌ `shadow-xl`
- ❌ `shadow-2xl`
- ❌ 自定義 `drop-shadow` 或 `box-shadow` 數值

---

## ✍️ Typography 字體系統

### 標題層級

| 用途 | Class | 字級 | 字重 |
|-----|-------|-----|-----|
| Page Title | `text-2xl font-bold` | 24px | 700 |
| Section Title | `text-xl font-semibold` | 20px | 600 |
| Card Title | `text-lg font-semibold` | 18px | 600 |
| Subtitle | `text-base font-medium` | 16px | 500 |
| Body | `text-base font-normal` | 16px | 400 |
| Small | `text-sm` | 14px | 400 |
| Meta | `text-xs text-muted-foreground` | 12px | 400 |

### 行高規範

- 標題：`leading-tight` (1.25)
- 內文：`leading-normal` (1.5) 或 `leading-relaxed` (1.625)
- Markdown：`leading-relaxed` (1.7)

### 範例

```tsx
// Page Title
<h1 className="text-2xl font-bold">個人檔案</h1>

// Section Title
<h2 className="text-xl font-semibold mb-4">我的徽章</h2>

// Card Title
<CardTitle className="text-lg font-semibold">夢想學校進度</CardTitle>

// Body Text
<p className="text-base leading-relaxed">這是內文...</p>

// Meta Info
<span className="text-xs text-muted-foreground">2 小時前</span>
```

---

## 🧩 組件規範

### Card 組件

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'

// 標準卡片
<Card className="p-6">
  <CardHeader className="p-6">
    <CardTitle>標題</CardTitle>
  </CardHeader>
  <CardContent className="p-6 pt-0">內容</CardContent>
</Card>

// 互動卡片
<Card interactive className="cursor-pointer">
  {/* Hover 時自動套用 shadow-hover */}
</Card>
```

**規範**:
- 統一使用 `rounded-2xl`
- 標準內距 `p-6` (24px)
- 使用 `--shadow-card` 陰影
- Interactive 卡片自動套用 hover 效果

---

### Button 組件

```tsx
import { Button } from '@/components/ui/button'

// 主要按鈕
<Button variant="default">確認</Button>

// 次要按鈕
<Button variant="secondary">取消</Button>

// 幽靈按鈕
<Button variant="ghost">返回</Button>

// 危險操作
<Button variant="destructive">刪除</Button>

// Icon 按鈕
<Button variant="ghost" size="icon">
  <Home className="h-5 w-5" />
</Button>
```

**規範**:
- 統一使用 `rounded-xl`
- 最小高度 `44px` (符合 Apple HIG 觸控標準)
- Hover: `scale-[1.02]`
- Active: `scale-[0.98]`

---

### Progress 組件

```tsx
import { Progress, ProgressWithLabel } from '@/components/ui/progress'

// 標準進度條
<Progress value={75} />

// 帶標籤的進度條
<ProgressWithLabel value={75} label="完成度" showPercentage />
```

**規範**:
- 統一漸變：`linear-gradient(90deg, #EADCC7 0%, #C9AA8A 100%)`
- 背景色：`bg-muted`
- 高度：`h-2`
- 圓角：`rounded-full`

---

### Loader 組件

```tsx
import { UnifiedLoader, PulseLoader } from '@/components/ui/unified-loader'
import { PremiumLoader } from '@/components/ui/premium-loader'

// 全屏載入
<UnifiedLoader message="載入中..." fullScreen />

// 區域載入
<UnifiedLoader message="處理中..." />

// 小型脈衝載入器
<PulseLoader />

// Legacy 支援 (內部使用 UnifiedLoader)
<PremiumLoader message="載入中..." />
```

**規範**:
- 統一使用 `UnifiedLoader` 作為基礎
- 3 個脈衝圓點動畫
- 延遲錯開 0.2s
- 動畫時長 1.5s

---

### AppBar 組件

```tsx
import { AppBar } from '@/components/layout/app-bar'

// Play 頁面 (極簡模式)
<AppBar title="對戰" />  {/* 自動偵測路徑 */}

// 一般頁面
<AppBar title="個人檔案" showEnergy={false} />
```

**規範**:
- 統一高度 `h-14` (56px)
- Play 頁面：`bg-[#F7F2EC]`
- 一般頁面：`bg-[#F7F2EC]/95 backdrop-blur-xl`
- 邊框：`border-b border-border/30`

---

## 📝 使用範例

### 完整頁面範例

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AppBar } from '@/components/layout/app-bar'

export default function ExamplePage() {
  return (
    <>
      <AppBar title="範例頁面" />

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
        {/* 標準卡片 */}
        <Card className="p-6">
          <CardHeader className="p-6">
            <CardTitle className="text-lg font-semibold">卡片標題</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <p className="text-base leading-relaxed mb-4">
              這是卡片內容，遵循設計系統規範。
            </p>

            {/* 進度條 */}
            <Progress value={75} className="mb-6" />

            {/* 按鈕組 */}
            <div className="flex gap-3">
              <Button variant="default">確認</Button>
              <Button variant="ghost">取消</Button>
            </div>
          </CardContent>
        </Card>

        {/* 互動卡片 */}
        <Card interactive onClick={() => console.log('clicked')}>
          <div className="p-6">
            <h3 className="text-base font-medium mb-2">點擊我</h3>
            <p className="text-sm text-muted-foreground">
              這是一個互動卡片，hover 時會有動畫效果
            </p>
          </div>
        </Card>
      </main>
    </>
  )
}
```

---

## ✅ Checklist - 新組件開發

在開發新組件時，請確認：

- [ ] 使用定義的色彩變數 (`--primary`, `--muted`, etc.)
- [ ] 遵循間距系統 (8/12/16/24/32/48px)
- [ ] 使用統一圓角 (`rounded-2xl` for cards, `rounded-xl` for buttons)
- [ ] 使用 2 級陰影系統 (`--shadow-card`, `--shadow-card-hover`)
- [ ] 文字對比度符合 WCAG AA (4.5:1)
- [ ] 觸控目標最小 44x44px
- [ ] Hover/Active 狀態有適當回饋
- [ ] 響應式設計 (手機優先)
- [ ] 載入狀態使用 `UnifiedLoader`

---

## 🚫 常見錯誤

### ❌ 不要做

```tsx
// 使用任意數值
<div className="p-5 rounded-lg shadow-md" />

// 使用未定義的圓角
<Card className="rounded-3xl" />

// 使用未定義的陰影
<div className="shadow-2xl" />

// 使用任意間距
<div className="mb-7 gap-5" />

// 使用低對比度文字
<p className="text-gray-400">...</p>

// 觸控目標過小
<button className="h-8 w-8">X</button>
```

### ✅ 應該做

```tsx
// 使用設計系統 tokens
<div className="p-6 rounded-2xl shadow-sm" />

// 使用定義的圓角
<Card className="rounded-2xl" />

// 使用定義的陰影
<div style={{ boxShadow: 'var(--shadow-card)' }} />

// 使用統一間距
<div className="mb-6 gap-6" />

// 使用高對比度文字
<p className="text-muted-foreground">...</p>

// 符合觸控標準
<Button size="icon" className="h-11 w-11">X</Button>
```

---

## 📚 參考資源

- [WCAG 2.1 對比度檢查工具](https://webaim.org/resources/contrastchecker/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)

---

**維護者**: Development Team
**問題回報**: 發現不符合規範的組件請回報至 GitHub Issues

---

## 🗓️ 更新歷史

### v1.0.0 (2025-12-04)
- ✅ 修復 WCAG 對比度問題 (Issue #1.4.2)
- ✅ 移除冗餘 `.dark` CSS 區塊 (Issue #1.4.1)
- ✅ 建立統一間距系統 (8/12/16/24/32/48px)
- ✅ 建立統一圓角系統 (16px/24px/full)
- ✅ 建立統一陰影系統 (2-tier)
- ✅ 統一 AppBar 高度與樣式 (Issue #1.1.1)
- ✅ 統一 Card 組件內距為 24px
- ✅ 統一 Button 圓角為 rounded-xl
- ✅ 統一 Progress 漸變色
- ✅ 整合 Loader 組件 (Issue #1.5.1)
