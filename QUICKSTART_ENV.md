# 🚀 PLMS 環境快速啟動指南

---

## ✅ 已完成

```
✅ apps/web/.env.local 已創建
✅ NEXT_PUBLIC_TIMEZONE=Asia/Taipei 已設置
✅ NEXT_PUBLIC_APP_REGION=tw 已設置
✅ Supabase 金鑰已配置
✅ 環境檢查系統已整合
```

---

## 🚀 現在立即執行

### 1. 啟動開發伺服器

```bash
pnpm run dev:web
```

### 2. 打開瀏覽器檢查

打開: **http://localhost:3000**

按 **F12** 或 **Cmd+Opt+I** 開啟 Console

### 3. 驗證輸出

**必須看到**:

```javascript
╔═══════════════════════════════════════════════════════╗
║  PLMS Environment Check                               ║
╚═══════════════════════════════════════════════════════╝

📍 Region & Timezone:
   Region: tw
   Configured TZ: Asia/Taipei  ← ✅ 這行必須出現
   Browser TZ: Asia/Taipei
   Current Time: 2025/10/27 ...

🔌 Backend Connection:
   Supabase URL: https://umzqjgxsetsmwzhniemw.supabase.co
   Anon Key: ✅ Set

✅ All environment checks passed
```

---

## ✅ 成功標誌

Console 顯示:
```
Region: tw
Configured TZ: Asia/Taipei
```

## ❌ 失敗標誌

Console 顯示:
```
Configured TZ: Not set
```

**解決**: 重啟伺服器

---

## 📋 驗收完成後

當 Console 顯示 `timezone=Asia/Taipei` 後，可以：

1. ✅ 運行 E2E 測試
2. ✅ 測試 Warmup API 修復
3. ✅ 驗證科目檢測
4. ✅ 測試完整 Solve 流程

---

**立即執行**: `pnpm run dev:web` 然後檢查 Console！


