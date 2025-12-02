# 🧪 錯題本練習系統 - 快速測試指南

## ⚡ 快速啟動測試

### 步驟 1: 啟動開發伺服器
```bash
cd /Users/simonac/Desktop/moonshot-idea
pnpm --filter web dev
```

### 步驟 2: 準備測試數據

#### 選項 A: 手動創建錯題（推薦）
1. 打開瀏覽器訪問 `http://localhost:3000`
2. 登入系統
3. 前往 `/play` 頁面
4. 開始一場對戰（PVE 或 PVP）
5. **故意答錯至少 3 題**（這些會自動加入錯題本）

#### 選項 B: 使用 SQL 插入測試數據
```sql
-- 1. 確認你的 user_id
SELECT id, email FROM auth.users LIMIT 1;

-- 2. 查找一些題目 ID
SELECT id, stem FROM pack_questions LIMIT 5;

-- 3. 插入錯題記錄
INSERT INTO error_book (user_id, question_id, status)
VALUES
  ('YOUR_USER_ID', 'QUESTION_ID_1', 'active'),
  ('YOUR_USER_ID', 'QUESTION_ID_2', 'active'),
  ('YOUR_USER_ID', 'QUESTION_ID_3', 'active');
```

---

## 🎯 核心功能測試

### 測試 1: 基本流程 ✅

**操作步驟**:
```
1. 訪問 http://localhost:3000/backpack
2. 點擊頂部「錯題本」按鈕
3. 確認看到錯題列表
4. 點擊底部「📚 開始練習錯題本 (X 題)」按鈕
5. 等待跳轉到練習室
```

**預期結果**:
- ✅ 顯示錯題列表（包含題目預覽、科目標籤）
- ✅ 按鈕顯示正確的錯題數量
- ✅ 點擊後跳轉到 `/play/practice/{roomCode}`
- ✅ 練習室載入並顯示第一題
- ✅ 題目來自錯題本

**驗證方法**:
```bash
# 打開開發者工具 Console
# 查看網路請求:
POST /api/play/practice/create
{
  "sourceType": "ERROR_BOOK",
  "subject": null
}

GET /api/play/practice/questions?roomId=xxx&offset=0&limit=20
```

---

### 測試 2: 科目過濾 ✅

**操作步驟**:
```
1. 在 Backpack 錯題本視圖
2. 點擊科目過濾器（如「數學」）
3. 確認只顯示該科目錯題
4. 點擊「開始練習」
5. 進入練習室
```

**預期結果**:
- ✅ 過濾後只顯示該科目錯題
- ✅ 按鈕顯示過濾後的數量
- ✅ 練習室只包含該科目題目

**驗證 API 請求**:
```json
POST /api/play/practice/create
{
  "sourceType": "ERROR_BOOK",
  "subject": "math"
}
```

---

### 測試 3: 錯題本為空 ✅

**操作步驟**:
```
1. 刪除所有錯題記錄（或使用新用戶）
2. 前往 Backpack → 錯題本
3. 點擊「開始練習」（如果按鈕存在）
```

**預期結果**:
- ✅ 顯示「還沒有錯題」提示
- ✅ 不顯示「開始練習」按鈕（因為 `filteredErrorBookItems.length === 0`）

**SQL 清空錯題**:
```sql
DELETE FROM error_book WHERE user_id = 'YOUR_USER_ID';
```

---

### 測試 4: 答題流程 ✅

**操作步驟**:
```
1. 進入錯題本練習室
2. 閱讀第一題
3. 選擇答案（A/B/C/D）
4. 觀察反饋
5. 滾動到下一題
```

**預期結果**:
- ✅ 題目正確顯示（question_text, options）
- ✅ 選擇答案後顯示正確/錯誤反饋
- ✅ 錯誤答案顯示詳解（如果有）
- ✅ 答對題目不再加入錯題本
- ✅ 答錯題目自動更新錯題本時間
- ✅ 無限滾動載入更多題目

---

### 測試 5: 多人練習（未來功能預覽）

**操作步驟**:
```
1. 用戶 A 創建錯題本練習室
2. 複製 room_code（如 ABC123）
3. 用戶 B 訪問 /play/practice/ABC123
4. 兩人同時答題
```

**預期結果**:
- ✅ 兩人看到相同題目順序（因為 deterministic shuffle）
- ✅ 實時顯示參與者數量
- ⚠️ 目前不支援實時進度同步（Phase 2 功能）

---

## 🐛 邊界情況測試

### 邊界 1: 未登入用戶
```
1. 登出系統
2. 訪問 /backpack
```
**預期**: 顯示「請先登入」提示

---

### 邊界 2: 無效 room_code
```
訪問 /play/practice/INVALID123
```
**預期**: 顯示「練習室不存在」錯誤

