-- Migration: 創建 RAG 系統相關表（筆記本 + 文件索引）
-- Created: 2025-11-23
-- Description: 為 Summary Tab RAG 系統創建 notebook_entries 和 rag_documents 表

-- ============================================
-- 1. 創建 notebook_entries 表（筆記本）
-- ============================================
CREATE TABLE IF NOT EXISTS notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 內容欄位
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,  -- Markdown 格式內容
  source_type TEXT CHECK (source_type IN ('summary', 'qa', 'manual')) DEFAULT 'manual',
  
  -- RAG 相關欄位（可選）
  document_id TEXT,  -- 關聯的 RAG 文件 ID
  vector_collection TEXT,  -- ChromaDB collection 名稱
  
  -- 元數據
  tags TEXT[] DEFAULT '{}',  -- 標籤陣列
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 創建索引以優化查詢性能
CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_tags ON notebook_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notebook_created ON notebook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_source_type ON notebook_entries(source_type);

-- 添加註釋
COMMENT ON TABLE notebook_entries IS '用戶筆記本，儲存摘要、問答結果和手動筆記';
COMMENT ON COLUMN notebook_entries.source_type IS '來源類型：summary（摘要）、qa（問答）、manual（手動）';
COMMENT ON COLUMN notebook_entries.document_id IS 'RAG 文件 ID（對應 rag_documents.id）';
COMMENT ON COLUMN notebook_entries.vector_collection IS 'ChromaDB collection 名稱';

-- ============================================
-- 2. 創建 rag_documents 表（RAG 文件索引）
-- ============================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 文件基本資訊
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT CHECK (file_type IN ('pdf', 'txt')) NOT NULL,
  original_text TEXT,  -- 原始文本內容
  
  -- ChromaDB 相關（暫時保留，未來可能使用）
  chroma_collection TEXT,
  chroma_doc_ids TEXT[],
  
  -- 摘要與關鍵詞（由 AI 生成）
  summary TEXT,  -- 抽取式摘要
  keywords TEXT[],  -- 關鍵詞陣列
  
  -- 處理狀態
  status TEXT CHECK (status IN ('uploading', 'processing', 'ready', 'error')) DEFAULT 'uploading',
  error_message TEXT,  -- 錯誤訊息（如果處理失敗）
  
  -- 時間戳記
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_rag_docs_user ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);
CREATE INDEX IF NOT EXISTS idx_rag_docs_uploaded ON rag_documents(uploaded_at DESC);

-- 添加註釋
COMMENT ON TABLE rag_documents IS 'RAG 文件索引，追蹤上傳文件的處理狀態';
COMMENT ON COLUMN rag_documents.status IS '處理狀態：uploading（上傳中）、processing（處理中）、ready（就緒）、error（錯誤）';
COMMENT ON COLUMN rag_documents.summary IS '抽取式摘要（3-5 個關鍵句子）';
COMMENT ON COLUMN rag_documents.keywords IS '關鍵詞陣列（5-10 個）';

-- ============================================
-- 3. 啟用 Row Level Security (RLS)
-- ============================================

-- 啟用 RLS
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- notebook_entries 的 RLS 政策（先刪除舊的，避免衝突）
DROP POLICY IF EXISTS "Users can view their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can insert their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can update their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can delete their own notebook entries" ON notebook_entries;

CREATE POLICY "Users can view their own notebook entries"
  ON notebook_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notebook entries"
  ON notebook_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebook entries"
  ON notebook_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebook entries"
  ON notebook_entries FOR DELETE
  USING (auth.uid() = user_id);

-- rag_documents 的 RLS 政策（先刪除舊的，避免衝突）
DROP POLICY IF EXISTS "Users can view their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can insert their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can update their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can delete their own RAG documents" ON rag_documents;

CREATE POLICY "Users can view their own RAG documents"
  ON rag_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RAG documents"
  ON rag_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RAG documents"
  ON rag_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RAG documents"
  ON rag_documents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. 創建 updated_at 自動更新觸發器
-- ============================================

-- 創建觸發器函數（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 notebook_entries 添加觸發器（先刪除舊的）
DROP TRIGGER IF EXISTS update_notebook_entries_updated_at ON notebook_entries;

CREATE TRIGGER update_notebook_entries_updated_at
  BEFORE UPDATE ON notebook_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 創建輔助函數
-- ============================================

-- 函數：獲取用戶的筆記本統計
CREATE OR REPLACE FUNCTION get_notebook_stats(p_user_id UUID)
RETURNS TABLE (
  total_entries BIGINT,
  summary_count BIGINT,
  qa_count BIGINT,
  manual_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE source_type = 'summary') AS summary_count,
    COUNT(*) FILTER (WHERE source_type = 'qa') AS qa_count,
    COUNT(*) FILTER (WHERE source_type = 'manual') AS manual_count
  FROM notebook_entries
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函數：獲取用戶的 RAG 文件統計
CREATE OR REPLACE FUNCTION get_rag_documents_stats(p_user_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  ready_count BIGINT,
  processing_count BIGINT,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_documents,
    COUNT(*) FILTER (WHERE status = 'ready') AS ready_count,
    COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
    COUNT(*) FILTER (WHERE status = 'error') AS error_count
  FROM rag_documents
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
