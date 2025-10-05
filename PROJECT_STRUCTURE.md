# 📁 完整檔案結構

```
edu-app/
├── app/
│   ├── (app)/                          # 主應用程式群組
│   │   ├── layout.tsx                  # App layout with TabBar
│   │   ├── community/
│   │   │   └── page.tsx                # 社群動態頁 (類 Threads)
│   │   ├── play/
│   │   │   └── page.tsx                # 每日任務頁
│   │   ├── ask/
│   │   │   └── page.tsx                # AI 助教頁 (重點整理/解題)
│   │   ├── backpack/
│   │   │   └── page.tsx                # 學習資料管理頁
│   │   ├── store/
│   │   │   └── page.tsx                # 教材商城頁
│   │   └── profile/
│   │       └── page.tsx                # 個人檔案頁
│   │
│   ├── api/
│   │   └── ai/
│   │       └── route.ts                # Gemini AI Proxy API
│   │
│   ├── layout.tsx                      # Root layout
│   ├── page.tsx                        # Home redirect
│   └── globals.css                     # Global styles & themes
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── dialog.tsx
│   │   ├── separator.tsx
│   │   └── input.tsx
│   │
│   ├── layout/                         # Layout components
│   │   ├── tab-bar.tsx                 # Bottom navigation
│   │   └── app-bar.tsx                 # Top navigation with avatar
│   │
│   └── providers/
│       └── theme-provider.tsx          # Theme context provider
│
├── lib/
│   ├── utils.ts                        # Utility functions (cn)
│   └── supabase.ts                     # Supabase client & types
│
├── public/                             # Static assets
│
├── .env.local.example                  # Environment variables template
├── .gitignore
├── next.config.js
├── tailwind.config.ts                  # Tailwind configuration
├── postcss.config.js
├── tsconfig.json
├── package.json
├── README.md
└── PROJECT_STRUCTURE.md               # This file
```

## 🎨 頁面對應

| 路由 | 檔案 | 功能 |
|------|------|------|
| `/community` | `app/(app)/community/page.tsx` | 社群動態 |
| `/play` | `app/(app)/play/page.tsx` | 每日任務 |
| `/ask` | `app/(app)/ask/page.tsx` | AI 助教 |
| `/backpack` | `app/(app)/backpack/page.tsx` | 學習書包 |
| `/store` | `app/(app)/store/page.tsx` | 教材商城 |
| `/profile` | `app/(app)/profile/page.tsx` | 個人檔案 |

## 🔌 API 路由

| 端點 | 檔案 | 功能 |
|------|------|------|
| `POST /api/ai` | `app/api/ai/route.ts` | Gemini AI 代理 |

## 🧩 核心元件

### Layout Components
- **TabBar** (`components/layout/tab-bar.tsx`) - 底部五個主要分頁
- **AppBar** (`components/layout/app-bar.tsx`) - 頂部標題與使用者頭像

### UI Components (shadcn/ui)
- Button, Card, Avatar, Tabs, Dialog, Separator, Input
- 所有元件支援深色/淺色主題

## 🎯 設計系統

### 色彩模式
- **Light Mode**: 白底黑字 (hsl(0 0% 100%) / hsl(0 0% 0%))
- **Dark Mode**: 黑底白字 (hsl(0 0% 0%) / hsl(0 0% 100%))
- **Radius**: 1rem (圓角設定)

### 動畫
- Framer Motion - 頁面進入動效
- Tailwind Animate - 元件過渡效果
- 動畫時長: 150-200ms

## 📦 主要依賴

- **Next.js 14** - App Router
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Headless UI components
- **Framer Motion** - Animation library
- **Supabase** - Backend (Auth, DB, Storage)
- **Lucide React** - Icon library
- **next-themes** - Theme switching

## 🚀 開始開發

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.local.example .env.local

# 啟動開發伺服器
npm run dev
```
