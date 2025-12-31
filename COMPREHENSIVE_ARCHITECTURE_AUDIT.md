# 🏗️ PLMS 專案完整架構審查報告

> **審查日期**: 2025-01-XX  
> **審查範圍**: 全專案架構、頁面、功能、資料流、RAG/AI 系統  
> **審查者**: 資深全端架構師

---

## 0. Repo Overview

### 專案類型
**Monorepo** (Turborepo + pnpm workspaces)

### Apps / Services 結構

| 目錄 | 類型 | 描述 | 技術棧 |
|------|------|------|--------|
| `apps/web` | Web App | Next.js 14 主應用（前端 + API） | Next.js 14, React 18, TypeScript, Tailwind, Supabase |
| `apps/mobile` | Mobile App | Expo React Native 應用 | Expo ~50, React Native 0.73, Expo Router |
| `packages/shared` | Shared SDK | 共用業務邏輯與型別定義 | TypeScript, Zod, tsup |
| `packages/server` | Server Services | Chick 系統服務（WebSocket 相關） | TypeScript |
| `packages/pdf-native-core` | Native Module | Rust PDF 解析器 | Rust, Cargo |

### 前端主要位置
- **Web**: `apps/web/app/` (Next.js App Router)
- **Mobile**: `apps/mobile/app/` (Expo Router)

### 後端 / API 主要位置
- **API Routes**: `apps/web/app/api/` (124+ 個 API 端點)
- **Server Services**: `packages/server/chick/` (WebSocket 服務)
- **Service Layer**: `apps/web/lib/services/` (21 個服務模組)
- **DAL/Repo Layer**: `apps/web/lib/dal/` (資料存取層)

### RAG / AI 相關程式位置
- **AI 核心**: `apps/web/lib/ai/` (universal-explainer, aura-contract, route-solver 等)
- **RAG 服務**: 
  - `apps/web/lib/services/rag-summary.ts` (摘要生成)
  - `apps/web/lib/services/rag-question-generator.ts` (題目生成)
  - `apps/web/app/api/rag/` (RAG API 端點)
- **Embeddings**: 
  - `apps/web/lib/ai/embedding.ts`
  - `apps/web/lib/services/embeddings.ts`
  - `apps/web/lib/tutor-utils.ts` (generateEmbedding)
- **向量資料庫**: Supabase PostgreSQL + pgvector extension
- **向量搜尋**: `db/sql/002_functions.sql` (match_concepts, search_doc_chunks)

---

## 1. Pages & Feature Map

### 主要頁面路由

| Route / Path | 檔案路徑 | 頁面用途 / 功能簡述 | 核心功能模組 |
|--------------|----------|---------------------|--------------|
| `/` | `apps/web/app/page.tsx` | 首頁（重定向） | 路由重定向 |
| `/home` | `apps/web/app/(app)/home/page.tsx` | 首頁儀表板 | 學習進度、任務概覽 |
| `/play` | `apps/web/app/(app)/play/page.tsx` | 知識對戰主頁 | 對戰模式選擇、WebSocket 連接、狀態管理 |
| `/play/practice/[roomCode]` | `apps/web/app/(app)/play/practice/[roomCode]/page.tsx` | 無限練習室 | 多人練習、TikTok 式刷題 |
| `/ask` | `apps/web/app/(app)/ask/page.tsx` | AI 助教頁 | 解題、重點統整、AI 詳解生成 |
| `/backpack` | `apps/web/app/(app)/backpack/page.tsx` | 學習書包 | 筆記管理、檔案上傳、RAG 檢索 |
| `/error-book` | `apps/web/app/(app)/error-book/page.tsx` | 錯題本 | 錯題管理、複習模式 |
| `/error-book/[id]` | `apps/web/app/(app)/error-book/[id]/page.tsx` | 錯題詳情 | 錯題詳解、練習 |
| `/profile` | `apps/web/app/(app)/profile/page.tsx` | 個人檔案 | 用戶資料、設定、成就 |
| `/community` | `apps/web/app/(app)/community/page.tsx` | 社群動態 | 貼文、留言、互動 |
| `/store` | `apps/web/app/(app)/store/page.tsx` | 教材商城 | 題本下載、購買 |
| `/store-shop` | `apps/web/app/(app)/store-shop/page.tsx` | 商店頁 | 商品瀏覽 |
| `/dashboard` | `apps/web/app/(app)/dashboard/page.tsx` | 儀表板 | 學習數據統計 |
| `/dashboard/enhanced` | `apps/web/app/(app)/dashboard/enhanced/page.tsx` | 增強儀表板 | 進階數據分析 |
| `/onboarding/*` | `apps/web/app/onboarding/**/page.tsx` | 新手引導流程 | 12 個步驟頁面（welcome, basic-info, goal, challenge, avatar, review 等） |
| `/login` | `apps/web/app/(auth)/login/page.tsx` | 登入頁 | Supabase Auth |
| `/auth/callback` | `apps/web/app/(auth)/auth/callback/page.tsx` | 認證回調 | OAuth 回調處理 |
| `/admin/*` | `apps/web/app/admin/**/page.tsx` | 管理後台 | 題目匯入、審核、大學管理 |
| `/preview` | `apps/web/app/preview/page.tsx` | 預覽模式 | 開發預覽 |
| `/qr/[alias]` | `apps/web/app/qr/[alias]/page.tsx` | QR 碼入口 | 題本 QR 碼掃描 |
| `/test-question` | `apps/web/app/test-question/page.tsx` | 測試頁 | 開發測試 |
| `/test-streaming` | `apps/web/app/test-streaming/page.tsx` | 串流測試 | AI 串流測試 |
| `/dev-tools` | `apps/web/app/dev-tools/page.tsx` | 開發工具 | 開發輔助工具 |

