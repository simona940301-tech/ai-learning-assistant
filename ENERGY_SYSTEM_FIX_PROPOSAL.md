# 精力值系統修正方案 - 新用戶滿精力值保證

## 📋 問題分析

**目前問題：**
1. `handle_new_user()` 函數創建 profile 時沒有明確設定精力值相關欄位
2. 雖然 schema 有 `daily_energy_count INTEGER DEFAULT 8`，但 `daily_energy_reset_at` 可能為 NULL
3. 新用戶可能無法立即開始遊戲（精力值或重置時間未正確初始化）

**影響範圍：**
- 所有新註冊用戶
- 第一次登入體驗
- 遊戲可用性

---

## 🎯 解決方案比較

### 方案一：資料庫層級確保（基礎版）
**實作方式：**
- 在 `handle_new_user()` 函數中明確設定精力值欄位
- 使用簡單的 NOW() + INTERVAL '1 day' 作為重置時間

**優點：**
- ✅ 實作簡單快速
- ✅ 所有新用戶都會有正確的初始值
- ✅ 資料庫層級保證一致性

**缺點：**
- ❌ 重置時間計算不夠精確（UTC+8 04:00）
- ❌ 未考慮時區問題

---

### 方案二：資料庫層級 + 精確時區計算（標準版）
**實作方式：**
- 在 `handle_new_user()` 函數中設定精力值
- 使用精確的 UTC+8 04:00 重置時間計算
- 與現有 API 邏輯保持一致

**優點：**
- ✅ 時區計算精確
- ✅ 與現有系統一致
- ✅ 資料庫層級保證

**缺點：**
- ⚠️ 需要複製時區計算邏輯到資料庫函數

---

### 方案三：完整初始化 + 欄位檢查 + 回補機制（頂尖版）⭐️ **推薦**
**實作方式：**
1. **資料庫層級初始化**：在 `handle_new_user()` 中完整設定所有精力值相關欄位
2. **精確時區計算**：使用與 API 層一致的 UTC+8 04:00 計算邏輯
3. **Schema 完善**：確保 `daily_energy_reset_at` 欄位在 schema 中有正確的 DEFAULT 值
4. **回補機制**：提供 migration 修正現有用戶
5. **防護機制**：在 API 層添加 fallback 邏輯

**優點：**
- ✅ 完整的資料庫層級保證
- ✅ 精確的時區處理
- ✅ 向後兼容（修正現有用戶）
- ✅ 雙重防護（資料庫 + API）
- ✅ 符合業界最佳實踐（王者榮耀、陰陽師等）

**缺點：**
- ⚠️ 實作較複雜
- ⚠️ 需要 migration 腳本

---

## 🏆 最頂尖實作方案（方案三）

### 實作內容

#### 1. **完善的資料庫函數**
```sql
-- 精確計算 UTC+8 04:00 的重置時間
CREATE OR REPLACE FUNCTION get_next_energy_reset_time()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_reset TIMESTAMPTZ;
BEGIN
  -- 計算下一個 UTC+8 04:00 的時間點
  SELECT (
    (CURRENT_DATE AT TIME ZONE 'Asia/Taipei' + INTERVAL '1 day' + INTERVAL '4 hours') 
    AT TIME ZONE 'UTC'
  ) INTO next_reset;
  
  -- 如果當前時間已經超過今天的 04:00，則設定為明天
  IF next_reset <= NOW() AT TIME ZONE 'UTC' THEN
    SELECT (
      (CURRENT_DATE AT TIME ZONE 'Asia/Taipei' + INTERVAL '2 days' + INTERVAL '4 hours') 
      AT TIME ZONE 'UTC'
    ) INTO next_reset;
  END IF;
  
  RETURN next_reset;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 更新 handle_new_user() 函數
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    daily_energy_count,
    daily_energy_reset_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    8, -- 滿精力值
    get_next_energy_reset_time() -- 精確的下次重置時間
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. **Schema 完善**
- 確保 `daily_energy_reset_at` 欄位有正確的 DEFAULT 值
- 添加檢查約束確保精力值在合理範圍

#### 3. **回補 Migration**
- 修正所有現有用戶的精力值設定
- 確保 NULL 值被正確初始化

#### 4. **API 層 Fallback**
- 在 `/api/play/user/status` 中添加檢查
- 如果發現 NULL 值，自動修正

---

## 📊 業界參考

### 王者榮耀
- ✅ 新用戶註冊：滿精力值
- ✅ 重置時間：每天固定時間（04:00）
- ✅ 精力值上限：根據等級調整

### 陰陽師
- ✅ 新用戶註冊：滿精力值 + 新手禮包
- ✅ 時間恢復 + 道具恢復混合模式
- ✅ 精力值上限：50（可升級）

### 我們的系統
- ✅ 精力值上限：8
- ✅ 重置時間：UTC+8 04:00
- ✅ 新用戶：應為滿精力值（8）

---

## ✅ 實作檢查清單

- [ ] 1. 建立 `get_next_energy_reset_time()` 函數
- [ ] 2. 更新 `handle_new_user()` 函數
- [ ] 3. 確保 schema 中有 `daily_energy_reset_at` 欄位定義
- [ ] 4. 建立回補 migration 修正現有用戶
- [ ] 5. 更新 API 層添加 fallback 邏輯
- [ ] 6. 測試新用戶註冊流程
- [ ] 7. 測試現有用戶資料修正

---

## 🚀 建議採用方案

**推薦：方案三（頂尖版）**

**原因：**
1. 符合業界最佳實踐
2. 完整解決問題（新用戶 + 現有用戶）
3. 提供雙重防護機制
4. 精確的時區處理
5. 向後兼容
