---

### 邊界 3: 題目數據缺失
```sql
-- 刪除某個 pack_question
DELETE FROM pack_questions WHERE id = 'SOME_ERROR_BOOK_QUESTION_ID';
```
**預期**: 該題目自動跳過或顯示友好錯誤

---

## 📊 性能測試

### 測試 1: 大量錯題載入
```sql
-- 插入 100 筆錯題
DO $$
DECLARE
    i INT;
BEGIN
    FOR i IN 1..100 LOOP
        INSERT INTO error_book (user_id, question_id, status)
        SELECT 'YOUR_USER_ID', id, 'active'
        FROM pack_questions
        LIMIT 1 OFFSET i;
    END LOOP;
END $$;
```

**驗證**:
- ✅ Backpack 頁面載入時間 < 2 秒
- ✅ 練習室首屏載入時間 < 1 秒
- ✅ 分頁載入正常（每次 20 題）

---

### 測試 2: 併發請求
```bash
# 使用 Apache Bench 測試
ab -n 100 -c 10 -H "Cookie: sb-access-token=YOUR_TOKEN" \
  http://localhost:3000/api/play/practice/create \
  -p create_payload.json
```

**預期**: 無資料競爭，無重複 room_code

---

## 🔍 除錯技巧

### Console 日誌
```javascript
// 在 BackpackContent.tsx 中查看
console.log('Filtered error book items:', filteredErrorBookItems)
console.log('Selected subject:', selectedSubject)

// 在 InfinitePracticeRoom.tsx 中查看
console.log('Fetched questions:', questions)
console.log('Room ID:', roomId)
```

### 網路請求檢查
```
打開 Chrome DevTools → Network Tab
過濾: practice
查看:
  - POST /api/play/practice/create
  - GET /api/play/practice/questions
```

### 資料庫查詢
```sql
-- 檢查錯題本
SELECT eb.*, pq.stem
FROM error_book eb
JOIN pack_questions pq ON eb.question_id = pq.id
WHERE eb.user_id = 'YOUR_USER_ID'
AND eb.status = 'active';

-- 檢查練習室
SELECT * FROM practice_rooms
WHERE source_type = 'ERROR_BOOK'
ORDER BY created_at DESC
LIMIT 5;

-- 檢查參與者
SELECT pp.*, pr.room_code
FROM practice_participants pp
JOIN practice_rooms pr ON pp.room_id = pr.id
WHERE pr.source_type = 'ERROR_BOOK';
```

---

## ✅ 測試檢查清單

### 功能測試
- [ ] 錯題本列表顯示正常
- [ ] 「開始練習」按鈕功能正常
- [ ] 科目過濾功能正常
- [ ] 練習室正確載入錯題
- [ ] 答題流程正常
- [ ] 錯題本為空時顯示提示
- [ ] 分頁載入正常

### 性能測試
- [ ] 大量錯題載入（100+ 題）
- [ ] 首屏載入時間 < 2 秒
- [ ] API 響應時間 < 500ms

### 安全測試
- [ ] 未登入用戶無法訪問
- [ ] 無法查看他人錯題
- [ ] SQL 注入防護
- [ ] XSS 防護

### 兼容性測試
- [ ] Chrome/Edge 最新版
- [ ] Safari 最新版
- [ ] Firefox 最新版
- [ ] 手機瀏覽器（iOS/Android）

---

## 🚨 已知問題追蹤

### Issue #1: 科目過濾可能失效
**描述**: Supabase 嵌套查詢可能不支援 `packs.subject` 過濾
**影響**: 中等
**解決方案**: 改為兩步驟查詢
**狀態**: 待驗證

### Issue #2: 選項格式不一致
**描述**: `pack_questions.choices` 可能是字串陣列或對象陣列
**影響**: 低
**解決方案**: API 層統一轉換
**狀態**: 已實作

---

## 📞 獲取幫助

### 查看實作文檔
```bash
cat ERROR_BOOK_PRACTICE_IMPLEMENTATION.md
```

### 檢查 API 日誌
```bash
# 開發伺服器 console 會顯示詳細日誌
[Error checking error_book:] ...
[Create practice room:] ...
```

### 聯繫開發團隊
- 提交 Issue: GitHub Issues
- Slack: #dev-practice-mode
- Email: dev@example.com

---

## 🎉 測試完成

所有測試通過後，請：
1. ✅ 更新 `ERROR_BOOK_PRACTICE_IMPLEMENTATION.md`
2. ✅ 提交測試報告
3. ✅ 準備 PR 審查
4. ✅ 計劃 Phase 2 開發

---

**測試者**: _____________
**測試日期**: _____________
**測試結果**: ⬜ 通過 / ⬜ 失敗
**備註**: _____________________________________________
