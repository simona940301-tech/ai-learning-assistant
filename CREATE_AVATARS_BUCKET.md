# 🎯 創建 Avatars Storage Bucket

## 問題
上傳頭像時出現錯誤：
```
StorageApiError: Bucket not found
```

## 解決方案

### 方法 1: 使用 Supabase Dashboard（推薦）

1. **打開 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
   ```

2. **創建 Bucket**
   - 點擊 "New Bucket"
   - Bucket name: `avatars`
   - ✅ **勾選 "Public bucket"**
   - File size limit: 10 MB (可選)
   - Allowed MIME types: `image/*` (可選)
   - 點擊 "Create bucket"

3. **完成！**
   - Bucket 創建後，RLS 政策會自動應用（已經在 `apps/web/supabase/storage.sql` 中定義）
   - 刷新頁面重新測試上傳

---

### 方法 2: 使用 Supabase CLI

如果你有安裝 Supabase CLI：

```bash
# 檢查現有 buckets
supabase storage list

# 創建 avatars bucket (public)
supabase storage create avatars --public
```

---

### 方法 3: 使用 SQL + Dashboard

1. **先在 Dashboard 創建 bucket**（方法 1 的步驟 1-2）

2. **然後在 SQL Editor 執行政策**

```sql
-- 執行這個檔案中的 SQL
-- apps/web/supabase/storage.sql
-- 或者手動執行：

-- 公開讀取
CREATE POLICY "Public avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 認證用戶上傳
CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- 用戶更新自己的頭像
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用戶刪除自己的頭像
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 驗證

創建 bucket 後，在瀏覽器 Console 執行：

```javascript
// 測試連線
const { data: buckets, error } = await supabase.storage.listBuckets()
console.log('Buckets:', buckets)
console.log('Has avatars?', buckets?.some(b => b.name === 'avatars'))
```

應該看到：
```
Buckets: [{ name: 'avatars', ... }, ...]
Has avatars? true
```

---

## 測試上傳

1. 刷新頁面：`http://localhost:3000/onboarding/avatar`
2. 上傳照片
3. 檢查 Console 日誌：

**成功的日誌應該是：**
```
[AvatarUploader] Starting upload process...
[AvatarUploader] File: photo.jpg Size: 123456 bytes
[AvatarUploader] Pixelating image...
[AvatarUploader] Pixelation complete. Blob size: 12345 bytes
[AvatarUploader] Uploading to storage bucket "avatars"...
[AvatarUploader] File path: user-id/timestamp-photo.jpg.png
[AvatarUploader] ✅ Upload successful!
[AvatarUploader] Avatar URL: https://...
[AvatarUploader] Success!
```

**失敗的日誌會是：**
```
[AvatarUploader] ❌ Upload failed!
[AvatarUploader] Error details: { ... }
[AvatarUploader] Error message: Bucket not found
```

---

## 常見問題

### Q: Bucket 已存在但還是失敗？
A: 檢查 RLS 政策是否正確應用。在 Supabase Dashboard > Storage > Policies 確認政策存在。

### Q: 上傳成功但無法訪問？
A: 確認 bucket 是 **public**，或者 RLS 讀取政策正確設置。

### Q: 政策衝突錯誤？
A: 先刪除舊的政策，再重新執行 `apps/web/supabase/storage.sql`

---

## 下一步

✅ 創建 bucket 後，重新測試上傳功能
✅ 如果還有問題，查看詳細的 Console 日誌
✅ 確認用戶已登入（`auth.role() = 'authenticated'`）

**現在去 Supabase Dashboard 創建 bucket！** 🚀
