# 🔧 Avatar Upload 快速修復

## 問題診斷

你遇到的錯誤：
```
400 - 上傳失敗 (Supabase Storage)
500 - Gemini 分析失敗
```

## ✅ 已修復

### 1. **創建簡化版上傳器**
- 檔案: `AvatarUploaderSimple.tsx`
- **移除 Gemini 依賴**（避免 API 錯誤）
- 只做：像素化 → 上傳 → 完成
- 更快、更穩定

### 2. **更新所有引用**
- ✅ Onboarding 使用 `AvatarUploaderSimple`
- ✅ Profile Modal 使用 `AvatarUploaderSimple`

---

## 🚀 現在需要做的

### **檢查 Supabase Storage Bucket**

1. **打開 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage
   ```

2. **檢查是否有 `avatars` bucket**
   - 如果沒有，點擊 "New Bucket"
   - 名稱: `avatars`
   - Public: ✅ **勾選** (需要公開訪問)
   - 點擊 Create

3. **檢查 Storage Policies**

   如果 bucket 存在但上傳失敗，執行這個 SQL：

   ```sql
   -- 允許認證用戶上傳
   CREATE POLICY "Authenticated users upload avatars"
     ON storage.objects FOR INSERT
     WITH CHECK (
       bucket_id = 'avatars'
       AND auth.role() = 'authenticated'
     );

   -- 允許所有人讀取
   CREATE POLICY "Public avatars read"
     ON storage.objects FOR SELECT
     USING (bucket_id = 'avatars');

   -- 允許用戶更新自己的頭像
   CREATE POLICY "Users update own avatars"
     ON storage.objects FOR UPDATE
     USING (
       bucket_id = 'avatars'
       AND (storage.foldername(name))[1] = auth.uid()::text
     );
   ```

---

## 🧪 測試流程

### **測試 1: 上傳照片**
```bash
1. 訪問 http://localhost:3000/onboarding/avatar
2. 上傳一張照片
3. 應該看到：
   - ✅ 即時預覽（像素化）
   - ✅ "處理中..." 訊息
   - ✅ "完成！" + 綠色勾勾
```

### **測試 2: Profile 編輯**
```bash
1. 訪問 http://localhost:3000/profile
2. 點擊「編輯個人資料」
3. 上傳照片
4. 應該自動關閉 modal
5. 頭像應該更新
```

---

## 📊 錯誤排查

### **如果還是 400 錯誤**

檢查 Console 的詳細錯誤：
```javascript
// 在 AvatarUploaderSimple.tsx:73
console.error('[AvatarUploader] Upload error:', uploadError)
```

常見原因：
- ❌ Bucket 不存在
- ❌ Bucket 名稱錯誤
- ❌ Storage Policy 不正確
- ❌ 用戶未登入

### **如果 Bucket 已存在但還是失敗**

確認 Supabase 連線：
```typescript
// 測試連線
const { data, error } = await supabaseBrowserClient.storage.listBuckets()
console.log('Buckets:', data)
console.log('Error:', error)
```

---

## 💡 簡化版 vs 完整版

### **簡化版 (AvatarUploaderSimple)** ← 現在使用
```
Upload → Pixelate → Upload to Storage → Done
優點: 快速、穩定、零依賴
缺點: 無 AI 增強
```

### **完整版 (AvatarUploader)** ← 暫不使用
```
Upload → Pixelate → Gemini分析 → AI生成 → Done
優點: 更好品質
缺點: 複雜、需要 Gemini API
```

---

## 🎯 下一步

1. **確認 Supabase Storage 設置**
   - 創建 `avatars` bucket
   - 設置 policies

2. **重新測試**
   - 刷新頁面
   - 重新上傳照片

3. **成功後**
   - 可以考慮加回 Gemini（可選）
   - 或保持簡單版本

---

**簡化版已經很好用了！先把這個跑通再說。** ✨