### 主要功能模組

#### 共用元件
- **Layout**: `components/layout/tab-bar.tsx`, `components/layout/app-bar.tsx`
- **UI Components**: `components/ui/` (29 個 shadcn/ui 元件)
- **Battle Components**: `components/play/` (38 個對戰相關元件)
- **Ask Components**: `components/ask/` (28 個 AI 助教元件)
- **Backpack Components**: `components/backpack/` (34 個書包管理元件)
- **Solve Components**: `components/solve/` (54 個解題元件)

#### 關鍵 Hooks / Context
- **`usePlay`** (`lib/play-context.tsx`): 對戰狀態管理、WebSocket 連接
- **`useAsk`** (`lib/ask-context.tsx`): AI 助教狀態、檔案管理
- **`useTutorFlow`** (`lib/use-tutor-flow.ts`): 舊版導師流程
- **`useTutorFlowV2`** (`lib/use-tutor-flow-v2.ts`): 新版導師流程
- **`useChickStore`** (`src/store/chickStore.ts`): Chick 寵物系統狀態

#### 主要 Store / Context
- **React Context API**: 
  - `AskContext` (`lib/ask-context.tsx`)
  - `PlayContext` (`lib/play-context.tsx`)
  - `CompanionContext` (`lib/companion-context.tsx`)
- **Zustand**: 
  - `chickStore` (`src/store/chickStore.ts`)

---

## 2. User Flows & Interaction Logic

### Flow 1: 首次進入 → 註冊/登入 → 新手引導 → 主頁

```
1. 用戶訪問 `/` → 重定向到 `/home` 或 `/onboarding`
2. 檢查認證狀態 (`middleware.ts`, `getCurrentUser`)
   - 未登入 → `/login`
   - 已登入但未完成 onboarding → `/onboarding/welcome`
3. 新手引導流程 (`/onboarding/*`)
   - welcome → basic-info → goal → challenge → avatar → review → complete
   - 每個步驟呼叫 `/api/onboarding/session` 更新進度
4. 完成後 → `/play` 或 `/home`
```

**涉及檔案**:
- `apps/web/middleware.ts` (認證檢查)
- `apps/web/app/(auth)/auth/callback/page.tsx` (OAuth 回調)
- `apps/web/app/onboarding/**/page.tsx` (12 個步驟頁面)
- `apps/web/app/api/onboarding/session/route.ts` (進度管理)

**問題標記**:
- ⚠️ **巢狀很深**: 12 個 onboarding 步驟，容易迷路
- ⚠️ **重複邏輯**: 多個 onboarding 頁面都有類似的狀態檢查

---

### Flow 2: 知識對戰流程（PVE / PVP）

```
1. 用戶進入 `/play` → 選擇對戰模式
   - 系統對戰 (PVE_TRAINING, PVE_CHALLENGE, PVE_TUTORIAL)
   - 自訂對戰 (PVP)
   - 內容貢獻 (UGC)
   - 無限練習 (Practice Room)
2. 建立 WebSocket 連接 (`lib/play-context.tsx`)
   - 連接 `ws://.../ws/battle`
   - 發送 AUTH 消息
3. 發送 START_MATCH 消息
   - PVE: 直接開始，收到 MATCH_FOUND
   - PVP: 進入匹配隊列，收到 LOBBY_CONFIRMING
4. 確認對戰 (CONFIRM_LOBBY) → 收到 ROUND_STARTED
5. 答題循環:
   - 顯示題目 (`BattleQuestionV3`)
   - 用戶選擇答案 → 發送 SUBMIT_ANSWER
   - 收到 ANSWER_RESULT → 更新分數
   - 收到 ROUND_RESOLVED → 等待下一題
6. 對戰結束 → 收到 BATTLE_END
   - 呼叫 `/api/play/progression/apply-battle` 更新進度
   - 顯示結果 (`GamifiedMatchResultModal`)
```

**涉及檔案**:
- `apps/web/app/(app)/play/page.tsx` (主頁)
- `apps/web/lib/play-context.tsx` (狀態管理)
- `components/play/BattleQuestionV3.tsx` (題目顯示)
- `packages/server/chick/` (WebSocket 服務)
- `apps/web/app/api/play/battle/events/route.ts` (對戰事件)

**問題標記**:
- ⚠️ **複雜狀態管理**: `battleState` 包含 20+ 個欄位，容易不同步
- ⚠️ **競態條件**: 前端 timer 和後端 WebSocket 消息可能不同步
- ⚠️ **錯誤處理不足**: WebSocket 斷線重連邏輯不完整

---

### Flow 3: AI 解題流程（Ask 頁面）

```
1. 用戶進入 `/ask` → 選擇模式 (solve / summary)
2. 輸入題目文字 → 點擊送出
3. 前端呼叫 `/api/ai/route-solver` (Hybrid Solver)
   - 返回 subject hint, expert tags, retrieval metadata
4. 前端呼叫 `/api/exec/similar` (相似題檢索)
5. 前端呼叫 `/api/explain` (詳解生成)
   - 使用 Universal Explainer pipeline
   - 三層降級: Universal → Basic → Minimal
6. 顯示詳解卡 (`ExplainCardV2`)
   - 題目、答案、解析、步驟
7. 用戶可選擇:
   - 存入書包 → `/api/notebook/save`
   - 再練一題 → 清空狀態
   - 追問 → `/api/ai/followup`
