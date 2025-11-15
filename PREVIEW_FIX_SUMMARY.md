# 🔧 預覽修復總結

## ❌ 發現的問題

### 1. **資料庫缺少 `coins` 欄位**
- **錯誤**: `column profiles.coins does not exist`
- **原因**: API 期望 `coins` 欄位，但資料庫中未創建
- **影響**: 無法顯示用戶錢包餘額

### 2. **Rust WebSocket 伺服器編譯錯誤**
- **錯誤**: `RecallOverlayPayload` 欄位不匹配
- **原因**: 代碼使用舊的欄位名稱（`mastery_map`, `weak_skills`）
- **已修復**: 改為新的欄位（`duration_sec`, `items`）

## ✅ 已修復

### 1. **Rust 代碼修復**
- [x] 修改 [ws_handler.rs:435](services/battle-ws/src/ws_handler.rs:435)
- [x] 使用 `battle_models::RecallOverlayPayload`
- [x] 移除未使用的導入

### 2. **創建資料庫遷移**
- [x] 創建 `20250127_add_coins_field.sql`
- [x] 添加 `coins INTEGER DEFAULT 0 NOT NULL`
- [x] 創建索引 `idx_profiles_coins`

## ⏳ 待完成步驟

### 步驟 1: 執行資料庫遷移

在 Supabase Dashboard 執行以下 SQL：

```sql
-- Migration: Add coins field to profiles table
-- Date: 2025-11-14

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins);

COMMENT ON COLUMN profiles.coins IS 'User wallet balance (coins for rewards)';
```

**檔案路徑**: `supabase/migrations/20250127_add_coins_field.sql`

### 步驟 2: 啟用 Mock 用戶

1. 訪問: http://127.0.0.1:3000/dev-tools
2. 點擊 "Enable" 按鈕
3. 頁面自動重新載入

### 步驟 3: 預覽功能

訪問以下頁面進行預覽：

- **Preview Hub**: http://127.0.0.1:3000/preview
- **Play / 對戰系統**: http://127.0.0.1:3000/play
- **Backpack**: http://127.0.0.1:3000/backpack

## 🎯 預期結果

### 完成遷移後：
- ✅ Play 頁面正常載入
- ✅ 顯示用戶狀態（Elo、Energy、Coins）
- ✅ 對戰系統 UI 可預覽
- ✅ Rust WebSocket 伺服器運行（ws://localhost:8080）

### 當前狀態：
- ✅ Next.js 開發伺服器運行（http://127.0.0.1:3000）
- ✅ Mock 用戶功能已實現
- ⏳ Rust WebSocket 伺服器編譯中
- ⏳ 資料庫遷移待執行

## 📊 Supabase 專案資訊

**專案 ID**: `umzqjgxsetsmwzhniemw`  
**專案 URL**: https://umzqjgxsetsmwzhniemw.supabase.co

---

**最後更新**: 2025-11-14 09:14 (UTC+8)
