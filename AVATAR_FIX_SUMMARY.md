# 頭像功能修復總結

## ✅ 已修復問題

### 1. 架構違規修復
- ✅ 創建 `ProfileRepo` (lib/dal/profile-repo.ts) - 數據訪問層
- ✅ 創建 `ProfileService` (lib/services/profile-service.ts) - 業務邏輯層
- ✅ 重構 API routes 使用 Service/Repo 層，符合專案架構規範

### 2. 403 錯誤修復指南

**問題**：Storage 上傳返回 403 錯誤

**解決方案**：

1. **檢查 Storage Bucket 是否存在**
   - 前往 Supabase Dashboard > Storage
   - 確認 `avatars` bucket 存在
   - 如果不存在，創建新 bucket：
     - Name: `avatars`
     - Public: `true` (勾選)

2. **執行 Storage Policies**
   - 前往 Supabase Dashboard > SQL Editor
   - 執行 `apps/web/supabase/storage-policies-avatars.sql`
   - 或手動執行以下 SQL：

```sql
-- 公開讀取
CREATE POLICY "Public avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 認證使用者可上傳
CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- 使用者可更新自己的頭像
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 使用者可刪除自己的頭像
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

3. **驗證 Policies**
   ```sql
   SELECT policyname, cmd
   FROM pg_policies
   WHERE schemaname = 'storage' 
     AND tablename = 'objects' 
     AND policyname LIKE '%avatar%';
   ```

### 3. 代碼改進

#### 架構合規
- ✅ Route 層只負責請求驗證和響應構建
- ✅ 業務邏輯移至 Service 層
- ✅ 數據訪問封裝在 Repo 層
- ✅ 使用依賴注入模式

#### 錯誤處理
- ✅ 更清晰的錯誤訊息
- ✅ 特定 Storage 錯誤處理
- ✅ 符合專案架構規範

## 📝 注意事項

### React 警告（與本實作無關）
```
Warning: Cannot update a component (`PlayProvider`) while rendering a different component (`BattleQuestionV3`)
```

這個警告來自 `BattleQuestionV3` 組件，與頭像功能無關。需要檢查該組件是否在 render 中調用 setState。

### WebSocket 錯誤（與本實作無關）
```
WebSocket connection to 'ws://localhost:8080/ws/battle' failed
```

這是對戰系統的 WebSocket 連接問題，與頭像功能無關。

### ChunkLoadError（開發環境問題）
```
ChunkLoadError: Loading chunk _app-pages-browser_components_ui_Toast_tsx failed
```

這是 Next.js 開發環境的熱重載問題，通常重啟開發伺服器即可解決。

## 🚀 測試步驟

1. **測試 Storage Policies**
   ```bash
   # 在 Supabase Dashboard 執行驗證 SQL
   SELECT policyname FROM pg_policies 
   WHERE schemaname = 'storage' AND tablename = 'objects' 
   AND policyname LIKE '%avatar%';
   ```

2. **測試上傳功能**
   - 前往 `/profile` 頁面
   - 點擊「編輯個人資料」
   - 選擇照片並上傳
   - 確認沒有 403 錯誤

3. **驗證架構合規**
   - 檢查 API routes 不超過 100 行 ✅
   - 檢查使用 Service/Repo 層 ✅
   - 檢查沒有直接查詢數據庫 ✅

## 📦 檔案結構

```
apps/web/
├── app/api/profile/
│   ├── route.ts                    # GET profile (符合架構)
│   └── upload-avatar/
│       └── route.ts                # POST upload (符合架構)
├── lib/
│   ├── dal/
│   │   └── profile-repo.ts        # 數據訪問層
│   └── services/
│       └── profile-service.ts      # 業務邏輯層
└── supabase/
    └── storage-policies-avatars.sql # Storage policies
```

## ✨ 總結

- ✅ 架構違規已修復
- ✅ 代碼符合專案架構規範
- ✅ 提供 403 錯誤修復指南
- ✅ 錯誤處理改進
- ⚠️ 需要執行 Storage policies SQL 來修復 403 錯誤

