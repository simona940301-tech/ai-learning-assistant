# 🚀 正式版本部署檢查清單

## 切換到正式版本

### 1. 環境變數設置

在 Vercel 或其他部署平台，確保以下環境變數設置：

**必須移除或設置為 false：**
- `NEXT_PUBLIC_PREVIEW_FORCE_MOCK` - 移除或設置為 `false`

**確保設置正確：**
- `NODE_ENV` - 在生產環境自動設置為 `production`
- `NEXT_PUBLIC_SUPABASE_URL` - 你的 Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 你的 Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` - 你的 Supabase Service Role Key

### 2. Mock User 檢查

Mock user 模式會在以下情況啟用：
- `NODE_ENV === 'development'` (本地開發)
- `NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'` (Vercel Preview)

**正式版本會自動禁用 mock user**，因為：
- 生產環境的 `NODE_ENV` 是 `production`
- 如果沒有設置 `NEXT_PUBLIC_PREVIEW_FORCE_MOCK`，就不會啟用

### 3. 頭像系統檢查

✅ **已修復的問題：**
- Profile 頁面頭像顯示
- 對戰畫面頭像顯示
- Onboarding 只顯示兩個學生選項
- 選擇頭像後需要確認按鈕

**檢查項目：**
1. 確保 `apps/web/public/avatars/presets/student/` 中有：
   - `student-01.webp.png`
   - `student-02.webp.png`

2. 確保資料庫中的 `profiles.avatar_url` 欄位正確保存頭像路徑

3. 測試流程：
   - 完成 onboarding 選擇頭像
   - 檢查 Profile 頁面是否顯示頭像
   - 進入對戰檢查頭像是否顯示

### 4. 部署前測試

在本地測試正式模式：
```bash
# 設置環境變數
export NODE_ENV=production
export NEXT_PUBLIC_PREVIEW_FORCE_MOCK=false

# 運行生產構建
npm run build
npm run start
```

### 5. Vercel 部署檢查

1. 進入 Vercel 專案設置
2. 檢查 Environment Variables
3. 確保 Production 環境沒有 `NEXT_PUBLIC_PREVIEW_FORCE_MOCK`
4. 或設置為 `false`

### 6. 頭像顯示問題排查

如果頭像不顯示，檢查：

1. **Profile 頁面：**
   - 檢查 `/api/profile` 是否返回 `avatar_url`
   - 檢查瀏覽器 Console 是否有圖片載入錯誤
   - 檢查 `user.avatar` 是否有值

2. **對戰畫面：**
   - 檢查 `play-context` 中的 `userStatus.avatarUrl` 是否有值
   - 檢查 `BattleHeader` 是否正確傳遞 `playerAvatarUrl`

3. **資料庫：**
   - 檢查 `profiles` 表中的 `avatar_url` 欄位
   - 確認路徑格式正確（例如：`/avatars/presets/student/student-01.webp.png`）

### 7. 快速修復命令

如果 mock user 沒有頭像，可以手動設置：

```sql
UPDATE profiles 
SET avatar_url = '/avatars/presets/student/student-01.webp.png'
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';
```

## 部署步驟

1. ✅ 確保所有環境變數正確設置
2. ✅ 確保頭像圖片檔案存在
3. ✅ 運行本地生產構建測試
4. ✅ 部署到 Vercel
5. ✅ 測試 onboarding 流程
6. ✅ 測試 Profile 頁面頭像顯示
7. ✅ 測試對戰畫面頭像顯示

## 緊急修復

如果部署後發現問題：

1. **頭像不顯示：**
   - 檢查圖片路徑是否正確
   - 檢查 CORS 設置
   - 檢查圖片檔案是否存在於 `public` 資料夾

2. **Mock user 仍在啟用：**
   - 檢查環境變數設置
   - 清除 Vercel 快取
   - 重新部署

3. **Onboarding 問題：**
   - 檢查資料庫連接
   - 檢查 API 路由是否正常
   - 檢查 Console 錯誤訊息



































