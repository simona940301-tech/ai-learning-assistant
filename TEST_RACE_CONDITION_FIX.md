# 🧪 Race Condition 修復測試指南

## 修復內容

✅ **問題**: React 18 批處理導致 battleState 為 null，無法進入戰鬥
✅ **解決**: 使用 ROUND_STARTED 消息中的 question 數據，不依賴 MATCH_FOUND 狀態更新
✅ **修改文件**: `/apps/web/lib/play-context.tsx`

---

## 快速測試步驟

### 1. 確認服務運行中

```bash
# ✅ Next.js 開發伺服器 (port 3000)
ps aux | grep "next dev" | grep -v grep

# ✅ Rust WebSocket 伺服器 (port 8080)
ps aux | grep battle-ws | grep -v grep
```

### 2. 訪問遊戲頁面

打開瀏覽器：http://localhost:3000/play

### 3. 開始 PVE 對戰

1. 點擊 **「系統對戰」**
2. 選擇 **「個人訓練模式」**
3. 選擇科目和時間（任意）
4. 點擊 **「立即開始」**

### 4. 觀察結果

#### ✅ 預期成功流程

**視覺效果:**
- 過渡動畫顯示（藍紫色背景，脈衝圓圈）
- 文字：「準備開始...」
- 0.8-1 秒後平滑進入戰鬥畫面
- 題目正確顯示，可以答題

**Console 日誌 (正常情況 - 無 race condition):**
```
[SystemBattleModal] 🚀 Starting PVE transition overlay
[PlayProvider] 📨 Received message: MATCH_FOUND
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!
[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay
[PlayProvider] 📨 Received message: ROUND_STARTED
[PlayProvider] 🎮 Round started: 0
[PlayProvider] 🔍 ROUND_STARTED - prev state: {exists: true, questionCount: 3}
[PlayProvider] ✅ Setting isInBattle = true
```

**Console 日誌 (Race Condition 發生但被修復):**
```
[SystemBattleModal] 🚀 Starting PVE transition overlay
[PlayProvider] 📨 Received message: MATCH_FOUND
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!
[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay
[PlayProvider] 📨 Received message: ROUND_STARTED
[PlayProvider] 🎮 Round started: 0
[PlayProvider] 🔍 ROUND_STARTED - prev state: {exists: false}  ← 檢測到 race condition
[PlayProvider] ⚠️ battleState is null due to React batching, using ROUND_STARTED question data
[PlayProvider] ✅ Creating initial state with current question
```

#### ❌ 如果仍然失敗

**症狀:**
- 過渡動畫顯示後卡住
- 無法進入戰鬥畫面
- Console 顯示錯誤

**檢查項目:**
```bash
# 1. 確認 Next.js 已重新編譯修改的檔案
# 查看終端是否顯示 "Compiled" 訊息

# 2. 確認 WebSocket 伺服器版本
cat /tmp/battle-ws-release.log | tail -20

# 3. 強制刷新瀏覽器（清除快取）
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R

# 4. 檢查是否有其他錯誤
# 打開瀏覽器 Console 查看完整日誌
```

---

## 詳細測試場景

### 場景 A: 正常流程（推薦先測試）

**條件:** 電腦性能正常，網絡良好
**預期:** MATCH_FOUND 狀態更新及時，使用原有流程
**日誌:** 看到 `exists: true, questionCount: 3`

### 場景 B: Race Condition（可能在慢設備發生）

**條件:** 可能在性能較差的設備或高負載時自動發生
**預期:** 系統自動使用 ROUND_STARTED 的 question 數據
**日誌:** 看到 `exists: false` + `using ROUND_STARTED question data`
**結果:** 戰鬥仍然正常開始，無崩潰

### 場景 C: 多回合測試

**操作:**
1. 完成第一題答題
2. 等待第二題出現
3. 完成第二題
4. 完成第三題
5. 查看戰鬥結果

**預期:**
- 每一題都能正常顯示
- 答題狀態正確記錄
- 戰鬥結果正確顯示

---

## 關鍵指標

### ✅ 修復成功標誌

1. **無 CRITICAL 錯誤**
   - ❌ 不再看到: `CRITICAL: battleState is null in ROUND_STARTED!`
   - ✅ 可能看到: `⚠️ battleState is null due to React batching` (這是正常的警告)

2. **能進入戰鬥**
   - ✅ 過渡動畫 → 戰鬥畫面（平滑過渡）
   - ✅ 題目正確顯示
   - ✅ 選項可點擊

3. **多回合正常**
   - ✅ 第一題 → 第二題 → 第三題（無卡頓）
   - ✅ 分數正確累加

### ❌ 需要進一步調查的情況

1. **仍然卡在過渡動畫**
   - 檢查 WebSocket 連線狀態
   - 查看是否收到 ROUND_STARTED 消息

2. **題目顯示為空白**
   - 檢查 `message.question` 是否存在
   - 查看 Console 是否有 `No question in ROUND_STARTED message!` 錯誤

3. **第二題無法顯示**
   - 檢查題目列表更新邏輯
   - 查看 `Adding question to list at index` 日誌

---

## 快速驗證命令

```bash
# 1. 檢查修改是否生效
grep -A 5 "using ROUND_STARTED question data" /Users/simonac/Desktop/moonshot-idea/apps/web/lib/play-context.tsx

# 2. 查看最新的 WebSocket 日誌
tail -f /tmp/battle-ws-release.log

# 3. 重新編譯前端（如果需要）
cd /Users/simonac/Desktop/moonshot-idea/apps/web
# Next.js 會自動編譯，無需手動操作

# 4. 清除瀏覽器快取後重新測試
# 在瀏覽器按 Cmd + Shift + R (Mac) 或 Ctrl + Shift + R (Windows)
```

---

## 預期改進

### 修復前
```
用戶體驗:
  點擊開始 → 過渡動畫 → ❌ 卡住（battleState null）

Console:
  ❌ CRITICAL: battleState is null in ROUND_STARTED!

結果: 無法進入戰鬥
```

### 修復後
```
用戶體驗:
  點擊開始 → 過渡動畫 → ✅ 平滑進入戰鬥

Console:
  ⚠️ battleState is null due to React batching (可能出現)
  ✅ using ROUND_STARTED question data (可能出現)
  ✅ Creating initial state with current question

結果: 戰鬥正常開始
```

---

## 相關文件

- **修復文檔**: `RACE_CONDITION_FINAL_FIX.md`
- **原始問題報告**: `BATTLESTATE_NULL_FIX.md`
- **過渡動畫修復**: `PVE_TRANSITION_FIX.md`
- **修改代碼**: `apps/web/lib/play-context.tsx` (line 576-651)

---

**測試準備完成時間**: 2025-11-19 13:26
**修復版本**: Final
**等待測試結果** ⏳
