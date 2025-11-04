# 🎯 瀏覽器 Console 檢查清單

**URL**: http://localhost:3000  
**工具**: F12 或 Cmd+Opt+I 開啟 Console

---

## ✅ 必須看到的內容

在 Console 中尋找以下輸出：

```javascript
╔═══════════════════════════════════════════════════════╗
║  PLMS Environment Check                               ║
╚═══════════════════════════════════════════════════════╝
```

---

## 📋 逐項檢查

### 1. Region 檢查
```
📍 Region & Timezone:
   Region: tw    ← ✅ 必須是 "tw"
```
- [ ] ✅ 看到 `Region: tw`
- [ ] ❌ 看到 `Region: Not set`

---

### 2. Timezone 檢查 (關鍵!)
```
   Configured TZ: Asia/Taipei    ← ✅ 必須是 "Asia/Taipei"
```
- [ ] ✅ 看到 `Configured TZ: Asia/Taipei`
- [ ] ❌ 看到 `Configured TZ: Not set`

---

### 3. Supabase 連接
```
🔌 Backend Connection:
   Supabase URL: https://umzqjgxsetsmwzhniemw.supabase.co
   Anon Key: ✅ Set
```
- [ ] ✅ 看到 Supabase URL
- [ ] ✅ 看到 `Anon Key: ✅ Set`
- [ ] ❌ 看到 `Anon Key: ❌ Missing`

---

### 4. Feature Flags
```
🎛️  Feature Flags:
   Analytics: ✅ Enabled
   Debug Logs: ✅ Enabled
```
- [ ] ✅ 看到兩個 Feature Flags

---

### 5. 最終狀態 (最重要!)
```
✅ All environment checks passed
```
- [ ] ✅ 看到 `✅ All environment checks passed`
- [ ] ❌ 看到 `⚠️  Warnings:` 或錯誤訊息

---

## 🎉 成功標準

**所有 5 項都打勾** = ✅ 環境配置成功！

**任何一項打 ❌** = ⚠️ 需要排查

---

## ❌ 如果看不到輸出

### 步驟 1: 硬刷新
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### 步驟 2: 檢查 Console Filter
確保 Console 沒有過濾掉 log 訊息

### 步驟 3: 檢查 Console Levels
確保 "Info" 和 "Log" 層級已啟用

### 步驟 4: 清除快取
```
DevTools → Application → Clear storage → Clear site data
然後重新載入頁面
```

---

## 📸 參考截圖

**正確的輸出應該看起來像這樣**:

```
╔═══════════════════════════════════════════════════════╗
║  PLMS Environment Check                               ║
╚═══════════════════════════════════════════════════════╝

📍 Region & Timezone:
   Region: tw                         ✅
   Configured TZ: Asia/Taipei         ✅
   Browser TZ: Asia/Taipei
   Current Time: 2025/10/27 下午12:55:00

🔌 Backend Connection:
   Supabase URL: https://umzqjgxsetsmwzhniemw.supabase.co  ✅
   Anon Key: ✅ Set                   ✅

🎛️  Feature Flags:
   Analytics: ✅ Enabled              ✅
   Debug Logs: ✅ Enabled             ✅

✅ All environment checks passed      ✅

═══════════════════════════════════════════════════════
```

**總共應該有 6 個 ✅ 符號！**

---

## 📝 回報格式

### 如果成功 ✅

```
✅ 所有檢查通過
Region: tw
Configured TZ: Asia/Taipei
Supabase: 已連接
All environment checks passed
```

### 如果失敗 ❌

```
❌ 發現問題:
[複製貼上 Console 中看到的錯誤或 "Not set" 訊息]
```

---

**現在請檢查瀏覽器 Console 並回報結果！** 🎯


