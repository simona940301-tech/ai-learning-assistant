# 🚀 學習個人化系統 - 快速部署指南

## ⚡ 3 步驟部署

### Step 1: 執行資料庫 Migration (5 分鐘)

在 Supabase Dashboard > SQL Editor 執行：

```sql
-- 檔案 1: apps/web/supabase/migrations/025_user_proficiency_system.sql
-- 檔案 2: apps/web/supabase/migrations/026_hint_usage_logs.sql
```

**驗證**:
```sql
SELECT COUNT(*) FROM user_proficiency;
SELECT COUNT(*) FROM hint_usage_logs;
-- 應該不報錯
```

### Step 2: 設定環境變數 (2 分鐘)

確保 `.env.local` 包含：
```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Step 3: 測試 API (5 分鐘)

```bash
# 1. 啟動開發伺服器
pnpm --filter web dev

# 2. 執行測試腳本
# 先編輯 test-personalization-apis.ts 更新登入資訊
npx tsx test-personalization-apis.ts
```

預期結果: ✅ Passed: 8 / 8

---

## 🎯 訪問新功能

### Enhanced Dashboard
訪問: http://localhost:3000/dashboard/enhanced

功能：
- ✅ 總體熟練度追蹤
- ✅ 概念掌握雷達圖
- ✅ 成績預測儀表板
- ✅ 個人化學習建議

---

## 📋 完整功能清單

### 已實作的 8 個核心系統

| 功能 | API Endpoint | 狀態 |
|------|--------------|------|
| Proficiency Tracking | `/api/proficiency/calculate` | ✅ |
| Concept Proficiency | `/api/proficiency/concepts` | ✅ |
| Enhanced DDA | `/api/play/pve/questions` | ✅ |
| SRS Practice | `/api/error-book/practice` | ✅ |
| RAG Generator | `/api/questions/generate` | ✅ |
| Micro-hints | `/api/hints/generate` | ✅ |
| Dashboard UI | `/dashboard/enhanced` | ✅ |
| Visualizations | Recharts Components | ✅ |

---

## 🧪 快速測試腳本

```bash
# 測試 Proficiency API
curl -X POST http://localhost:3000/api/proficiency/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"forceRecalculate": true}'

# 測試 RAG Generation
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conceptTag": "tense-consistency",
    "subject": "English",
    "difficulty": 3,
    "count": 2
  }'

# 測試 Micro-hints
curl -X POST http://localhost:3000/api/hints/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Which is correct?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "B",
    "subject": "English",
    "conceptTags": ["tense-consistency"],
    "userAttempts": 0
  }'
```

---

## ⚠️ 常見問題

### Q: Migration 執行失敗？
**A**: 檢查是否有舊表，先清理測試環境：
```sql
DROP TABLE IF EXISTS hint_usage_logs CASCADE;
DROP TABLE IF EXISTS user_concept_proficiency CASCADE;
```

### Q: Gemini API 錯誤？
**A**: 檢查 API Key 是否正確，訪問 https://aistudio.google.com/apikey

### Q: Charts 不顯示？
**A**: 重新安裝 Recharts:
```bash
pnpm --filter web add recharts
rm -rf apps/web/.next
```

---

## 🎉 完成！

所有功能已就緒，可以開始使用個人化學習系統！

**檔案位置**:
- 完整文檔: `PERSONALIZATION_SYSTEM_IMPLEMENTATION_COMPLETE.md`
- API 測試: `test-personalization-apis.ts`
- Dashboard: `apps/web/app/(app)/dashboard/enhanced/page.tsx`
