# 🏪 Phase 2: 題本商店系統 - 技術設計文檔

## 📋 目標概述

打造一個完整的題本生態系統，讓用戶可以：
- 📚 瀏覽官方/社群題本
- 💾 下載題本到個人 Backpack
- 📝 從下載的題本開始練習
- 🎓 教師上傳自訂題本

---

## 🏗️ 系統架構

### 數據流設計

```
┌─────────────────────────────────────────────────────────┐
│                    題本來源層 (Phase 2)                    │
├─────────────┬──────────────┬──────────────┬─────────────┤
│ 官方題本     │ 社群題本      │ 教師上傳      │ RAG 生成     │
│ (學測/指考)  │ (UGC)        │ (Admin)      │ (Ask)       │
└──────┬──────┴──────┬───────┴──────┬───────┴──────┬──────┘
       │             │              │              │
       └─────────────┴──────────────┴──────────────┘
                            │
                  ┌─────────▼─────────┐
                  │ question_sets     │ ← 新增核心表
                  │ - id              │
                  │ - title           │
                  │ - creator_id      │
                  │ - source_type     │
                  │ - question_ids[]  │
                  │ - is_public       │
                  │ - price           │
                  │ - downloads       │
                  └─────────┬─────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
    ┌─────────▼─────────┐       ┌────────▼─────────┐
    │user_question_sets │       │  Store UI        │
    │(用戶已下載題本)    │       │  (瀏覽/搜尋)      │
    └─────────┬─────────┘       └──────────────────┘
              │
    ┌─────────▼─────────┐
    │ Backpack UI       │
    │ 「我的題本」Tab    │
    │ [開始練習] 按鈕    │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ practice_rooms    │
    │ source_type:      │
    │ - QUESTION_SET    │ ← 新增類型
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │InfinitePracticeRoom│
    └───────────────────┘
```

---

## 🗄️ 資料庫 Schema

### 1. question_sets 表（題本集合）

```sql
-- 題本表：儲存完整的題目集合
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 基本資訊
  title TEXT NOT NULL,                    -- "112 學測數學完整題本"
  description TEXT,                       -- 題本描述
  cover_image_url TEXT,                   -- 封面圖片

  -- 創建者資訊
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creator_type TEXT NOT NULL DEFAULT 'OFFICIAL'
    CHECK (creator_type IN ('OFFICIAL', 'TEACHER', 'COMMUNITY', 'RAG')),

  -- 題本來源
  source_type TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source_type IN ('MANUAL', 'SEED_QUESTIONS', 'UGC', 'RAG')),
  source_metadata JSONB DEFAULT '{}'::jsonb,  -- 來源相關元數據

  -- 題目配置
  question_ids UUID[] NOT NULL,           -- 題目 ID 陣列
  question_source TEXT NOT NULL DEFAULT 'seed_questions'
    CHECK (question_source IN ('seed_questions', 'pack_questions', 'ugc_questions')),
  total_questions INTEGER GENERATED ALWAYS AS (array_length(question_ids, 1)) STORED,

  -- 分類標籤
  subject TEXT CHECK (subject IN ('chinese', 'english', 'math', 'science', 'social', 'mixed')),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  tags TEXT[] DEFAULT '{}',               -- ["學測", "高一", "代數"]

  -- 商店配置
  is_public BOOLEAN DEFAULT false,        -- 是否在商店顯示
  is_featured BOOLEAN DEFAULT false,      -- 是否為精選題本
  price INTEGER DEFAULT 0,                -- 價格（0 = 免費）

  -- 統計數據
  downloads INTEGER DEFAULT 0,            -- 下載次數
  rating DECIMAL(3, 2) DEFAULT 0.00,      -- 平均評分（0.00-5.00）
  review_count INTEGER DEFAULT 0,         -- 評論數量

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,               -- 發布時間

  -- 狀態管理
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'))
);

-- 索引優化
CREATE INDEX idx_question_sets_creator ON question_sets(creator_id);
CREATE INDEX idx_question_sets_subject ON question_sets(subject);
CREATE INDEX idx_question_sets_public ON question_sets(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_question_sets_featured ON question_sets(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_question_sets_tags ON question_sets USING GIN(tags);
CREATE INDEX idx_question_sets_downloads ON question_sets(downloads DESC);
CREATE INDEX idx_question_sets_rating ON question_sets(rating DESC);
CREATE INDEX idx_question_sets_status ON question_sets(status);

-- 全文搜索
CREATE INDEX idx_question_sets_search ON question_sets
  USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
```

---

### 2. user_question_sets 表（用戶已下載題本）