```

**涉及檔案**:
- `apps/web/app/(app)/ask/page.tsx` (主頁)
- `components/ask/AnySubjectSolver.tsx` (解題邏輯)
- `apps/web/lib/ai/route-solver.ts` (路由解析)
- `apps/web/lib/ai/universal-explainer.ts` (詳解生成)
- `apps/web/app/api/explain/route.ts` (詳解 API)

**問題標記**:
- ⚠️ **多個 API 呼叫**: 需要 3+ 個串行 API 呼叫，延遲高
- ⚠️ **狀態分散**: 詳解、相似題、重點分別管理，容易不同步
- ⚠️ **重複邏輯**: `ExplanationCard` 和 `ExplanationCardV2` 功能重疊

---

### Flow 4: 書包檔案上傳與 RAG 檢索

```
1. 用戶進入 `/backpack` → 點擊上傳
2. 選擇檔案 (PDF/圖片) → 上傳到 Supabase Storage
3. 呼叫 `/api/backpack/upload` → 儲存到 `backpack_items` 表
4. 如果是 PDF，呼叫 OCR (`/api/backpack/ocr`)
5. RAG 處理 (如果啟用):
   - 呼叫 `/api/rag/upload` → 切 chunk → 生成 embedding → 存入 `doc_chunks` 表
6. 用戶在 Ask 頁面使用書包檔案:
   - 選擇檔案 → 匯入到 Ask
   - 呼叫 `/api/backpack/ask` → RAG 檢索相關 chunks
   - 將 chunks 作為 context 傳給 AI
```

**涉及檔案**:
- `apps/web/app/(app)/backpack/page.tsx` (主頁)
- `apps/web/app/api/backpack/upload/route.ts` (上傳)
- `apps/web/app/api/rag/upload/route.ts` (RAG 處理)
- `apps/web/lib/services/mcp/backpack.ts` (retrieve_doc_chunks)

**問題標記**:
- ⚠️ **非同步處理**: RAG embedding 生成可能很慢，沒有進度提示
- ⚠️ **錯誤處理**: PDF 解析失敗時沒有明確錯誤訊息

---

### Flow 5: 錯題本複習流程

```
1. 用戶在對戰中答錯 → 自動加入錯題本
   - 呼叫 `/api/error-book` (POST)
2. 用戶進入 `/error-book` → 查看錯題列表
3. 點擊錯題 → 進入 `/error-book/[id]`
4. 選擇練習模式:
   - 直接練習 → 呼叫 `/api/error-book/practice`
   - 生成相似題 → 呼叫 RAG 題目生成
5. 練習完成 → 更新錯題狀態
```

**涉及檔案**:
- `apps/web/app/(app)/error-book/page.tsx` (列表)
- `apps/web/app/(app)/error-book/[id]/page.tsx` (詳情)
- `apps/web/app/api/error-book/route.ts` (CRUD)
- `apps/web/app/api/error-book/practice/route.ts` (練習)

---

## 3. Data Model & Storage Logic

### 主要資料來源與儲存方式

#### 資料庫 (Supabase PostgreSQL)
- **Schema 位置**: 
  - `apps/web/supabase/schema.sql` (主要 schema)
  - `apps/web/supabase/migrations/` (15 個 migration 檔案)
  - `db/sql/` (40 個 SQL 檔案，包含向量搜尋函式)

#### 核心 Domain 與 Tables

##### 1. 用戶系統 (User Domain)
- **Tables**:
  - `profiles` (`apps/web/supabase/schema.sql:5-15`)
    - 欄位: `id`, `username`, `avatar_url`, `bio`, `xp`, `coins`, `streak`, `role`
  - `auth.users` (Supabase Auth 內建)
- **TypeScript Types**:
  - `packages/shared/types/user.ts` (UserSchema)
- **API**:
  - `apps/web/app/api/profile/route.ts` (GET, PUT)
  - `apps/web/app/api/profile/upload-avatar/route.ts`

##### 2. 題目系統 (Question Domain)
- **Tables**:
  - `pack_questions` (推測，未在 schema.sql 中看到，但在 API 中大量使用)
  - `seed_questions` (推測，用於 PVE 對戰)
  - `ugc_questions` (用戶生成題目)
  - `packs` (題本)
- **TypeScript Types**:
  - `packages/shared/types/question.ts` (QuestionSchema)
  - `packages/shared/types/pack.ts` (PackSchema)
- **API**:
  - `apps/web/app/api/play/questions/battle/route.ts`
  - `apps/web/app/api/play/ugc-questions/route.ts`
  - `apps/web/app/api/packs/route.ts`

**問題標記**:
- ⚠️ **Schema 不完整**: `schema.sql` 中沒有 `pack_questions` 等核心表的定義
- ⚠️ **命名不一致**: `pack_questions` vs `seed_questions` vs `ugc_questions`

##### 3. 對戰系統 (Battle Domain)
- **Tables**:
  - `battle_events` (推測，用於記錄對戰事件)
  - `battle_matches` (推測，用於匹配記錄)
- **API**:
  - `apps/web/app/api/play/battle/events/route.ts`
  - `apps/web/app/api/play/battle/update-elo/route.ts`
- **WebSocket**: `packages/server/chick/` (實時對戰)

**問題標記**:
- ⚠️ **資料結構不明**: 對戰相關表的 schema 未在 `schema.sql` 中定義

##### 4. 學習資料系統 (Backpack Domain)
- **Tables**:
  - `backpack_items` (`apps/web/supabase/schema.sql:60-74`)
    - 欄位: `id`, `user_id`, `subject`, `type`, `title`, `content`, `file_url`
  - `backpack_notes` (`apps/web/supabase/schema.sql:113-121`)
    - 欄位: `id`, `user_id`, `question`, `canonical_skill`, `note_md`
  - `notebook_entries` (推測，在 API 中使用但未在 schema.sql 中定義)
  - `files` (RAG 檔案表，推測)
  - `doc_chunks` (RAG chunks 表，推測，包含 `embedding vector(1536)`)
- **TypeScript Types**:
  - `apps/web/lib/types.ts` (BackpackFile)
- **API**:
  - `apps/web/app/api/backpack/route.ts` (GET, DELETE)
  - `apps/web/app/api/notebook/save/route.ts`

**問題標記**:
- ⚠️ **表結構不一致**: `backpack_items` vs `notebook_entries` vs `backpack_notes` 功能重疊
- ⚠️ **RAG 表未定義**: `files` 和 `doc_chunks` 表未在 `schema.sql` 中

##### 5. 錯題本系統 (Error Book Domain)
- **Tables**:
  - `error_book` (在 migration 中定義，`supabase/migrations/20251026_05_optimize_sampler_performance.sql:16-25`)
    - 欄位: `id`, `user_id`, `question_id`, `status`, `last_attempted_at`, `notes`, `knowledge_tags`
- **TypeScript Types**:
  - `packages/shared/types/errorBook.ts` (ErrorItemSchema)
- **API**:
  - `apps/web/app/api/error-book/route.ts` (GET, POST, DELETE)

##### 6. 任務系統 (Mission Domain)
- **Tables**:
  - `missions` (推測)
  - `daily_missions` (推測)
- **TypeScript Types**:
  - `packages/shared/types/mission.ts` (MissionSchema)
- **API**:
  - `apps/web/app/api/missions/route.ts`
  - `apps/web/app/api/missions/daily/route.ts`

##### 7. 概念系統 (Concept Domain) - RAG 相關
- **Tables**:
  - `concepts` (`db/sql/001_schema.sql:5-28`)
    - 欄位: `id`, `subject`, `category`, `name`, `definition`, `embedding vector(1536)`
  - `concept_edges` (`db/sql/001_schema.sql:35-41`)
    - 欄位: `src_id`, `dst_id`, `relation`, `weight`
- **向量搜尋函式**:
  - `match_concepts` (`db/sql/002_functions.sql:2-24`)
  - `search_doc_chunks` (推測，在 `retrieve_doc_chunks` 中使用)

### 資料流簡圖

```
使用者操作 (前端)
  ↓
