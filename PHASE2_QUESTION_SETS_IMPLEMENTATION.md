# 🏪 Phase 2: 題本商店系統 - 實作完成報告

## 📋 實作概述

**目標**：打造完整的題本生態系統，支援題本瀏覽、下載、練習
**實作日期**：2025-11-24
**狀態**：✅ 後端 API 全部完成 | ⏳ 前端 UI 待實作

---

## 🎯 已完成功能

### 1. 資料庫 Schema ✅

創建了完整的題本系統資料表：

#### `question_sets` (題本集合表)
```sql
- id: UUID 主鍵
- title, description: 題本基本資訊
- creator_id, creator_type: 創建者
- source_type, source_metadata: 來源追蹤
- question_ids[]: 題目 ID 陣列
- question_source: 題目來源表 (seed/pack/ugc)
- subject, difficulty_level, tags: 分類標籤
- is_public, is_featured, price: 商店配置
- downloads, rating, review_count: 統計數據
- status: DRAFT | PUBLISHED | ARCHIVED | DELETED
```

#### `user_question_sets` (用戶已下載題本)
```sql
- user_id, set_id: 關聯
- downloaded_at, last_practiced_at: 時間追蹤
- progress_data: JSONB 儲存練習進度
- practice_count: 練習次數
- is_favorite, custom_tags, notes: 個人化設定
```

#### `question_set_reviews` (評論系統)
```sql
- set_id, user_id: 關聯
- rating (1-5), review_text: 評分與評論
```

**文件位置**: [apps/web/db/sql/023_question_sets_system.sql](apps/web/db/sql/023_question_sets_system.sql)

---

### 2. Store API ✅

#### GET /api/store/question-sets
**功能**: 瀏覽題本商店

**Query Parameters**:
- `subject`: 科目過濾 (chinese, english, math, science, social, mixed)
- `difficulty`: 難度過濾 (1-5)
- `sort`: 排序方式 (popular, newest, rating)
- `search`: 全文搜尋
- `tags`: 標籤過濾
- `page`, `limit`: 分頁

**特色**:
- ✅ 支援多維度過濾
- ✅ 全文搜索 (GIN 索引)
- ✅ 已登入用戶自動標記 `is_downloaded`
- ✅ 分頁支援

**文件位置**: [apps/web/app/api/store/question-sets/route.ts](apps/web/app/api/store/question-sets/route.ts)

---

#### POST /api/store/question-sets/download
**功能**: 下載題本到個人 Backpack

**Request Body**:
```json
{
  "setId": "uuid"
}
```

**驗證邏輯**:
1. ✅ 題本存在且狀態為 PUBLISHED
2. ✅ 題本為公開 (is_public = true)
3. ✅ 防止重複下載
4. ✅ 自動更新題本下載數（使用 PostgreSQL Function）

**Response**:
```json
{
  "success": true,
  "download": { ... },
  "message": "成功下載「112 學測數學」",
  "is_duplicate": false
}
```

**文件位置**: [apps/web/app/api/store/question-sets/download/route.ts](apps/web/app/api/store/question-sets/download/route.ts)

---

### 3. Backpack API ✅

#### GET /api/backpack/question-sets
**功能**: 獲取用戶已下載的題本

**Query Parameters**:
- `subject`: 科目過濾
- `favorite`: 只顯示收藏

**返回數據**:
```json
{
  "sets": [
    {
      "id": "uuid",
      "set_id": "uuid",
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
  ],
  "count": 3
}
```

---

#### DELETE /api/backpack/question-sets?setId=xxx
**功能**: 刪除已下載的題本

---

#### PATCH /api/backpack/question-sets
**功能**: 更新題本設定 (收藏、筆記等)

**Request Body**:
```json
{
  "setId": "uuid",
  "isFavorite": true,
  "customTags": ["重點", "常錯"],
  "notes": "這份題本很重要"
}
```

**文件位置**: [apps/web/app/api/backpack/question-sets/route.ts](apps/web/app/api/backpack/question-sets/route.ts)

