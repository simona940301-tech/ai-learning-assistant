# Profile 系統優化 - 快速啟動指南

## 🚀 立即啟用（3 步驟）

### 步驟 1：執行資料庫 Migration

**方式 A：使用 Supabase Dashboard（推薦）**
```bash
# 1. 登入 Supabase Dashboard
# 2. 進入 SQL Editor
# 3. 建立新 Query
# 4. 貼上以下 SQL 並執行

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);

COMMENT ON COLUMN profiles.bio IS 'User bio/description, max 200 characters';
COMMENT ON COLUMN profiles.email_notifications IS 'Enable email notifications';
COMMENT ON COLUMN profiles.push_notifications IS 'Enable push notifications';
```

**方式 B：使用命令列（如果有 psql）**
```bash
psql "${DATABASE_URL}" -f add-profile-fields.sql
```

### 步驟 2：測試驗證

```bash
# 執行測試腳本
npx tsx test-profile-persistence.ts

# 預期結果：
# ✅ Test 1: Checking profiles table structure...
# ✅ Test 2: Testing avatar persistence...
# ✅ Test 3: Testing display name priority...
# ✅ Test 4: Checking onboarding completion status...
# ✅ Test 5: Testing notification preferences...
```

### 步驟 3：啟動應用並測試

```bash
# 啟動開發伺服器
pnpm --filter web dev

# 測試功能：
# 1. 登入應用
# 2. 訪問 /profile - 檢查名稱顯示是否正確
# 3. 訪問 /profile/settings - 測試所有新功能
# 4. 儲存設定 - 確認資料持久化
# 5. 登出再登入 - 驗證資料保存
```

## 📋 功能檢查清單

### Profile 頁面 (`/profile`)
- [ ] 名稱顯示正確（不再是 email）
- [ ] Avatar 正確顯示
- [ ] 點擊「設定」進入 Settings 頁面

### Settings 頁面 (`/profile/settings`)

#### 個人資料區塊
- [ ] 顯示名稱欄位可編輯
- [ ] 使用者名稱欄位可編輯
- [ ] 真實姓名欄位可編輯（選填）
- [ ] 個人簡介欄位可編輯（最多 200 字）
- [ ] 字數統計即時更新

#### 頭像與基本資訊
- [ ] 頭像正確顯示
- [ ] 點擊「更換頭像」可選擇新頭像
- [ ] 新頭像即時預覽

#### 目標設定
- [ ] 理想大學下拉選單
- [ ] 目標科系下拉選單（根據大學動態更新）

#### 通知偏好
- [ ] Email 通知開關
- [ ] 推播通知開關

#### 儲存功能
- [ ] 點擊「儲存設定」按鈕
- [ ] 顯示「設定已成功儲存！」綠色訊息
- [ ] 1.5 秒後自動返回 Profile 頁面
- [ ] 返回後所有資料正確顯示

### 資料持久性測試
- [ ] 登出應用
- [ ] 重新登入
- [ ] 訪問 `/profile` - 所有資料保持不變
- [ ] Avatar 正確顯示
- [ ] 名稱正確顯示
- [ ] 訪問 `/profile/settings` - 所有設定保持不變

## 🐛 疑難排解

### 問題 1：名稱仍顯示 email
**解決方案**：
```bash
# 清除瀏覽器快取
# 或使用無痕模式重新測試
```

### 問題 2：Settings 頁面載入錯誤
**檢查**：
```bash
# 確認 Migration 已執行
npx tsx run-profile-migration.ts

# 應該顯示：
# ✅ All fields already exist! No migration needed.
```

### 問題 3：儲存後資料消失
**檢查**：
```bash
# 檢查資料庫連線
# 檢查 console 是否有錯誤訊息
# 確認 Supabase RLS policies 正確
```

## 📊 驗證成功標準

執行以下指令，所有項目都應該是 `✓`：

```bash
npx tsx run-profile-migration.ts
```

預期輸出：
```
Current fields:
  - bio: ✓
  - email_notifications: ✓
  - push_notifications: ✓

✅ All fields already exist! No migration needed.
```

## 🎯 核心改進

### Before → After

1. **Profile 頁面名稱**
   - ❌ Before: `user@example.com` → 顯示為 "user"
   - ✅ After: 優先顯示 display_name → full_name → username

2. **Settings 功能**
   - ❌ Before: 只有 username、avatar、目標學校
   - ✅ After: 完整個人資料 + 通知偏好 + UX 優化

3. **Avatar 持久性**
   - ❌ Before: 擔心登出後消失
   - ✅ After: 完整測試驗證，確保持久化

## 📞 支援

如有任何問題，請檢查：
1. [PROFILE_ENHANCEMENT_SUMMARY.md](PROFILE_ENHANCEMENT_SUMMARY.md) - 完整技術文件
2. Console 錯誤訊息
3. Supabase Dashboard → Logs

---

**預估完成時間**：5-10 分鐘
**難度**：⭐⭐☆☆☆（簡單）
**風險**：✅ 低（所有改動都向下相容）