API Route (apps/web/app/api/*/route.ts)
  ↓
Service Layer (apps/web/lib/services/*.ts)
  ↓
DAL/Repo Layer (apps/web/lib/dal/*-repo.ts)
  ↓
Supabase Client (lib/supabase.ts)
  ↓
PostgreSQL Database
```

**狀態管理流程**:
```
前端組件
  ↓
React Context (usePlay, useAsk)
  ↓
API 呼叫
  ↓
更新 Context 狀態
  ↓
UI 重新渲染
```

### 資料結構問題

1. **重複定義**:
   - `backpack_items` vs `notebook_entries` vs `backpack_notes` 功能重疊
   - `pack_questions` vs `seed_questions` vs `ugc_questions` 命名不一致

2. **Schema 不完整**:
   - `schema.sql` 中缺少多個核心表的定義
   - RAG 相關表 (`files`, `doc_chunks`) 未在主要 schema 中

3. **型別不一致**:
   - 前端使用 `BackpackFile`，但後端可能返回不同格式
   - API 回應格式不統一（有些用 `success: true`，有些用 `ok: true`）

---

## 4. RAG / AI System Overview

### AI / LLM 相關功能

#### 1. 解題詳解生成 (Explain System)
- **功能名稱**: Universal Explainer
- **觸發頁面**: `/ask` (solve 模式)
- **API**: `/api/explain`
- **實作檔案**: 
  - `apps/web/lib/ai/universal-explainer.ts`
  - `apps/web/app/api/explain/route.ts`
- **模型**: OpenAI GPT-4o / GPT-4o-mini
- **流程**:
  1. 接收題目文字
  2. 三層降級機制:
     - Layer 1: Universal Explainer (完整解釋)
     - Layer 2: Basic Extractor (基本解釋)
     - Layer 3: Minimal Fallback (最小解釋，永遠不失敗)
  3. 返回 Markdown 格式詳解

#### 2. 相似題檢索 (Similar Questions)
- **功能名稱**: Similar Question Retrieval
- **觸發頁面**: `/ask` (solve 模式)
- **API**: `/api/exec/similar`
- **實作檔案**: `apps/web/app/api/exec/similar/route.ts` (推測)
- **技術**: 向量相似度搜尋 (pgvector)

#### 3. 重點統整 (Summary)
- **功能名稱**: Document Summary
- **觸發頁面**: `/ask` (summary 模式)
- **API**: `/api/ai/summarize`
- **實作檔案**: 
  - `apps/web/lib/services/rag-summary.ts`
  - `apps/web/lib/ai/summary-pipeline.ts`
- **模型**: Google Gemini 1.5 Flash
- **功能**:
  - 抽取式摘要 (extractiveSummary)
  - 關鍵詞提取 (extractKeywords)
  - 文件主題生成 (generateDocumentTheme)

#### 4. 題目路由解析 (Route Solver)
- **功能名稱**: Hybrid Route Solver
- **觸發頁面**: `/ask` (solve 模式)
- **API**: `/api/ai/route-solver`
- **實作檔案**: `apps/web/lib/ai/route-solver.ts`
- **模型**: OpenAI GPT-4o-mini
- **功能**:
  - 題型判斷 (Hard Guard)
  - 專家標籤匹配 (Expert Probes)
  - 科目推斷 (Subject Hint)
  - Aura Contract Pipeline (生成結構化詳解)

#### 5. 概念標籤 (Concept Tagging)
- **功能名稱**: Concept Tagger
- **觸發時機**: 錯題加入時自動標籤
- **API**: `/api/ai/concept`
- **實作檔案**: `apps/web/lib/concept-tagger.ts`
- **模型**: OpenAI GPT-4o-mini

#### 6. 追問生成 (Follow-up)
- **功能名稱**: Follow-up Question Generation
- **觸發頁面**: `/ask` (詳解卡中的追問)
- **API**: `/api/ai/followup`
- **實作檔案**: `apps/web/app/api/ai/followup/route.ts` (推測)

#### 7. Avatar 生成 (Avatar Generation)
- **功能名稱**: Gemini Avatar Generator
- **觸發頁面**: `/onboarding/avatar`
- **API**: `/api/avatar/generate`
- **實作檔案**: `apps/web/lib/avatar/gemini-avatar-generator.ts`
- **模型**: Google Gemini (Vision API)

### RAG 流程詳解

#### 階段 1: 資料收集 / 匯入 (Ingestion)

**檔案來源**:
- 用戶上傳: PDF、圖片 (透過 `/api/backpack/upload`)
- 資料庫: 現有題目、文件

**檔案處理方式**:
- **PDF 解析**: 
  - `apps/web/lib/pdf/` (座標工具、圖片偵測)
  - `packages/pdf-native-core/` (Rust PDF 解析器)
- **OCR**: `/api/backpack/ocr` (圖片文字識別)
- **Chunk 切割**: 推測在 `/api/rag/upload` 中處理

**對應程式碼位置**:
- `apps/web/app/api/backpack/upload/route.ts`
- `apps/web/app/api/rag/upload/route.ts`
- `apps/web/lib/services/mcp/backpack.ts` (init_backpack_file_upload)

#### 階段 2: 向量化與索引 (Embedding & Index)

**Embedding 模型**:
- OpenAI `text-embedding-3-large` (1536 維)
- 實作: `apps/web/lib/tutor-utils.ts:55-80` (generateEmbedding)

**向量儲存**:
- Supabase PostgreSQL + pgvector extension
- 表: `concepts` (concept embeddings), `doc_chunks` (document chunks)

**建立索引流程**:
- `apps/web/lib/services/mcp/backpack.ts:54-103` (retrieve_doc_chunks)
- 使用 Supabase RPC: `search_doc_chunks` (推測)

**對應程式碼位置**:
- `apps/web/lib/ai/embedding.ts`
- `apps/web/lib/services/embeddings.ts`
- `db/sql/001_schema.sql:25` (embedding vector(1536))
- `db/sql/002_functions.sql:2-24` (match_concepts 函式)

#### 階段 3: 查詢與生成 (Query & Generation)

**查詢組合**:
- 用戶 query → 生成 embedding → 向量相似度搜尋
- 過濾: 只搜尋用戶自己的檔案 (`user_id` 過濾)

**Chunk 過濾與排序**:
- 使用 `match_threshold: 0.2` (相似度閾值)
- `match_count: 6` (返回 top 6 chunks)
- 按相似度排序 (cosine similarity)

**Prompt 組合**:
- 將檢索到的 chunks 作為 context 加入 prompt
- 傳給 AI 模型生成回答

**對應程式碼位置**:
- `apps/web/lib/services/mcp/backpack.ts:79-84` (RPC 呼叫)
- `apps/web/app/api/backpack/ask/route.ts` (推測，RAG 查詢端點)

### RAG / AI 系統問題

1. **重複的 Pipeline**:
   - `universal-explainer` vs `aura-contract` vs `basic-extractor` 功能重疊
   - 多個 prompt 模板散落在不同檔案

2. **錯誤處理不足**:
   - Embedding 生成失敗時沒有明確 fallback
   - RAG 查詢超時沒有處理

3. **效能瓶頸**:
   - 同步處理大量檔案 embedding（應該改為非同步佇列）
   - 向量搜尋沒有快取機制

4. **缺乏監控**:
   - 沒有追蹤 RAG 查詢的 latency、成功率
   - 沒有監控 embedding 生成的成本

---

## 5. Cross-cutting Concerns

### 登入與驗證 (Auth)

**方案**: Supabase Auth (JWT-based)

**驗證邏輯位置**:
- **Middleware**: `apps/web/middleware.ts` (Edge-level 認證)
- **API Guard**: `apps/web/lib/api/auth.ts` (getApiUser, getCurrentUser)
- **Server Client**: `apps/web/lib/supabase/server.ts` (createClient)

**權限分級**:
- **一般用戶**: 通過 JWT 驗證即可
- **管理員**: 檢查 `profiles.role === 'admin'` (`middleware.ts:260-314`)
- **服務間**: API Key 驗證 (`middleware.ts:327-377`)

**問題標記**:
- ⚠️ **Mock 模式**: 開發環境跳過認證，可能導致安全漏洞
- ⚠️ **權限檢查不一致**: 部分 API 在 middleware 檢查，部分在 route 內檢查

### 錯誤處理與觀察性

**錯誤邊界**:
- `components/error-boundary.tsx` (React Error Boundary)
- `apps/web/app/error.tsx` (Next.js Error Page)
- `apps/web/app/global-error.tsx` (Global Error Handler)

**Logging**:
- Console 日誌 (大量使用 `console.log`, `console.error`)
- 沒有集中式 logger
- 沒有 Sentry 或其他錯誤追蹤服務整合

**Analytics**:
- `packages/shared/analytics/` (Analytics 介面)
- 20+ 個預定義事件
- 批次上傳: `/api/analytics/batch`

**問題標記**:
- ⚠️ **缺乏集中式錯誤處理**: 錯誤處理散落在各處
- ⚠️ **沒有錯誤追蹤服務**: 生產環境錯誤難以追蹤

### 設定與環境變數管理

**環境變數使用**:
- `.env.local` (本地開發)
- `process.env.*` (直接使用，沒有集中 config)

**Config 模組**:
- `packages/shared/config/flags.ts` (Feature Flags, 14 個 flags)
- `apps/web/lib/feature-flags.ts` (Web 專用 flags)
- `apps/web/lib/env-validation.ts` (環境變數驗證)

**問題標記**:
- ⚠️ **Config 分散**: 環境變數散落在各處，沒有集中管理
- ⚠️ **型別不安全**: 環境變數沒有 TypeScript 型別定義

---

## 6. Top 10 Engineering Improvement Proposals

### 1. 統一資料模型：合併重複的筆記/書包表結構

**類別**: `架構簡化 / 重構`, `資料模型整併`

**問題現況**:
- 目前有三個功能重疊的表：
  - `backpack_items` (`apps/web/supabase/schema.sql:60-74`)
  - `notebook_entries` (在 API 中使用但未在 schema.sql 中定義)
  - `backpack_notes` (`apps/web/supabase/schema.sql:113-121`)
- 前端使用 `BackpackFile` 型別，但後端返回格式不一致
- API 回應格式不統一（`success: true` vs `ok: true`）

**為什麼這是問題**:
- **可維護性**: 三個表維護成本高，容易出現資料不一致
- **學習曲線**: 新開發者需要理解三套不同的資料結構
- **錯誤風險**: 資料可能寫入錯誤的表，導致遺失

**具體改善方案**:
1. **階段 1**: 建立統一的 `backpack_items` 表結構，包含所有必要欄位
2. **階段 2**: 建立 migration script，將 `notebook_entries` 和 `backpack_notes` 資料遷移到 `backpack_items`
3. **階段 3**: 更新所有 API 和前端程式碼，統一使用 `backpack_items`
4. **階段 4**: 刪除舊表（保留 14 天觀察期）

**影響範圍與風險**:
- **影響模組**: 
  - `apps/web/app/api/backpack/route.ts`
  - `apps/web/app/api/notebook/save/route.ts`
  - `apps/web/components/backpack/` (所有書包元件)
  - `apps/web/lib/types.ts` (BackpackFile 型別)
- **Migration 風險**: 需要確保資料不遺失，建議先備份
- **相容性**: 需要同時支援舊 API 格式一段時間，避免前端斷線

---

### 2. 簡化 AI 詳解 Pipeline：合併重複的解釋生成邏輯

**類別**: `架構簡化 / 重構`, `RAG / AI 流程改善`

**問題現況**:
- 目前有三套解釋生成系統：
  - `universal-explainer` (`apps/web/lib/ai/universal-explainer.ts`)
  - `aura-contract` (`apps/web/lib/ai/aura-contract.ts`)
  - `basic-extractor` (`apps/web/lib/ai/basic-extractor.ts`)
- 多個 prompt 模板散落在不同檔案：
  - `apps/web/lib/prompts.ts`
  - `apps/web/lib/ai/aura-contract.ts:12-53` (GENERATOR_SYSTEM_PROMPT)
  - `apps/web/lib/ai/universal-explainer.ts` (內嵌 prompt)
- `/api/explain` 使用三層降級，但邏輯複雜

**為什麼這是問題**:
- **可維護性**: 三套系統維護成本高，prompt 更新需要改多處
- **效能**: 多層降級增加延遲，用戶體驗差
- **一致性**: 不同系統生成的詳解格式可能不一致

**具體改善方案**:
1. **階段 1**: 統一為單一 `UniversalExplainer`，移除 `basic-extractor` 和 `aura-contract`
2. **階段 2**: 建立集中式 Prompt 管理模組 (`lib/ai/prompts/`)
3. **階段 3**: 優化降級邏輯，改為並行嘗試而非串行降級
4. **階段 4**: 加入快取機制，避免重複生成相同題目的詳解

**影響範圍與風險**:
- **影響模組**:
  - `apps/web/lib/ai/universal-explainer.ts`
  - `apps/web/lib/ai/aura-contract.ts`
  - `apps/web/app/api/explain/route.ts`
  - `components/ask/AnySubjectSolver.tsx`
- **風險**: 需要充分測試，確保詳解品質不下降
- **相容性**: 需要保留舊 API 格式，避免前端斷線

---

### 3. 重構對戰狀態管理：簡化 WebSocket 狀態同步

**類別**: `架構簡化 / 重構`, `可靠性 / 錯誤處理`

**問題現況**:
- `battleState` 包含 20+ 個欄位 (`lib/play-context.tsx`)
- 前端 timer 和後端 WebSocket 消息可能不同步
- WebSocket 斷線重連邏輯不完整
- 狀態更新分散在多個地方，容易出現競態條件

**為什麼這是問題**:
- **可靠性**: 狀態不同步可能導致 UI 顯示錯誤
- **錯誤處理**: 斷線時沒有明確的錯誤提示
- **可維護性**: 複雜的狀態管理難以除錯

**具體改善方案**:
1. **階段 1**: 使用狀態機 (XState 或自建) 管理對戰狀態
2. **階段 2**: 移除前端 timer，完全依賴後端 WebSocket 消息
3. **階段 3**: 實作完整的斷線重連機制，加入指數退避
4. **階段 4**: 加入狀態驗證，確保前端狀態與後端一致

**影響範圍與風險**:
- **影響模組**:
  - `apps/web/lib/play-context.tsx`
  - `apps/web/app/(app)/play/page.tsx`
  - `components/play/BattleQuestionV3.tsx`
  - `packages/server/chick/` (WebSocket 服務)
- **風險**: 需要充分測試各種網路狀況（斷線、延遲、訊息遺失）
- **相容性**: 需要確保現有對戰流程不受影響

---

### 4. 統一 API 回應格式：建立標準化的回應結構

**類別**: `架構簡化 / 重構`, `開發者體驗 / 可維護性`

**問題現況**:
- 部分 API 使用 `{ success: true, data: ... }`
- 部分 API 使用 `{ ok: true, ... }`
- 部分 API 使用 `{ error: '...', message: '...' }`
- 錯誤格式不統一

**為什麼這是問題**:
- **開發者體驗**: 前端需要處理多種回應格式
- **可維護性**: 沒有統一的錯誤處理邏輯
- **型別安全**: TypeScript 型別定義困難

**具體改善方案**:
1. **階段 1**: 建立統一的 `ApiResponse<T>` 型別和 `ok()`, `fail()` helper
2. **階段 2**: 更新所有 API routes，統一使用新格式
3. **階段 3**: 建立前端統一的 API client，自動處理回應格式
4. **階段 4**: 加入 API 回應格式的 ESLint 規則

**影響範圍與風險**:
- **影響模組**: 所有 `apps/web/app/api/**/route.ts` (124+ 個檔案)
- **風險**: 需要大量測試，確保前端相容
- **相容性**: 建議分階段遷移，保留舊格式一段時間

---

### 5. 優化 RAG 處理流程：改為非同步佇列處理

**類別**: `效能 / 響應時間`, `RAG / AI 流程改善`

**問題現況**:
- 檔案上傳後，RAG embedding 生成是同步的 (`/api/rag/upload`)
- 大量檔案時會阻塞 API 回應
- 沒有進度提示，用戶不知道處理狀態
- 失敗時沒有重試機制

**為什麼這是問題**:
- **效能**: 同步處理大量檔案會導致 API 超時
- **用戶體驗**: 用戶不知道處理進度，可能以為系統卡住
- **可靠性**: 失敗時沒有自動重試

**具體改善方案**:
1. **階段 1**: 建立非同步任務佇列 (使用 Supabase Edge Functions 或外部佇列服務)
2. **階段 2**: 檔案上傳後立即返回，將 embedding 任務加入佇列
3. **階段 3**: 實作進度查詢 API (`/api/rag/status/:fileId`)
4. **階段 4**: 加入失敗重試機制和錯誤通知

**影響範圍與風險**:
- **影響模組**:
  - `apps/web/app/api/rag/upload/route.ts`
  - `apps/web/lib/services/mcp/backpack.ts`
  - `apps/web/components/backpack/` (上傳 UI)
- **風險**: 需要設定外部佇列服務（如 Supabase Edge Functions 或 Redis）
- **相容性**: 需要確保現有檔案仍能正常處理

---

### 6. 刪除重複的解釋元件：統一使用 ExplainCardV2

**類別**: `架構簡化 / 重構`, `開發者體驗 / 可維護性`

**問題現況**:
- `components/ask/ExplanationCard.tsx` (舊版)
- `components/ask/ExplanationCardV2.tsx` (新版)
- `apps/web/components/solve/ExplainCardV2.tsx` (另一個版本)
- 三個元件功能重疊，但實作不同

**為什麼這是問題**:
- **可維護性**: 需要維護三套相似的程式碼
- **一致性**: 不同頁面顯示的詳解格式可能不同
- **學習曲線**: 新開發者不知道該用哪個元件

**具體改善方案**:
1. **階段 1**: 選擇一個最佳實作（建議 `apps/web/components/solve/ExplainCardV2.tsx`）
2. **階段 2**: 將所有使用舊元件的地方遷移到新元件
3. **階段 3**: 刪除舊元件，保留 14 天觀察期
4. **階段 4**: 更新文檔，明確說明使用哪個元件

**影響範圍與風險**:
- **影響模組**:
  - `components/ask/ExplanationCard.tsx`
  - `components/ask/ExplanationCardV2.tsx`
  - `apps/web/components/solve/ExplainCardV2.tsx`
  - 所有使用這些元件的頁面
- **風險**: 需要確保新元件功能完整，不遺漏舊元件功能
- **相容性**: 需要確保 UI 顯示一致

---

### 7. 簡化新手引導流程：減少步驟數量

**類別**: `UX / Flow 優化`

**問題現況**:
- 新手引導有 12 個步驟 (`apps/web/app/onboarding/**/page.tsx`)
- 步驟過多，用戶容易中途放棄
- 每個步驟都有類似的狀態檢查邏輯

**為什麼這是問題**:
- **用戶體驗**: 步驟太多，完成率低
- **可維護性**: 12 個頁面維護成本高
- **開發效率**: 修改流程需要改多個檔案

**具體改善方案**:
1. **階段 1**: 分析用戶行為數據，找出可以合併或跳過的步驟
2. **階段 2**: 將 12 個步驟合併為 5-6 個核心步驟
3. **階段 3**: 建立統一的 onboarding 狀態管理 (Context 或 Zustand)
4. **階段 4**: 加入「稍後完成」選項，允許用戶跳過非必要步驟

**影響範圍與風險**:
- **影響模組**:
  - `apps/web/app/onboarding/**/page.tsx` (12 個檔案)
  - `apps/web/app/api/onboarding/session/route.ts`
- **風險**: 需要充分測試，確保合併後流程順暢
- **相容性**: 需要處理已進行到一半的 onboarding session

---

### 8. 建立集中式錯誤處理與監控系統

**類別**: `可靠性 / 錯誤處理`, `開發者體驗 / 可維護性`

**問題現況**:
- 錯誤處理散落在各處，沒有統一邏輯
- 只有 console 日誌，沒有錯誤追蹤服務
- 生產環境錯誤難以追蹤和除錯

**為什麼這是問題**:
- **可靠性**: 錯誤無法及時發現和修復
- **開發效率**: 除錯困難，需要查看大量日誌
- **用戶體驗**: 錯誤發生時沒有明確的錯誤訊息

**具體改善方案**:
1. **階段 1**: 整合 Sentry 或類似錯誤追蹤服務
2. **階段 2**: 建立統一的錯誤處理 middleware (`lib/middleware/error-handler.ts`)
3. **階段 3**: 所有 API routes 使用統一的錯誤處理
4. **階段 4**: 建立錯誤監控儀表板，追蹤錯誤率和趨勢

**影響範圍與風險**:
- **影響模組**: 所有 API routes 和前端元件
- **風險**: 需要設定外部服務（Sentry），增加依賴
- **相容性**: 需要確保現有錯誤處理邏輯不受影響

---

### 9. 優化 API 呼叫：減少串行請求，改用並行或批次

**類別**: `效能 / 響應時間`, `UX / Flow 優化`

**問題現況**:
- Ask 頁面需要 3+ 個串行 API 呼叫：
  - `/api/ai/route-solver` → `/api/exec/similar` → `/api/explain`
- 每個請求都需要等待前一個完成，總延遲高
- 沒有請求快取機制

**為什麼這是問題**:
- **效能**: 串行請求導致總延遲 = 所有請求延遲之和
- **用戶體驗**: 用戶需要等待較長時間才能看到結果
- **資源浪費**: 可以並行的請求被串行化

**具體改善方案**:
1. **階段 1**: 分析 API 依賴關係，找出可以並行的請求
2. **階段 2**: 將 `/api/exec/similar` 和 `/api/explain` 改為並行呼叫
3. **階段 3**: 建立請求快取機制，避免重複請求相同內容
4. **階段 4**: 考慮建立單一 `/api/ask/complete` 端點，後端內部並行處理

**影響範圍與風險**:
- **影響模組**:
  - `components/ask/AnySubjectSolver.tsx`
  - `apps/web/app/api/ai/route-solver/route.ts`
  - `apps/web/app/api/exec/similar/route.ts` (推測)
  - `apps/web/app/api/explain/route.ts`
- **風險**: 需要確保並行請求不會導致資料不一致
- **相容性**: 需要確保現有流程不受影響

---

### 10. 補齊缺失的資料庫 Schema 文檔

**類別**: `開發者體驗 / 可維護性`, `資料模型整併`

**問題現況**:
- `apps/web/supabase/schema.sql` 中缺少多個核心表的定義：
  - `pack_questions` (在 API 中大量使用但未定義)
  - `seed_questions` (PVE 對戰使用)
  - `ugc_questions` (用戶生成題目)
  - `files` (RAG 檔案表)
  - `doc_chunks` (RAG chunks 表)
  - `battle_events`, `battle_matches` (對戰相關表)
  - `notebook_entries` (筆記表)
  - `missions`, `daily_missions` (任務表)
- Schema 分散在多個 migration 檔案中，難以追蹤

**為什麼這是問題**:
- **可維護性**: 新開發者無法快速了解資料結構
- **學習曲線**: 需要查看多個 migration 檔案才能理解完整 schema
- **錯誤風險**: 可能建立重複的表或使用錯誤的欄位名稱

**具體改善方案**:
1. **階段 1**: 掃描所有 migration 檔案，整理完整的 schema
2. **階段 2**: 更新 `schema.sql`，包含所有表的定義
3. **階段 3**: 建立 schema 文檔，說明每個表的用途和關係
4. **階段 4**: 加入 schema 驗證工具，確保 migration 與 schema.sql 一致

**影響範圍與風險**:
- **影響模組**: 所有使用資料庫的模組
- **風險**: 需要確保 schema.sql 與實際資料庫一致
- **相容性**: 需要確保現有 migration 不受影響

---

## 附錄：推測項目說明

以下結論是基於程式碼推測，需要進一步確認：

1. **`pack_questions` 表結構**: 在 API 中大量使用，但未在 `schema.sql` 中定義。推測欄位包括 `id`, `pack_id`, `question_id`, `stem`, `choices`, `answer`, `explanation`, `difficulty`。

2. **`files` 和 `doc_chunks` 表**: 在 `retrieve_doc_chunks` 中使用，但未在主要 schema 中定義。推測 `doc_chunks` 包含 `id`, `file_id`, `content`, `embedding vector(1536)`, `metadata`。

3. **`battle_events` 和 `battle_matches` 表**: 在對戰 API 中使用，但未在 schema 中定義。推測用於記錄對戰事件和匹配記錄。

4. **`/api/exec/similar` 端點**: 在 `AnySubjectSolver.tsx` 中呼叫，但未找到實作檔案。推測用於相似題檢索。

---

**報告完成日期**: 2025-01-XX  
**審查範圍**: 核心功能 60-80% (部分深層模組尚未深入分析)