---

### 4. Practice API 擴展 ✅

#### POST /api/play/practice/create (擴展)
**新增**: 支援 `QUESTION_SET` sourceType

**Request Body**:
```json
{
  "sourceType": "QUESTION_SET",
  "setId": "uuid"
}
```

**驗證邏輯**:
1. ✅ 驗證 setId 必填
2. ✅ 驗證用戶已下載該題本
3. ✅ 驗證題本狀態為 PUBLISHED
4. ✅ 驗證題本包含題目

**source_config 格式**:
```json
{
  "source_type": "QUESTION_SET",
  "set_id": "uuid",
  "user_id": "uuid"
}
```

---

#### GET /api/play/practice/questions (擴展)
**新增**: 支援 `QUESTION_SET` 查詢

**查詢流程**:
```
1. 從 question_sets 取得 question_ids 和 question_source
2. 根據 question_source 查詢對應表：
   - seed_questions
   - pack_questions
   - ugc_questions
3. 轉換為統一格式
4. Deterministic shuffle
5. 分頁返回
```

**支援的題目來源**:
- ✅ `seed_questions`: 官方題庫 (學測/指考)
- ✅ `pack_questions`: Pack系統題目
- ✅ `ugc_questions`: 用戶生成題目

---

## 📂 文件結構

```
apps/web/
├── db/sql/
│   └── 023_question_sets_system.sql          ← 資料庫 Schema
├── app/api/
│   ├── store/question-sets/
│   │   ├── route.ts                          ← 題本列表 API
│   │   └── download/route.ts                 ← 下載題本 API
│   ├── backpack/question-sets/
│   │   └── route.ts                          ← 我的題本 API
│   └── play/practice/
│       ├── create/route.ts                   ← 創建練習室 (已擴展)
│       └── questions/route.ts                ← 查詢題目 (已擴展)
```

---

## 🔄 完整用戶流程

### 流程 1: 下載並練習題本
```
用戶訪問 /store (待實作 UI)
    ↓
瀏覽題本列表
    ↓ (GET /api/store/question-sets)
點擊「下載」按鈕
    ↓ (POST /api/store/question-sets/download)
題本加入 user_question_sets
    ↓
前往 /backpack → 「我的題本」Tab (待實作 UI)
    ↓ (GET /api/backpack/question-sets)
點擊「開始練習」
    ↓ (POST /api/play/practice/create with sourceType='QUESTION_SET')
練習室創建
    ↓ (GET /api/play/practice/questions)
開始無限練習
```

---

## 🎯 技術亮點

### 1. 多來源題目整合
**挑戰**: 題本可能包含不同來源的題目
**解決**:
- `question_source` 欄位標記來源表
- API 層動態查詢對應表
- 統一轉換為標準格式

```typescript
if (questionSource === 'seed_questions') {
  // 查詢 seed_questions 表
} else if (questionSource === 'pack_questions') {
  // 查詢 pack_questions 表
} else if (questionSource === 'ugc_questions') {
  // 查詢 ugc_questions 表
}
```

---

### 2. 原子性下載計數
**挑戰**: 併發下載時如何保證計數準確？
**解決**: 使用 PostgreSQL Function

