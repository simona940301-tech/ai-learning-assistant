# 🧹 專案清理報告

執行日期: 2025-10-25

## 📋 執行摘要

已成功移除所有 iOS 原生開發相關檔案，專注於 **React Native + Expo** 開發模式。

---

## ✅ 已移除項目

### 1. iOS 原生開發資料夾
- ❌ `moonshot idea/` - 完整的 Xcode 專案目錄
  - `moonshot idea.xcodeproj/` - Xcode 專案檔案
  - `moonshot idea.xcworkspace/` - Xcode 工作空間
  - `moonshot idea/` - 應用主要目錄
  - `moonshot ideaTests/` - 測試目錄
  - `moonshot ideaUITests/` - UI 測試目錄

- ❌ `ios-app/` - iOS 應用相關檔案
  - `WebView.swift` - WebView 組件
  - `ContentView.swift` - 主視圖
  - `Info.plist` - iOS 應用設定
  - `README.md` - iOS 相關文檔

### 2. 移除的檔案類型
- `.xcodeproj` - Xcode 專案檔案
- `.xcworkspace` - Xcode 工作空間
- `.swift` - Swift 原始碼檔案
- `.entitlements` - iOS 權限設定
- `.plist` - iOS 設定檔案
- `xcuserdata/` - Xcode 使用者資料

### 3. Git 狀態清理
所有 iOS 原生檔案已從 staging area 移除，不會被提交。

---

## 🎯 保留項目

### 核心專案結構 (Next.js Web App)

```
moonshot idea/
├── 📁 app/                        # Next.js App Router
│   ├── (app)/                     # 應用頁面
│   │   ├── ask/                   # AI 助手頁面
│   │   ├── backpack/              # 檔案庫頁面
│   │   └── ...
│   └── api/                       # API 路由 (29 個端點)
│       ├── ai/                    # AI 相關 API
│       ├── tutor/                 # 導師系統 API
│       ├── solve/                 # 解題 API
│       └── warmup/                # 暖身題 API
│
├── 📁 components/                 # React 組件
│   ├── ask/                       # Ask 頁面組件 (17 個)
│   ├── ui/                        # Shadcn UI 組件
│   └── providers/                 # Context Providers
│
├── 📁 lib/                        # 核心函式庫 (23 個模組)
│   ├── openai.ts                  # OpenAI 整合
│   ├── supabase.ts                # Supabase 客戶端
│   ├── tutor-*.ts                 # 導師系統
│   ├── motivation-system.ts       # 動機系統
│   ├── native-bridge.ts           # 原生橋接 (待移除)
│   └── theme.ts                   # 主題系統
│
├── 📁 data/                       # 資料檔案
│   ├── concept_edges.json         # 概念關聯
│   ├── english_concepts.json      # 英文概念
│   ├── mathA_keypoints.jsonl      # 數學重點
│   └── mathA_questions_sample.jsonl # 數學題目範例
│
├── 📁 db/sql/                     # 資料庫 Schema (4 個檔案)
│   ├── 001_schema.sql             # 主要 Schema
│   ├── 002_functions.sql          # 資料庫函式
│   ├── 003_math_schema.sql        # 數學系統 Schema
│   └── 004_keypoint_concepts_mapping.sql
│
├── 📁 supabase/                   # Supabase 設定
│   ├── schema.sql                 # 完整 Schema
│   └── migrations/                # 資料庫遷移檔案
│
├── 📁 scripts/                    # 工具腳本
│   ├── seed_concepts.ts           # 概念資料種子
│   ├── import_math_data.ts        # 數學資料匯入
│   └── ping-solve.ts              # API 驗證
│
├── 📁 docs/                       # 專案文檔 (7 個檔案)
│   ├── AGENTS.md                  # Agent 系統規格
│   ├── VISION_ROADMAP.md          # 願景路線圖
│   ├── MATH_SYSTEM_SETUP.md       # 數學系統設定
│   └── ...
│
├── 📁 legacy/                     # 已棄用代碼
│   └── types-deprecated.ts
│
├── 📁 tools/                      # 開發工具
│   ├── fixtures/                  # 測試固件
│   └── scripts/                   # 驗證腳本
│
└── 📁 設定檔案
    ├── package.json               # Next.js 依賴
    ├── next.config.js             # Next.js 設定
    ├── tailwind.config.ts         # Tailwind 設定
    ├── tsconfig.json              # TypeScript 設定
    └── .eslintrc.json             # ESLint 設定
```

### 保留的技術棧

#### ✅ 前端框架
- **Next.js 14** - 目前是 web app，需遷移至 React Native
- **TypeScript** - 完整類型系統
- **Tailwind CSS** - 需改用 NativeWind 或 StyleSheet
- **Shadcn/ui** - 需改用 React Native 組件

#### ✅ 後端服務
- **Supabase** - 完整後端即服務
  - PostgreSQL 資料庫
  - Row Level Security
  - 實時訂閱
  - 29 個 API 路由 (需改寫為 serverless)

