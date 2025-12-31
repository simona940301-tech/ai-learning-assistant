# Ready Score 改用 Department Requirements 實作總結

## 📋 改動摘要

我們已將大學選擇系統從硬編碼的 `taiwan-universities.ts` 改為使用資料庫中的 `department_requirements` 表，讓系統能夠動態載入真實的大學科系資料，並根據實際的入學標準計算 Ready Score。

## ✅ 已完成的改動

### 1. **Onboarding Goal 頁面** ([onboarding/goal/page.tsx](apps/web/app/onboarding/goal/page.tsx))

**改動內容：**
- ✅ 從 `department_requirements` 表動態載入大學和科系資料
- ✅ 顯示每個科系的英文入學要求（如：頂標、前標、均標）
- ✅ 儲存選擇的大學和科系名稱到 `profiles.target_university` 和 `profiles.target_department`
- ✅ 移除對 `taiwan-universities.ts` 的依賴

**關鍵程式碼：**
```typescript
// 從 department_requirements 載入資料
const { data, error } = await supabaseBrowserClient
  .from('department_requirements')
  .select('id, university_name, department_name, score_english, requirement_english')
  .order('university_name', { ascending: true })

// 顯示科系時附帶英文要求
{dept.department_name}
{dept.score_english && (
  <span className="ml-2 text-xs text-muted-foreground">
    (英文: {dept.requirement_english || dept.score_english})
  </span>
)}
```

### 2. **Dream School Progress API** ([api/profile/dream-school-progress/route.ts](apps/web/app/api/profile/dream-school-progress/route.ts))

**改動內容：**
- ✅ 直接使用 `profile.target_university` 和 `profile.target_department` 查詢資料
- ✅ 從 `department_requirements` 表取得該科系的實際英文入學要求
- ✅ 根據科系要求動態調整 `minReadyScore`（例如：頂標13 → 89分，前標12 → 86分）
- ✅ 簡化 profile 查詢邏輯，移除 `dream_school_id` 和 `dream_department_id` 欄位

**關鍵程式碼：**
```typescript
// 查詢使用者的目標科系
const { data: profile } = await supabase
  .from('profiles')
  .select('mock_exam_level, streak, elo_rank, target_university, target_department')
  .eq('id', user.id)
  .single()

// 動態查詢該科系的英文要求
const { data: deptReq } = await supabase
  .from('department_requirements')
  .select('score_english, requirement_english')
  .eq('university_name', profile.target_university)
  .eq('department_name', profile.target_department)
  .maybeSingle()

// 根據要求級分動態調整最低分數
if (deptReq?.score_english) {
  englishRequirement = {
    requiredGradeLevel: deptReq.score_english,
    passScore: 60,
    excellentScore: 90,
  }
  minReadyScore = 50 + (deptReq.score_english * 3)
}
```

### 3. **Settings 頁面** ([profile/settings/page.tsx](apps/web/app/(app)/profile/settings/page.tsx))

**改動內容：**
- ✅ 從 `department_requirements` 表動態載入大學和科系資料
- ✅ 顯示每個科系的英文入學要求
- ✅ 允許使用者更新目標學校和科系
- ✅ 移除對 `taiwan-universities.ts` 的依賴

**關鍵程式碼：**
```typescript
// 載入資料
const { data } = await supabaseBrowserClient
  .from('department_requirements')
  .select('id, university_name, department_name, score_english, requirement_english')
  .order('university_name', { ascending: true })

// 儲存時直接使用名稱
updatePayload.target_university = selectedUniversity
updatePayload.target_department = selectedDepartment
```

## 📊 資料流程

### 使用者旅程：

1. **Onboarding 階段**
   - 使用者選擇大學和科系（從 `department_requirements` 載入）
   - 系統儲存 `target_university` 和 `target_department` 到 `profiles` 表

2. **Ready Score 計算**
   - API 從 `profiles` 取得使用者的目標學校和科系
   - 從 `department_requirements` 查詢該科系的英文入學要求
   - 根據實際要求動態計算 `minReadyScore`
   - 計算使用者目前的 Ready Score 百分比

3. **設定頁面調整**
   - 使用者可隨時更新目標學校和科系
   - 更新後立即影響 Ready Score 計算

## 🗄️ 資料庫結構

### `profiles` 表（已存在）
```sql
target_university TEXT  -- 儲存大學名稱（例如：國立台灣大學）
target_department TEXT  -- 儲存科系名稱（例如：資訊工程學系）
mock_exam_level INTEGER -- 模考級分 (0-15)
```

### `department_requirements` 表（已存在）
```sql
university_name TEXT    -- 大學名稱
department_name TEXT    -- 科系名稱
score_english INTEGER   -- 英文檢定標準分數（級分）
requirement_english TEXT -- 英文檢定標準文字（例如：頂標、前標）
```

## 🎯 Ready Score 計算邏輯

### 動態 `minReadyScore` 公式：
```
minReadyScore = 50 + (score_english × 3)

範例：
- 頂標 (13級分): 50 + (13 × 3) = 89分
- 前標 (12級分): 50 + (12 × 3) = 86分
- 均標 (10級分): 50 + (10 × 3) = 80分
- 後標 (8級分):  50 + (8 × 3) = 74分
```

### Ready % 計算：
```
Ready % = (userFinalScore / minReadyScore) × 100
```

## ⚠️ 注意事項

1. **資料一致性**
   - 確保 `department_requirements` 表有足夠的資料
   - 如果查詢不到科系資料，系統會使用預設值（`minReadyScore = 80`）

2. **向後兼容**
   - 舊的 `dream_school_id` 和 `dream_department_id` 欄位保留，但不再使用
   - 可在未來的 migration 中移除

3. **效能優化**
   - `department_requirements` 表已建立索引：
     - `idx_department_requirements_university`
     - `idx_department_requirements_department`

## 🧪 測試建議

### 測試流程：

1. **Onboarding 測試**
   ```
   - 訪問 /onboarding/goal
   - 選擇一所大學（例如：國立台灣大學）
   - 選擇一個科系（例如：資訊工程學系）
   - 確認顯示英文入學要求
   - 完成 onboarding
   ```

2. **Ready Score 測試**
   ```
   - 完成一些英文練習題
   - 訪問 /api/profile/dream-school-progress
   - 確認回傳的 Ready Score 有使用正確的 minReadyScore
   - 確認 breakdown 顯示正確的 requiredGrade
   ```

3. **Settings 測試**
   ```
   - 訪問 /profile/settings
   - 更改目標學校和科系
   - 儲存設定
   - 重新查詢 Ready Score，確認有更新
   ```

## 📝 待辦事項

- [ ] 匯入完整的 `department_requirements` 資料
- [ ] 測試 onboarding 流程
- [ ] 測試 Ready Score 計算
- [ ] 測試設定頁面更新
- [ ] 檢查 Profile 頁面是否有顯示目標學校（如有需要更新）
- [ ] 移除對 `taiwan-universities.ts` 的所有依賴（如已無其他使用處）

## 🚀 部署步驟

1. 確保 `department_requirements` 表已建立（migration 017）
2. 匯入大學科系資料到 `department_requirements` 表
3. 部署更新的程式碼
4. 測試完整流程

## 📚 相關文件

- [Department Requirements Schema](apps/web/db/sql/017_department_requirements.sql)
- [Dream School Calculator](apps/web/lib/dream-school-calculator.ts)
- [Department Standards Guide](DEPARTMENT_STANDARDS_GUIDE.md)
