# Supabase 設定指南

## 📋 資料庫架構

已建立完整的資料庫 schema，包含以下資料表：

### 核心資料表

1. **profiles** - 使用者個人檔案
   - XP、金幣、連續天數
   - 自動在使用者註冊時建立

2. **posts** - 社群貼文
   - 支援多圖片上傳
   - 點讚與留言功能

3. **tasks** - 學習任務
   - 五科目分類
   - XP 與金幣獎勵

4. **backpack_items** - 學習資料
   - 文字/PDF/圖片分類
   - 五科目資料夾

5. **store_items** - 商城教材
   - 免費/付費分類
   - 評分系統

6. **ai_interactions** - AI 互動記錄
   - 重點整理/解題歷史
   - 可儲存至 Backpack

## 🚀 快速設定

### 1. 執行 Schema

在 Supabase Dashboard 中：

1. 前往 **SQL Editor**
2. 複製 `supabase/schema.sql` 內容
3. 執行 SQL

### 2. 匯入測試資料

執行 `supabase/seed.sql` 來建立範例商城教材。

### 3. 設定 Storage

**步驟 A：建立 Buckets（使用 Dashboard UI）**

前往 **Storage** 在 Supabase Dashboard，點擊 **New Bucket** 建立：

1. **avatars** - Public bucket
2. **post_images** - Public bucket
3. **backpack_files** - Private bucket

**步驟 B：設定 Storage Policies（執行 SQL）**

前往 **SQL Editor**，複製並執行 `supabase/storage.sql` 內容，或直接執行：

```sql
-- Avatars - public read, users manage own files
CREATE POLICY "Public avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- Post images - public read, users manage own files
CREATE POLICY "Public post images read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post_images');

CREATE POLICY "Authenticated users upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post_images'
    AND auth.role() = 'authenticated'
  );

-- Backpack files - private, owner only
CREATE POLICY "Users view own backpack files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backpack_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users upload own backpack files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backpack_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

完整 policies 請參考 `supabase/storage.sql`。

## 🔐 認證設定

### Email Auth (預設)

已在環境變數中配置，開箱即用。

### OAuth Providers (選用)

在 Supabase Dashboard > Authentication > Providers 啟用：

- Google
- GitHub
- Apple

## 📊 資料關係圖

```
auth.users (Supabase Auth)
    ↓
profiles (自動建立)
    ↓
    ├─→ posts (1:N)
    ├─→ tasks (1:N)
    ├─→ backpack_items (1:N)
    ├─→ ai_interactions (1:N)
    └─→ follows (N:N)

store_items (獨立，公開讀取)
    ↓
user_purchases (關聯使用者與購買)
```

## 🔒 Row Level Security (RLS)

所有資料表皆啟用 RLS，確保資料安全：

- ✅ **Profiles**: 公開檢視，僅本人可更新
- ✅ **Posts**: 公開檢視，僅本人可編輯/刪除
- ✅ **Tasks**: 僅本人可檢視與操作
- ✅ **Backpack**: 完全私密，僅本人可存取
- ✅ **Store Items**: 公開檢視
- ✅ **AI Interactions**: 僅本人可檢視

## 📝 使用範例

### 建立貼文

```typescript
const { data, error } = await supabase
  .from('posts')
  .insert({
    user_id: user.id,
    content: '今天學習超有收穫！',
    images: ['/path/to/image.jpg']
  })
```

### 取得使用者 Backpack

```typescript
const { data, error } = await supabase
  .from('backpack_items')
  .select('*')
  .eq('user_id', user.id)
  .eq('subject', 'math')
  .order('created_at', { ascending: false })
```

### 完成任務並更新 XP

```typescript
// 1. 標記任務完成
await supabase
  .from('tasks')
  .update({
    completed: true,
    completed_at: new Date().toISOString()
  })
  .eq('id', taskId)

// 2. 更新使用者 XP
await supabase
  .from('profiles')
  .update({
    xp: profile.xp + task.xp_reward,
    coins: profile.coins + task.coin_reward
  })
  .eq('id', user.id)
```

## 🎯 下一步

1. ✅ Schema 已建立
2. ✅ RLS 已設定
3. ⬜ 設定 Storage Buckets
4. ⬜ 啟用 OAuth Providers (選用)
5. ⬜ 在前端整合 Supabase 查詢

完成！資料庫已準備就緒 🚀
