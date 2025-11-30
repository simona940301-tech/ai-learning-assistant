# Chick System 開發指南

## 📋 概述

本指南說明如何驗證、測試和開發 Chick Hatching System 相關功能。

## 🚀 快速開始

### 1. 執行資料庫遷移

在 Supabase Dashboard → SQL Editor 中執行：

```sql
-- 檔案位置: apps/web/db/migrations/add_chick_hatching_system.sql
-- 或直接複製貼上 SQL 內容
```

### 2. 驗證遷移

```bash
npm run verify:chick-migration
```

此腳本會檢查：
- ✅ 所有必要欄位是否存在
- ✅ 索引是否建立
- ✅ 資料庫函數是否可用

### 3. 檢查開發環境

```bash
npm run dev:check-chick
```

此腳本會檢查：
- ✅ 環境變數設定
- ✅ 資料庫連線
- ✅ 遷移狀態
- ✅ API 伺服器狀態
- ✅ 必要檔案存在

### 4. 測試 API

```bash
# 測試所有 API
npm run test:chick-api

# 只測試特定 API
npm run test:chick-api -- --hatch
npm run test:chick-api -- --status
npm run test:chick-api -- --whistle
```

## 📁 檔案結構

### 核心組件

```
apps/web/
├── components/chick/
│   ├── ReunionModal.tsx          # 久別重逢彈窗
│   ├── ReunionGate.tsx            # 重逢邏輯閘道
│   ├── HatchingCeremony.tsx      # 孵化儀式
│   └── ...
├── src/store/
│   └── chickStore.ts             # Zustand store
├── app/api/chick/
│   ├── hatch/route.ts            # 孵化 API
│   ├── status/route.ts           # 狀態 API
│   └── reunion/whistle/route.ts   # 哨子 API
└── scripts/
    ├── verify-chick-migration.ts  # 遷移驗證
    ├── test-chick-api.ts          # API 測試
    └── dev-check-chick.ts         # 開發環境檢查
```

## 🔧 開發工具

### 遷移驗證腳本

**用途**: 驗證資料庫遷移是否正確執行

```bash
npm run verify:chick-migration
```

**檢查項目**:
- `profiles` 表的 5 個新欄位
- `use_chick_whistle` 函數

### API 測試工具

**用途**: 測試 chick 相關 API 端點

```bash
npm run test:chick-api
```

**測試端點**:
- `POST /api/chick/hatch` - 孵化小雞
- `GET /api/chick/status` - 獲取狀態
- `POST /api/chick/reunion/whistle` - 使用哨子

**注意**: 需要有效的認證 token 或 mock user session

### 開發環境檢查

**用途**: 一鍵檢查所有開發環境設定

```bash
npm run dev:check-chick
```

**檢查項目**:
- 環境變數設定
- 資料庫連線
- 遷移狀態
- API 伺服器可達性
- 必要檔案存在

## 🐛 故障排除

### 問題 1: 遷移驗證失敗

**症狀**: `verify:chick-migration` 顯示欄位不存在

**解決方案**:
1. 確認已在 Supabase Dashboard 執行遷移 SQL
2. 檢查 Supabase 連線設定
3. 確認環境變數 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 正確

### 問題 2: API 測試返回 401

**症狀**: `test:chick-api` 顯示認證失敗

**解決方案**:
1. 確認開發伺服器正在運行 (`npm run dev`)
2. 確認 mock user 已建立 (`npm run seed:mock-user`)
3. 檢查環境變數 `MOCK_USER_ID` 是否設定

### 問題 3: API 伺服器無法連線

**症狀**: `dev:check-chick` 顯示 API 伺服器連線失敗

**解決方案**:
1. 確認開發伺服器正在運行 (`npm run dev`)
2. 檢查 `NEXT_PUBLIC_APP_URL` 環境變數（預設為 `http://localhost:3000`）
3. 確認沒有防火牆或代理阻擋連線

## 📊 資料庫結構

### 新增欄位 (profiles 表)

- `chick_name` (TEXT) - 小雞名稱
- `user_nickname` (TEXT) - 用戶暱稱
- `chick_hatched_at` (TIMESTAMPTZ) - 孵化時間
- `chick_first_fed_at` (TIMESTAMPTZ) - 首次餵食時間
- `last_seen_at` (TIMESTAMPTZ) - 最後活躍時間

### 新增函數

- `use_chick_whistle(p_user_id UUID, p_cost INTEGER)` - 使用哨子召回小雞

## 🔐 環境變數

### 必要變數

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 可選變數

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
MOCK_USER_ID=e770f9cd-52a7-43de-b983-70f6f78d2f53
```

## ✅ 驗收清單

在部署前確認：

- [ ] 資料庫遷移已執行
- [ ] 遷移驗證通過 (`npm run verify:chick-migration`)
- [ ] 開發環境檢查通過 (`npm run dev:check-chick`)
- [ ] API 測試通過 (`npm run test:chick-api`)
- [ ] 瀏覽器測試通過（手動測試孵化流程）
- [ ] 所有現有功能正常運作

## 📝 相關文件

- [API 架構文件](../docs/API_ARCHITECTURE.md)
- [專案架構文件](../docs/AGENTS.md)