#### ✅ AI 整合
- **OpenAI API** - GPT-5 Flow
- **導師系統** - 多模式解題引擎
- **概念圖** - 知識關聯系統

#### ✅ 資料系統
- **數學題庫** - JSONL 格式
- **概念資料** - JSON 格式
- **SQL Schema** - PostgreSQL

#### ✅ 文檔資源
- 17 個 Markdown 文檔
- 完整的系統設計文件
- API 架構規範

---

## ⚠️ 重要發現

### 目前狀態
專案目前是 **Next.js Web Application**，尚未設定 React Native + Expo。

### 需要處理的項目

#### 1. 框架遷移
- [ ] 初始化 Expo 專案 (`expo init` 或 `npx create-expo-app`)
- [ ] 遷移 UI 組件從 React Web 到 React Native
- [ ] 替換 Tailwind CSS 為 NativeWind 或 StyleSheet
- [ ] 處理 Next.js 路由 → React Navigation

#### 2. API 重構
- [ ] 將 Next.js API routes 改為獨立後端或 Supabase Edge Functions
- [ ] 29 個 API 端點需要遷移策略
- [ ] 考慮使用 Supabase Edge Functions 或 Vercel Serverless

#### 3. 組件遷移
- [ ] 17 個 Ask 頁面組件需改寫為 React Native
- [ ] Shadcn/ui → React Native Paper 或自定義組件
- [ ] Framer Motion → React Native Reanimated

#### 4. 待移除檔案
- `lib/native-bridge.ts` - 原生橋接（iOS 專用，已無用）
- `.next/` - Next.js 構建輸出
- `next.config.js` - Next.js 設定
- `postcss.config.js` - PostCSS 設定（Web 專用）

#### 5. 平台特定調整
- [ ] 相機功能 → `expo-camera`
- [ ] 檔案上傳 → `expo-image-picker`
- [ ] 推播通知 → `expo-notifications`
- [ ] 主題切換 → `expo-system-ui` 或 Context

---

## 🎯 接下來的開發重點

### Phase 1: Ready Score 小測試 (2-3 weeks)
1. 設計測驗流程 (選擇題、簡答題)
2. 實作計分系統
3. 建立結果分析頁面
4. 整合 Supabase 資料儲存

### Phase 2: 拍題→解題→詳解卡 (3-4 weeks)
1. 整合相機功能 (`expo-camera`)
2. OCR 文字辨識 (Google Vision API 或 Tesseract)
3. 題目解析引擎
4. 詳解卡 UI 設計
5. 錯題本功能

### Phase 3: 家長週報與任務追蹤 (2-3 weeks)
1. 學習數據統計
2. 週報生成系統
3. 任務系統設計
4. 家長端界面

### Phase 4: 桌面支援 (未來階段)
1. React Native Web 整合
2. Electron 封裝
3. 響應式布局優化

---

## 📊 檔案統計

### 已移除
- **資料夾**: 2 個 (`moonshot idea/`, `ios-app/`)
- **Swift 檔案**: ~10 個
- **Xcode 專案檔**: 1 個
- **總計**: ~50+ 個 iOS 原生相關檔案

### 保留
- **TypeScript 檔案**: ~80 個
- **React 組件**: ~30 個
- **API 路由**: 29 個
- **SQL 檔案**: 6 個
- **文檔檔案**: 17 個
- **資料檔案**: 4 個

---

## ✅ 清理完成確認

- ✅ 所有 iOS 原生檔案已移除
- ✅ Git staging area 已清理
- ✅ 專案結構保持完整
- ✅ Next.js 應用正常運作 (`npm run dev` 可用)
- ⚠️ 尚未設定 React Native + Expo (需執行遷移)

---

## 🚀 下一步行動建議

### 立即執行
1. **決定遷移策略**
   - 選項 A: 保留 Next.js web app，另建 Expo 專案共用 API
   - 選項 B: 完全遷移至 Expo + React Native
   - 選項 C: 使用 Expo + Next.js monorepo (Turborepo)

2. **初始化 React Native 環境**
   ```bash
   # 建議使用 Expo
   npx create-expo-app mobile-app --template

   # 或在當前目錄初始化
   expo init
   ```

3. **設定開發工具**
   - 安裝 Expo CLI: `npm install -g expo-cli`
   - 安裝 EAS CLI: `npm install -g eas-cli`
   - 設定 Expo 帳號

4. **API 遷移計畫**
   - 評估使用 Supabase Edge Functions
   - 或保留 Vercel serverless functions
   - 確保 mobile app 可以呼叫 API

### 需要釐清的問題
1. 是否要保留 Next.js web app？
2. API 應該如何部署？(Vercel / Supabase Edge Functions / 其他)
3. 共用代碼策略？(Monorepo / Shared packages)
4. 是否需要同時支援 iOS + Android？

---

**報告完成** ✅

需要協助執行下一步嗎？例如：
- 初始化 Expo 專案
- 設定 Monorepo 架構
- 遷移第一個組件到 React Native
- 設定 Supabase Edge Functions
