# 用戶自創題目 - 快速開始指南

## 🚀 5 分鐘快速體驗

### 前置要求
- ✅ 數據庫已執行 `011_play_battle_schema.sql`
- ✅ 數據庫已執行 `012_ugc_functions.sql`
- ✅ 開發伺服器已啟動（`pnpm --filter web dev`）
- ✅ 已登入用戶帳號

---

## 步驟 1: 創建題目（2 分鐘）

1. 進入對戰頁面 `/play`
2. 點擊「內容貢獻與合約」（UGC Contract）
3. 選擇「創建自訂題目」
4. 填寫題目資訊：
   ```
   學科：英文
   難度：2
   題目：Which sentence is grammatically correct?
   選項 A：He go to school.
   選項 B：He goes to school.
   選項 C：He going to school.
   選項 D：He gone to school.
   正確答案：B
   解題提示：Remember third person singular present tense
   ```
5. 點擊「提交題目」

✅ **完成！** 你會看到「題目創建成功」的提示

---

## 步驟 2: 查看題目（30 秒）

1. 返回「內容貢獻與合約」
2. 點擊「我的自創題目」
3. 你會看到剛才創建的題目，狀態為「待審核」

📊 **可查看資訊**：
- 題目內容
- 審核狀態
- 使用次數
- 累計獎勵

---

## 步驟 3: 審核題目（1 分鐘）

### 方法 A: 使用管理員 API（推薦）

```bash
# 獲取待審核題目
curl http://localhost:3000/api/admin/ugc-questions/review \
  -H "Cookie: your-auth-cookie"

# 審核通過
curl -X POST http://localhost:3000/api/admin/ugc-questions/review \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "questionId": "your-question-id",
    "action": "APPROVE"
  }'
```

### 方法 B: 直接執行 SQL（更快）

1. 打開 Supabase SQL Editor
2. 執行：
   ```sql
   -- 查看待審核題目
   SELECT id, question_text FROM ugc_questions WHERE review_status = 'PENDING';

   -- 審核通過（替換 ID）
   UPDATE ugc_questions SET review_status = 'APPROVED' WHERE id = 'your-id';
   ```

或使用測試腳本：
```bash
# 在 Supabase SQL Editor 中執行
apps/web/db/sql/test_ugc_approve.sql
```

✅ **完成！** 題目已審核通過

---

## 步驟 4: 在對戰中使用（1.5 分鐘）

1. 返回對戰頁面 `/play`
2. 點擊「自訂對戰」
3. 點擊「創建房間」
4. 設定房間：
   ```
   房間名稱：測試用戶自創題目
   學科：英文
   題目來源：用戶自創題目（或混合模式）
   啟用用戶自創題目：ON
   ```
5. 創建房間並開始對戰

🎮 **體驗！** 你會在對戰中看到用戶自創題目

---

## 🧪 自動化測試

### 運行測試腳本

```bash
# 1. 確保開發伺服器運行中
pnpm --filter web dev

# 2. 在另一個終端運行測試
npx tsx test-ugc-flow.ts
```

測試腳本會自動：
- ✅ 提交題目
- ✅ 查詢題目
- ✅ 更新題目
- ✅ 刪除題目
- ✅ 獲取對戰題目

---

## 📋 功能檢查清單

### 基礎功能
- [ ] 可以創建題目
- [ ] 可以查看自己的題目
- [ ] 可以更新待審核題目
- [ ] 可以刪除待審核題目
- [ ] 無法刪除已審核題目

### 審核機制
- [ ] 題目初始狀態為 PENDING
- [ ] 可以審核通過題目
- [ ] 可以拒絕題目
- [ ] 只有 APPROVED 題目可用於對戰

### 對戰整合
- [ ] 可以選擇「系統題庫」
- [ ] 可以選擇「用戶自創題目」
- [ ] 可以選擇「混合模式」
- [ ] 混合模式包含兩種題目
- [ ] 題目顯示正確（選項、正確答案）

### UI/UX
- [ ] 提交成功有提示
- [ ] 審核狀態顯示清楚
- [ ] 題目詳情完整
- [ ] 使用次數有更新

---

## 🐛 常見問題

### Q1: 提交題目失敗
**原因**: 可能未登入或權限不足
**解決**:
```bash
# 檢查登入狀態
# 查看瀏覽器 Console 的錯誤訊息
```

### Q2: 審核後題目未出現在對戰中
**原因**: 可能題目來源設置錯誤
**解決**:
- 確認「題目來源」選擇了「用戶自創題目」或「混合模式」
- 確認「啟用用戶自創題目」開關為 ON
- 確認學科匹配（如果有篩選）

### Q3: 使用次數沒有增加
**原因**: 可能數據庫函數未執行
**解決**:
```sql
-- 檢查函數是否存在
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'increment_ugc_usage_count';

-- 如果不存在，執行
-- apps/web/db/sql/012_ugc_functions.sql
```

### Q4: 無法刪除題目
**原因**: 只能刪除 PENDING 狀態題目
**解決**:
- 已審核的題目無法刪除（這是設計如此）
- 如需刪除已審核題目，需使用管理員權限直接操作數據庫

---

## 📊 數據驗證

### 驗證題目已創建
```sql
SELECT * FROM ugc_questions ORDER BY created_at DESC LIMIT 5;
```

### 驗證題目已審核
```sql
SELECT review_status, COUNT(*) FROM ugc_questions GROUP BY review_status;
```

### 驗證使用計數
```sql
SELECT id, question_text, usage_count FROM ugc_questions WHERE usage_count > 0;
```

### 驗證獎勵發放
```sql
SELECT
  uq.id,
  uq.question_text,
  uq.total_rewards,
  p.user_wallet_balance
FROM ugc_questions uq
JOIN profiles p ON uq.designer_id = p.id
WHERE uq.total_rewards > 0;
```

---

## 🎯 下一步

完成快速體驗後，你可以：

1. **閱讀完整文檔**
   - `apps/web/docs/UGC_QUESTIONS_GUIDE.md`
   - 了解所有 API 細節和高級功能

2. **查看實作總結**
   - `UGC_IMPLEMENTATION_SUMMARY.md`
   - 了解完整的架構和設計決策

3. **自定義功能**
   - 調整獎勵金額
   - 添加自動審核機制
   - 實作題目評分系統

4. **部署到生產環境**
   - 執行數據庫 migration
   - 設置管理員權限
   - 配置獎勵策略

---

## 💡 提示

- 💾 **記得保存題目 ID**: 審核時需要用到
- 🔄 **刷新頁面**: 審核後記得刷新「我的自創題目」頁面
- 📝 **測試各種狀態**: 嘗試創建、審核、拒絕不同的題目
- 🎮 **體驗對戰**: 在實際對戰中測試用戶自創題目

---

**開始時間**: 現在就開始！
**預計時間**: 5 分鐘
**難度**: ⭐️ 簡單

祝你體驗愉快！ 🎉