```sql
CREATE OR REPLACE FUNCTION increment_question_set_downloads(p_set_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE question_sets
  SET downloads = downloads + 1
  WHERE id = p_set_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3. 防重複下載
**挑戰**: 用戶多次點擊下載按鈕
**解決**:
- `UNIQUE(user_id, set_id)` 約束
- 檢查現有記錄並返回友好訊息

---

### 4. 進度追蹤 (JSONB)
**優勢**:
- 靈活擴展（無需 ALTER TABLE）
- 支援複雜查詢（GIN 索引）
- 節省空間

```json
{
  "completed": 20,
  "total": 50,
  "correct_rate": 0.75,
  "last_question_index": 19,
  "time_spent_seconds": 1200
}
```

---

## 📊 RLS 安全策略

### question_sets
- ✅ 公開題本所有人可查看
- ✅ 創建者可查看自己的題本
- ✅ 教師可創建題本
- ✅ 創建者可更新自己的題本

### user_question_sets
- ✅ 用戶只能查看自己下載的題本
- ✅ 用戶只能下載自己的記錄
- ✅ 用戶只能更新自己的記錄

### question_set_reviews
- ✅ 所有人可查看評論
- ✅ 用戶只能創建/更新自己的評論

---

## 🚀 待實作功能 (Phase 2.1 - UI)

### 1. Store 頁面 (`/store`)
```typescript
// app/(app)/store/page.tsx
export default function StorePage() {
  return (
    <main>
      <StoreHeader />           // 標題、搜尋框
      <FilterBar />             // 科目、難度、排序過濾
      <FeaturedSets />          // 精選題本（is_featured = true）
      <QuestionSetList />       // 題本列表
    </main>
  )
}
```

**組件需求**:
- `QuestionSetCard`: 題本卡片 (封面、標題、統計、下載按鈕)
- `FilterBar`: 過濾器
- `SearchBar`: 搜尋框
- `Pagination`: 分頁組件

---

### 2. Backpack 「我的題本」Tab
```typescript
// apps/web/app/(app)/backpack/BackpackContent.tsx

// 新增 viewMode
type ViewMode = 'backpack' | 'error-book' | 'question-sets'

// 新增 Tab
<button onClick={() => setViewMode('question-sets')}>
  我的題本
</button>

// 新增視圖
{viewMode === 'question-sets' && (
  <MyQuestionSets />
)}
```

**UI 需求**:
- 顯示已下載題本列表
- 顯示練習進度條
- [開始練習] 按鈕 → 創建練習室
- [刪除] 按鈕
- 收藏功能

---

## 🧪 測試指南

### API 測試

#### 1. 測試題本列表
```bash
curl http://localhost:3000/api/store/question-sets?subject=math&sort=popular
```

#### 2. 測試下載題本
```bash
curl -X POST http://localhost:3000/api/store/question-sets/download \
  -H "Content-Type: application/json" \
  -d '{"setId":"YOUR_SET_ID"}' \
  -b "sb-access-token=YOUR_TOKEN"
```

#### 3. 測試我的題本
```bash
curl http://localhost:3000/api/backpack/question-sets \
  -b "sb-access-token=YOUR_TOKEN"
```

#### 4. 測試題本練習
```bash
# 創建練習室
curl -X POST http://localhost:3000/api/play/practice/create \
  -H "Content-Type: application/json" \
  -d '{"sourceType":"QUESTION_SET","setId":"YOUR_SET_ID"}' \
  -b "sb-access-token=YOUR_TOKEN"

# 查詢題目
curl "http://localhost:3000/api/play/practice/questions?roomId=YOUR_ROOM_ID&offset=0&limit=20"
```

---

### 資料庫測試

#### 1. 執行 Migration
```bash
# 方法 A: 使用 Supabase CLI
supabase db push

# 方法 B: 在 Supabase Dashboard 執行
# 複製 apps/web/db/sql/023_question_sets_system.sql 內容
# 貼上到 SQL Editor 執行
```

#### 2. 創建測試題本
```sql
-- 插入範例題本（需要先有 seed_questions 數據）
INSERT INTO question_sets (
  title,
  description,
  creator_type,
  source_type,
  question_ids,
  question_source,
  subject,
  difficulty_level,
  tags,
  is_public,
  is_featured,
  status
) VALUES (
  '測試題本 - 數學',
  '用於測試的範例題本',
  'OFFICIAL',
  'MANUAL',
  ARRAY[]::UUID[],  -- 需要填入實際題目 ID
  'seed_questions',
  'math',
  3,
  ARRAY['測試', '範例'],
  true,
  false,
  'PUBLISHED'
);
```

#### 3. 驗證 RLS
```sql
-- 切換到測試用戶
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'YOUR_USER_ID';