```sql
-- 用戶下載的題本
CREATE TABLE IF NOT EXISTS user_question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,

  -- 下載資訊
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_practiced_at TIMESTAMPTZ,          -- 最後練習時間

  -- 學習進度
  progress_data JSONB DEFAULT '{}'::jsonb, -- { "completed": 10, "total": 50, "correct_rate": 0.8 }
  practice_count INTEGER DEFAULT 0,        -- 練習次數

  -- 個人化設定
  is_favorite BOOLEAN DEFAULT false,       -- 收藏
  custom_tags TEXT[] DEFAULT '{}',         -- 個人標籤
  notes TEXT,                              -- 筆記

  -- 唯一約束：每個用戶只能下載一次同一題本
  UNIQUE(user_id, set_id)
);

-- 索引
CREATE INDEX idx_user_question_sets_user ON user_question_sets(user_id);
CREATE INDEX idx_user_question_sets_set ON user_question_sets(set_id);
CREATE INDEX idx_user_question_sets_favorite ON user_question_sets(user_id, is_favorite)
  WHERE is_favorite = TRUE;
CREATE INDEX idx_user_question_sets_last_practiced ON user_question_sets(last_practiced_at DESC);
```

---

### 3. question_set_reviews 表（評論系統 - 可選）

```sql
CREATE TABLE IF NOT EXISTS question_set_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(set_id, user_id)  -- 每個用戶只能評論一次
);

CREATE INDEX idx_reviews_set ON question_set_reviews(set_id);
CREATE INDEX idx_reviews_user ON question_set_reviews(user_id);
```

---

## 🔐 Row Level Security (RLS)

