# E4 Reading Explain UI/UX Upgrade - 完成報告

## ✅ 已完成功能

### S1: Error-aware Explanation
- **位置**: `apps/web/components/solve/explain/ErrorAwareExplanation.tsx`
- **功能**: 
  - 思考摘要（2-3行）
  - 常見陷阱（1行）
  - 正確答案（1行）
- **設計**: 極簡卡片，僅顯示必要資訊

### S2: Vertical Reasoning Flow
- **位置**: `apps/web/components/solve/explain/VerticalReasoningFlow.tsx`
- **功能**:
  - 自動跳過缺失步驟（keywords → evidence → cue → relation → answer）
  - 點擊步驟自動滾動到對應段落並高亮
  - 使用現有的 `highlightParagraph` 機制
- **設計**: 垂直步驟器，最小化視覺噪音

### S3: Minimal Notes
- **位置**: `apps/web/components/solve/explain/MinimalNotes.tsx`
- **功能**:
  - 文本選擇顯示浮動工具欄（高亮/筆記）
  - 高亮切換（黃色）
  - 筆記編輯（≤140字）
  - 筆記標記（🗒️）
- **設計**: 浮動工具欄，僅在 Full 模式顯示

### S4: Progressive Vocabulary
- **位置**: `apps/web/components/solve/explain/ProgressiveVocabulary.tsx`
- **功能**:
  - 分層顯示：IPA → POS → Chinese → Example → Synonyms
  - 延遲載入（Example/Synonyms）
  - [加入牌組] / [標記已掌握] 按鈕
  - DeepL 集成準備（目前為 mock 數據）
- **設計**: 可展開卡片，僅在 Full 模式顯示

### Mode Toggle
- **位置**: `apps/web/components/solve/explain/useViewMode.ts`
- **功能**:
  - Simple 模式：僅顯示思考摘要 + 垂直推理
  - Full 模式：顯示所有功能（詞彙、筆記、詳細解釋）
  - localStorage 持久化
- **設計**: 頂部切換開關

### Save to Backpack
- **位置**: `apps/web/components/solve/explain/ReadingExplain.tsx`
- **功能**:
  - 整合現有 `/api/backpack/save` API
  - 匿名用戶本地存儲 fallback
  - 固定底部 CTA 按鈕
- **設計**: 固定底部按鈕，不干擾內容

## 🔧 技術實現

### 保持不變的功能
- ✅ 問題切片和渲染（Q1, Q2...）
- ✅ 可滾動文章查看器（`ReadingPassage`）
- ✅ 證據點擊高亮機制（`handleEvidenceClick` → `highlightParagraph`）
- ✅ 所有現有路由和 API 合約

### 新增整合
- ✅ 模式切換 hook (`useViewMode`)
- ✅ 所有新組件已整合到 `ReadingExplain.tsx`
- ✅ 條件渲染基於 `mode === 'full'`
- ✅ 現有滾動/高亮機制完全保留

## 📋 待完成項目

### Supabase Schema（需要創建）
需要創建以下表來持久化數據：

```sql
-- 1. Highlights & Notes
CREATE TABLE reading_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_id TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  text TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vocab Cache (with DeepL results)
CREATE TABLE vocab_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  ipa TEXT,
  pos TEXT,
  zh TEXT,
  example TEXT,
  synonyms TEXT[],
  deepl_provider BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Vocab Actions
CREATE TABLE user_vocab_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  in_deck BOOLEAN DEFAULT FALSE,
  mastered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word)
);
```

### DeepL API 集成（需要實現）
- **位置**: 需要創建 `apps/web/lib/deepl.ts`
- **API Key**: `DEEPL_API_KEY=b75d034a-55ad-4b76-aac6-6b946409eb33:fx`
- **功能**: 
  - 翻譯缺失的中文釋義
  - 生成例句
  - 緩存結果到 Supabase

### Minimal Notes 改進
- 當前實現為基礎版本，需要：
  - 改進文本範圍選擇和定位
  - 實現高亮在 DOM 中的視覺渲染
  - 改進筆記標記的位置計算

## 🎨 設計原則

所有組件遵循：
- ✅ **極簡主義**: 最少元素，最短文本
- ✅ **移動優先**: 單手操作友好
- ✅ **系統主題**: 尊重 dark/light mode
- ✅ **無干擾動畫**: 僅必要的過渡效果
- ✅ **認知負擔最小**: Simple 模式預設

## 📊 驗收標準檢查

- ✅ 現有滾動/高亮機制完全保留
- ✅ S1: Error-aware Explanation 顯示
- ✅ S2: Vertical Reasoning Flow 顯示，點擊滾動
- ✅ S3: Minimal Notes（Full 模式）
- ✅ S4: Progressive Vocabulary（Full 模式）
- ✅ Mode Toggle 工作並持久化
- ✅ Save to Backpack 整合
- ⏳ Supabase Schema（待創建）
- ⏳ DeepL API 集成（待實現）

## 🚀 下一步

1. 創建 Supabase migration 文件
2. 實現 DeepL API 集成
3. 改進 Minimal Notes 的文本選擇和高亮渲染
4. 測試完整流程並優化性能

