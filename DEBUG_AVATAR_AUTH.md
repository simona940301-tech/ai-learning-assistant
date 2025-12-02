# 🔍 Debug Avatar Upload RLS 問題

## 問題
執行了 RLS 政策後，還是遇到：
```
new row violates row-level security policy (403)
```

## 可能的原因

### 1. 用戶未正確認證
RLS 政策要求 `auth.role() = 'authenticated'`，但用戶可能：
- Session 過期
- 使用匿名登入
- Token 無效

### 2. 政策沒有正確創建
政策可能沒有成功應用到 storage.objects

### 3. Bucket 配置問題
Bucket 的 RLS 可能被強制啟用但沒有正確的政策

---

## 🔧 立即診斷步驟

### 步驟 1: 檢查用戶認證狀態

**在瀏覽器 Console 執行**：

```javascript
// 檢查當前用戶
const { data: { user }, error } = await supabase.auth.getUser()
console.log('User:', user)
console.log('User ID:', user?.id)
console.log('User role:', user?.role)
console.log('Error:', error)

// 檢查 session
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('Access token exists:', !!session?.access_token)
```

**期望結果**：
```javascript
User: { id: "e770f9cd-52a7-43de-b983-70f6f78d2f53", ... }
User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
User role: authenticated
Session: { access_token: "...", ... }
Access token exists: true
```

**如果失敗**：
- User 是 null → 需要重新登入
- User role 不是 'authenticated' → 可能是匿名用戶
- Session 是 null → Token 過期，需要刷新

---

### 步驟 2: 檢查 RLS 政策是否存在

**在 Supabase SQL Editor 執行**：

```sql
-- 檢查所有 storage.objects 政策
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;
```

**期望結果**：應該看到至少這些政策
```
policyname: "Authenticated users upload avatars"
cmd: INSERT
```

**如果沒有看到**：
- 政策創建失敗
- 需要手動創建政策

---

### 步驟 3: 檢查 Bucket RLS 設置

**在 Supabase SQL Editor 執行**：

```sql
-- 檢查 bucket 配置
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'avatars';
```

**期望結果**：
```
name: avatars
public: true
```

**如果 public 是 false**：
- 需要在 Dashboard 設置 bucket 為 public
- 或者修改 RLS 政策

---

### 步驟 4: 測試簡化的政策

如果上面的都正常，嘗試**臨時**使用更寬鬆的政策來測試：

**⚠️ 警告：這是測試用的，不要用在生產環境！**

```sql
-- 臨時移除限制（僅測試用）
DROP POLICY IF EXISTS "Authenticated users upload avatars" ON storage.objects;

-- 創建超級寬鬆的測試政策
CREATE POLICY "Test avatar upload - REMOVE LATER"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');
```

**測試上傳**：
- 如果成功 → 問題在認證檢查
- 如果失敗 → 問題在其他地方

**成功後記得刪除測試政策**：
```sql
DROP POLICY IF EXISTS "Test avatar upload - REMOVE LATER" ON storage.objects;

-- 重新創建正確的政策
CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );
```

---

## 🎯 快速修復方案

### 方案 A: 重新登入

如果是認證問題，最簡單的方法：

1. 登出
2. 清除瀏覽器 localStorage
3. 重新登入
4. 重新測試上傳

```javascript
// 在 Console 執行
await supabase.auth.signOut()
localStorage.clear()
// 然後重新登入
```

---

### 方案 B: 使用 Service Role（開發環境）

**僅限開發測試**，在 `.env.local` 添加：

```bash
# ⚠️ 不要提交到 Git！
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

然後修改上傳邏輯使用 service role（繞過 RLS）。

**不推薦用在生產環境！**

---

### 方案 C: 檢查 Auth Context

確認 `useAuth()` 返回的用戶是正確的：

在 `AvatarUploaderSimple.tsx` 添加調試：

```typescript
const { user } = useAuth()

// 添加這個
useEffect(() => {
  console.log('[AvatarUploader] Current user:', user)
  console.log('[AvatarUploader] User ID:', user?.id)
}, [user])
```

如果 user 是 null，問題在認證流程。

---

## 🔍 常見錯誤

### 錯誤 1: Anon Key vs Service Role
```typescript
// ❌ 錯誤：使用 anon key 但沒有正確的 session
const client = createClient(url, ANON_KEY)

// ✅ 正確：確保有有效的 session
const { data: { session } } = await client.auth.getSession()
console.log('Has session:', !!session)
```

### 錯誤 2: RLS 政策語法
```sql
-- ❌ 錯誤：使用 WHERE 而不是 WITH CHECK
CREATE POLICY "Upload" ON storage.objects
  WHERE bucket_id = 'avatars';

-- ✅ 正確：INSERT 需要 WITH CHECK
CREATE POLICY "Upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

### 錯誤 3: Schema 名稱
```sql
-- ❌ 錯誤：使用 public schema
CREATE POLICY "Upload" ON objects ...

-- ✅ 正確：使用 storage schema
CREATE POLICY "Upload" ON storage.objects ...
```

---

## 📋 完整檢查清單

執行每一步並記錄結果：

- [ ] 步驟 1: 用戶認證狀態檢查
  - [ ] User ID 存在
  - [ ] Session 有效
  - [ ] Access token 存在

- [ ] 步驟 2: RLS 政策檢查
  - [ ] 政策已創建
  - [ ] 政策名稱正確
  - [ ] 政策類型是 INSERT

- [ ] 步驟 3: Bucket 設置檢查
  - [ ] Bucket 存在
  - [ ] Bucket 是 public

- [ ] 步驟 4: 測試簡化政策
  - [ ] 寬鬆政策測試
  - [ ] 上傳成功/失敗

---

## 🚀 下一步

1. **執行步驟 1** 檢查用戶認證
2. 在這裡貼上結果
3. 根據結果決定修復方案

**現在先執行步驟 1 的 Console 命令！** 🔍