```sql
-- question_sets RLS
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;

-- 公開題本所有人可查看
CREATE POLICY "Public question sets are viewable by everyone"
  ON question_sets FOR SELECT
  USING (is_public = TRUE AND status = 'PUBLISHED');

-- 創建者可查看自己的題本
CREATE POLICY "Users can view own question sets"
  ON question_sets FOR SELECT
  USING (auth.uid() = creator_id);

-- 教師可創建題本
CREATE POLICY "Teachers can create question sets"
  ON question_sets FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- 創建者可更新自己的題本
CREATE POLICY "Users can update own question sets"
  ON question_sets FOR UPDATE
  USING (auth.uid() = creator_id);

-- user_question_sets RLS
ALTER TABLE user_question_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own downloads"
  ON user_question_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can download question sets"
  ON user_question_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own downloads"
  ON user_question_sets FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 📡 API 設計

### 1. GET /api/store/question-sets
**用途**: 瀏覽題本商店

**Query Parameters**:
```typescript
{
  subject?: 'math' | 'english' | 'chinese' | 'science' | 'social' | 'mixed'
  difficulty?: 1 | 2 | 3 | 4 | 5
  sort?: 'popular' | 'newest' | 'rating' | 'downloads'
  search?: string
  tags?: string[]
  page?: number
  limit?: number
}
```

**Response**:
```json
{
  "sets": [
    {
      "id": "uuid",
      "title": "112 學測數學完整題本",
      "description": "包含 112 學測數學所有題目",
      "cover_image_url": "https://...",
      "creator_type": "OFFICIAL",
      "subject": "math",
      "difficulty_level": 4,
      "total_questions": 50,
      "downloads": 1234,
      "rating": 4.8,
      "price": 0,
      "is_featured": true,
      "tags": ["學測", "數學", "官方"]
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 10
}
```

---

### 2. POST /api/store/question-sets/download
**用途**: 下載題本到個人 Backpack

**Request Body**:
```json
{
  "setId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "download": {
    "id": "uuid",
    "set_id": "uuid",
    "downloaded_at": "2025-11-24T10:00:00Z"
  }
}
```

---

### 3. GET /api/backpack/question-sets
**用途**: 獲取用戶已下載的題本

**Response**:
```json
{
  "sets": [
    {
      "id": "uuid",
      "title": "112 學測數學完整題本",
      "total_questions": 50,
      "progress_data": {
        "completed": 20,
        "correct_rate": 0.75
      },
      "downloaded_at": "2025-11-24T10:00:00Z",
      "last_practiced_at": "2025-11-24T15:00:00Z",
      "is_favorite": true
    }
  ]
}
```

---

### 4. POST /api/play/practice/create (擴展)
**新增**: 支援 `QUESTION_SET` sourceType

**Request Body**:
```json
{
  "sourceType": "QUESTION_SET",
  "setId": "uuid"
}
```

---

## 🎨 UI 設計

### 1. Store 頁面 (`/store`)

#### Layout
```
┌─────────────────────────────────────────┐
│  🏪 題本商店                             │
│  ┌─────────────────────────────────┐    │
│  │ 搜尋框 🔍                        │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 過濾器: [全部][數學][英文]...    │    │
│  │        [熱門][最新][評分]        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ⭐ 精選題本                            │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │     │ │     │ │     │              │
│  │題本1│ │題本2│ │題本3│              │
│  │     │ │     │ │     │              │
│  └─────┘ └─────┘ └─────┘              │
│                                         │
│  📚 所有題本                            │
│  ┌────────────────────────────────┐    │
│  │ 112 學測數學           ⬇ 1.2k  │    │
│  │ 50 題 | ⭐ 4.8        [下載]   │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ 111 指考英文           ⬇ 890   │    │
│  │ 40 題 | ⭐ 4.6        [下載]   │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### 組件結構
```typescript
// app/(app)/store/page.tsx
export default function StorePage() {
  return (
    <main>
      <StoreHeader />
      <SearchBar />
      <FilterBar />
      <FeaturedSets />
      <QuestionSetList />
    </main>
  )
}
```

---

### 2. Backpack 「我的題本」Tab

#### Layout
```
┌─────────────────────────────────────────┐
│  背包                                    │
│  [背包] [錯題本] [我的題本] ← 新增 Tab   │
│                                         │
│  📚 我的題本 (3)                         │
│  ┌────────────────────────────────┐    │
│  │ 112 學測數學           📊 20/50 │    │
│  │ 進度: 40% | 正確率: 75%         │    │
│  │ [開始練習] [刪除]               │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ 111 指考英文           📊 15/40 │    │
│  │ 進度: 37% | 正確率: 80%         │    │
│  │ [開始練習] [刪除]               │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 🔄 用戶流程

### 流程 1: 下載並練習題本
```
用戶訪問 /store
    ↓
瀏覽題本列表（可搜尋/過濾）
    ↓
點擊「下載」按鈕
    ↓ (POST /api/store/question-sets/download)
題本加入 Backpack
    ↓
前往 /backpack → 「我的題本」Tab
    ↓
點擊「開始練習」
    ↓ (POST /api/play/practice/create)
跳轉到練習室 /play/practice/{roomCode}
```

### 流程 2: 教師上傳題本
```
教師登入（role = 'teacher' or 'admin'）
    ↓
前往 /admin/question-sets/create
    ↓
填寫題本資訊（標題、描述、科目等）
    ↓
選擇題目（從 seed_questions 或手動輸入）
    ↓ (POST /api/admin/question-sets)
創建題本（status = 'DRAFT'）
    ↓
審核通過 → 發布到商店（status = 'PUBLISHED', is_public = true）
```

---

## 🚀 實作步驟

### Step 1: 資料庫 Schema ✅
```bash
1. 創建 migration 文件
2. 執行 SQL（question_sets, user_question_sets）
3. 測試 RLS policies
```

### Step 2: API 開發
```bash
1. GET /api/store/question-sets       # 題本列表
2. POST /api/store/question-sets/download  # 下載題本
3. GET /api/backpack/question-sets     # 我的題本
4. 擴展 /api/play/practice/create     # 支援 QUESTION_SET
5. 擴展 /api/play/practice/questions   # 支援 QUESTION_SET
```

### Step 3: UI 開發
```bash
1. app/(app)/store/page.tsx           # Store 頁面
2. components/store/QuestionSetCard   # 題本卡片
3. components/store/FilterBar         # 過濾器
4. 修改 BackpackContent.tsx          # 新增「我的題本」Tab
```

### Step 4: 測試與優化
```bash
1. 單元測試
2. E2E 測試
3. 性能優化
4. 用戶體驗優化
```

---

## 📊 數據遷移策略

### 方案 A: 從現有題目創建題本
```sql
-- 創建「112 學測數學」題本
INSERT INTO question_sets (
  title,
  description,
  creator_type,
  source_type,
  question_ids,
  question_source,
  subject,
  difficulty_level,
  is_public,
  status
)
SELECT
  '112 學測數學完整題本',
  '包含 112 年學測數學所有題目',
  'OFFICIAL',
  'SEED_QUESTIONS',
  array_agg(id ORDER BY question_number),
  'seed_questions',
  'math',
  4,
  true,
  'PUBLISHED'
FROM seed_questions
WHERE source = 'GSAT_2024_Math'
GROUP BY source;
```

---

## 🔧 技術挑戰與解決方案

### 挑戰 1: 題本與題目的關聯
**問題**: `question_ids` 是 UUID 陣列，如何高效查詢？
**解決**:
- 使用 PostgreSQL `ANY(array)` 或 `= ANY(array)` 語法
- 添加 GIN 索引（如需要）

### 挑戰 2: 多來源題目整合
**問題**: 題本可能包含 seed_questions、pack_questions、ugc_questions
**解決**:
- `question_source` 欄位標記來源表
- API 層根據 source 查詢對應表
- 統一轉換為標準格式

### 挑戰 3: 練習進度追蹤
**問題**: 如何記錄用戶在題本中的練習進度？
**解決**:
- `user_question_sets.progress_data` JSONB 儲存詳細進度
- 練習室結束時更新進度
- 提供進度視覺化（進度條、統計圖表）

---

## 🎯 MVP 功能範圍（Phase 2.1）

**必須實作**:
- ✅ 資料庫 Schema
- ✅ Store 頁面（瀏覽/搜尋）
- ✅ 下載題本功能
- ✅ Backpack 「我的題本」Tab
- ✅ 題本練習流程

**暫不實作**（Phase 2.2）:
- ⏳ 評論系統
- ⏳ 教師上傳介面
- ⏳ RAG 生成題本
- ⏳ 付費題本（price > 0）

---

## 📝 總結

Phase 2 將建立完整的題本生態系統，為用戶提供：
1. 豐富的官方題本資源
2. 便捷的題本管理
3. 無縫的練習體驗
4. 未來的社群共享平台

**預計時間**: 2-3 小時
**複雜度**: 中等
**優先級**: 高

---

準備開始實作了嗎？🚀
