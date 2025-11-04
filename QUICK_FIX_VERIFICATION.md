# 🎯 快速驗證步驟 - 無限遞迴修復

**立即執行這 4 個步驟！**

---

## ✅ Step 1: 清除瀏覽器緩存

### 方法 A: 使用 DevTools

1. 按 `F12` 或 `Cmd+Opt+I` 打開 DevTools
2. 點擊 **Application** 標籤
3. 左側選擇 **Storage**
4. 點擊 **Clear site data**
5. 點擊 **Clear data** 按鈕

### 方法 B: 使用 Console

在 Console 執行：

```javascript
localStorage.clear()
sessionStorage.clear()
console.log('✅ Storage cleared')
```

---

## 🔄 Step 2: 硬刷新頁面

### Mac
```
Cmd + Shift + R
```

### Windows
```
Ctrl + Shift + F5
```

### 或使用 DevTools
1. 打開 DevTools (F12)
2. **右鍵點擊**刷新按鈕
3. 選擇 "**清空快取並強制重新整理**"

---

## ✍️ Step 3: 提交測試題目

複製並貼上這個英文題目：

```
There are reports coming in that a number of people have been injured in a terrorist ___ . (A) access (B) supply (C) attack (D) burden
```

按 `Enter` 提交。

---

## ✅ Step 4: 驗證結果

### ✅ 成功標準

#### Console 應該顯示:

```javascript
✅ [API Guard] Global fetch guard installed
✅ [ForceSolver] Solver-only mode active
✅ Guard: hard=none
✅ experts=[english:0.69,...]
✅ chosen=english
✅ Subject detection validated: english
```

#### UI 應該顯示:

- ✅ **詳解卡片**（不是選擇題）
- ✅ 頂部有 [詳解｜相似題｜重點] 三個 Chip
- ✅ 內容是**英文相關**的解釋
- ✅ 沒有數學公式

### ❌ 失敗標準

#### 不應該出現:

```javascript
❌ [API Guard] ✅ Allowed: ... (重複 3000 次)
❌ Maximum call stack size exceeded
❌ RangeError
❌ [warmup-mcq] Subject input: undefined
```

#### 不應該看到:

- ❌ "下列哪一個描述最符合...？" 選擇題
- ❌ 數學選項（餘弦定理等）
- ❌ 數學公式

---

## 📊 驗證清單

完成後勾選：

- [ ] Step 1: 已清除瀏覽器緩存
- [ ] Step 2: 已執行硬刷新
- [ ] Step 3: 已提交英文題目
- [ ] Step 4A: Console 無遞迴錯誤
- [ ] Step 4B: Console 無洗版日誌
- [ ] Step 4C: UI 顯示詳解卡片
- [ ] Step 4D: 內容是英文相關

---

## 📝 回報格式

### 如果成功 ✅

```
✅ 所有檢查通過
Console: Subject detection validated: english
UI: 顯示英文詳解卡片
無錯誤
```

### 如果失敗 ❌

```
❌ 仍有問題:
[描述問題]
[貼上 Console 錯誤]
[截圖]
```

---

## 🚨 緊急排查

### 如果仍有遞迴錯誤

```bash
# 完全重啟
lsof -ti:3000 | xargs kill -9
rm -rf apps/web/.next
pnpm run dev:web

# 等待 15 秒後
# 關閉所有瀏覽器視窗
# 重新打開瀏覽器
# 訪問 http://localhost:3000/ask
```

---

**現在立即執行 Step 1-4！** 🎯