-- 查詢公開題本（應該成功）
SELECT * FROM question_sets WHERE is_public = TRUE;

-- 下載題本（應該成功）
INSERT INTO user_question_sets (user_id, set_id)
VALUES (current_setting('request.jwt.claims.sub')::uuid, 'SOME_SET_ID');
```

---

## 📈 性能優化

### 1. 索引策略
```sql
-- 已創建的索引
idx_question_sets_public        -- WHERE is_public = TRUE
idx_question_sets_featured      -- WHERE is_featured = TRUE
idx_question_sets_downloads     -- ORDER BY downloads DESC
idx_question_sets_rating        -- ORDER BY rating DESC
idx_question_sets_search        -- 全文搜索 (GIN)
idx_question_sets_tags          -- 標籤搜索 (GIN)
```

### 2. 查詢優化
- ✅ 使用 `select('*')` 避免 N+1 查詢
- ✅ 適當的 JOIN 層級 (最多 2 層)
- ✅ 分頁載入（避免一次性載入大量數據）

### 3. 快取策略 (未來)
- ⏳ Redis 快取熱門題本
- ⏳ CDN 快取封面圖片
- ⏳ 前端 React Query 快取

---

## 🔮 未來擴展 (Phase 2.2)

### 1. 付費題本
- 新增支付流程
- 虛擬貨幣系統
- 訂閱制度

### 2. 評論系統 UI
- 顯示評論列表
- 提交評論/評分
- 評論排序 (熱門/最新)

### 3. 教師上傳介面
- `/admin/question-sets/create` 頁面
- 題目選擇器
- 批量上傳

### 4. RAG 生成題本
- Ask 頁面整合
- AI 自動生成題目
- 一鍵建立題本

### 5. 社群功能
- 題本分享 (生成 share code)
- 多人協作練習
- 排行榜

---

## ✅ Phase 2 檢查清單

### 後端 API
- [x] 資料庫 Schema (023_question_sets_system.sql)
- [x] GET /api/store/question-sets (題本列表)
- [x] POST /api/store/question-sets/download (下載題本)
- [x] GET /api/backpack/question-sets (我的題本)
- [x] DELETE /api/backpack/question-sets (刪除題本)
- [x] PATCH /api/backpack/question-sets (更新設定)
- [x] 擴展 POST /api/play/practice/create (支援 QUESTION_SET)
- [x] 擴展 GET /api/play/practice/questions (支援 QUESTION_SET)
- [x] RLS Policies
- [x] PostgreSQL Functions

### 前端 UI (待實作)
- [ ] Store 頁面 (`/store`)
- [ ] QuestionSetCard 組件
- [ ] FilterBar 組件
- [ ] SearchBar 組件
- [ ] Backpack 「我的題本」Tab
- [ ] MyQuestionSets 組件
- [ ] 進度條組件

### 測試
- [ ] API 單元測試
- [ ] RLS 測試
- [ ] E2E 測試
- [ ] 性能測試

### 文檔
- [x] 技術設計文檔 (PHASE2_QUESTION_SETS_DESIGN.md)
- [x] 實作總結文檔 (本文檔)
- [ ] API 文檔
- [ ] 用戶指南

---

## 🎉 總結

**Phase 2 後端實作已全部完成！**

✅ **資料庫**: 完整 Schema + RLS + Functions
✅ **API**: 7 個端點全部實作
✅ **整合**: 完美整合現有 Practice 系統
✅ **安全性**: RLS + JWT 驗證
✅ **性能**: 索引優化 + 分頁支援

**下一步**:
1. 執行資料庫 migration
2. 創建測試數據
3. 實作前端 UI (Store 頁面 + Backpack Tab)
4. 端到端測試

**估計時間**: 前端 UI 約需 2-3 小時

---

**實作者**: AI Code Engineer
**審核者**: 待定
**部署狀態**: 後端完成，待前端 UI
**版本**: 2.0.0
