# ✅ Avatar Storage RLS 修復驗證指南

## 已執行的修復

Migration: `apps/web/supabase/migrations/027_fix_avatar_storage_rls.sql`

**修復內容**：
- 更新 INSERT policy，加入文件路徑檢查
- 確保用戶只能上傳到自己的文件夾：`{user_id}/{filename}`

---

## 🔍 驗證步驟

### 1. 檢查 Policy 是否正確設置

在 Supabase Dashboard > SQL Editor 執行：

```sql
SELECT 
  policyname, 
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname = 'Authenticated users upload avatars';
```

**預期結果**：
- `policyname`: `Authenticated users upload avatars`
- `cmd`: `INSERT`
- `with_check` 應該包含：`(bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)`

---

### 2. 確認 Bucket 存在

在 Supabase Dashboard > Storage > Buckets，確認：
- ✅ `avatars` bucket 存在
- ✅ 設為 **Public bucket**
- ✅ File size limit: 10 MB
- ✅ Allowed MIME types: `image/*` 或留空

---

### 3. 測試上傳功能

#### 方法 A：瀏覽器測試（推薦）

1. 打開應用程式並登入
2. 前往個人資料頁面或頭像設置頁面
3. 選擇一張圖片上傳
4. 打開瀏覽器開發者工具（F12）> Console

**成功的日誌應該顯示**：
```
✅ [AvatarUploader] Starting upload process...
✅ [AvatarUploader] File: photo.jpg Size: 123456 bytes
✅ [AvatarUploader] Pixelating image...
✅ [AvatarUploader] Pixelation complete. Blob size: 12345 bytes
✅ [AvatarUploader] Uploading to storage bucket "avatars"...
✅ [AvatarUploader] File path: {user_id}/timestamp-photo.jpg.png
✅ [AvatarUploader] ✅ Upload successful!
✅ [AvatarUploader] Avatar URL: https://...
✅ [AvatarUploader] Success!
```

**如果失敗，會顯示**：
```
❌ [AvatarUploader] ❌ Upload failed!
❌ [AvatarUploader] Error message: ...
```

#### 方法 B：檢查 Storage 文件

1. 上傳成功後，前往 Supabase Dashboard > Storage > avatars
2. 應該看到文件夾結構：`{user_id}/timestamp-filename.png`
3. 點擊文件應該可以預覽

---

## 🐛 如果還有問題

### 問題 1：仍然出現 RLS policy 錯誤

**可能原因**：
- Policy 沒有正確更新
- Bucket 不存在或設置錯誤

**解決方法**：
1. 手動執行 `FORCE_FIX_RLS.sql`（需要先更新 INSERT policy）
2. 或重新執行 migration `027_fix_avatar_storage_rls.sql`

### 問題 2：Bucket not found

**解決方法**：
1. 前往 Supabase Dashboard > Storage
2. 創建 `avatars` bucket（Public）
3. 參考 `CREATE_AVATARS_BUCKET.md`

### 問題 3：403 Forbidden

**可能原因**：
- 用戶未登入
- Policy 檢查失敗

**檢查**：
```javascript
// 在瀏覽器 Console 執行
const { data: { user } } = await supabase.auth.getUser()
console.log('User ID:', user?.id)
console.log('Authenticated:', !!user)
```

---

## ✅ 成功指標

- [ ] Policy 正確設置（包含路徑檢查）
- [ ] `avatars` bucket 存在且為 Public
- [ ] 可以成功上傳頭像
- [ ] Console 顯示成功日誌
- [ ] 頭像 URL 可以訪問
- [ ] 個人資料頁面顯示新頭像

---

## 📝 相關文件

- `apps/web/supabase/migrations/027_fix_avatar_storage_rls.sql` - 修復 migration
- `FORCE_FIX_RLS.sql` - 手動修復腳本（需要更新）
- `CREATE_AVATARS_BUCKET.md` - Bucket 創建指南
- `AVATAR_UPLOAD_FIXES.md` - 之前的修復記錄

---

**測試完成後，如果一切正常，問題已解決！** 🎉

